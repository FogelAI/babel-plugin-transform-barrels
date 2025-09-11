const ospath = require("path");
const { PathFunctions, TypesFunctions } = require("./utils");
const { BuildInFileSystem: FileSystem, SerializedFile } = require('./buildInFileSystem');
const { JsonSerializer } = require('./serializers');

const fileSystem = new FileSystem(PathFunctions);

class PackagePathResolver {
    static #getPackageJsonDir(path, type) {
        let highestPackageJsonDir;
        let currentDir = path;
        let lastSegment;
        while (currentDir && lastSegment!=="node_modules") {
            const packagePath = ospath.join(currentDir, "package.json");
            if (fileSystem.fileExists(packagePath)) {
                if (type === "nearest") return currentDir;
                highestPackageJsonDir = currentDir;
            }
            currentDir = currentDir.substring(0, currentDir.lastIndexOf(ospath.sep));
            lastSegment = ospath.basename(currentDir);
        }
        return highestPackageJsonDir;
    }

    static #getNearestPackageJsonDir(path) {
        return PackagePathResolver.#getPackageJsonDir(path,"nearest");
    }

    static getNearestPackageJsonPath(path) {
        const packageJsonDir = PackagePathResolver.#getNearestPackageJsonDir(path);
        const packageJsonPath = ospath.join(packageJsonDir, "package.json");
        return packageJsonPath;
    }

    static getNearestPackageJsonContent(path) {
        const packagePath = PackagePathResolver.getNearestPackageJsonPath(path);
        if (!packagePath) return "";
        const packageManager = new PackageManager();
        const packageObj = packageManager.getPackageJSON(packagePath);
        return packageObj;
    }

    static getHighestParentPackageDir(path) {
        if (!PathFunctions.isNodeModule(path)) return process.cwd();
        return PackagePathResolver.#getPackageJsonDir(path, "highest");
    }  

    static getHighestPackageJSONPath(path) {
        const highestParentPackageDir = PackagePathResolver.getHighestParentPackageDir(path);
        const highestParentPackagePath = ospath.join(highestParentPackageDir, "package.json");
        return highestParentPackagePath;
    }
}

class Package {
    constructor(path) {
        this.path = path;
        this.name = this.getPackageName();
        this.data;
    }

    getPackageName() {
        const localPackageName = ".";
        if (!PathFunctions.isNodeModule(this.path)) return localPackageName;
        const packageDir = ospath.dirname(this.path);
        return PathFunctions.removeNodeModulesPath(packageDir);
    }

    static getMainPackageNameFromPath(path) {
        const moduleDir = ospath.dirname(path)
        const mainPackagePath = PackagePathResolver.getHighestParentPackageDir(moduleDir);
        const packageName = PathFunctions.normalizeModulePath(mainPackagePath);
        return packageName;
    }    

    get exports() {
        return this.data.exports;
    }

    set exports(value) {
        this.data.exports = value;
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

    get isNodeModule() {
        return PathFunctions.isNodeModule(this.path);
    }

    get type() {
        return this.data.type || "commonjs";
    }

    get version() {
        return this.data.version;
    }

    get workspaces() {
        return this.data.workspaces;
    }

    set workspaces(value) {
        this.data.workspaces = value;
    }

    #normalizeMainField() {
        if (this.main) {
            if (!ospath.extname(this.main)) {
                const cjsFolder = ospath.dirname(this.path);
                const fullPath = require.resolve(ospath.join(cjsFolder, this.main))
                const modulePath = PathFunctions.normalizeModulePath(fullPath);
                this.main = ospath.relative(this.name, modulePath);
            }
        }
    }

    #normalizeExportsField() {
        if (!this.exports) return;
        if (typeof this.exports === 'string') {
            this.exports = {".": this.exports};
        } else if (typeof this.exports === 'object') {
            if (!TypesFunctions.isObjectEmpty(this.exports) && !Object.keys(this.exports)[0].startsWith(".")) {
                this.exports = {".": this.exports};    
            }
        }
    }  

    #normalizeWorkspacesField() {
        if (this.workspaces) {
            if (!Array.isArray(this.workspaces)) {
                this.workspaces = this.workspaces.packages || [];    
            }
        }
    }

    #normalizeFields() {
        this.#normalizeMainField();
        this.#normalizeExportsField();
        this.#normalizeWorkspacesField();
    }

    load() {
        const jsonFile = new SerializedFile(fileSystem, new JsonSerializer());
        const packageJsonObj = jsonFile.read(this.path);
        this.data = packageJsonObj;
        this.#normalizeFields();
    }
}

