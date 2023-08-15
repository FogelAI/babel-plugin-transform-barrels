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

    static createASTImportDeclaration = ({exportedName: specifierLocalName, localName: specifierImportedName, path: modulePath, type: specifierType}) => {
      return t.importDeclaration(
        [
          specifierType === "named"
            ? t.importSpecifier(t.identifier(specifierLocalName),t.identifier(specifierImportedName))
            : t.importDefaultSpecifier(t.identifier(specifierLocalName))
          ,
        ],
        t.stringLiteral(modulePath)
      )
    }  
  }

module.exports = AST;