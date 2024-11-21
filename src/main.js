const generate = require('@babel/generator').default;
const AST = require("./ast");
const { ExecutorFactory, JestMock } = require("./executorConfig");
const resolver = require("./resolver");
const BarrelFileManagerFacade = require("./barrel");
const pluginOptions = require("./pluginOptions");
const logger = require("./logger");

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
  const jestMockFunction = new JestMock();
  if (!(pluginOptions.options.executorName === "jest")) return;
  if (!JestMock.isJestMockFunctionCall(path.node)) return;
  jestMockFunction.setExpression(path.node.expression);
  const { modulePath } = jestMockFunction;
  const parsedJSFile = state.filename;
  resolver.from = parsedJSFile;
  const resolvedPathObject = resolver.resolve(modulePath ,parsedJSFile);
  if (resolvedPathObject.packageJsonExports) return;
  const barrelFile = BarrelFileManagerFacade.getBarrelFile(resolvedPathObject.absEsmFile);
  if (!barrelFile.isBarrelFileContent) return;
  const directImportsPathMapping = jestMockFunction.getDirectImportsPathMapping(barrelFile).get(modulePath);
  const transformedASTImport = AST.createASTJestMockCallFunction(directImportsPathMapping);
  logger.log(`Source mock line: ${generate(path.node, { comments: false, concise: true }).code}`);
  transformedASTImport.forEach(line=> logger.log(`Transformed mock line: ${generate(line).code}`));
  path.replaceWithMultiple(transformedASTImport)
}

module.exports = function (babel) {
  const PLUGIN_KEY = 'transform-barrels';
  return {
    name: PLUGIN_KEY,
    pre(state) {
      const plugins = state.opts.plugins;
      const plugin = plugins.find(plugin => plugin.key === PLUGIN_KEY);
      pluginOptions.setOptions(plugin.options);
      const { options } = pluginOptions;
      logger.setOptions(options.logging);
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
      ImportDeclaration: importDeclarationVisitor,
      ExpressionStatement: expressionStatementVisitor,
    },
  };
};
