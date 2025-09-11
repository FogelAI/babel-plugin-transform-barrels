const ospath = require("path");

class PathFunctions {
    static getFolderPath(folderName) {
      return ospath.resolve(folderName);
    }

    static getFilePath(folderName, fileName) {
      return ospath.resolve(folderName, fileName);
    }
    
    static isRelativePath(path) {
      return path.startsWith(".");
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

    static dirName(path) {
      return ospath.dirname(path);
    }

    static getMultiExtension(filePath) {
      const base = ospath.basename(filePath);
      const i = base.indexOf('.');
      return i === -1 ? '' : base.slice(i);
    }
  
    static absoluteToRelative(fromAbsolute, toAbsolute) {
      let relativeFilePath = ospath.relative(fromAbsolute, toAbsolute);
      if (relativeFilePath.length === 0) {
        relativeFilePath = `.${ospath.sep}`;
      }
      if (!['.', ospath.sep].includes(relativeFilePath[0])) {
        relativeFilePath = `.${ospath.sep}${relativeFilePath}`;
      }
      return relativeFilePath;
    }

    static removeNodeModulesPath(path) {
      const nodeModulesDirName = "node_modules";
      const nodeModulesIndex  = path.lastIndexOf(nodeModulesDirName);
      if (nodeModulesIndex === -1) return path;
      return path.slice(nodeModulesIndex + nodeModulesDirName.length + 1);
    }

    static normalizeModulePath(path) {
      if (!ospath.isAbsolute(path)) return path;
      if (PathFunctions.isNodeModule(path)) {
        return PathFunctions.removeNodeModulesPath(path);
      } else {
        return "." + path.replace(process.cwd(), "");
      }
    }  

    static replaceFileExtension(filePath, newExtension) {
      return filePath.replace(/(\.[^/.]+)?$/, newExtension);
    }

    static isAnyRegexMatch(str, regexArray) {
      return regexArray.some(regex => new RegExp(regex).test(str));
    }
}

class TypesFunctions {
  static isObject(val) {
    return typeof val === "object" && val !== null && !Array.isArray(val);
  }

  static isObjectEmpty(obj) {
    if (!TypesFunctions.isObject(obj)) throw new TypeError("The type is not an object");
    if (Object.keys(obj).length === 0) {
      return true;
    } else {
      return false;
    }
  }

  static isArrayEmpty(arr) {
    if (Array.isArray(arr) && !arr.length) {
      return true;
    }
    return false;
  }
}

module.exports = { PathFunctions, TypesFunctions };