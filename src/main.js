const generate = require('@babel/generator').default;
const AST = require("./ast");
const { ExecutorFactory } = require("./executorConfig");
const { JestMock } = require("./jestMock");
const resolver = require("./resolver");
const BarrelFileManagerFacade = require("./barrel");
const pluginOptions = require("./pluginOptions");
const logger = require("./logger");
const { packageManager } = require("./packages");

const importDeclarationVisitor = (path, state) => {
  const importsSpecifiers = path.node.specifiers;
  const parsedJSFile = state.filename;
  const importsPath = path.node.source.value;
  if (AST.isSpecialImportCases(path.node)) return;
  logger.log(`Source import line: ${generate(path.node, { comments: false, concise: true }).code}`);
  resolver.from = parsedJSFile;
  const resolvedPathObject = resolver.resolve(importsPath ,parsedJSFile);
  if (resolvedPathObject.packageJsonExports) return;
  const barrelFile = BarrelFileManagerFacade.getBarrelFile(resolvedPathObject.absEsmFile);
  if (!barrelFile.isBarrelFileContent) return;
  const directSpecifierASTArray = []
  for (const specifier of importsSpecifiers) {
    const importedName = specifier?.imported?.name || "default";
    const importSpecifier = barrelFile.getDirectSpecifierObject(importedName).toImportSpecifier();
    if (!importSpecifier.path) return;
    importSpecifier.localName = specifier.local.name;
    const transformedASTImport = AST.createASTImportDeclaration(importSpecifier);
    logger.log(`Transformed import line: ${generate(transformedASTImport).code}`);
    directSpecifierASTArray.push(transformedASTImport);
  }
  path.replaceWithMultiple(directSpecifierASTArray);
};

const expressionStatementVisitor = (path, state) => {
  if (!(pluginOptions.options.executorName === "jest")) return;
  if (!JestMock.isSpecificObjectFunctionCall(path.node.expression, "jest", "mock")) return;
  if (AST.isSpecialImportCases(path.node)) return;
  const jestMockFunction = new JestMock(path, state);
  const parsedJSFile = state.filename;
  resolver.from = parsedJSFile;
  jestMockFunction.load();
  if (!jestMockFunction.barrelFile.isBarrelFileContent) return;
  jestMockFunction.transformedExpressionStatement();
}

module.exports = function (babel) {
  const PLUGIN_KEY = 'transform-barrels';
  return {
    name: PLUGIN_KEY,
    pre(state) {
      resolver.resetDefaults();
      const plugins = state.opts.plugins;
      const plugin = plugins.find(plugin => plugin.key === PLUGIN_KEY);
      pluginOptions.setOptions(plugin.options);
      const { options } = pluginOptions;
      logger.setOptions(options.logging);
      const babelPackageJsonContent = packageManager.getNearestPackageJsonContent(__dirname);
      logger.log(`Babel-plugin-transform-barrels version: ${babelPackageJsonContent.version}`);
      logger.log(`Processed Javascript file: ${state.opts.filename}`);
      const executor = ExecutorFactory.createExecutor(options.executorName, options.alias, options.extensions);
      resolver.appendAlias(executor.getAlias());
      resolver.setModulesDirs(options.modulesDirs);
      const extensions = executor.getExtensions();
      extensions.length !==0 && resolver.setExtensions(extensions)
    },
    post(state) {
      BarrelFileManagerFacade.saveToCacheAllPackagesBarrelFiles();
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