class PackageDualModule {
    constructor(packageObj) {
        this.packageObj = packageObj;
    }

    static getPackageEntryByType(packageObj, moduleType) {
        const { main, type, module } = packageObj;
        if (moduleType === "module") {
          const moduleShortPath = module || (type === "module" && main);
          return moduleShortPath;
        } else {
          const moduleShortPath = type === "commonjs" && main;
          return moduleShortPath;
        }
    }

    static getPackageExportsEntryByType(packageObj, modulePath, moduleType) {
        if (!packageObj.exports) return;
        for (const [exportKey, exportValue] of Object.entries(packageObj.exports)) {
          const normalizedExportKey = ospath.join(packageObj.name, exportKey);
          const isPathMatch = normalizedExportKey === modulePath;
          if (!isPathMatch) continue;
          if (typeof exportValue === "string") {
            const moduleRelativePath = packageObj.type === moduleType && exportValue;
            return moduleRelativePath;
          } else if (typeof exportValue === "object") {
            const moduleTypeExportsKey = moduleType === "commonjs" ? ["require"] : ["module", "import"];
            const moduleKey = [...moduleTypeExportsKey, "default"].find((key)=>key in exportValue);
            if (!moduleKey) return;
            const moduleRelativePath = exportValue?.[moduleKey]?.default || exportValue?.[moduleKey];
            return moduleRelativePath;
          } else {
            return;
          }
        }
    }

    #getEntryByType(moduleType) {
        const cjsPackageExportsEntry = PackageDualModule.getPackageExportsEntryByType(this.packageObj, this.packageObj.name, moduleType);
        if (cjsPackageExportsEntry) {
            return ospath.join(this.packageObj.name, cjsPackageExportsEntry);
        }
        const cjsPackageEntry = PackageDualModule.getPackageEntryByType(this.packageObj, moduleType);
        if (cjsPackageEntry) {
            return ospath.join(this.packageObj.name, cjsPackageEntry);
        };
    }

    get cjsEntry() {
        const entry = this.#getEntryByType("commonjs");
        return entry;
    }

    get esmEntry() {
        const entry = this.#getEntryByType("module");
        return entry;
    }

    get cjsFolder() {
        return this.cjsEntry && ospath.dirname(this.cjsEntry)
    }

    get esmFolder() {
        return this.esmEntry && ospath.dirname(this.esmEntry)
    }

    get cjsExtension() {
        return this.cjsEntry && PathFunctions.getMultiExtension(this.cjsEntry)
    }

    get esmExtension() {
        return this.esmEntry && PathFunctions.getMultiExtension(this.esmEntry)
    }

    convertESMToCJSPath(path) {
        const replacedPathExt = PathFunctions.replaceFileExtension(path, this.cjsExtension);
        return replacedPathExt.replace(this.esmFolder, this.cjsFolder);
    }
}

class PackageManager {
    static instance;

    constructor() {
      if (!PackageManager.instance) {
        this.packages = new Map();
        PackageManager.instance = this;
      }
      return PackageManager.instance;
    }

    getMainPackageOfModule(modulePath) {
      const moduleDir = ospath.dirname(modulePath)
      const mainPackageJSONFile = PackagePathResolver.getHighestPackageJSONPath(moduleDir);
      let packageObj = new Package(mainPackageJSONFile);
      if (!this.packages.has(packageObj.name)) {
        packageObj.load();
        this.packages.set(packageObj.name, packageObj);
      }
      packageObj = this.packages.get(packageObj.name);
      return packageObj;  
    };

    getPackageJSON(packageJSONFile) {
        let packageObj = new Package(packageJSONFile);
        packageObj.load();
        return packageObj;  
    }
}

module.exports = { PackagePathResolver, Package, PackageDualModule, PackageManager };