const ospath = require("path");
const t = require("@babel/types");
const AST = require("./ast");
const PathFunctions = require("./path");
const resolver = require("./resolver");
const packageManager = require("./packages");

class BarrelFile {
    constructor(path) {
        this.path = path;
        this.exportMapping = {};
        this.importMapping = {};
    }

    static isBarrelFilename(path) {
      const barrelFileRegex = new RegExp(`index\.(js|mjs|jsx|ts|tsx)$`);
      return barrelFileRegex.test(path);  
    }    

    get isBarrelFileContent() {
        return !PathFunctions.isObjectEmpty(this.exportMapping);
    }    

    handleExportNamedDeclaration(node) {
        if (node.specifiers.length > 0) {
          node.specifiers.forEach((specifier) => {
            let specifierObj = SpecifierFactory.createSpecifier("export");
            if (node.source) {
              // if node.source exist -> export { abc } from './abc';
              specifierObj.exportedName = specifier.exported.name;
              specifierObj.localName = specifier?.local?.name;
              specifierObj.type = AST.getSpecifierType(specifier);
              const exportPath = node.source.value;
              specifierObj.esmPath = resolver.resolve(exportPath, this.path).absEsmFile;
            } else {
              // if node.source doesnt exist -> export { abc };
              const localName = specifier?.local?.name;
              if (localName in this.importMapping) {
                specifierObj = this.importMapping[localName].toExportSpecifier();
                specifierObj.exportedName = specifier.exported.name;
              }
            }
            const { exportedName } = specifierObj;
            this.exportMapping[exportedName] = this.getDeepestDirectSpecifierObject(specifierObj);
          });
        };
        if (node.declaration) {
          const specifierObj = SpecifierFactory.createSpecifier("export");
          specifierObj.type = "named";
          specifierObj.esmPath = this.path;
          const declarations = node.declaration.declarations || [node.declaration];
          // if declaration exists -> export function abc(){};
          // if declaration.declarations exists -> export const abc = 5, def = 10;
          declarations.forEach((declaration) => {
            specifierObj.localName = declaration.id.name;
            specifierObj.exportedName = declaration.id.name;
            const { exportedName } = specifierObj;
            this.exportMapping[exportedName] = this.getDeepestDirectSpecifierObject(specifierObj);    
          });
        }
    }
    
    handleExportDefaultDeclaration(node) {
        // export default abc;
        if (node.declaration.name) {
          const localName = node.declaration.name;
          if (localName in this.importMapping) {
            const specifierObj = this.importMapping[localName].toExportSpecifier();
            specifierObj.exportedName = "default";
            const { exportedName } = specifierObj;
            this.exportMapping[exportedName] = this.getDeepestDirectSpecifierObject(specifierObj);
          }
        }
    }
    
    handleExportAllDeclaration(node) {
        // export * from './abc';
        const exportPath = node.source.value;
        let absoluteExportedPath = resolver.resolve(exportPath, this.path).absEsmFile;
        const exportedAllFile = new BarrelFile(absoluteExportedPath);
        exportedAllFile.createSpecifiersMapping(true);
        Object.assign(this.exportMapping, exportedAllFile.exportMapping);
    }
    
    handleImportDeclaration(node) {
        node.specifiers.forEach((specifier) => {
            // import {abc, def} from './abc';
            const specifierObj = SpecifierFactory.createSpecifier("import");
            specifierObj.importedName = specifier?.imported?.name;
            specifierObj.localName = specifier.local.name;
            specifierObj.type = AST.getSpecifierType(specifier);
            const importPath = node.source.value;
            specifierObj.esmPath = resolver.resolve(importPath, this.path).absEsmFile;
            const { localName } = specifierObj;
            this.importMapping[localName] = specifierObj;
        });
    }
    
    createSpecifiersMapping(forceFullScan = false) {
        const barrelAST = AST.filenameToAST(this.path);
        barrelAST.program.body.every((node) => {
          if (t.isExportNamedDeclaration(node)) {
            // export { abc } from './abc';
            // export { abc };
            // export function abc(){};
            // export const abc = 5, def = 10;
            if (node.declaration && !forceFullScan) {
              this.exportMapping = {};
              return false;
            }  
            this.handleExportNamedDeclaration(node);
          } else if (t.isExportDefaultDeclaration(node)) {
            // export default abc;
            this.handleExportDefaultDeclaration(node);
          } else if (t.isExportAllDeclaration(node)) {
            // export * from './abc';
            this.handleExportAllDeclaration(node);
          } else if (t.isImportDeclaration(node)) {
            if (!AST.isAnySpecifierExist(node.specifiers) && !forceFullScan) {
            // import './abc';
              this.exportMapping = {};
              return false;
            }
            // import {abc, def} from './abc';
            this.handleImportDeclaration(node);
          } else {
            if (forceFullScan) {
              return true;
            } else {
              this.exportMapping = {};
              return false;  
            }
          }
          return true;
        });
        this.path = PathFunctions.normalizeModulePath(this.path);
    }    

