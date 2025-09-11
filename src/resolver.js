const ospath = require("path");
const fg = require("fast-glob");
const { PathFunctions, TypesFunctions } = require("./utils");
const { BuildInFileSystem: FileSystem } = require('./buildInFileSystem');
const { PackageManager, PackageDualModule } = require("./packages");

const fileSystem = new FileSystem(PathFunctions);

class Resolver {
    static nodeModulesFolder = {};
    static defaultModuleDirs = ["node_modules"];
    static defaultExtensions = ["", ".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"];

    constructor(executorStrategy) {
        this.resetDefaults();
        this.executorStrategy = executorStrategy;
    }

    resetDefaults() {
      this.aliasObj = {};
      this.from = "";
      this.moduleDirs = [...Resolver.defaultModuleDirs];
      this.absModuleDirs = [];
      this.extensions = [...Resolver.defaultExtensions];
    }

    appendAlias(alias) {
      this.aliasObj = { ...this.aliasObj, ...alias };
    }

    setAlias(alias) {
      this.aliasObj = alias;
    }

    setExtensions(extensions) {
      this.extensions = [...new Set(["", ...extensions])];
    }

    setModuleDirs(moduleDirs) {
      this.moduleDirs = [];
      this.absModuleDirs = [];
      for (const moduleDir of moduleDirs) {
        if (ospath.isAbsolute(moduleDir)) {
          this.absModuleDirs.push(moduleDir);
        } else {
          this.moduleDirs.push(moduleDir);
        }
      }
    }

    loadWorkspacesAlias() {
      const workspacesAlias = this.#getConvertionOfWorkspacesToAlias();
      workspacesAlias && this.appendAlias(workspacesAlias);
    }

    loadAlias(alias) {
      if (this.executorStrategy) {
        const preparedAlias = this.executorStrategy.prepareAlias(alias);
        this.appendAlias(preparedAlias);
      }
    }

    loadExtensions(extensions) {
      if (this.executorStrategy) {
        const preparedExtensions = this.executorStrategy.prepareExtensions(extensions);
        this.setExtensions(preparedExtensions);  
      }
    }  

    loadModuleDirs(moduleDirs) {
      this.setModuleDirs(moduleDirs);
    }

