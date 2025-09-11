const generate = require('@babel/generator').default;
const { AST, SkippingCases } = require("./ast");
const BarrelFileManagerFacade = require("./barrel");

class BarrelImportTransformer {
    constructor({ logger, resolver }) {
      this.logger = logger;
      this.resolver = resolver;
    }

    transform(path, state) {
        const importsSpecifiers = path.node.specifiers;
        const parsedJSFile = state.filename;
        const importsPath = path.node.source.value;
        if (SkippingCases.isOneOfSkippingImportCases(path.node)) return;
        this.logger.log(`Source import line: ${generate(path.node, { comments: false, concise: true }).code}`);
        this.resolver.from = parsedJSFile;
        const resolvedPath = this.resolver.resolve(importsPath ,parsedJSFile);
        if (!resolvedPath) return null;
        const barrelFile = BarrelFileManagerFacade.getBarrelFile(resolvedPath);
        if (!barrelFile.isBarrelFileContent) return;
        const directSpecifierASTArray = this.transformSpecifiers(importsSpecifiers, barrelFile);
        if (!directSpecifierASTArray) return;
        path.replaceWithMultiple(directSpecifierASTArray);          
    }

    transformSpecifiers (importsSpecifiers, barrelFile) {
        const directSpecifierASTArray = [];
        for (const specifier of importsSpecifiers) {
          const importedName = specifier?.imported?.name || "default";
          const importSpecifier = barrelFile.getDirectSpecifierObject(importedName).toImportSpecifier();
          if (!importSpecifier.path) return;
          importSpecifier.localName = specifier.local.name;
          const transformedASTImport = AST.createASTImportDeclaration(importSpecifier);
          this.logger.log(`Transformed import line: ${generate(transformedASTImport).code}`);
          directSpecifierASTArray.push(transformedASTImport);
        }
        return directSpecifierASTArray;
    }      
}

module.exports = { BarrelImportTransformer };