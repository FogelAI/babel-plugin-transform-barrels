const ospath = require("path");
const PathFunctions = require("./path");
const resolver = require("./resolver");

class Package {
    constructor(path) {
        this.path = path;
        this.name = this.getHighestPackageName();
        this.data;
    }

    static getHighestParentPackageDir(path) {
        if (!PathFunctions.isNodeModule(path)) return process.cwd();
        let highestPackageJsonDir;
        let currentDir = path;
        let lastSegment;
        while (currentDir && lastSegment!=="node_modules") {
            const packagePath = ospath.join(currentDir, "package.json");
            if (PathFunctions.fileExists(packagePath)) {
                highestPackageJsonDir = currentDir;
            }
            currentDir = currentDir.substring(0, currentDir.lastIndexOf(ospath.sep));
            lastSegment = currentDir.split(ospath.sep).pop();
        }
        return highestPackageJsonDir;
    }  

    static getMainPackageJSON(path) {
        const HighestParentPackageDir = Package.getHighestParentPackageDir(path);
        const HighestParentPackagePath = ospath.join(HighestParentPackageDir, "package.json");
        return HighestParentPackagePath;
    }

    removeNodeModulesPath(path) {
        const PackageDirName = path.replace(/.:.+node_modules[\/|\\]/g,"");
        return PackageDirName;
    }

    getHighestPackageName() {
        if (!PathFunctions.isNodeModule(this.path)) return ".";
        const HighestParentPackageDir = Package.getHighestParentPackageDir(this.path);
        return this.removeNodeModulesPath(HighestParentPackageDir);
    }

    get cjsEntry() {
        if (this.data.main) {
            const cjsFolder = ospath.dirname(this.path);
            const fullPath = resolver.resolve(ospath.join(cjsFolder, this.data.main), this.path).esmFile;
            return PathFunctions.normalizeModulePath(fullPath);
        }
    }

    get esmEntry() {
        return this.data.module && ospath.join(this.name, this.data.module);
    }

    get cjsFolder() {
        return this.cjsEntry && ospath.dirname(this.cjsEntry)
    }

    get esmFolder() {
        return this.esmEntry && ospath.dirname(this.esmEntry)
    }

    get cjsExtension() {
        return this.cjsEntry && ospath.extname(this.cjsEntry)
    }

    get esmExtension() {
        return this.esmEntry && ospath.extname(this.esmEntry)
    }

    get type() {
        return this.data.type || "commonjs";
    }

    get version() {
        return this.data.version;
    }

    convertESMToCJSPath(path) {
        const replacedPathExt = PathFunctions.replaceFileExtension(path, this.cjsExtension);
        return replacedPathExt.replace(this.esmFolder, this.cjsFolder);
    }

    load() {
        const packageJsonObj = require(this.path);
        this.data = packageJsonObj;
    }
}

let instance;

class PackageManager {
    constructor() {
      this.packages = new Map();
      if (instance) {
        throw new Error("You can only create one instance!");
      }
      instance = this;
    }

    getNearestPackageJsonPath() {
        let currentDir = ospath.dirname(resolver.from);
        while (currentDir) {
            const packagePath = ospath.join(currentDir, "package.json");
            if (PathFunctions.fileExists(packagePath)) {
                return packagePath;
            }
            currentDir = currentDir.substring(0, currentDir.lastIndexOf(ospath.sep));
        }
    }

    getNearestPackageJsonContent() {
        const packagePath = this.getNearestPackageJsonPath();
        if (!packagePath) return "";
        const packageObj = require(packagePath);
        return packageObj;
    }

    getMainPackageOfModule(modulePath) {
      const moduleDir = ospath.dirname(modulePath)
      const mainPackageJSONFile = Package.getMainPackageJSON(moduleDir);
      let packageObj = new Package(mainPackageJSONFile);
      if (!this.packages.has(packageObj.name)) {
        packageObj.load();
        this.packages.set(packageObj.name, packageObj);
      }
      packageObj = this.packages.get(packageObj.name);
      return packageObj;
    };
}

const singletonPackageManager = new PackageManager();

module.exports = { Package, packageManager: singletonPackageManager };