const ospath = require("path");
const t = require("@babel/types");
const { AST, SkippingCases } = require("./ast");
const { PathFunctions, TypesFunctions } = require("./utils");
const { ResolverFactory } = require("./resolver");
const { Package, PackageDualModule, PackageManager } = require("./packages");
const { FileCacheFactory } = require("./cache");
const pluginOptions = require("./pluginOptions");
const logger = require("./logger");

const packageManager = new PackageManager();

class DefaultPatternExport {
  constructor() {
    this.esmPath = "";
    this.type = "";
    this.localName = "";
    this.exportedName = "";
    this.exportedNamesList = [];
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
      this.exportedNamesList.push(specifierObj.exportedName);
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
        return !TypesFunctions.isObjectEmpty(this.exportMapping) || this.defaultPatternExport.isDefaultPatternCreated;
    }    

    resetProperties() {
      this.exportMapping = {};
      this.defaultPatternExport = new DefaultPatternExport();
      this.importMapping = {};
    }

    getAllDirectPaths() {
      const obj = {};
      for (const exportKey in this.exportMapping) {
        const path = this.exportMapping[exportKey].path;
        obj[path] = [];
      }
      for (const exportedName of this.defaultPatternExport.exportedNamesList) {
        const path = this.getDirectSpecifierObject(exportedName).path;
        obj[path] = [];
      }
      return obj;
    }

    handleExportNamedDeclaration(node) {
        if (node.specifiers.length > 0) {
          node.specifiers.forEach((specifier) => {
            if (SkippingCases.isTypeExport(specifier)) return true;
            let specifierObj = SpecifierFactory.createSpecifier("export");
            specifierObj.exportedName = specifier.exported.name;
            specifierObj.localName = specifier?.local?.name;
            specifierObj.type = AST.getExportSpecifierType(specifier);
            specifierObj.esmPath = PathFunctions.normalizeModulePath(this.path);
            if (node.source) {
              // if node.source exist -> export { abc } from './abc';
              const exportPath = node.source.value;
              const resolver = ResolverFactory.lastCreatedInstance;
              specifierObj.esmPath = PathFunctions.normalizeModulePath(resolver.resolve(exportPath, this.path));
            } else {
              // if node.source doesnt exist -> export { abc };
              const { localName } = specifierObj;
              if (localName in this.importMapping) {
                // import { abc } from './module';
                // export { abc };
                specifierObj = this.importMapping[localName].toExportSpecifier();
                specifierObj.exportedName = specifier.exported.name;
              } else {
                // const name = "name";
                // export { name as differentName };
                specifierObj.localName = specifier.exported.name; 
              }
            }
            const { exportedName } = specifierObj;
            const deepestDirectSpecifier = this.getDeepestDirectSpecifierObject(specifierObj);
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
                specifierObj.esmPath = PathFunctions.normalizeModulePath(this.path);
                specifierObj.localName = property.value.name;
                specifierObj.exportedName = property.value.name;
                const { exportedName } = specifierObj;
                if (!this.defaultPatternExport.isMatchDefaultPattern(specifierObj)) {
                  this.exportMapping[exportedName] = specifierObj;
                }    
              }
            } else {
              const specifierObj = SpecifierFactory.createSpecifier("export");
              specifierObj.type = "named";
              specifierObj.esmPath = PathFunctions.normalizeModulePath(this.path);
              specifierObj.localName = declaration.id.name;
              specifierObj.exportedName = declaration.id.name;
              const { exportedName } = specifierObj;
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
            // import { abc } from './module';
            // export default abc;
            const specifierObj = this.importMapping[localName].toExportSpecifier();
            specifierObj.exportedName = "default";
            const { exportedName } = specifierObj;
            const deepestDirectSpecifier = this.getDeepestDirectSpecifierObject(specifierObj);
            deepestDirectSpecifier.esmPath = PathFunctions.normalizeModulePath(deepestDirectSpecifier.esmPath);
            this.exportMapping[exportedName] = deepestDirectSpecifier;
          } else {
            // const defaultName = "defaultName";
            // export default defaultName;
            let specifierObj = SpecifierFactory.createSpecifier("export");
            specifierObj.localName = node.declaration.name;
            specifierObj.exportedName = "default";
            specifierObj.type = "default";
            specifierObj.esmPath = PathFunctions.normalizeModulePath(this.path);
            const { exportedName } = specifierObj;
            this.exportMapping[exportedName] = specifierObj;
          }
        }
    }
    
    handleExportAllDeclaration(node) {
        // export * from './abc';
        const exportPath = node.source.value;
        const resolver = ResolverFactory.lastCreatedInstance;
        const absoluteExportedPath = resolver.resolve(exportPath, this.path);
        if (!absoluteExportedPath) return;
        const exportedAllFile = new BarrelFile(absoluteExportedPath);
        exportedAllFile.defaultPatternExport.isDefaultPatternCreated = true;
        exportedAllFile.createSpecifiersMapping(true);
        delete exportedAllFile.exportMapping["default"];
        const normalizedExportedPath = PathFunctions.normalizeModulePath(absoluteExportedPath);
        for (const exportKey in exportedAllFile.exportMapping) {
          exportedAllFile.exportMapping[exportKey]["esmPath"] = normalizedExportedPath;
        }
        Object.assign(this.exportMapping, exportedAllFile.exportMapping);
    }
    
