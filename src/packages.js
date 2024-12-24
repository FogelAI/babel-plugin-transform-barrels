const ospath = require("path");
const PathFunctions = require("./path");

class Package {
    constructor(path) {
        this.path = path;
        this.name = this.getPackageName();
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

    getPackageName() {
        if (!PathFunctions.isNodeModule(this.path)) return ".";
        const packageDir = ospath.dirname(this.path);
        return this.removeNodeModulesPath(packageDir);
    }

    get exports() {
        return this.data.exports;
    }

    set exports(value) {
        this.data.exports = value;
    }

    resolveExports(importPath) {
        if (!this.exports) return null;
        for (const [exportKey, exportValue] of Object.entries(this.exports)) {
            const normalizedExportKey = ospath.join(this.name, exportKey);
            const isObject = typeof exportValue === "object";
            const isPathMatch = normalizedExportKey === importPath;
            const hasRequiredKeys = ["require", "import"].every(key => Object.keys(exportValue).includes(key));
            if (isObject && isPathMatch && hasRequiredKeys) {
                return {
                    absCjsFile: exportValue.require?.default || exportValue.require,
                    absEsmFile: exportValue.import?.default || exportValue.import
                }
            }
        }
    }

    get main() {
        return this.data.main;
    }

    set main(value) {
        this.data.main = value;
    }

    get module() {
        return this.data.module;
    }

    get cjsEntry() {
        return this.type === "commonjs" && this.main && ospath.join(this.name, this.main);
    }

    get esmEntry() {
        return this.module && ospath.join(this.name, this.module);
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

    normalizeMainField() {
        if (this.main) {
            if (!ospath.extname(this.main)) {
                const cjsFolder = ospath.dirname(this.path);
                const fullPath = require.resolve(ospath.join(cjsFolder, this.main))
                const modulePath = PathFunctions.normalizeModulePath(fullPath);
                this.main = ospath.relative(this.name, modulePath);
            }
        }
    }

    normalizeExportsField() {
        if (!this.exports || typeof this.exports === 'string') return;
        const key = ".";
        if (!(key in this.exports)) this.exports = {".": this.exports};
    }  

    normalizeFields() {
        this.normalizeMainField();
        this.normalizeExportsField();
    }

    load() {
        const packageJsonObj = require(this.path);
        this.data = packageJsonObj;
        this.normalizeFields();
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

    getNearestPackageJsonPath(path) {
        let currentDir = ospath.dirname(path);
        while (currentDir) {
            const packagePath = ospath.join(currentDir, "package.json");
            if (PathFunctions.fileExists(packagePath)) {
                return packagePath;
            }
            currentDir = currentDir.substring(0, currentDir.lastIndexOf(ospath.sep));
        }
    }

    getNearestPackageJsonContent(path) {
        const packagePath = this.getNearestPackageJsonPath(path);
        if (!packagePath) return "";
        const packageObj = require(packagePath);
        return packageObj;
    }

    getMainPackageOfModule(modulePath) {
      const moduleDir = ospath.dirname(modulePath)
      const mainPackageJSONFile = Package.getMainPackageJSON(moduleDir);
      const packageObj = this.getPackageJSON(mainPackageJSONFile);
      return packageObj;
    };

    getPackageJSON(packageJSONFile) {
        let packageObj = new Package(packageJSONFile);
        if (!this.packages.has(packageObj.name)) {
          packageObj.load();
          this.packages.set(packageObj.name, packageObj);
        }
        packageObj = this.packages.get(packageObj.name);
        return packageObj;  
    }
}

const singletonPackageManager = new PackageManager();

module.exports = { Package, packageManager: singletonPackageManager };