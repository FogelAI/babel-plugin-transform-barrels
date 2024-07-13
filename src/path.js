const ospath = require("path");
const fs = require("fs");

const nodeModulesFolder = {};

class PathFunctions {
    static isObject(val) {
      return typeof val === "object" && val !== null && !Array.isArray(val);
    }

    static isObjectEmpty(obj) {
      if (!PathFunctions.isObject(obj)) throw new TypeError("The type is not an object");
      if (typeof obj === 'object' && Object.keys(obj).length !== 0) {
        return false;
      } else {
        return true;
      }
    }

    static isArrayEmpty(arr) {
      if (Array.isArray(arr) && !arr.length) {
        return true;
      }
      return false;
    }
  
    static pathExists(path) {
      try {
          return !fs.accessSync(path, fs.constants.F_OK);
      } catch (e) {
          return false;
      }
    }

    static createFolderIfNotExists(folderPath) {
      if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath);
      }
    }

    static fileExists(path) {
      try {
          return (PathFunctions.pathExists(path) && fs.lstatSync(path).isFile());
      } catch (e) {
          return false;
      }
    }

    static folderExists(path) {
      return (fs.existsSync(path) && fs.lstatSync(path).isDirectory());
    }
  
    static isRelativePath(path) {
      const relativePathRegExp = /^\.{1,2}\//;
      return relativePathRegExp.test(path);
    }
    
    static isRegularPath(path) {
      const regularPathRegExp = /^\.$|^\.[\\\/]|^\.\.$|^\.\.[\/\\]|^\/|^[A-Z]:[\\\/]/i;
      return regularPathRegExp.test(path);
    }

    static isNodeModule(path) {
      const isNodeModuleVar = !PathFunctions.isRegularPath(path) || path.includes("node_modules");
      return isNodeModuleVar;
    }

    static removeLastSegment(path) {
      return path.substring(0, ospath.normalize(path).lastIndexOf(ospath.sep));
    }    
  
    static getAbsolutePath(path, from=process.cwd()) {
      if (ospath.isAbsolute(path)) return path;
      let currentDir = from;
      if (!PathFunctions.isNodeModule(path)) return ospath.join(currentDir, path);
      let mainPackage = path.split("/")[0];
      if (nodeModulesFolder[mainPackage] !== undefined) {
          if (nodeModulesFolder[mainPackage] === null) {
              return null;
          } else {
              return ospath.join(nodeModulesFolder[mainPackage], path)
          }
      }
      while (currentDir) {
          if (currentDir.endsWith("node_modules")) {
              currentDir = PathFunctions.removeLastSegment(currentDir);
              continue;
          }
          const nodeModulesPath = ospath.join(currentDir, "node_modules");
          const packagePath = ospath.join(nodeModulesPath, mainPackage);
          if (PathFunctions.pathExists(packagePath)) {
              nodeModulesFolder[mainPackage] = nodeModulesPath;
              return ospath.join(nodeModulesPath, path);
          }
          currentDir = PathFunctions.removeLastSegment(currentDir);
      }
      nodeModulesFolder[mainPackage] = null;
      return null;    
    }

    static absoluteToRelative(fromAbsolute, toAbsolute) {
      let relativeFilePath = ospath.relative(fromAbsolute, toAbsolute).replace(/\\/g, "/");
      if (relativeFilePath.length === 0) {
        relativeFilePath = './';
      }
      if (!['.', '/'].includes(relativeFilePath[0])) {
        relativeFilePath = `./${relativeFilePath}`;
      }
      return relativeFilePath;
    }

    static removeNodeModulesPath(path) {
      const PackageDirName = path.replace(/.:.+node_modules[\/|\\]/g,"");
      return PackageDirName;
    }

    static normalizeModulePath(path) {
      if (!ospath.isAbsolute(path)) return path;
      if (PathFunctions.isNodeModule(path)) {
        return PathFunctions.removeNodeModulesPath(path);
      } else {
        return "." + path.replace(process.cwd(), "");
      }
    }  
}

module.exports = PathFunctions;