    handleImportDeclaration(node) {
        if (SkippingCases.isOneOfSkippingImportCases(node)) return false;
        if (AST.isAnySpecifierExist(node.specifiers)) {
          const importPath = node.source.value;
          const resolver = ResolverFactory.lastCreatedInstance;
          const resolvedPath = resolver.resolve(importPath, this.path);
          if (!resolvedPath) return;
          const normalizedResolvedPath = PathFunctions.normalizeModulePath(resolvedPath);
          node.specifiers.forEach((specifier) => {
              // import {abc, def} from './abc';
              if (SkippingCases.isTypeImport(specifier)) return;
              const specifierObj = SpecifierFactory.createSpecifier("import");
              specifierObj.importedName = specifier?.imported?.name || "default";
              specifierObj.localName = specifier.local.name;
              specifierObj.type = AST.getImportSpecifierType(specifier);
              specifierObj.esmPath = normalizedResolvedPath;
              const { localName } = specifierObj;
              this.importMapping[localName] = specifierObj;
          });  
        }
    }
    
    createSpecifiersMapping(forceFullScan = false) {
        const barrelAST = AST.filenameToAST(this.path);
        barrelAST.program.body.every((node) => {
          if (t.isExportNamedDeclaration(node)) {
            // export { abc } from './abc';
            // export { abc };
            // export function abc(){};
            // export const abc = 5, def = 10;
            if (SkippingCases.isTypeExport(node)) return true;
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
        const { absEsmPath, localName } = specifierObj;
        if (BarrelFile.isBarrelFilename(absEsmPath) && absEsmPath !== this.path) {
          const resolver = ResolverFactory.lastCreatedInstance;
          const resolvedPathObject = resolver.resolve(absEsmPath ,this.path);
          const barrelFile = BarrelFileManagerFacade.getBarrelFile(resolvedPathObject);        
          if (barrelFile.isBarrelFileContent) {
            const deepestSpecifier = Object.assign(new ExportSpecifier(), {...barrelFile.getDirectSpecifierObject(localName)});
            deepestSpecifier.exportedName = specifierObj.exportedName;
            return this.getDeepestDirectSpecifierObject(deepestSpecifier);
          }  
        }
        return specifierObj;
    }

    getDirectSpecifierObject(specifierExportedName) {
      if (this.exportMapping[specifierExportedName]) {
        return this.exportMapping[specifierExportedName];
      }
      if (this.defaultPatternExport.isDefaultPatternCreated) {
        return this.defaultPatternExport.getSpecifier(specifierExportedName);
      }
    }    
}

class BarrelFilesPackage {
    constructor(packageObj) {
      this.packageObj = packageObj;
      this.barrelFiles = new Map();
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

class BarrelFilesPackagesManager {
  constructor() {
      this.barrelFilesByPackage = new Map();
  }

  isPackageExist(packageName) {
    return this.barrelFilesByPackage.has(packageName);
  }

  getPackage(packageName) {
    return this.barrelFilesByPackage.get(packageName);
  }

  getBarrelFilesPackage(path) {
    const packageName = Package.getMainPackageNameFromPath(path);
    if (!this.isPackageExist(packageName)) {
      const packageObj = packageManager.getMainPackageOfModule(path);
      const barrelFilesPackage = new BarrelFilesPackage(packageObj);
      this.barrelFilesByPackage.set(packageName, barrelFilesPackage);
      return barrelFilesPackage;
    } else {
      const barrelFilesPackage = this.getPackage(packageName);
      return barrelFilesPackage;
    }
  }

  dispose() {
    this.barrelFilesByPackage.clear();
  }
}

class BarrelFilesPackageSerializer {
  #convertMapToObject(mapInstance) {
    return Object.fromEntries(mapInstance);
  }

  #convertNativeObjectToBarrelFileObject(value) {
    return Object.assign(new BarrelFile(), value);
  }

  #convertNativeObjectToExportSpecifierObjectMapping(value) {
    const exportMapping = {};
    for (const [exportMappingKey, exportMappingValue] of Object.entries(value)) {
      exportMapping[exportMappingKey] = Object.assign(SpecifierFactory.createSpecifier("export"), exportMappingValue);
    }
    return exportMapping;
  }

  #convertNativeObjectToDefaultPatternExportObject(value) {
    return Object.assign(new DefaultPatternExport(), value);
  }

  #parseBarrelFiles(stringData) {
    const barrelFiles = new Map();
    const barrelFilesObj = JSON.parse(stringData);
    for (const [barrelFilePath, barrelFileObj] of Object.entries(barrelFilesObj)) {
      const barrelFile = this.#convertNativeObjectToBarrelFileObject(barrelFileObj);
      barrelFile.exportMapping = this.#convertNativeObjectToExportSpecifierObjectMapping(barrelFileObj.exportMapping);
      barrelFile.defaultPatternExport = this.#convertNativeObjectToDefaultPatternExportObject(barrelFileObj.defaultPatternExport);
      barrelFiles.set(barrelFilePath, barrelFile);
    }
    return barrelFiles;
  }

