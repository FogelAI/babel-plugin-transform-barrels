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

class ExecutorConfig {
    constructor(alias, extensions, loadStrategy) {
      this.alias = alias || {};
      this.extensions = extensions || [];
      this.loadStrategy = loadStrategy;
    }
  
    load() {
        if (this.loadStrategy) {
          this.alias = this.loadStrategy.prepareAlias(this.alias)
          this.extensions = this.loadStrategy.prepareExtensions(this.extensions)  
        }
        this.addWorkspacesToAlias();
    }

    getAlias() {
      return this.alias;
    }

    getExtensions() {
        return this.extensions;
    }  

    addWorkspacesToAlias() {
      const workspaces = new Workspaces();
      workspaces.load();
      this.alias = {
        ...workspaces.getAlias(),
        ...this.getAlias()
      }
    }
}

class WebpackStrategy {
    prepareExtensions(extensions) {
        return extensions;
    }

    prepareAlias(alias) {
        return this.addPrefixRegexToAliases(alias);
    }

    addPrefixRegexToAliases(aliasObj) {
        if (PathFunctions.isObjectEmpty(aliasObj)) return;
        const newAliasObj = {};
        const aliases = Object.keys(aliasObj);
        for (const alias of aliases) {
          newAliasObj[`^${alias}((?:[\\/]|$))`] = `${aliasObj[alias]}$1`;
        }
        return newAliasObj;  
    }
}

class ViteStrategy {
  prepareExtensions(extensions) {
      return extensions;
  }

  prepareAlias(alias) {
      return alias;
  }
}

class JestStrategy {
    prepareExtensions(extensions) {
        return extensions.map(ext => ext.startsWith(".") ? ext : `.${ext}`);
    }

    prepareAlias(alias) {
        return Array.isArray(alias) ? Object.fromEntries(alias) : alias;
    }
}

class ExecutorFactory {
    static createExecutor(type, alias, extensions) {
      switch (type) {
        case 'webpack':
          const webpack = new ExecutorConfig(alias, extensions, new WebpackStrategy());
          webpack.load();
          return webpack;
        case 'vite':
          const vite = new ExecutorConfig(alias, extensions, new ViteStrategy());
          vite.load();
          return vite;
        case 'jest':
          const jest = new ExecutorConfig(alias, extensions, new JestStrategy());
          jest.load();
          return jest;
        default:
          const defaultExecutor = new ExecutorConfig();
          defaultExecutor.load();
          return defaultExecutor;
      }
    }
  }
  
module.exports = ExecutorFactory;