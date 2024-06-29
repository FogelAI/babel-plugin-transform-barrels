const ospath = require("path");
const t = require("@babel/types");
const AST = require("./ast");
const PathFunctions = require("./path");
const resolver = require("./resolver");
const { Package, packageManager } = require("./packages");
const Cache = require("./cache");
const pluginOptions = require("./pluginOptions");

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
          const barrelFile = BarrelFileManagerFacade.getBarrelFile(esmPath);
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

class BarrelFilesPackage {
    constructor(packageObj, cache) {
      this.packageObj = packageObj;
      this.cache = cache;
      this.barrelFiles = this.cache?.data || new Map();
    }

    getBarrelFile(path) {
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
}

class BarrelFilesPackageCacheStrategy {
  customizedParsingMethod(cacheData) {
    const barrelFiles = new Map();
    for (const [key, value] of Object.entries(cacheData)) {
      const barrelFile = Object.assign(new BarrelFile(), value);
      for (const [exportMappingKey, exportMappingValue] of Object.entries(value.exportMapping)) {
        barrelFile.exportMapping[exportMappingKey] = Object.assign(SpecifierFactory.createSpecifier("export"), exportMappingValue);
      }
      barrelFiles.set(key, barrelFile);
    }
    return barrelFiles;
  }
}

class BarrelFilesPackageCacheFacade {
  static getCachePackageFileName(packageName) {
    if (PathFunctions.isNodeModule(packageName)) {
      return `${packageName}.json`.replace("\\","_");
    } else {
      return `local.json`;
    }
  }  

  static createCache(packageObj) {
    const { isCacheEnabled } = pluginOptions.options;
    if (!isCacheEnabled || !PathFunctions.isNodeModule(packageObj.path)) return;
    const cacheFileName = BarrelFilesPackageCacheFacade.getCachePackageFileName(packageObj.name);
    const packagesVersionsFileName = 'packagesVersions.json'
    const cacheFolderName = "babel-plugin-transform-barrels_cache"
    const cache = new Cache(cacheFileName, cacheFolderName, packagesVersionsFileName, packageObj.name, packageObj.version, new BarrelFilesPackageCacheStrategy());
    if (cache.isCacheUpdated) {
      cache.loadCacheData();  
    }
    return cache;
  }
}


class BarrelFilesPackagesManager {
  constructor() {
    this.barrelFilesByPackage = new Map();
  }

  getBarrelFileManager(path) {
    const moduleDir = ospath.dirname(path)
    const mainPackagePath = Package.getHighestParentPackageDir(moduleDir);
    const packageName = PathFunctions.normalizeModulePath(mainPackagePath);
    let barrelFilesPackage;
    if (!this.barrelFilesByPackage.has(packageName)) {
      const packageObj = packageManager.getMainPackageOfModule(path);
      const cache = BarrelFilesPackageCacheFacade.createCache(packageObj);
      barrelFilesPackage = new BarrelFilesPackage(packageObj, cache);
      this.barrelFilesByPackage.set(packageName, barrelFilesPackage);
    }
    barrelFilesPackage = this.barrelFilesByPackage.get(packageName);
    return barrelFilesPackage;
  }
}

class BarrelFileManagerFacade {
  static getBarrelFile(path) {
    if (!BarrelFile.isBarrelFilename(path)) return new BarrelFile();
    const barrelFilesPackage = barrelFilesPackagesManager.getBarrelFileManager(path);
    const barrelFile = barrelFilesPackage.getBarrelFile(path);
    return barrelFile;
  }

  static saveToCacheAllPackagesBarrelFiles() {
    const { isCacheEnabled } = pluginOptions.options;
    barrelFilesPackagesManager.barrelFilesByPackage.forEach((barrelFilesPackage)=>{
      if (isCacheEnabled && PathFunctions.isNodeModule(barrelFilesPackage.packageObj.path) && !barrelFilesPackage.cache.isCacheUpdated) {
        barrelFilesPackage.cache.saveCache(barrelFilesPackage.barrelFiles);
      }
    })
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

class Specifier {
  constructor() {
      this.esmPath = "";
      this.type = "";
      this.localName = "";
  }

  get absEsmPath() {
    return PathFunctions.getAbsolutePath(this.esmPath, resolver.from);
  }

  get cjsPath() {
    const packageObj = packageManager.getMainPackageOfModule(this.absEsmPath);
    return packageObj.convertESMToCJSPath(this.esmPath);
  }

  get path() {
    const packageObj = packageManager.getNearestPackageJsonContent();
    return packageObj?.type === "module" ? this.esmPath : this.cjsPath;
  }
}

class ExportSpecifier extends Specifier {
    constructor() {
        super();
        this.exportedName = "";
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
}

class ImportSpecifier extends Specifier {
    constructor() {
        super();
        this.importedName = "";
    }

    toExportSpecifier() {
        const specifierObj = SpecifierFactory.createSpecifier("export");
        specifierObj.type = this.type;
        specifierObj.esmPath = this.esmPath;
        specifierObj.localName = this.importedName;
        return specifierObj;
    }
}

const barrelFilesPackagesManager = new BarrelFilesPackagesManager();

module.exports = BarrelFileManagerFacade;