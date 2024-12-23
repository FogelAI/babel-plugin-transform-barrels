const t = require("@babel/types");
const generate = require('@babel/generator').default;
const resolver = require("./resolver");
const BarrelFileManagerFacade = require("./barrel");
const PathFunctions = require("./path");
const logger = require("./logger");

class JestMock {
    static isSpecificObjectFunctionCall(node, objectName, propertyName) {
      if (!(t.isCallExpression(node) && t.isMemberExpression(node.callee))) return false;
      const nodeObjectName = node.callee.object.name;
      const nodePropertyName = node.callee.property.name;
      return (nodeObjectName === objectName && nodePropertyName === propertyName);
    }
  
    constructor(path, state) {
      this.path = path;
      this.state = state;
      this.modulePath = "";
      this.barrelImports = new ImportBarrelPaths();
      this.nonExistKeys = [];
    }
  
    load() {
      this.loadModulePath();
      this.loadBarrelFile();
    }
  
    loadModulePath() {
      const argumentsVar = this.path.node.expression.arguments;
      this.modulePath = argumentsVar[0].value;
    }

    loadBarrelFile() {
      const parsedJSFile = this.state.filename;
      const resolvedPathObject = resolver.resolve(this.modulePath ,parsedJSFile);
      if (resolvedPathObject.packageJsonExports) return;
      this.barrelFile = BarrelFileManagerFacade.getBarrelFile(resolvedPathObject.absEsmFile);
    }

    getObjectProperties(path) {
      return path.node.properties;
    }

    objectExpressionVisitor = (objectPath)=> {
      const properties = this.getObjectProperties(objectPath);
      const directModules = new ImportBarrelPaths();
      const nonExistKeys = [];
      for (const property of properties) {
        if (t.isProperty(property)) {
          const importedName = property?.key?.name || "default";
          const directSpecifier = this.barrelFile.getDirectSpecifierObject(importedName);
          if (directSpecifier) {
            const importSpecifier = directSpecifier.toImportSpecifier();
            const directImportedName = importSpecifier.importedName;
            const directModulePath = importSpecifier.path;
            if (!importSpecifier.path) return;
            directModules.add(directModulePath, importedName, directImportedName);  
          } else {
            nonExistKeys.push(importedName);
          }
        }
      }
      this.nonExistKeys = [...this.nonExistKeys, ...nonExistKeys];
      this.barrelImports = directModules;
      objectPath.skip();
    }

    transformedExpressionStatement() {
      const numOfArguments = this.path.node.expression.arguments.length;
      if (numOfArguments === 1) {
        this.barrelImports.map = this.barrelFile.getAllDirectPaths();
      } else if (numOfArguments === 2) {
        this.path.traverse({ ObjectExpression: this.objectExpressionVisitor});
        if (PathFunctions.isObjectEmpty(this.barrelImports.map)) {
          this.barrelImports.map = this.barrelFile.getAllDirectPaths();
        }
      }
      this.createNewJestMockCallFunction()
      this.path.remove();
    }

    newObjectExpressionVisitor = (objectPath)=> {
      const properties = this.getObjectProperties(objectPath);
      const barrelModulePath = this.barrelImports.currentBarrelUse;
      const specifiers = this.barrelImports.get(barrelModulePath);
      const newProperties = [];
      for (const property of properties) {
        const newProperty = t.cloneNode(property);
        if (t.isProperty(property)) {
          const importedName = property?.key?.name || "default";
          if (importedName in specifiers) {
            newProperty.key.name = specifiers[importedName];
            newProperties.push(newProperty)
          } else if (this.nonExistKeys.includes(importedName)) {
            newProperties.push(newProperty)
          }
        } else {
          newProperties.push(newProperty)
        }
      }
      objectPath.node.properties = newProperties;
    }

    newCallExpressionVisitor = (objectPath)=> {
      if (!JestMock.isSpecificObjectFunctionCall(objectPath.node, "jest", "requireActual")) return;
      if (objectPath.node.arguments[0].value !== this.modulePath) return;
      objectPath.node.arguments[0] = t.stringLiteral(this.barrelImports.currentBarrelUse);
    }

    createNewJestMockCallFunction() {
      const modules = Object.keys(this.barrelImports.map);
      logger.log(`Source mock line: ${generate(this.path.node, { comments: false, concise: true }).code}`);
      for (const modulePath of modules) {
        const clonedNode = t.cloneNode(this.path.node);
        this.path.insertBefore(clonedNode);
        const clonedPath = this.path.getSibling(this.path.key - 1)
        const mockModuleNameParameter = t.stringLiteral(modulePath);
        clonedPath.node.expression.arguments[0] = mockModuleNameParameter;
        this.barrelImports.currentBarrelUse = modulePath;
        clonedPath.traverse({ObjectExpression: this.newObjectExpressionVisitor, CallExpression: this.newCallExpressionVisitor});
        logger.log(`Transformed mock line: ${generate(clonedPath.node, { comments: false, concise: true }).code}`);
      }
    }
}

class ImportBarrelPaths {
  constructor() {
    this.currentBarrelUse = "";
    this.map = {};
  }

  add(importDirectPath, importedName, directImportedName) {
    this.map[importDirectPath] ??= {};
    this.map[importDirectPath][importedName] = directImportedName;
  }

  get(importDirectPath) {
    return this.map[importDirectPath];
  }
  
  hasBarrel(importBarrelPath) {
    return importBarrelPath in this.map;
  }
}

module.exports = { JestMock };