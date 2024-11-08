const ospath = require("path");
const PathFunctions = require("./path");
const { packageManager } = require("./packages");

let instance;
const defaultModulesDirs = ["node_modules"];
const defaultExtensions = ["", ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"];

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
      this.extensions = defaultExtensions;
    }

    setExtensions(extensions) {
      this.extensions = extensions;
      this.extensions.unshift("");
    }

    setModulesDirs(modulesDirs) {
      this.modulesDirs = modulesDirs;
    }

    isExtensionFile(path, ext) {
      const extFilePathRegex = new RegExp(`\.(${ext})$`);
      return extFilePathRegex.test(path.toLowerCase());  
    }

    getTargetPathType(target, from) {
      if (this.isExtensionFile(target, "cjs") || (!PathFunctions.isNodeModule(from) && PathFunctions.isNodeModule(target) && !this.isExtensionFile(target, "mjs"))) {
        return "CJS";
      } else {
        return "ESM";
      }
    }

    resolve(path, from) {
        const originalPath = PathFunctions.isRegularPath(path) ? path : this.convertAliasToOriginal(path);
        const fromDir = ospath.dirname(from);
        const absolutePath = PathFunctions.getAbsolutePath(originalPath, fromDir, this.modulesDirs);
        if (!absolutePath) return;
        const filePath = this.getFilePathWithExtension(absolutePath);
        if (filePath) {
          const resolvedPath = new ResolvedPath();
          if (this.getTargetPathType(filePath, from) === "ESM") {
            resolvedPath.absEsmFile = filePath;
          } else {
            resolvedPath.absCjsFile = filePath;
          }
          resolvedPath.originalPath = path;
          return resolvedPath;
        }
        const entryPath = this.getFilePathFromPackageJson(absolutePath, originalPath);
        if (entryPath) return entryPath;
        const indexPath = this.getIndexFilePath(absolutePath);
        if (indexPath) {
          const resolvedPath = new ResolvedPath();
          if (this.getTargetPathType(indexPath, from) === "ESM") {
            resolvedPath.absEsmFile = indexPath;
          } else {
            resolvedPath.absCjsFile = indexPath;
          }
          resolvedPath.originalPath = path;
          return resolvedPath;
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
          const resolvedPath = new ResolvedPath();
          resolvedPath.absCjsFile = absCjsModule ? this.getFilePathWithExtension(absCjsModule) : ""
          resolvedPath.absEsmFile = absEsmModule ? this.getFilePathWithExtension(absEsmModule) : ""
          resolvedPath.packageJsonExports = !!exportsObj;
          resolvedPath.originalPath = importPath;
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

const singletonResolver = new Resolver();

module.exports = singletonResolver;