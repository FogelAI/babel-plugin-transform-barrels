const fs = require("fs");
const parser = require("@babel/parser");
const t = require("@babel/types");

class AST {
    static filenameToAST = (filename) => {
      try {
        const content = fs.readFileSync(filename, "utf-8");
        return parser.parse(content, { sourceType: "module", plugins:["jsx", "typescript"] });
      } catch (error) {
        return null;
      }
    };
    
    static isAnySpecifierExist(specifiers) {
      return specifiers.length !== 0;
    }

    static getSpecifierType(specifier) {
      if (t.isExportSpecifier(specifier) || t.isExportDefaultSpecifier(specifier) || t.isExportNamespaceSpecifier(specifier)) {
        if (specifier?.local?.name === "default")
        {
          return "default";
        } else if (specifier?.local) {
          return "named";
        } else {
          return "namespace"
        }  
      }
      if (t.isImportSpecifier(specifier) || t.isImportDefaultSpecifier(specifier) || t.isImportNamespaceSpecifier(specifier)) {
        if (t.isImportDefaultSpecifier(specifier))
        {
          return "default";
        } else if (t.isImportSpecifier(specifier)) {
          return "named";
        } else {
          return "namespace"
        }  
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

    static createASTJestMockCallFunction = (specifiersByModule) => {
      const astExpressionStatements = [];
      const modules = Object.keys(specifiersByModule);
      for (const modulePath of modules) {
        const callee = t.memberExpression(t.identifier("jest"), t.identifier("mock"));
        const mockModuleNameParameter = t.stringLiteral(modulePath);
        const functionArguments = [mockModuleNameParameter];
        if (specifiersByModule[modulePath].length !== 0) {
          const astObject = AST.createASTObject(specifiersByModule[modulePath]);
          const mockCallbackParameter = t.arrowFunctionExpression([], astObject);  
          functionArguments.push(mockCallbackParameter);
        }
        const callExpression = t.callExpression(callee, functionArguments)
        astExpressionStatements.push(t.expressionStatement(callExpression));
      }
      return astExpressionStatements;
    }  

    static createASTObject(obj) {
      const keys = Object.keys(obj);
      const objectProperties = [];
      for (const key of keys) {
        const name = obj[key].name;
        const value = obj[key].astValue;
        objectProperties.push(t.objectProperty(t.identifier(name), value));
      }
      return t.objectExpression(objectProperties)
    }
}

module.exports = AST;