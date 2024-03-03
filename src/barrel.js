const t = require("@babel/types");
const AST = require("./ast");
const PathFunctions = require("./path");
const { PackageJson, WebpackConfig, JestConfig } = require("./alias");

class BarrelFilesMapping {
  constructor() {
    this.mapping = {};
  }

  isBarrelFile(modulePath) {
    const isBarrelFilename = (modulePath) => {
      const barrelFileRegex = new RegExp(`index\.(js|mjs|jsx|ts|tsx)$`);
      return barrelFileRegex.test(modulePath);  
    }
    const isScannedBarrelFilename = (modulePath) => {
      return !!this.mapping[modulePath];
    }
    const isBarrelFileContent = (modulePath) => {
      return !PathFunctions.isObjectEmpty(this.mapping[modulePath]);
    }
    if (!isBarrelFilename(modulePath)) return false;
    if (!isScannedBarrelFilename(modulePath)) {
      this.createSpecifiersMapping(modulePath);
    };
    return isBarrelFileContent(modulePath);
  }

  createSpecifiersMapping(fullPathModule, forceFullScan = false) {
    const barrelAST = AST.filenameToAST(fullPathModule);
    this.mapping[fullPathModule] = {};
    const imports = {};
    barrelAST.program.body.every((node) => {
      const originalExportedPath = node.source?.value || fullPathModule;
      const convertedExportedPath = webpackConfig.convertAliasToOriginal(fullPathModule, originalExportedPath);
      let absoluteExportedPath = PathFunctions.getModuleAbsolutePath(fullPathModule, convertedExportedPath);
      if (t.isExportNamedDeclaration(node)) {
        node.specifiers.forEach((specifier) => {
          const specifierExportedName = specifier.exported.name;
          let specifierLocalName = specifier?.local?.name;
          let specifierType = AST.getSpecifierType(specifier);
          // if node.source exist -> export { abc } from './abc';
          if (!node.source) {
            // if node.source doesnt exist -> export { abc };
            if (specifierLocalName in imports) {
              absoluteExportedPath = imports[specifierLocalName]["path"];
              specifierType = imports[specifierLocalName]["type"];
              specifierLocalName = imports[specifierLocalName]["importedName"];
            }
          }
          this.mapping[fullPathModule][specifierExportedName] =
            this.createDirectSpecifierObject(absoluteExportedPath, specifierExportedName, specifierLocalName, specifierType);
        });
        if (node.declaration && !forceFullScan) {
            this.mapping[fullPathModule] = {};
            return false;
        }  
        if (node.declaration) {
          const specifierType = "named";
          const declarations = node.declaration.declarations || [node.declaration];
          // if declaration exists -> export function abc(){};
          // if declaration.declarations exists -> export const abc = 5, def = 10;
          declarations.forEach((declaration) => {
            const specifierName = declaration.id.name;
            this.mapping[fullPathModule][specifierName] =
              this.createDirectSpecifierObject(absoluteExportedPath, specifierName, specifierName, specifierType);    
          });
        }
      } else if (t.isExportDefaultDeclaration(node)) {
        // export default abc;
        if (node.declaration.name) {
          let specifierLocalName = node.declaration.name;
          if (specifierLocalName in imports) {
            const specifierType = imports[specifierLocalName]["type"];
            const specifierExportedName = "default";
            const absoluteExportedPath = imports[specifierLocalName]["path"];
            specifierLocalName = imports[specifierLocalName]["importedName"];
            this.mapping[fullPathModule][specifierExportedName] =
              this.createDirectSpecifierObject(absoluteExportedPath, specifierExportedName, specifierLocalName, specifierType);
          }
        }
      } else if (t.isExportAllDeclaration(node)) {
        // export * from './abc';
        if (!this.mapping[absoluteExportedPath]) {
          this.createSpecifiersMapping(absoluteExportedPath, true);
        }
        Object.assign(this.mapping[fullPathModule],this.mapping[absoluteExportedPath]);
        delete this.mapping[absoluteExportedPath];
      } else if (t.isImportDeclaration(node)) {
        if (!AST.isAnySpecifierExist(node.specifiers) && !forceFullScan) {
        // import './abc';
          this.mapping[fullPathModule] = {};
          return false;
        }
        node.specifiers.forEach((specifier) => {
        // import {abc, def} from './abc';
          const specifierImportedName = specifier?.imported?.name;
          const specifierLocalName = specifier?.local?.name;
          const specifierType = AST.getSpecifierType(specifier);
          const originalExportedPath = node.source.value;
          const convertedExportedPath = webpackConfig.convertAliasToOriginal(fullPathModule, originalExportedPath);
          const absoluteExportedPath = PathFunctions.getModuleAbsolutePath(fullPathModule, convertedExportedPath);
          imports[specifierLocalName] = {
            importedName: specifierImportedName,
            localName: specifierLocalName,
            path: absoluteExportedPath,
            type: specifierType,
          };
        });
      } else {
        if (forceFullScan) {
          return true;
        } else {
          this.mapping[fullPathModule] = {};
          return false;  
        }
      }
      return true;
    });
  }