    getDeepestDirectSpecifierObject(specifierObj) {
        const { esmPath, localName } = specifierObj;
        if (BarrelFile.isBarrelFilename(esmPath)) {
          const barrelFile = BarrelFileManager.getBarrelFile(esmPath);
          if (barrelFile.isBarrelFileContent) {
            const deepestSpecifier = barrelFile.getDirectSpecifierObject(localName);
            return this.getDeepestDirectSpecifierObject(deepestSpecifier);
          }  
        }
        specifierObj.esmPath = PathFunctions.normalizeModulePath(specifierObj.esmPath);
        return specifierObj;
    }

    getDirectSpecifierObject(specifierExportedName) {
        return this.exportMapping[specifierExportedName];
    }    
}

class BarrelFileManager {
    constructor() {
      this.barrelFiles = new Map();
    }
  
    getBarrelFileInner(path) {
      let barrelFile = new BarrelFile(path);
      if (BarrelFile.isBarrelFilename(path)) {
        const barrelKeyName = PathFunctions.normalizeModulePath(path);
        if (!this.barrelFiles.has(barrelKeyName)) {
            barrelFile.createSpecifiersMapping();
            this.barrelFiles.set(barrelKeyName, barrelFile);
        }
        barrelFile = this.barrelFiles.get(barrelKeyName);
      };
      return barrelFile;
    }

    static getBarrelFile(path) {
      if (!BarrelFile.isBarrelFilename(path)) return new BarrelFile();
      const packageObj = packageManager.getMainPackageOfModule(path, new BarrelFileManager());
      const barrelFile = packageObj.barrelFileManager.getBarrelFileInner(path);
      return barrelFile;
    }
}

class SpecifierFactory {
    static createSpecifier(type) {
        switch (type) {
          case 'export':
            return new ExportSpecifier();
          case 'import':
            return new ImportSpecifier();
          default:
            throw new Error('Invalid specifier type');
        }
    }
}

class ExportSpecifier {
    constructor() {
        this.esmPath = "";
        this.exportedName = "";
        this.localName = "";
        this.type = "";
    }

    toImportSpecifier() {
        const specifierObj = SpecifierFactory.createSpecifier("import");
        specifierObj.type = this.type;
        specifierObj.esmPath = this.esmPath;
        if (!PathFunctions.isNodeModule(specifierObj.esmPath)) {
          specifierObj.esmPath = ospath.join(process.cwd(), specifierObj.esmPath);
        }
        specifierObj.importedName = this.localName;
        return specifierObj;
    }

    get absEsmPath() {
      return PathFunctions.getAbsolutePath(this.esmPath, resolver.from);
    }

    get cjsPath() {
      const packageObj = packageManager.getMainPackageOfModule(this.absEsmPath, new BarrelFileManager());
      return packageObj.convertESMToCJSPath(this.esmPath);
    }

    get path() {
      const packageObj = packageManager.packages.get(".");
      return packageObj.type === "commonjs" ? this.cjsPath : this.esmPath;
    }
}

class ImportSpecifier {
    constructor() {
        this.esmPath = "";
        this.importedName = "";
        this.localName = "";
        this.type = "";
    }

    toExportSpecifier() {
        const specifierObj = SpecifierFactory.createSpecifier("export");
        specifierObj.type = this.type;
        specifierObj.esmPath = this.esmPath;
        specifierObj.localName = this.importedName;
        return specifierObj;
    }

    get absEsmPath() {
      return PathFunctions.getAbsolutePath(this.esmPath, resolver.from);
    }

    get cjsPath() {
      const packageObj = packageManager.getMainPackageOfModule(this.absEsmPath, new BarrelFileManager());
      return packageObj.convertESMToCJSPath(this.esmPath);
    }

    get path() {
      const packageObj = packageManager.packages.get(".");
      return packageObj.type === "commonjs" ? this.cjsPath : this.esmPath;
    }
}

module.exports = BarrelFileManager;