const fs = require("fs");
const parser = require("@babel/parser");
const t = require("@babel/types");
const { builtinModules } = require('module');
const pluginOptions = require("./pluginOptions");
const PathFunctions = require("./path");

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
        const mockModuleNameParameter = t.stringLiteral(modulePath);
        const astFunctionArguments = [mockModuleNameParameter];
        if (specifiersByModule[modulePath].length !== 0) {
          const astObject = AST.createASTObject(specifiersByModule[modulePath]);
          const mockCallbackParameter = t.arrowFunctionExpression([], astObject);  
          astFunctionArguments.push(mockCallbackParameter);
        }
        const callExpression = AST.createASTCallExpression("jest", "mock", astFunctionArguments)
        astExpressionStatements.push(t.expressionStatement(callExpression));
      }
      return astExpressionStatements;
    }  

    static createASTObject(arrOfObjects) {
      const objectProperties = [];
      for (const obj of arrOfObjects) {
        const type = obj.type;
        if (type === "property") {
          const name = obj.property;
          const value = obj.astValue;
          objectProperties.push(t.objectProperty(t.identifier(name), value));  
        } else if (type === "spreadElement") {
          const modulePath = obj.modulePath;
          const astFuncArgumentsList = [t.stringLiteral(modulePath)]; 
          const astJestRequireActual = AST.createASTCallExpression("jest", "requireActual", astFuncArgumentsList);
          objectProperties.push(t.spreadElement(astJestRequireActual))
        }
      }
      return t.objectExpression(objectProperties)
    }

    static createASTCallExpression(objectName, propertyName, funcArgumentsList) {
      const callee = t.memberExpression(t.identifier(objectName), t.identifier(propertyName));
      const callExpression = t.callExpression(callee, funcArgumentsList)
      return callExpression;
    }

    static isSpecialImportCases(node) {
      const importsPath = node.source?.value || node.expression.arguments[0].value;
      const importsSpecifiers = node.specifiers || node.expression.arguments[1]?.body?.properties || [];
      if (t.isImportDeclaration(node) && !AST.isAnySpecifierExist(importsSpecifiers)) return true;
      if (AST.getSpecifierType(importsSpecifiers[0]) === "namespace") return true;
      if (pluginOptions.options.executorName === "vite" && importsPath.startsWith("/")) return true;
      if (pluginOptions.options.executorName === "webpack" && importsPath.includes("!")) return true;
      if (PathFunctions.isSpecialCharInBundlerPathImport(importsPath)) return true;
      if (builtinModules.includes(importsPath)) return true;
      const { moduleIgnorePatterns } = pluginOptions.options;
      if (PathFunctions.isAnyRegexMatch(importsPath, moduleIgnorePatterns)) return true;
      return false;
    }    
}

module.exports = AST;