    #getConvertionOfWorkspacesToAlias() {
      const packageManager = new PackageManager();
      const localPackageJson = ospath.resolve('package.json');
      const packageObj = packageManager.getPackageJSON(localPackageJson);
      if (packageObj.workspaces) {
        const workspaces = new PackageJsonWorkspaces(packageObj);
        workspaces.load();  
        return workspaces.getAlias();
      }
    }

    resolve(path, from, moduleType="module") {
        if (this.executorStrategy?.hasSpecialCharInImportPath?.(path)) {
          throw new ResolveError(`The ${path} path from the ${from} file is ignored from resolving because has special character`, ResolveError.subErrors.has_special_character ,path, {...this});
        }
        this.from = from;
        let resolvedPath;
        const fromDir = ospath.dirname(from);
        const originalPath = PathFunctions.isRegularPath(path) ? path : this.convertAliasToOriginal(path);
        resolvedPath = this.#resolveRegularPaths(originalPath, fromDir, moduleType);
        if (resolvedPath) return resolvedPath;
        resolvedPath = this.#resolveNodeModules(originalPath, fromDir, moduleType);
        if (resolvedPath) return resolvedPath;
        resolvedPath = this.#resolveAbsoluteModuleDirs(originalPath, moduleType);
        if (resolvedPath) return resolvedPath;  
        throw new ResolveError(`Unable to resolve the ${path} path from the ${from} file`, ResolveError.subErrors.not_found ,path, {...this});
    }    

    convertAliasToOriginal(path) {
      const { aliasObj } = this;
      const aliases = Object.keys(aliasObj);
      for (const alias of aliases) {
        let aliasDestination = aliasObj[alias];
        const regexPattern = alias;
        const regex = new RegExp(regexPattern);
        if (regex.test(path)) {
          const dollarNumberRegex = new RegExp(/\$([0-9]+)/g);
          if (dollarNumberRegex.test(aliasDestination)) {
            const originalPath = path.replace(regex, aliasDestination);
            return originalPath;
          } else {
            const originalPath = aliasDestination;
            return originalPath;
          }
        }
      }
      return path;
    }

    #resolveRegularPaths(path, fromDir, moduleType) {
      let fixedPath = path;
      if (PathFunctions.isRelativePath(path)) {
        fixedPath = ospath.join(fromDir, path);
      }
      if (ospath.isAbsolute(fixedPath)) {
        return this.#resolveAbsFilePath(fixedPath, moduleType);
      }
    }

    #resolveNodeModules(path, fromDir=process.cwd(), moduleType) {
      let currentDir = fromDir;
      let mainPackage = path.split("/")[0];
      if (Resolver.nodeModulesFolder[mainPackage] !== undefined) {
          if (Resolver.nodeModulesFolder[mainPackage] === null) {
              return null;
          } else {
              const absPath = ospath.join(Resolver.nodeModulesFolder[mainPackage], path);
              return this.#resolveAbsFilePath(absPath, moduleType);
          }
      }
      while (currentDir) {
          if (currentDir.endsWith("node_modules")) {
              currentDir = PathFunctions.removeLastSegment(currentDir);
              continue;
          }
          for (const moduleDir of this.moduleDirs) {
            const nodeModulesPath = ospath.join(currentDir, moduleDir);
            const absPath = ospath.join(nodeModulesPath, path);
            const resolvedPath = this.#resolveAbsFilePath(absPath, moduleType);
            if (resolvedPath) {
                Resolver.nodeModulesFolder[mainPackage] = nodeModulesPath;
                return resolvedPath;
            }
          }
          currentDir = PathFunctions.removeLastSegment(currentDir);  
      }
      Resolver.nodeModulesFolder[mainPackage] = null;
      return null;
    }

    #resolveAbsoluteModuleDirs(absPath, moduleType) {
      for (const absModuleDir of this.absModuleDirs) {
        const path = ospath.join(absModuleDir, absPath);
        const resolvedPath = this.#resolveAbsFilePath(path, moduleType);
        if (resolvedPath) return resolvedPath;
      }
    }

    #resolveAbsFilePath(absolutePath, moduleType) {
      const filePath = this.getFilePathWithExtension(absolutePath);
      if (filePath) return filePath;
      const entryExportPath = this.#getFilePathFromPackageJsonExports(absolutePath, moduleType);
      if (entryExportPath) return entryExportPath;
      const entryPath = this.getFilePathFromPackageJson(absolutePath, moduleType);
      if (entryPath) return entryPath;
      const indexPath = this.getIndexFilePath(absolutePath);
      if (indexPath) return indexPath;
    }

    getFilePathWithExtension(path) {
      const ext = this.extensions.find((ext)=> fileSystem.fileExists(path + ext));
      if (ext === undefined) return null;
      const resolvedPath = path + ext;
      return resolvedPath;
    }  

    getFilePathFromPackageJson(path, moduleType) {
      const packageFilename = "package.json";
      const packagePath = ospath.join(path, packageFilename);
      if (fileSystem.fileExists(packagePath)) {
        const packageManager = new PackageManager();
        const packageObj = packageManager.getPackageJSON(packagePath);
        const moduleShortPath = PackageDualModule.getPackageEntryByType(packageObj, moduleType);
        if (!moduleShortPath) {
          throw new ResolveError(`Unable to resolve from package.json the entry file of module type "${moduleType}" in the ${path} path from the ${this.from} file`, ResolveError.subErrors.entry_file_of_module_type_doesnt_exist ,path, {...this});
        }
        if (!moduleShortPath) return null;
        const absModulePath = ospath.join(path, moduleShortPath);
        const absModuleWithExt = this.getFilePathWithExtension(absModulePath);
        return absModuleWithExt;
      }
    }

    #getFilePathFromPackageJsonExports(path, moduleType) {
      const packageFilename = "package.json";
      const packagePath = ospath.join(path, packageFilename);
      if (fileSystem.fileExists(packagePath)) {
        const packageManager = new PackageManager();
        const packageObj = packageManager.getPackageJSON(packagePath);
        if (!packageObj.exports) return null;
        const normalizedModulePath = PathFunctions.normalizeModulePath(path);
        const moduleRelativePath = PackageDualModule.getPackageExportsEntryByType(packageObj, normalizedModulePath, moduleType);
        if (!moduleRelativePath) return null;
        const moduleAbsPath = ospath.join(path, moduleRelativePath);
        return moduleAbsPath;
      }
    }

    getIndexFilePath(path) {
      let indexFilePath = ospath.join(path, "index");
      indexFilePath = this.getFilePathWithExtension(indexFilePath);
      return indexFilePath;
    }
}

class ResolveError extends Error {
  constructor(message, subError, path, resolverObj) {
      super(message);
      this.name = 'ResolveError';
      this.subError = subError;
      this.path = path;
      this.resolverObj = resolverObj;
  }

  static subErrors = {
    not_found: "not_found_resolved_path",
    has_special_character: "has_special_character",
    entry_file_of_module_type_doesnt_exist: "entry_file_of_module_type_in_packagejson_doesnt_exist"
  }
}

class PackageJsonWorkspaces {
  constructor(packageObj) {
    this.packageObj = packageObj;
    this.aliasObj = {};
  }

  load() {
    this.workspacesToAliases()
  }
  
