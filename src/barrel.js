const t = require("@babel/types");
const ospath = require("path");
const fs = require("fs");
const fg = require("fast-glob");
const AST = require("./ast");

class PathFunctions {
  static isObjectEmpty(obj) {
    if (typeof obj === 'object' && Object.keys(obj).length !== 0) {
      return false;
    } else {
      return true;
    }
  }

  static fileExists(path) {
    try {
        return !fs.accessSync(path, fs.F_OK);
    } catch (e) {
        return false;
    }
  }

  static isRelativePath(path) {
    return path.match(/^\.{0,2}\//);
  }
  
  static checkIfModule(path) {
    const notModuleRegExp = /^\.$|^\.[\\\/]|^\.\.$|^\.\.[\/\\]|^\/|^[A-Z]:[\\\/]/i;
    const isModuleVar = !notModuleRegExp.test(path) || path.includes("node_modules");
    return isModuleVar;
  }

  static getModuleAbsolutePath(parsedJSFile, convertedImportsPath) {
    let absolutePath = convertedImportsPath;
    if (!ospath.isAbsolute(convertedImportsPath)) {
      absolutePath = ospath.join(ospath.dirname(parsedJSFile), convertedImportsPath);
    }
    const ext = ['.js','.jsx','.ts','.tsx', '/index.js','/index.jsx','/index.ts','/index.tsx'].find((ext)=> PathFunctions.fileExists(absolutePath + ext)) || "";
    absolutePath = absolutePath + ext;
    // const resolvedAbsolutePath = require.resolve(absolutePath);
    return absolutePath;
  }
}

class PackageJson {
  constructor() {
    this.mainPkg = ospath.resolve('package.json');
    this.packagesJsons = [];
    this.aliasObj = {};
    this.workspaces = this.loadWorkspaces();
    this.getNodePackages();
    this.aliasesToWorkspaces();
  }

  loadWorkspaces() {
    const workspaces = require(this.mainPkg).workspaces || [];
    if (Array.isArray(workspaces)) return workspaces;
    return workspaces.packages || [];
  }

  getNodePackages( { workspacePath = ospath.resolve('.') } = {} ) {
    if (this.workspaces===[]) return [];
    const globWorkspaces = this.workspaces.map((ws)=> ws + '/**/package.json');
    const packagesJsons = fg.sync(
      globWorkspaces,
      {
        deep: Infinity,
        onlyFiles: true,
        absolute: true,
        cwd: workspacePath,
        ignore: ['**/node_modules'],
      },
    );
    this.packagesJsons = packagesJsons;
    return packagesJsons;
  }

  aliasesToWorkspaces() {
    const aliases = this.packagesJsons.reduce((alias, pkgPath) => {
      const pkgName = require(pkgPath).name;
      alias[pkgName] = ospath.dirname(pkgPath);
      return alias;
    }, {})
    this.aliasObj = aliases;
    return aliases;
  }

  getAlias() {
    return this.aliasObj;
  }
}

class WebpackConfig {
  constructor() {
    this.aliasObj = {};
  }

  getWebpackAlias(plugin) {
    const filePath = plugin.options.webpackConfigFilename;
    // If the config comes back as null, we didn't find it, so throw an exception.
    if (!filePath) {
      return null;
    }
    const webpackConfigObj = require(filePath);
  
    let alias = {};
    if (typeof webpackConfigObj === 'object') {
      if (!PathFunctions.isObjectEmpty(webpackConfigObj?.resolve?.alias)) {
        alias = webpackConfigObj.resolve.alias;
      }
    } else if (typeof webpackConfigObj === 'function') {
      const args = plugin.options.args || [];
      alias = webpackConfigObj(...args).resolve.alias;
    }
    this.aliasObj = alias;
    return alias;
  }  

  convertAliasToOriginal(parsedJSFile, originalImportsPath) {
    let convertedPath = originalImportsPath;
    const aliasObj = this.aliasObj;
    const aliases = Object.keys(aliasObj);
    for (const alias of aliases) {
      let aliasDestination = aliasObj[alias];
      const regex = new RegExp(`^${alias}(\/|$)`);
      
      if (regex.test(originalImportsPath)) {
        const isModule = PathFunctions.checkIfModule(aliasDestination);
        if (isModule) {
          convertedPath = aliasDestination;
          break;
        }
        // If the filepath is not absolute, make it absolute
        if (!ospath.isAbsolute(aliasDestination)) {
            aliasDestination = ospath.join(ospath.dirname(parsedJSFile), aliasDestination);
        }
        let relativeFilePath = ospath.relative(ospath.dirname(parsedJSFile), aliasDestination);
  
        // In case the file path is the root of the alias, need to put a dot to avoid having an absolute path
        if (relativeFilePath.length === 0) {
            relativeFilePath = '.';
        }
  
        let requiredFilePath = originalImportsPath.replace(alias, relativeFilePath);
  
        // If the file is requiring the current directory which is the alias, add an extra slash
        if (requiredFilePath === '.') {
            requiredFilePath = './';
        }
  
        // In the case of a file requiring a child directory of the current directory, we need to add a dot slash
        if (['.', '/'].indexOf(requiredFilePath[0]) === -1) {
            requiredFilePath = `./${requiredFilePath}`;
        }
  
        convertedPath = requiredFilePath;
        break;
      }
    }
    return convertedPath;
  }  

