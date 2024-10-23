const ospath = require("path");
const t = require("@babel/types");
const AST = require("./ast");
const PathFunctions = require("./path");
const resolver = require("./resolver");
const { Package, packageManager } = require("./packages");
const Cache = require("./cache");
const pluginOptions = require("./pluginOptions");

class DefaultPatternExport {
  constructor() {
    this.esmPath = "";
    this.type = "";
    this.localName = "";
    this.exportedName = "";
    this.isDefaultPatternCreated = false;
    this.numOfDefaultPatternUsed = 0;
    this.firstSpecifier = undefined;
  }

  getSpecifierPattern(specifierObj) {
    const esmPath = this.getEsmPathPattern(specifierObj.esmPath, specifierObj.exportedName);
    const type = specifierObj.type;
    const localName = type !=="namespace" && specifierObj.localName.replaceAll(specifierObj.exportedName, "${specifier}");
    const exportedName = specifierObj.exportedName.replaceAll(specifierObj.exportedName, "${specifier}");
    return { esmPath, type, localName, exportedName };
  }

  createDefaultPattern(specifierObj) {
    const specifierPattern = this.getSpecifierPattern(specifierObj);
    if (!specifierPattern.esmPath.includes("${specifier}")) return;
    this.firstSpecifier = specifierObj;
    this.esmPath = specifierPattern.esmPath;
    this.type = specifierPattern.type;
    this.localName = specifierPattern.localName;
    this.exportedName = specifierPattern.exportedName;
  }

  getEsmPathPattern(esmPath, specifierName) {
    const regexPattern = `\\b${specifierName}\\b`;
    const regex = new RegExp(regexPattern, "g");
    const pathPattern = esmPath.replace(regex, "${specifier}");
    return pathPattern;
  }

  isMatchDefaultPattern(specifierObj) {
    if (!this.isDefaultPatternCreated) {
      this.isDefaultPatternCreated = true;
      this.createDefaultPattern(specifierObj);
    }
    if (this.esmPath === "") return false;
    const specifierPattern = this.getSpecifierPattern(specifierObj);
    const isMatch = specifierPattern.esmPath === this.esmPath && 
                    specifierPattern.type === this.type &&
                    specifierPattern.exportedName === this.exportedName &&
                    specifierPattern.localName === this.localName;
    if (isMatch) {
      this.numOfDefaultPatternUsed += 1;
    }
    return isMatch;
  }

  getSpecifier(exportedName) {
    const specifierObj = SpecifierFactory.createSpecifier("export");
    specifierObj.esmPath = this.esmPath.replaceAll("${specifier}", exportedName);
    specifierObj.type = this.type;
    specifierObj.localName = this.localName.replaceAll("${specifier}", exportedName);
    specifierObj.exportedName = this.exportedName.replaceAll("${specifier}", exportedName);
    return specifierObj;
  }
}

class BarrelFile {
    constructor(path) {
        this.path = path;
        this.exportMapping = {};
        this.defaultPatternExport = new DefaultPatternExport();
        this.importMapping = {};
    }

    static isBarrelFilename(path) {
      const barrelFileRegex = new RegExp(`index\.(js|mjs|jsx|ts|tsx)$`);
      return barrelFileRegex.test(path.toLowerCase());  
    }    

    get isBarrelFileContent() {
        return !PathFunctions.isObjectEmpty(this.exportMapping) || this.defaultPatternExport.isDefaultPatternCreated;
    }    

    resetProperties() {
      this.exportMapping = {};
      this.defaultPatternExport = new DefaultPatternExport();
      this.importMapping = {};
    }

