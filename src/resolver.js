const ospath = require("path");
const PathFunctions = require("./path");

let instance;

class Resolver {
    constructor() {
        this.aliasObj = {};
        this.from = "";
        if (instance) {
          throw new Error("You can only create one instance!");
        }
        instance = this;  
    }

    getTargetPathType(target, from) {
      if (!PathFunctions.isNodeModule(from) && PathFunctions.isNodeModule(target)) {
        return "CJS";
      } else {
        return "ESM";
      }
    }

    resolve(path, from) {
        const originalPath = PathFunctions.isRegularPath(path) ? path : this.convertAliasToOriginal(path);
        const fromDir = ospath.dirname(from);
        const absolutePath = PathFunctions.getAbsolutePath(originalPath, fromDir);
        if (!absolutePath) return;
        const extensions = ["", ".js", ".jsx", ".ts", ".tsx"];
        const filePath = this.getFilePathWithExtension(absolutePath, extensions);
        if (filePath) {
          const resolvedPath = new ResolvedPath();
          if (this.getTargetPathType(absolutePath, from) === "ESM") {
            resolvedPath.absEsmFile = filePath;
          } else {
            resolvedPath.absCjsFile = filePath;
          }
          return resolvedPath;
        }
        const entryPath = this.getFilePathFromPackageJson(absolutePath);
        if (entryPath) return entryPath;
        const indexPath = this.getIndexFilePath(absolutePath);
        if (indexPath) {
          const resolvedPath = new ResolvedPath();
          if (this.getTargetPathType(absolutePath, from) === "ESM") {
            resolvedPath.absEsmFile = indexPath;
          } else {
            resolvedPath.absCjsFile = indexPath;
          }
          return resolvedPath;
        };
    }    

    getFilePathWithExtension(path, extensions) {
      const ext = extensions.find((ext)=> PathFunctions.fileExists(path + ext));
      if (ext === undefined) return null;
      const resolvedPath = path + ext;
      return resolvedPath;
    }  

    getFilePathFromPackageJson(path) {
      const packageFilename = "package.json";
      const packagePath = ospath.join(path, packageFilename);
      if (PathFunctions.fileExists(packagePath)) {
          const configPackage = require(packagePath);
          const { main, type, module } = configPackage;
          const cjsModule = type !== "module" && main;
          const esmModule = type === "module" ? main : module;
          const absCjsModule = cjsModule && ospath.join(path, cjsModule);
          const absEsmModule = esmModule && ospath.join(path, esmModule);
          const resolvedPath = new ResolvedPath();
          const extensions = ["", ".js", ".jsx", ".ts", ".tsx"];
          resolvedPath.absCjsFile = absCjsModule && this.getFilePathWithExtension(absCjsModule, extensions)
          resolvedPath.absEsmFile = absEsmModule && this.getFilePathWithExtension(absEsmModule, extensions)
          return resolvedPath;
      }
    }  

    getIndexFilePath(path) {
      const extensions = [".js", ".jsx", ".ts", ".tsx"];
      let indexFilePath = ospath.join(path, "index");
      indexFilePath = this.getFilePathWithExtension(indexFilePath, extensions);
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
  constructor(absEsmFile, absCjsFile) {
    this.absEsmFile = absEsmFile || "";
    this.absCjsFile = absCjsFile || "";
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