  appendAlias(alias) {
    this.aliasObj = { ...this.aliasObj, ...alias };
  }
}

class BarrelFilesMapping {
  constructor() {
    this.mapping = {};
  }

  static isBarrelFile(modulePath) {
    const barrelFileRegex = new RegExp(`index\.(js|mjs|jsx|ts|tsx)$`);
    return barrelFileRegex.test(modulePath);
  }

  createSpecifiersMapping(fullPathModule) {
    const barrelAST = AST.filenameToAST(fullPathModule);
    this.mapping[fullPathModule] = {};
    barrelAST.program.body.forEach((node) => {
      if (t.isExportNamedDeclaration(node)) {
        const originalExportedPath = node.source?.value || fullPathModule;
        const convertedExportedPath = webpackConfig.convertAliasToOriginal(fullPathModule, originalExportedPath);
        const absoluteExportedPath = PathFunctions.getModuleAbsolutePath(fullPathModule, convertedExportedPath);
        node.specifiers.forEach((specifier) => {
          const specifierExportedName = specifier.exported.name;
          const specifierLocalName = specifier?.local?.name;
          const specifierType = AST.getSpecifierType(specifier);
          this.mapping[fullPathModule][specifierExportedName] =
            this.createDirectSpecifierObject(absoluteExportedPath, specifierExportedName, specifierLocalName, specifierType);
        });
        if (t.isVariableDeclaration(node.declaration)) {
          const specifierType = "named";
          node.declaration.declarations.forEach((declaration) => {
            const specifierName = declaration.id.name;
            this.mapping[fullPathModule][specifierName] =
              this.createDirectSpecifierObject(absoluteExportedPath, specifierName, specifierType);    
          });
        } else if (t.isFunctionDeclaration(node.declaration)) {
          const specifierType = "named";
          const specifierName = node.declaration.id.name;
          this.mapping[fullPathModule][specifierName] =
            this.createDirectSpecifierObject(absoluteExportedPath, specifierName, specifierType);
        }
      } else if (t.isExportAllDeclaration(node)) {
        const originalExportedPath = node.source.value;
        const convertedExportedPath = webpackConfig.convertAliasToOriginal(fullPathModule, originalExportedPath);
        const absoluteExportedPath = PathFunctions.getModuleAbsolutePath(fullPathModule, convertedExportedPath);
        if (!this.mapping[absoluteExportedPath]) {
          this.createSpecifiersMapping(absoluteExportedPath);
        }
        Object.assign(this.mapping[fullPathModule],this.mapping[absoluteExportedPath]);
      }
    });
  }

  createDirectSpecifierObject(fullPathModule, specifierExportedName, specifierLocalName, specifierType) {
    if (BarrelFilesMapping.isBarrelFile(fullPathModule)) {
      if (!this.mapping[fullPathModule]) {
        this.createSpecifiersMapping(fullPathModule);
      }
      const originalPath = this.mapping[fullPathModule][specifierExportedName]["path"];
      const originalExportedName = this.mapping[fullPathModule][specifierExportedName]["exportedName"];
      const originalLocalName = this.mapping[fullPathModule][specifierExportedName]["localName"];
      const originalType = this.mapping[fullPathModule][specifierExportedName]["type"];
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
    if (!this.mapping[fullPathModule]) {
      this.createSpecifiersMapping(fullPathModule);
    }
    return this.mapping[fullPathModule][specifierExportedName];
  }
}

const mapping = new BarrelFilesMapping();
const webpackConfig = new WebpackConfig();
const packageJsonConfig = new PackageJson();

const importDeclarationVisitor = (path, state) => {
  const parsedJSFile = state.filename
  const originalImportsPath = path.node.source.value;
  const originalImportsSpecifiers = path.node.specifiers;
  const convertedImportsPath = webpackConfig.convertAliasToOriginal(parsedJSFile, originalImportsPath);
  if (PathFunctions.checkIfModule(convertedImportsPath)) return;
  const importModuleAbsolutePath = PathFunctions.getModuleAbsolutePath(parsedJSFile, convertedImportsPath);
  if (!BarrelFilesMapping.isBarrelFile(importModuleAbsolutePath)) return;
  const directSpecifierASTArray = originalImportsSpecifiers.map(
    (specifier) => {
      const directSpecifierObject = mapping.getDirectSpecifierObject(
        importModuleAbsolutePath,
        specifier.imported.name
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
    },
    visitor: {
      ImportDeclaration: importDeclarationVisitor,
    },
  };
};