  createDirectSpecifierObject(fullPathModule, specifierExportedName, specifierLocalName, specifierType) {
    if (this.isBarrelFile(fullPathModule)) {
      const originalPath = this.mapping[fullPathModule][specifierLocalName]["path"];
      const originalExportedName = this.mapping[fullPathModule][specifierLocalName]["exportedName"];
      const originalLocalName = this.mapping[fullPathModule][specifierLocalName]["localName"];
      const originalType = this.mapping[fullPathModule][specifierLocalName]["type"];
      return this.createDirectSpecifierObject(originalPath, originalExportedName, originalLocalName, originalType);
    }
    return {
      exportedName: specifierExportedName,
      localName: specifierLocalName,
      path: fullPathModule,
      type: specifierType,
    };
  }

  getDirectSpecifierObject(fullPathModule, specifierExportedName) {
    return this.mapping[fullPathModule][specifierExportedName];
  }
}

const mapping = new BarrelFilesMapping();
const webpackConfig = new WebpackConfig();
const jestConfig = new JestConfig();
const packageJsonConfig = new PackageJson();

const importDeclarationVisitor = (path, state) => {
  const originalImportsSpecifiers = path.node.specifiers;
  if (!AST.isAnySpecifierExist(originalImportsSpecifiers)) return;
  if (AST.getSpecifierType(originalImportsSpecifiers[0]) === "namespace") return;
  const parsedJSFile = state.filename
  const originalImportsPath = path.node.source.value;
  const convertedImportsPath = webpackConfig.convertAliasToOriginal(parsedJSFile, originalImportsPath);
  if (PathFunctions.checkIfModule(convertedImportsPath)) return;
  const importModuleAbsolutePath = PathFunctions.getModuleAbsolutePath(parsedJSFile, convertedImportsPath);
  if (!mapping.isBarrelFile(importModuleAbsolutePath)) return;
  const directSpecifierASTArray = originalImportsSpecifiers.map(
    (specifier) => {
      const directSpecifierObject = mapping.getDirectSpecifierObject(
        importModuleAbsolutePath,
        specifier?.imported?.name || "default"
      );
      const newImportProperties = {
        localName: specifier.local.name,
        importedName: directSpecifierObject["localName"],
        path: directSpecifierObject["path"],
        type: directSpecifierObject["type"],
      }
      return AST.createASTImportDeclaration(newImportProperties);
    }
  );
  path.replaceWithMultiple(directSpecifierASTArray);
};

module.exports = function (babel) {
  const PLUGIN_KEY = 'transform-barrels';
  return {
    name: PLUGIN_KEY,
    pre(state) {
      const plugins = state.opts.plugins;
      const plugin = plugins.find(plugin => plugin.key === PLUGIN_KEY);
      webpackConfig.getWebpackAlias(plugin);
      webpackConfig.appendAlias(packageJsonConfig.getAlias());
      webpackConfig.appendAlias(jestConfig.getJestAlias(plugin));
    },
    visitor: {
      ImportDeclaration: importDeclarationVisitor,
    },
  };
};
