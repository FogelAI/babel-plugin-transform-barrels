const ospath = require("path");
const fg = require("fast-glob");
const PathFunctions = require("./path");

class PackageJson {
    constructor() {
      this.mainPkg = ospath.resolve('package.json');
      this.packagesJsons = [];
      this.aliasObj = {};
      this.workspaces = this.loadWorkspaces();
      this.getNodePackages();
      this.aliasesToWorkspaces();
    }
  
    loadWorkspaces() {
      const workspaces = require(this.mainPkg).workspaces || [];
      if (Array.isArray(workspaces)) return workspaces;
      return workspaces.packages || [];
    }
  
    getNodePackages( { workspacePath = ospath.resolve('.') } = {} ) {
      if (this.workspaces===[]) return [];
      const globWorkspaces = this.workspaces.map((ws)=> ws + '/**/package.json');
      const packagesJsons = fg.sync(
        globWorkspaces,
        {
          deep: Infinity,
          onlyFiles: true,
          absolute: true,
          cwd: workspacePath,
          ignore: ['**/node_modules'],
        },
      );
      this.packagesJsons = packagesJsons;
      return packagesJsons;
    }
  
    aliasesToWorkspaces() {
      const aliases = this.packagesJsons.reduce((alias, pkgPath) => {
        const pkgName = require(pkgPath).name;
        alias[pkgName] = ospath.dirname(pkgPath);
        return alias;
      }, {})
      this.aliasObj = aliases;
      return aliases;
    }
  
    getAlias() {
      return this.aliasObj;
    }
  }
  
class WebpackConfig {
    constructor() {
      this.aliasObj = {};
    }
  
    getWebpackAlias(plugin) {
      const filePath = plugin.options.webpackConfigFilename;
      // If the config comes back as null, we didn't find it, so throw an exception.
      if (!filePath) {
        return null;
      }
      const webpackConfigObj = require(filePath);
    
      let alias = {};
      if (typeof webpackConfigObj === 'object') {
        if (!PathFunctions.isObjectEmpty(webpackConfigObj?.resolve?.alias)) {
          alias = webpackConfigObj.resolve.alias;
        }
      } else if (typeof webpackConfigObj === 'function') {
        const args = plugin.options.args || [];
        alias = webpackConfigObj(...args).resolve.alias;
      }
      this.aliasObj = alias;
      return alias;
    }  
  
    convertAliasToOriginal(parsedJSFile, originalImportsPath) {
      let convertedPath = originalImportsPath;
      const aliasObj = this.aliasObj;
      const aliases = Object.keys(aliasObj);
      for (const alias of aliases) {
        let aliasDestination = aliasObj[alias];
        const regex = new RegExp(`^${alias}(\/|$)`);
        
        if (regex.test(originalImportsPath)) {
          const isModule = PathFunctions.checkIfModule(aliasDestination);
          if (isModule) {
            convertedPath = aliasDestination;
            break;
          }
          // If the filepath is not absolute, make it absolute
          if (!ospath.isAbsolute(aliasDestination)) {
              aliasDestination = ospath.join(ospath.dirname(parsedJSFile), aliasDestination);
          }
          let relativeFilePath = ospath.relative(ospath.dirname(parsedJSFile), aliasDestination);
    
          // In case the file path is the root of the alias, need to put a dot to avoid having an absolute path
          if (relativeFilePath.length === 0) {
              relativeFilePath = '.';
          }
    
          let requiredFilePath = originalImportsPath.replace(regex, relativeFilePath);
    
          // If the file is requiring the current directory which is the alias, add an extra slash
          if (requiredFilePath === '.') {
              requiredFilePath = './';
          }
    
          // In the case of a file requiring a child directory of the current directory, we need to add a dot slash
          if (['.', '/'].indexOf(requiredFilePath[0]) === -1) {
              requiredFilePath = `./${requiredFilePath}`;
          }
    
          convertedPath = requiredFilePath;
          break;
        }
      }
      return convertedPath;
    }  
  
    appendAlias(alias) {
      this.aliasObj = { ...this.aliasObj, ...alias };
    }
}
  
class JestConfig {
    constructor() {
      this.aliasObj = {};
    }
  
    getJestAlias(plugin) {
      const aliases = plugin.options.jestAlias;
      if (!aliases) {
        return null;
      }
      aliases.forEach((alias)=>{
        this.aliasObj[alias[0]] = alias[1];
      })
      return this.aliasObj;
    }  
  
    appendAlias(alias) {
      this.aliasObj = { ...this.aliasObj, ...alias };
    }
}

module.exports = { PackageJson, WebpackConfig, JestConfig }