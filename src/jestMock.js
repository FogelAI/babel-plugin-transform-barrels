const t = require("@babel/types");
const AST = require("./ast");
const resolver = require("./resolver");
const BarrelFileManagerFacade = require("./barrel");

class JestMock {
    static isSpecificObjectFunctionCall(node, objectName, propertyName) {
      if (!(t.isCallExpression(node) && t.isMemberExpression(node.callee))) return false;
      const nodeObjectName = node.callee.object.name;
      const nodePropertyName = node.callee.property.name;
      return (nodeObjectName === objectName && nodePropertyName === propertyName);
    }
  
    constructor() {
      this.modulePath = "";
      this.properties = [];
      this.barrelImports = new ImportBarrelPaths();
    }
  
    load(expression) {
      this.loadArguments(expression);
    }
  
    loadArguments(expression) {
      const argumentsVar = expression.arguments
      this.modulePath = argumentsVar[0].value;
      this.properties = argumentsVar[1]?.body?.properties || [];
    }
  
    setExpression(expression) {
      this.load(expression);
    }

    getDirectImportsPathMapping(barrelFile) {
      const barrelModulePath = this.modulePath;
      const directModules = new ImportBarrelPaths();
      for (const property of this.properties) {
        if (t.isProperty(property)) {
          const importedName = property?.key?.name || "default";
          const importSpecifier = barrelFile.getDirectSpecifierObject(importedName).toImportSpecifier();
          const directModulePath = importSpecifier.path;
          if (!importSpecifier.path) return;
          directModules.add(barrelModulePath, directModulePath, { type: "property", property: importedName, astValue: property.value });  
        } else if (t.isSpreadElement(property)) {
          if (!JestMock.isSpecificObjectFunctionCall(property.argument, "jest", "requireActual")) continue;
          const requireActualList = this.getRequireActualList(property);
          for (const requireActual in requireActualList) {
            directModules.add(barrelModulePath, requireActual, { type: "spreadElement", modulePath: requireActual });  
          }
        }
      }
      if (!AST.isAnySpecifierExist(this.properties)) {
        directModules.map[barrelModulePath] = barrelFile.getAllDirectPaths();
      }
      return directModules;
    }

    getRequireActualList(property) {
        if (!JestMock.isSpecificObjectFunctionCall(property.argument, "jest", "requireActual")) null;
        const requireActualModule = property.argument.arguments[0].value;
        const resolvedPathObject = resolver.resolve(requireActualModule, resolver.from);
        if (resolvedPathObject.packageJsonExports) return;
        const barrelFile = BarrelFileManagerFacade.getBarrelFile(resolvedPathObject.absEsmFile);
        if (!barrelFile.isBarrelFileContent) return;
        return barrelFile.getAllDirectPaths();
    }
}

class ImportBarrelPaths {
  constructor() {
    this.map = {};
  }

  add(importBarrelPath, importDirectPath, specifier = null) {
    this.map[importBarrelPath] ??= {}
    this.map[importBarrelPath][importDirectPath] ??= [];
    specifier && this.map[importBarrelPath][importDirectPath].push(specifier);
  }

  get(importBarrelPath, importDirectPath) {
    if (importBarrelPath) {
      if (importDirectPath) {
        return this.map[importBarrelPath][importDirectPath];
      }
      return this.map[importBarrelPath];
    }
    return this.map;
  }
  
  hasBarrel(importBarrelPath) {
    return importBarrelPath in this.map;
  }
}

module.exports = { JestMock };