const fs = require("fs");
const parser = require("@babel/parser");
const t = require("@babel/types");

class AST {
    static filenameToAST = (filename) => {
      try {
        const content = fs.readFileSync(filename, "utf-8");
        return parser.parse(content, { sourceType: "module" });
      } catch (error) {
        return null;
      }
    };
    
    static getSpecifierType(specifier) {
      if (specifier.local.name === "default")
      {
        return "default";
      } else return "named";
    }

    static createASTImportDeclaration = ({localName, importedName, path, type}) => {
      return t.importDeclaration(
        [
          type === "named"
            ? t.importSpecifier(t.identifier(localName),t.identifier(importedName))
            : t.importDefaultSpecifier(t.identifier(localName))
          ,
        ],
        t.stringLiteral(path)
      )
    }  
  }

module.exports = AST;