const ospath = require("path");
const fg = require("fast-glob");
const PathFunctions = require("./path");

class Workspaces {
    constructor(path) {
      this.path = path || ospath.resolve('package.json');
      this.data = {};
      this.aliasObj = {};
    }
  
    loadPackageJson() {
      this.data = require(this.path);
    }
    
    load() {
      this.loadPackageJson();
      this.workspacesToAliases()
    }
    
    get workspaces() {
      const workspaces = this.data.workspaces || [];
      if (Array.isArray(workspaces)) return workspaces;
      return workspaces.packages || [];
    }
  
    getWorkspacesPackageJsons( { startPath = ospath.resolve('.'), workspaces } = {} ) {
      const globWorkspaces = workspaces.map((ws)=> ws + '/**/package.json');
      const packagesJsons = fg.sync(
        globWorkspaces,
        {
          deep: Infinity,
          onlyFiles: true,
          absolute: true,
          cwd: startPath,
          ignore: ['**/node_modules'],
        },
      );
      return packagesJsons;
    }
  
    workspacesToAliases() {
      const { workspaces } = this;
      const packagesJsons = this.getWorkspacesPackageJsons({workspaces});
      const aliases = packagesJsons.reduce((alias, pkgPath) => {
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
  
class AliasWebpack {
    constructor(options) {
      this.path = options.webpackConfigFilename;
      this.args = options.args || [];
      this.data = {};
      this.aliasObj = {};
    }

    resolveWebpackConfig() {
      const webpackConfigObj = require(this.path);
      if (typeof webpackConfigObj === 'object') {
        this.data = webpackConfigObj;
      } else if (typeof webpackConfigObj === 'function') {
        this.data = webpackConfigObj(...this.args);
      }
    }

    load() {
      if (!this.path) return;
      this.resolveWebpackConfig();
      this.aliasObj = this.data?.resolve?.alias || {};
      this.addPrefixRegexToAliases();
    }

    addPrefixRegexToAliases() {
      if (PathFunctions.isObjectEmpty(this.aliasObj)) return;
      const newAliasObj = {};
      const aliases = Object.keys(this.aliasObj);
      for (const alias of aliases) {
        newAliasObj[`^${alias}`] = this.aliasObj[alias];
      }
      this.aliasObj = newAliasObj;
      return newAliasObj;
    }  
  
    getAlias() {
      return this.aliasObj;
    }

    appendAlias(alias) {
      this.aliasObj = { ...this.aliasObj, ...alias };
    }
}
  
class AliasJest {
    constructor(options) {
      this.aliasObj = options.jestAlias || {};
    }
  
    load() {
      if (PathFunctions.isObjectEmpty(this.aliasObj)) return;
      this.buildAliasMap();
    }

    buildAliasMap() {
      if (PathFunctions.isObjectEmpty(this.aliasObj)) return;
      const newAliasObj = {};
      this.aliasObj.forEach((alias)=>{
        newAliasObj[alias[0]] = alias[1];
      })
      this.aliasObj = newAliasObj;
      return this.aliasObj;
    }  

    getAlias() {
      return this.aliasObj;
    }
    
    appendAlias(alias) {
      this.aliasObj = { ...this.aliasObj, ...alias };
    }
}

class AliasFactory {
  static createAlias(type, options) {
    switch (type) {
      case 'workspaces':
        const workspaces = new Workspaces();
        workspaces.load();
        return workspaces;
      case 'webpack':
        const webpack = new AliasWebpack(options);
        webpack.load();
        return webpack;
      case 'jest':
        const jest = new AliasJest(options);
        jest.load();
        return jest;
      default:
        throw new Error('Invalid alias type');
    }
  }
}

module.exports = AliasFactory;