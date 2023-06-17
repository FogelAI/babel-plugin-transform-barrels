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
  
    static createASTImportDeclaration = ({name: specifierName, path: modulePath, type: specifierType}) => {
      return t.importDeclaration(
        [
          specifierType === "named"
            ? t.importSpecifier(t.identifier(specifierName),t.identifier(specifierName))
            : t.importDefaultSpecifier(t.identifier(specifierName))
          ,
        ],
        t.stringLiteral(modulePath)
      )
    }  
  }

module.exports = AST;