  getWorkspacesPackageJsons( { startPath = ospath.resolve('.'), workspaces } = {} ) {
    const globWorkspaces = workspaces.map((ws)=> ws + '/**/package.json');
    const packagesJsons = fg.sync(
      globWorkspaces,
      {
        deep: Infinity,
        onlyFiles: true,
        absolute: true,
        cwd: startPath,
        ignore: ['**/node_modules'],
      },
    );
    return packagesJsons;
  }

  workspacesToAliases() {
    const { workspaces } = this.packageObj;
    const packagesJsons = this.getWorkspacesPackageJsons({workspaces});
    const aliases = packagesJsons.reduce((alias, pkgPath) => {
      const packageManager = new PackageManager();
      const packageObj = packageManager.getPackageJSON(pkgPath);
      const pkgName = packageObj.data.name;  
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

class WebpackStrategy {
  
  hasSpecialCharInImportPath(importPath) {
    return (importPath.includes("!") || importPath.includes("?"));
  }

  prepareExtensions(extensions) {
      return extensions;
  }

  prepareAlias(alias) {
      return this.addPrefixRegexToAliases(alias);
  }

  addPrefixRegexToAliases(aliasObj) {
      if (TypesFunctions.isObjectEmpty(aliasObj)) return;
      const newAliasObj = {};
      const aliases = Object.keys(aliasObj);
      for (const alias of aliases) {
        newAliasObj[`^${alias}((?:[\\/]|$))`] = `${aliasObj[alias]}$1`;
      }
      return newAliasObj;  
  }
}

class ViteStrategy {
  hasSpecialCharInImportPath(importPath) {
    return (importPath.startsWith("/") || importPath.startsWith("virtual:") || importPath.includes("?"));
  }

  prepareExtensions(extensions) {
      return extensions;
  }

  prepareAlias(alias) {
      return this.addPrefixRegexToAliases(alias);
  }

  addPrefixRegexToAliases(aliasObj) {
    if (TypesFunctions.isObjectEmpty(aliasObj)) return;
    const newAliasObj = {};
    const aliases = Object.keys(aliasObj);
    for (const alias of aliases) {
      newAliasObj[`^${alias}((?:[\\/]|$))`] = `${aliasObj[alias]}$1`;
    }
    return newAliasObj;  
  }
}

class JestStrategy {
  prepareExtensions(extensions) {
      return extensions.map(ext => ext.startsWith(".") ? ext : `.${ext}`);
  }

  prepareAlias(alias) {
      return Array.isArray(alias) ? Object.fromEntries(alias) : alias;
  }
}

class ResolverFactory {
  static #lastCreatedInstance;

  static get lastCreatedInstance() {
    return ResolverFactory.#lastCreatedInstance;
  }

  static createResolver(type, alias, extensions, moduleDirs) {
    const executorsMap = {
      regular: () => new ResolverWithErrorHandlingProxy(new Resolver()),
      webpack: () => new ResolverWithErrorHandlingProxy(new Resolver(new WebpackStrategy())),
      vite:    () => new ResolverWithErrorHandlingProxy(new Resolver(new ViteStrategy())),
      jest:    () => new ResolverWithErrorHandlingProxy(new Resolver(new JestStrategy())),
      default : () => new Resolver()
    };
    const resolver = (executorsMap[type] || executorsMap.default)();
    resolver.resetDefaults();
    resolver.loadWorkspacesAlias();
    resolver.loadAlias(alias || {});
    resolver.loadExtensions(extensions || Resolver.defaultExtensions);
    resolver.loadModuleDirs(moduleDirs || Resolver.defaultModuleDirs);
    ResolverFactory.#lastCreatedInstance = resolver;
    return resolver;
  }
}

class ResolverWithErrorHandlingProxy {
  constructor(realService) {
    this.realService = realService;
  }

  resolve(...args) {
    try {
      const resolvedPath = this.realService.resolve(...args);
      return resolvedPath;
    } catch(err) {
      if (err.name === "ResolveError") {
        if (err.subError === ResolveError.subErrors.entry_file_of_module_type_doesnt_exist) {
          return null;
        }
      }
      throw err;    
    }  
  }

  loadWorkspacesAlias() {
    return this.realService.loadWorkspacesAlias();
  }

  appendAlias(...args) {
    return this.realService.appendAlias(...args);
  }

  loadAlias(...args) {
    return this.realService.loadAlias(...args);
  }

  loadExtensions(...args) {
    return this.realService.loadExtensions(...args)
  }

  loadModuleDirs(...args) {
    return this.realService.loadModuleDirs(...args)
  }

  get from() {
    return this.realService.from;
  }

  set from(value) {
    this.realService.from = value;
  }

  resetDefaults() {
    this.realService.resetDefaults();
  }
}

module.exports = { ResolverFactory };