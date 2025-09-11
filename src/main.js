const { JestMock } = require("./jestMock");
const { BarrelImportTransformer } = require("./barrelImportTransformer");
const { JestMockTransformer } = require("./jestMockTransformer");
const { ResolverFactory } = require("./resolver");
const BarrelFileManagerFacade = require("./barrel");
const pluginOptions = require("./pluginOptions");
const logger = require("./logger");
const { PackagePathResolver } = require("./packages");

const importDeclarationVisitor = (path, state) => {
  const barrelImportTransformer = new BarrelImportTransformer({
     logger,
     resolver: ResolverFactory.lastCreatedInstance
  });
  barrelImportTransformer.transform(path, state);
};

const expressionStatementVisitor = (path, state) => {
  const jestMock = new JestMock(path, state);
  const jestMockTransformer = new JestMockTransformer({
    pluginOptions,
    jestMock,
    resolver: ResolverFactory.lastCreatedInstance
  });
  jestMockTransformer.transform(path, state);
}

module.exports = function (babel) {
  const PLUGIN_KEY = 'transform-barrels';
  return {
    name: PLUGIN_KEY,
    pre(state) {
      const plugins = state.opts.plugins;
      const plugin = plugins.find(plugin => plugin.key === PLUGIN_KEY);
      pluginOptions.setOptions(plugin.options);
      const { executorName, alias, extensions, moduleDirs, logging} = pluginOptions.options;
      const resolver = ResolverFactory.createResolver(executorName, alias, extensions, moduleDirs);
      logger.setOptions(logging);
      const babelPackageJsonContent = PackagePathResolver.getNearestPackageJsonContent(__dirname);
      logger.log(`Babel-plugin-transform-barrels version: ${babelPackageJsonContent.version}`);
      logger.log(`Processed Javascript file: ${state.opts.filename}`);
    },
    post(state) {
      BarrelFileManagerFacade.dispose();
    },
    visitor: {
      ImportDeclaration: wrapWithErrorHandling(importDeclarationVisitor, "ImportDeclaration"),
      ExpressionStatement: wrapWithErrorHandling(expressionStatementVisitor, "ExpressionStatement"),
    },
  };
};

const wrapWithErrorHandling = (visitorFunction, visitorName)=> {
  return function (path, state) {
    try {
      visitorFunction(path, state);
    } catch(err) {
      if (err.name === "ResolveError") {
        logger.log([
          `${err.name}: ${visitorName}: ${err.message}`,
          `Resolver object properties: ${JSON.stringify(err.resolverObj, null, 2)}`,
          `Error stack: ${err.stack}`
        ].join("\n"));  
      }
      throw err;    
    }
  }
}