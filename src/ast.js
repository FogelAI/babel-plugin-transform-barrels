const parser = require("@babel/parser");
const t = require("@babel/types");
const { builtinModules } = require('module');
const { BuildInFileSystem: FileSystem } = require('./buildInFileSystem');
const pluginOptions = require("./pluginOptions");
const { PathFunctions } = require("./utils");

class AST {
  static filenameToAST = (filename) => {
    try {
      const fileSystem = new FileSystem(PathFunctions);
      const content = fileSystem.readFile(filename, "utf-8");
      return parser.parse(content, { sourceType: "module", plugins:["jsx", "typescript"] });
    } catch (error) {
      return null;
    }
  };
  
  static isAnySpecifierExist(specifiers) {
    return specifiers.length !== 0;
  }

  static getExportSpecifierType(specifier) {
    if (specifier?.local?.name === "default") {
      return "default";
    } else if (specifier?.local) {
      return "named";
    } else {
      return "namespace"
    }  
  }

  static getImportSpecifierType(specifier) {
    if (t.isImportDefaultSpecifier(specifier)) {
      return "default";
    } else if (t.isImportSpecifier(specifier)) {
      return "named";
    } else {
      return "namespace"
    }  
  }

  static createASTImportDeclaration = ({localName, importedName, path, type}) => {
    let astImportSpecifier;
    switch (type) {
      case "named":
        astImportSpecifier = t.importSpecifier(t.identifier(localName),t.identifier(importedName))
        break;
      case "namespace":
        astImportSpecifier = t.importNamespaceSpecifier(t.identifier(localName))
        break;
      default:
        astImportSpecifier = t.importDefaultSpecifier(t.identifier(localName))
    }
    return t.importDeclaration([astImportSpecifier], t.stringLiteral(path));
  }
}

class SkippingCases {
  static isSideEffectImport(importsSpecifiers) {
    // import "module-name";
    return (!AST.isAnySpecifierExist(importsSpecifiers));
  }

  static isNamespaceImport(importsSpecifiers) {
    // import * as name from "module-name";
    if (AST.getImportSpecifierType(importsSpecifiers[0]) === "namespace") return true;
  }

  static isOneOfBuildinModules(path) {
    return (path.startsWith("node:") || builtinModules.includes(path));
  }

  static isIgnoredModule(importsPath) {
    const { moduleIgnorePatterns } = pluginOptions.options;
    if (PathFunctions.isAnyRegexMatch(importsPath, moduleIgnorePatterns)) return true;
  }

  static isOneOfPathSkippingCases(node) {
    const importsPath = node.source?.value || node.expression.arguments[0].value;
    if (
      SkippingCases.isOneOfBuildinModules(importsPath) ||
      SkippingCases.isIgnoredModule(importsPath)
    ) {
      return true;
    }
    return false;
  }    

  static isOneOfSkippingImportCases(node) {
    const importsSpecifiers = node.specifiers || node.expression.arguments[1]?.body?.properties || [];
    if (
      SkippingCases.isNamespaceImport(importsSpecifiers) ||
      SkippingCases.isSideEffectImport(importsSpecifiers) ||
      SkippingCases.isOneOfPathSkippingCases(node)
    ) {
      return true;
    }
    return false;
  }    
}

module.exports = { AST, SkippingCases };