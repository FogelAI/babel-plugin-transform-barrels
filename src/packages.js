const ospath = require("path");
const PathFunctions = require("./path");

class Package {
    constructor(path, barrelFileManager) {
        this.path = path;
        this.name = this.getHighestPackageName();
        this.data;
        this.barrelFileManager = barrelFileManager;
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
        return this.data.main && ospath.join(this.name, this.data.main);
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

    get type() {
        return this.data.type || "commonjs";
    }

    convertESMToCJSPath(path) {
        return path.replace(this.esmFolder, this.cjsFolder);
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
  
    getMainPackageOfModule(modulePath, barrelFileManager) {
      const moduleDir = ospath.dirname(modulePath)
      const mainPackageJSONFile = Package.getMainPackageJSON(moduleDir);
      let packageObj = new Package(mainPackageJSONFile, barrelFileManager);
      if (!this.packages.has(packageObj.name)) {
        packageObj.load();
        this.packages.set(packageObj.name, packageObj);
      }
      packageObj = this.packages.get(packageObj.name);
      return packageObj;
    };
}

const singletonPackageManager = new PackageManager();

module.exports = singletonPackageManager;