const ospath = require("path");
const fs = require("fs");

class PathFunctions {
    static isObjectEmpty(obj) {
      if (typeof obj === 'object' && Object.keys(obj).length !== 0) {
        return false;
      } else {
        return true;
      }
    }
  
    static fileExists(path) {
      try {
          return !fs.accessSync(path, fs.F_OK);
      } catch (e) {
          return false;
      }
    }
  
    static isRelativePath(path) {
      return path.match(/^\.{0,2}\//);
    }
    
    static checkIfModule(path) {
      const notModuleRegExp = /^\.$|^\.[\\\/]|^\.\.$|^\.\.[\/\\]|^\/|^[A-Z]:[\\\/]/i;
      const isModuleVar = !notModuleRegExp.test(path) || path.includes("node_modules");
      return isModuleVar;
    }
  
    static getModuleAbsolutePath(parsedJSFile, convertedImportsPath) {
      let absolutePath = convertedImportsPath;
      if (!ospath.isAbsolute(convertedImportsPath)) {
        absolutePath = ospath.join(ospath.dirname(parsedJSFile), convertedImportsPath);
      }
      const ext = ['.js','.jsx','.ts','.tsx', '/index.js','/index.jsx','/index.ts','/index.tsx'].find((ext)=> PathFunctions.fileExists(absolutePath + ext)) || "";
      absolutePath = absolutePath + ext;
      // const resolvedAbsolutePath = require.resolve(absolutePath);
      return absolutePath;
    }
}

module.exports = PathFunctions;