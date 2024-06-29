const AST = require("./ast");
const AliasFactory = require("./alias");
const resolver = require("./resolver");
const BarrelFileManagerFacade = require("./barrel");
const pluginOptions = require("./pluginOptions");

const importDeclarationVisitor = (path, state) => {
  const importsSpecifiers = path.node.specifiers;
  if (!AST.isAnySpecifierExist(importsSpecifiers)) return;
  if (AST.getSpecifierType(importsSpecifiers[0]) === "namespace") return;
  const parsedJSFile = state.filename;
  const importsPath = path.node.source.value;
  resolver.from = parsedJSFile;
  const resolvedPathObject = resolver.resolve(importsPath ,parsedJSFile);
  const barrelFile = BarrelFileManagerFacade.getBarrelFile(resolvedPathObject.absEsmFile);
  if (!barrelFile.isBarrelFileContent) return;
  const directSpecifierASTArray = importsSpecifiers.map((specifier) =>
    {
      const importedName = specifier?.imported?.name || "default";
      const importSpecifier = barrelFile.getDirectSpecifierObject(importedName).toImportSpecifier();
      importSpecifier.localName = specifier.local.name;
      return AST.createASTImportDeclaration(importSpecifier);
    }
  );
  path.replaceWithMultiple(directSpecifierASTArray);
};

module.exports = function (babel) {
  const PLUGIN_KEY = 'transform-barrels';
  return {
    name: PLUGIN_KEY,
    pre(state) {
      const plugins = state.opts.plugins;
      const plugin = plugins.find(plugin => plugin.key === PLUGIN_KEY);
      pluginOptions.setOptions(plugin.options);
      const aliasJest = AliasFactory.createAlias("jest", pluginOptions.options);
      const aliasWebpack = AliasFactory.createAlias("webpack", pluginOptions.options);
      const aliasWorkspaces = AliasFactory.createAlias("workspaces");
      const alias = {
        ...aliasWebpack.getAlias(),
        ...aliasWorkspaces.getAlias(),
        ...aliasJest.getAlias()
      }
      resolver.appendAlias(alias);
    },
    post(state) {
      BarrelFileManagerFacade.saveToCacheAllPackagesBarrelFiles();
    },
    visitor: {
      ImportDeclaration: importDeclarationVisitor,
    },
  };
};