  serialize(data) {
    const obj = (data instanceof Map) ? this.#convertMapToObject(data) : data;
    const raw = JSON.stringify(obj, null, 2);
    return raw;
  }

  deserialize(raw) {
    const data = this.#parseBarrelFiles(raw);
    return data;
  }
}

class BarrelFilesPackagesManagerCacheProxy {
  constructor(realService) {
    this.cacheFolderName = "babel-plugin-transform-barrels_cache";
    this.realService = realService;
  }

  get barrelFilesByPackage() {
    return this.realService.barrelFilesByPackage;
  }

  getBarrelFilesPackage(path) {
    const packageName = Package.getMainPackageNameFromPath(path);
    if (PathFunctions.isNodeModule(packageName) && !this.realService.isPackageExist(packageName)) {
      const barrelFilesPackage = this.realService.getBarrelFilesPackage(path);
      const currentPackageVersion = barrelFilesPackage.packageObj.version;
      const packageCache = FileCacheFactory.createPackageCache(packageName, this.cacheFolderName, new BarrelFilesPackageSerializer());
      if (packageCache.isCacheUpdated(currentPackageVersion)) {
        barrelFilesPackage.barrelFiles = packageCache.readCache();
      }
      return barrelFilesPackage;        
    }
    return this.realService.getBarrelFilesPackage(path);
  }

  saveToCacheAllPackagesBarrelFiles() {
    const { barrelFilesByPackage } = BarrelFileManagerFacade.barrelFilesPackagesManager;
    let index = 0;
    const lastIndex = barrelFilesByPackage.size - 1;
    barrelFilesByPackage.forEach((barrelFilesPackage)=>{
      const packageName = barrelFilesPackage.packageObj.name;
      const currentPackageVersion = barrelFilesPackage.packageObj.version;
      const packageCache = FileCacheFactory.createPackageCache(packageName, this.cacheFolderName, new BarrelFilesPackageSerializer());
      if (barrelFilesPackage.packageObj.isNodeModule && !packageCache.isCacheUpdated(currentPackageVersion)) {
        const isLastIteration = index === lastIndex;
        packageCache.saveCache(barrelFilesPackage.barrelFiles, currentPackageVersion, isLastIteration);
      }
      index++;
    })
  }

  dispose() {
    this.saveToCacheAllPackagesBarrelFiles();
    this.realService.dispose();
  }
}

class BarrelFileManagerFacade {
  static #barrelFilesPackagesManager;

  static get barrelFilesPackagesManager() {
    if (!BarrelFileManagerFacade.#barrelFilesPackagesManager) {
      BarrelFileManagerFacade.#barrelFilesPackagesManager = new BarrelFilesPackagesManager();
      if (pluginOptions.options.isCacheEnabled) {
        BarrelFileManagerFacade.#barrelFilesPackagesManager = new BarrelFilesPackagesManagerCacheProxy(BarrelFileManagerFacade.#barrelFilesPackagesManager);
      }    
    }

    return BarrelFileManagerFacade.#barrelFilesPackagesManager;
  }

  static getBarrelFile(path) {
    if (!BarrelFile.isBarrelFilename(path)) return new BarrelFile();
    const barrelFilesPackage = BarrelFileManagerFacade.barrelFilesPackagesManager.getBarrelFilesPackage(path);
    const barrelFile = barrelFilesPackage.getBarrelFile(path);
    return barrelFile;
  }

  static dispose() {
    BarrelFileManagerFacade.barrelFilesPackagesManager.dispose();
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

  get #fromPath() {
    return ospath.resolve("file.js");
  }

  get absEsmPath() {
    const resolver = ResolverFactory.lastCreatedInstance;
    return resolver.resolve(this.esmPath, this.#fromPath);
  }

  get cjsPath() {
    if (!this.absCjsPath) return null;
    return PathFunctions.normalizeModulePath(this.absCjsPath);
  }

  get absCjsPath() {
    try {
      const resolver = ResolverFactory.lastCreatedInstance;
      const packageObj = packageManager.getMainPackageOfModule(this.absEsmPath);
      const packageDualModuleObj = new PackageDualModule(packageObj);
      const convertedCjsPath = packageDualModuleObj.convertESMToCJSPath(this.esmPath);
      const absConvertedCjsPath = resolver.resolve(convertedCjsPath, this.#fromPath, "commonjs");
      return absConvertedCjsPath;  
    } catch (err) {
      return null;
    }
  }

  get path() {
    if (!PathFunctions.isNodeModule(this.esmPath)) {
      return this.absEsmPath;
    } else {
      const packageManager = new PackageManager();
      const localPackageJson = ospath.resolve('package.json');
      const packageObj = packageManager.getPackageJSON(localPackageJson);
      if (packageObj?.type === "module") {
        return this.absEsmPath;
      } else {
        return this.absCjsPath;
      }
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

module.exports = BarrelFileManagerFacade;