    handleExportNamedDeclaration(node) {
        if (node.specifiers.length > 0) {
          node.specifiers.forEach((specifier) => {
            let specifierObj = SpecifierFactory.createSpecifier("export");
            specifierObj.exportedName = specifier.exported.name;
            specifierObj.localName = specifier?.local?.name;
            specifierObj.type = AST.getSpecifierType(specifier);
            specifierObj.esmPath = this.path;
            if (node.source) {
              // if node.source exist -> export { abc } from './abc';
              const exportPath = node.source.value;
              specifierObj.esmPath = resolver.resolve(exportPath, this.path).absEsmFile;
            } else {
              // if node.source doesnt exist -> export { abc };
              const { localName } = specifierObj;
              if (localName in this.importMapping) {
                specifierObj = this.importMapping[localName].toExportSpecifier();
                specifierObj.exportedName = specifier.exported.name;
              }
            }
            const { exportedName } = specifierObj;
            const deepestDirectSpecifier = this.getDeepestDirectSpecifierObject(specifierObj);
            deepestDirectSpecifier.esmPath = PathFunctions.normalizeModulePath(deepestDirectSpecifier.esmPath);
            if (!this.defaultPatternExport.isMatchDefaultPattern(deepestDirectSpecifier)) {
              this.exportMapping[exportedName] = deepestDirectSpecifier;
            }
          });
        };
        if (node.declaration) {
          const declarations = node.declaration.declarations || [node.declaration];
          // if declaration exists -> export function abc(){};
          // if declaration.declarations exists -> export const abc = 5, def = 10;
          declarations.forEach((declaration) => {
            if (t.isObjectPattern(declaration.id)) {
              for (const property of declaration.id.properties) {
                const specifierObj = SpecifierFactory.createSpecifier("export");
                specifierObj.type = "named";
                specifierObj.esmPath = this.path;      
                specifierObj.localName = property.value.name;
                specifierObj.exportedName = property.value.name;
                const { exportedName } = specifierObj;
                specifierObj.esmPath = PathFunctions.normalizeModulePath(specifierObj.esmPath);
                if (!this.defaultPatternExport.isMatchDefaultPattern(specifierObj)) {
                  this.exportMapping[exportedName] = specifierObj;
                }    
              }
            } else {
              const specifierObj = SpecifierFactory.createSpecifier("export");
              specifierObj.type = "named";
              specifierObj.esmPath = this.path;    
              specifierObj.localName = declaration.id.name;
              specifierObj.exportedName = declaration.id.name;
              const { exportedName } = specifierObj;
              specifierObj.esmPath = PathFunctions.normalizeModulePath(specifierObj.esmPath);
              if (!this.defaultPatternExport.isMatchDefaultPattern(specifierObj)) {
                this.exportMapping[exportedName] = specifierObj;
              }  
            }
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
            const deepestDirectSpecifier = this.getDeepestDirectSpecifierObject(specifierObj);
            deepestDirectSpecifier.esmPath = PathFunctions.normalizeModulePath(deepestDirectSpecifier.esmPath);
            this.exportMapping[exportedName] = deepestDirectSpecifier;
          }
        }
    }
    
    handleExportAllDeclaration(node) {
        // export * from './abc';
        const exportPath = node.source.value;
        let absoluteExportedPath = resolver.resolve(exportPath, this.path).absEsmFile;
        const exportedAllFile = new BarrelFile(absoluteExportedPath);
        exportedAllFile.defaultPatternExport.isDefaultPatternCreated = true;
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
              this.resetProperties();
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
              this.resetProperties();
              return false;
            }
            // import {abc, def} from './abc';
            this.handleImportDeclaration(node);
          } else {
            if (forceFullScan) {
              return true;
            } else {
              this.resetProperties();
              return false;  
            }
          }
          return true;
        });
        this.path = PathFunctions.normalizeModulePath(this.path);
        if (this.defaultPatternExport.numOfDefaultPatternUsed === 1) {
          this.exportMapping[this.defaultPatternExport.firstSpecifier.exportedName] = this.defaultPatternExport.firstSpecifier;
          this.defaultPatternExport = new DefaultPatternExport();
        }
        delete this.defaultPatternExport.numOfDefaultPatternUsed;
        delete this.defaultPatternExport.firstSpecifier;
        delete this.importMapping;
    }    

    getDeepestDirectSpecifierObject(specifierObj) {
        const { esmPath, localName } = specifierObj;
        if (BarrelFile.isBarrelFilename(esmPath) && esmPath !== this.path) {
          const absEsmFile = resolver.resolve(esmPath ,this.path).absEsmFile;
          const barrelFile = BarrelFileManagerFacade.getBarrelFile(absEsmFile);
          if (barrelFile.isBarrelFileContent) {
            const deepestSpecifier = barrelFile.getDirectSpecifierObject(localName);
            return this.getDeepestDirectSpecifierObject(deepestSpecifier);
          }  
        }
        return specifierObj;
    }

    getDirectSpecifierObject(specifierExportedName) {
      return this.exportMapping[specifierExportedName] ?
          this.exportMapping[specifierExportedName] : 
          this.defaultPatternExport.getSpecifier(specifierExportedName);
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
      barrelFile.defaultPatternExport = Object.assign(new DefaultPatternExport(), value.defaultPatternExport);
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
    return PathFunctions.getAbsolutePath(this.esmPath, resolver.from, resolver.modulesDirs);
  }

  get cjsPath() {
    const packageObj = packageManager.getMainPackageOfModule(this.absEsmPath);
    return packageObj.convertESMToCJSPath(this.esmPath);
  }

  get absCjsPath() {
    return PathFunctions.getAbsolutePath(this.cjsPath, resolver.from, resolver.modulesDirs);
  }

  get path() {
    const packageObj = packageManager.getNearestPackageJsonContent();
    if (!PathFunctions.isNodeModule(this.esmPath) || packageObj?.type === "module") {
      return this.esmPath;
    } else {
      if (!PathFunctions.fileExists(this.absCjsPath)) return null;
      return this.cjsPath;
    }
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