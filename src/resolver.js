const ospath = require("path");
const PathFunctions = require("./path");
const { packageManager } = require("./packages");

let instance;
const defaultModulesDirs = ["node_modules"];
const defaultExtensions = ["", ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"];
const nodeModulesFolder = {};

class Resolver {
    constructor() {
        this.resetDefaults();
        if (instance) {
          throw new Error("You can only create one instance!");
        }
        instance = this;  
    }

    resetDefaults() {
      this.aliasObj = {};
      this.from = "";
      this.modulesDirs = defaultModulesDirs;
      this.absModuleDirs = [];
      this.extensions = defaultExtensions;
    }

    setExtensions(extensions) {
      this.extensions = extensions;
      this.extensions.unshift("");
    }

    setModulesDirs(modulesDirs) {
      this.modulesDirs = [];
      this.absModuleDirs = [];
      for (const moduleDir of modulesDirs) {
        if (ospath.isAbsolute(moduleDir)) {
          this.absModuleDirs.push(moduleDir);
        } else {
          this.modulesDirs.push(moduleDir);
        }
      }
    }

    resolve(path, from) {
        let resolvedPath;
        const fromDir = ospath.dirname(from);
        const originalPath = PathFunctions.isRegularPath(path) ? path : this.convertAliasToOriginal(path);
        resolvedPath = this.resolveRegularPaths(originalPath, fromDir);
        if (resolvedPath) return resolvedPath;
        resolvedPath = this.resolveNodeModules(originalPath, fromDir);
        if (resolvedPath) return resolvedPath;
        resolvedPath = this.resolveAbsoluteModuleDirs(originalPath, fromDir);
        if (resolvedPath) return resolvedPath;
        throw new ResolveError(`Unable to resolve the ${path} path from the ${from} file`, path, {...this});
    }    

    resolveRegularPaths(path, fromDir) {
      let fixedPath = path;
      if (PathFunctions.isRelativePath(path)) {
        fixedPath = ospath.join(fromDir, path);
      }
      if (ospath.isAbsolute(fixedPath)) {
        return this.resolveAbsFilePath(fixedPath, fromDir);
      }
    }

    resolveAbsoluteModuleDirs(absPath, fromDir) {
      for (const absModuleDir of this.absModuleDirs) {
        const path = ospath.join(absModuleDir, absPath);
        const resolvedPath = this.resolveAbsFilePath(path, fromDir);
        if (resolvedPath) return resolvedPath;
      }
    }

    resolveNodeModules(path, fromDir=process.cwd()) {
      let currentDir = fromDir;
      let mainPackage = path.split("/")[0];
      if (nodeModulesFolder[mainPackage] !== undefined) {
          if (nodeModulesFolder[mainPackage] === null) {
              return null;
          } else {
              const absPath = ospath.join(nodeModulesFolder[mainPackage], path);
              return this.resolveAbsFilePath(absPath, fromDir);
          }
      }
      while (currentDir) {
          if (currentDir.endsWith("node_modules")) {
              currentDir = PathFunctions.removeLastSegment(currentDir);
              continue;
          }
          for (const modulesDir of this.modulesDirs) {
            const nodeModulesPath = ospath.join(currentDir, modulesDir);
            const absPath = ospath.join(nodeModulesPath, path);
            const resolvedPath = this.resolveAbsFilePath(absPath, fromDir);
            if (resolvedPath) {
                nodeModulesFolder[mainPackage] = nodeModulesPath;
                return resolvedPath;
            }
          }
          currentDir = PathFunctions.removeLastSegment(currentDir);  
        }
      nodeModulesFolder[mainPackage] = null;
      return null;
    }

    resolveAbsFilePath(absolutePath, fromDir) {
      const filePath = this.getFilePathWithExtension(absolutePath);
      if (filePath) {
        const resolvedDualPath = ResolvedPath.createDualResolvedPath(filePath, fromDir, absolutePath);
        return resolvedDualPath;
      }
      const normalizedModulePath = PathFunctions.normalizeModulePath(absolutePath)
      const entryPath = this.getFilePathFromPackageJson(absolutePath, normalizedModulePath);
      if (entryPath) return entryPath;
      const indexPath = this.getIndexFilePath(absolutePath);
      if (indexPath) {
        const resolvedDualPath = ResolvedPath.createDualResolvedPath(indexPath, fromDir, absolutePath);
        return resolvedDualPath;
      };
    }

    getFilePathWithExtension(path) {
      const ext = this.extensions.find((ext)=> PathFunctions.fileExists(path + ext));
      if (ext === undefined) return null;
      const resolvedPath = path + ext;
      return resolvedPath;
    }  

    getFilePathFromPackageJson(path, importPath) {
      const packageFilename = "package.json";
      const packagePath = ospath.join(path, packageFilename);
      if (PathFunctions.fileExists(packagePath)) {
          const packageObj = packageManager.getPackageJSON(packagePath);
          const { main, type, module } = packageObj;
          const exportsObj = packageObj.resolveExports(importPath);
          const cjsModule = exportsObj?.absCjsFile || (type !== "module" && main);
          const esmModule = exportsObj?.absEsmFile || (type === "module" ? main : module);
          const absCjsModule = cjsModule && ospath.join(path, cjsModule);
          const absEsmModule = esmModule && ospath.join(path, esmModule);
          const absCjsModuleWithExt = absCjsModule ? this.getFilePathWithExtension(absCjsModule) : "";
          const absEsmModuleWithExt = absEsmModule ? this.getFilePathWithExtension(absEsmModule) : "";
          const packageJsonExports = !!exportsObj;
          const resolvedPath = new ResolvedPath(importPath, absEsmModuleWithExt, absCjsModuleWithExt, packageJsonExports);
          return resolvedPath;
      }
    }  

    getIndexFilePath(path) {
      let indexFilePath = ospath.join(path, "index");
      indexFilePath = this.getFilePathWithExtension(indexFilePath);
      return indexFilePath;
    }  

    convertAliasToOriginal(path) {
      const { aliasObj } = this;
      const aliases = Object.keys(aliasObj);
      for (const alias of aliases) {
        let aliasDestination = aliasObj[alias];
        const regexPattern = alias;
        const regex = new RegExp(regexPattern);
        if (regex.test(path)) {
          const originalPath = path.replace(regex, aliasDestination);
          return originalPath;
        }
      }
      return path;
    }    

    appendAlias(alias) {
        this.aliasObj = { ...this.aliasObj, ...alias };
    }
}

class ResolvedPath {
  static isExtensionFile(path, ext) {
    const extFilePathRegex = new RegExp(`\.(${ext})$`);
    return extFilePathRegex.test(path.toLowerCase());  
  }

  static getTargetPathType(target, from) {
    if (ResolvedPath.isExtensionFile(target, "cjs") || (!PathFunctions.isNodeModule(from) && PathFunctions.isNodeModule(target) && !ResolvedPath.isExtensionFile(target, "mjs"))) {
      return "CJS";
    } else {
      return "ESM";
    }
  }

  static createDualResolvedPath(filePath, from, absolutePath) {
    const resolvedDualPath = new ResolvedPath();
    if (ResolvedPath.getTargetPathType(filePath, from) === "ESM") {
      resolvedDualPath.absEsmFile = filePath;
    } else {
      resolvedDualPath.absCjsFile = filePath;
    }
    resolvedDualPath.originalPath = PathFunctions.normalizeModulePath(absolutePath);
    return resolvedDualPath;
  }

  constructor(originalPath, absEsmFile, absCjsFile, packageJsonExports) {
    this.originalPath = originalPath || "";
    this.absEsmFile = absEsmFile || "";
    this.absCjsFile = absCjsFile || "";
    this.packageJsonExports = packageJsonExports || false;
  }

  get esmFile() {
    return PathFunctions.normalizeModulePath(this.absEsmFile);
  }

  get cjsFile() {
    return PathFunctions.normalizeModulePath(this.absCjsFile);
  }

  get absEsmFolder() {
    return ospath.dirname(this.absEsmFile);
  }

  get absCjsFolder() {
    return ospath.dirname(this.absCjsFile);
  }

  get isNodeModule() {
    return (
      PathFunctions.isNodeModule(this.absEsmFile) || 
      PathFunctions.isNodeModule(this.absCjsFile)
    )
  }

  get isDual() {
    return (this.absEsmFile && this.absCjsFile);
  }
}

class ResolveError extends Error {
  constructor(message, path, resolverObj) {
      super(message);
      this.name = 'ResolveError';
      this.path = path;
      this.resolverObj = resolverObj;
  }
}

const singletonResolver = new Resolver();

module.exports = singletonResolver;