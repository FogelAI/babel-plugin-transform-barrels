// https://medium.com/@sanketmeghani/mocking-file-system-in-node-js-b9eb920d71e6
const mock = require('mock-fs');
const resolver = require('../../src/resolver');

describe('Resolver class', () => {
    beforeAll(() => {
        // https://github.com/tschaub/mock-fs/issues/234#issuecomment-377862172
        // console.log()
    })

    afterEach(() => {
        mock.restore();
    });

    describe('resolve method', () => {
        test('when resolving a relative path from a regular path, it should return a ResolvedPath instance where absEsmFile contains the file path with extension', () => {
            // Arrange
            mock({
                "c:\\path\\to.js": "",
            });
            const path = "./to";
            const from = "c:\\path\\from.js";
            const expectedResult = {
                absCjsFile: "",
                absEsmFile: "c:\\path\\to.js"
            }
    
            // Act
            const result = resolver.resolve(path,from);
    
            // Assert
            expect(result).toEqual(expectedResult);
        });
    
        test('when resolving a relative path from a regular path, it should return a ResolvedPath instance where absEsmFile contains the file path with mjs extension', () => {
            // Arrange
            mock({
                "c:\\path\\to.mjs": "",
            });
            const path = "./to";
            const from = "c:\\path\\from.js";
            const expectedResult = {
                absCjsFile: "",
                absEsmFile: "c:\\path\\to.mjs"
            }
    
            // Act
            const result = resolver.resolve(path,from);
    
            // Assert
            expect(result).toEqual(expectedResult);
        });

        test('when resolving a relative path from a regular path, it should return a ResolvedPath instance where absCjsFile contains the file path with cjs extension', () => {
            // Arrange
            mock({
                "c:\\path\\to.cjs": "",
            });
            const path = "./to";
            const from = "c:\\path\\from.js";
            const expectedResult = {
                absCjsFile: "c:\\path\\to.cjs",
                absEsmFile: ""
            }
    
            // Act
            const result = resolver.resolve(path,from);
    
            // Assert
            expect(result).toEqual(expectedResult);
        });

        test('when resolving a package from a regular path, it should return a ResolvedPath instance where absEsmFile and absCjsFile include file paths of the module and main keys (if they exist) from the package.json file', () => {
            // Arrange
            mock({
                "c:\\path\\node_modules\\nodeModule\\index.js": "",
                "c:\\path\\node_modules\\nodeModule\\package.json": JSON.stringify({ main: "./index.js"}),
            });
            const path = "nodeModule";
            const from = "c:\\path\\from.js";
            const expectedResult = {
                absCjsFile: "c:\\path\\node_modules\\nodeModule\\index.js",
                absEsmFile: ""
            }
    
            // Act
            const result = resolver.resolve(path,from);
    
            // Assert
            expect(result).toEqual(expectedResult);
        });
    
        test('when resolving an alias from a regular path, it should return a ResolvedPath instance where absEsmFile contains the file path', () => {
            // Arrange
            mock({
                "c:\\path\\alias\\file.js": "",
            });
            const path = "alias\\file.js";
            const from = "c:\\path\\from.js";
            const expectedResult = {
                absCjsFile: "",
                absEsmFile: "c:\\path\\alias\\file.js"
            }
    
            // Act
            resolver.appendAlias({ alias: "c:\\path\\alias" })
            const result = resolver.resolve(path,from);
    
            // Assert
            expect(result).toEqual(expectedResult);
        });
    
        test('when resolving a path of a directory, it should return a ResolvedPath instance where absEsmFile contains the file path of the barrel file (index.js)', () => {
            // Arrange
            mock({
                "c:\\path\\barrel\\index.js": "",
            });
            const path = "./barrel";
            const from = "c:\\path\\from.js";
            const expectedResult = {
                absCjsFile: "",
                absEsmFile: "c:\\path\\barrel\\index.js"
            }
    
            // Act
            const result = resolver.resolve(path,from);
    
            // Assert
            expect(result).toEqual(expectedResult);
        });
    
        test('when resolving a directory with package.json specifying both main and module, it should return a ResolvedPath instance with both absCjsFile and absEsmFile paths', () => {
            // Arrange
            mock({
                "c:\\path\\packageMainAndModule\\package.json": JSON.stringify({main: "./cjs.js", module: "./esm.js"}),
                "c:\\path\\packageMainAndModule\\cjs.js": "",
                "c:\\path\\packageMainAndModule\\esm.js": "",
            });
            const path = "./packageMainAndModule";
            const from = "c:\\path\\from.js";
            const expectedResult = {
                absCjsFile: "c:\\path\\packageMainAndModule\\cjs.js",
                absEsmFile: "c:\\path\\packageMainAndModule\\esm.js"
            }
    
            // Act
            const result = resolver.resolve(path, from);
    
            // Assert
            expect(result).toEqual(expectedResult);
        });
    
        test('when resolving a directory with package.json specifying only main, it should return a ResolvedPath instance with only absCjsFile path', () => {
            // Arrange
            mock({
                "c:\\path\\packageMain\\package.json": JSON.stringify({main: "./cjs.js"}),
                "c:\\path\\packageMain\\cjs.js": "",
            });
            const path = "./packageMain";
            const from = "c:\\path\\from.js";
            const expectedResult = {
                absCjsFile: "c:\\path\\packageMain\\cjs.js",
                absEsmFile: ""
            }
    
            // Act
            const result = resolver.resolve(path, from);
    
            // Assert
            expect(result).toEqual(expectedResult);
        });
    
        test('when resolving a directory with package.json specifying type as module and main, it should return a ResolvedPath instance with only absEsmFile path', () => {
            // Arrange
            mock({
                "c:\\path\\packageModule\\package.json": JSON.stringify({type: "module", main: "./esm.js"}),
                "c:\\path\\packageModule\\esm.js": "",
            });
            const path = "./packageModule";
            const from = "c:\\path\\from.js";
            const expectedResult = {
                absCjsFile: "",
                absEsmFile: "c:\\path\\packageModule\\esm.js"
            }
    
            // Act
            const result = resolver.resolve(path, from);
    
            // Assert
            expect(result).toEqual(expectedResult);
        }); 
    });
});