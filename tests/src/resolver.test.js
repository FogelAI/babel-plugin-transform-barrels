// https://medium.com/@sanketmeghani/mocking-file-system-in-node-js-b9eb920d71e6
const mock = require('mock-fs');
const resolver = require('../../src/resolver');
const {packageManager} = require('../../src/packages');

// https://stackoverflow.com/questions/70566676/jest-mock-doesnt-work-inside-tests-only-outside-tests
jest.mock("../../src/packages", ()=>{
    return {
        packageManager: {
            getPackageJSON: jest.fn()
        }
    }
})            


describe('Resolver class', () => {
    beforeAll(() => {
        // https://github.com/tschaub/mock-fs/issues/234#issuecomment-377862172
        console.log()
    })

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(process, 'cwd').mockReturnValue('c:\\project');
    });

    afterEach(() => {
        jest.spyOn(process, 'cwd').mockRestore();
        mock.restore();
        resolver.resetDefaults();
    });

    describe('resolve method', () => {
        describe('when resolving relative paths', () => {
            test('when resolving a relative path from a regular path, it should return a ResolvedPath instance where absEsmFile contains the file path with extension', () => {
                // Arrange
                mock({
                    "c:\\project\\path\\to.js": "",
                });
                const path = "./to";
                const from = "c:\\project\\path\\from.js";
                const expectedResult = {
                    absCjsFile: "",
                    absEsmFile: "c:\\project\\path\\to.js",
                    originalPath: ".\\path\\to",
                    packageJsonExports: false
                }
        
                // Act
                const result = resolver.resolve(path,from);
        
                // Assert
                expect(result).toEqual(expectedResult);
            });
        
            test('when resolving a relative path from a regular path, it should return a ResolvedPath instance where absEsmFile contains the file path with mjs extension', () => {
                // Arrange
                mock({
                    "c:\\project\\path\\to.mjs": "",
                });
                const path = "./to";
                const from = "c:\\project\\path\\from.js";
                const expectedResult = {
                    absCjsFile: "",
                    absEsmFile: "c:\\project\\path\\to.mjs",
                    originalPath: ".\\path\\to",
                    packageJsonExports: false
                }
        
                // Act
                const result = resolver.resolve(path,from);
        
                // Assert
                expect(result).toEqual(expectedResult);
            });

            test('when resolving a relative path from a regular path, it should return a ResolvedPath instance where absCjsFile contains the file path with cjs extension', () => {
                // Arrange
                mock({
                    "c:\\project\\path\\to.cjs": "",
                });
                const path = "./to";
                const from = "c:\\project\\path\\from.js";
                const expectedResult = {
                    absCjsFile: "c:\\project\\path\\to.cjs",
                    absEsmFile: "",
                    originalPath: ".\\path\\to",
                    packageJsonExports: false
                }
        
                // Act
                const result = resolver.resolve(path,from);
        
                // Assert
                expect(result).toEqual(expectedResult);
            });
        });

        describe('when resolving packages', () => {
            test('when resolving a package from a regular path, it should return a ResolvedPath instance where absEsmFile and absCjsFile include file paths of the module and main keys (if they exist) from the package.json file', () => {
                // Arrange
                const jsonFileContent = { main: "./index.js"};
                mock({
                    "c:\\project\\path\\node_modules\\nodeModule\\index.js": "",
                    "c:\\project\\path\\node_modules\\nodeModule\\package.json": JSON.stringify(jsonFileContent),
                });
                packageManager.getPackageJSON.mockReturnValue({
                    ...jsonFileContent,
                    resolveExports: ()=>{
                        return;
                    }
                });            
                const path = "nodeModule";
                const from = "c:\\project\\path\\from.js";
                const expectedResult = {
                    absCjsFile: "c:\\project\\path\\node_modules\\nodeModule\\index.js",
                    absEsmFile: "",
                    originalPath: "nodeModule",
                    packageJsonExports: false
                }
        
                // Act
                const result = resolver.resolve(path,from);
        
                // Assert
                expect(result).toEqual(expectedResult);
            });
        });
    
        describe('when resolving aliases', () => {
            test('when resolving an alias from a regular path, it should return a ResolvedPath instance where absEsmFile contains the file path', () => {
                // Arrange
                mock({
                    "c:\\project\\path\\alias\\aliasfile.js": "",
                });
                const path = "alias\\file.js";
                const from = "c:\\project\\path\\from.js";
                const expectedResult = {
                    absCjsFile: "",
                    absEsmFile: "c:\\project\\path\\alias\\aliasfile.js",
                    originalPath: ".\\path\\alias\\aliasfile.js",
                    packageJsonExports: false
                }
        
                // Act
                resolver.appendAlias({ alias: "c:\\project\\path\\alias\\aliasfile.js" })
                const result = resolver.resolve(path,from);
        
                // Assert
                expect(result).toEqual(expectedResult);
            });
        });
    
        describe('when resolving directories', () => {
            function mockPackageManager(content) {
                packageManager.getPackageJSON.mockReturnValue({
                    ...content,
                    resolveExports: () => undefined
                });
            }

            test('when resolving a path of a directory, it should return a ResolvedPath instance where absEsmFile contains the file path of the barrel file (index.js)', () => {
                // Arrange
                mock({
                    "c:\\project\\path\\barrel\\index.js": "",
                });
                const path = "./barrel";
                const from = "c:\\project\\path\\from.js";
                const expectedResult = {
                    absCjsFile: "",
                    absEsmFile: "c:\\project\\path\\barrel\\index.js",
                    originalPath: ".\\path\\barrel",
                    packageJsonExports: false
                }
        
                // Act
                const result = resolver.resolve(path,from);
        
                // Assert
                expect(result).toEqual(expectedResult);
            });
        
            test('when resolving a directory with package.json specifying both main and module, it should return a ResolvedPath instance with both absCjsFile and absEsmFile paths', () => {
                // Arrange
                const jsonFileContent = {main: "./cjs.js", module: "./esm.js"};
                mock({
                    "c:\\project\\path\\packageMainAndModule\\package.json": JSON.stringify(jsonFileContent),
                    "c:\\project\\path\\packageMainAndModule\\cjs.js": "",
                    "c:\\project\\path\\packageMainAndModule\\esm.js": "",
                });
                mockPackageManager(jsonFileContent)
                const path = "./packageMainAndModule";
                const from = "c:\\project\\path\\from.js";
                const expectedResult = {
                    absCjsFile: "c:\\project\\path\\packageMainAndModule\\cjs.js",
                    absEsmFile: "c:\\project\\path\\packageMainAndModule\\esm.js",
                    originalPath: ".\\path\\packageMainAndModule",
                    packageJsonExports: false
                }
        
                // Act
                const result = resolver.resolve(path, from);
        
                // Assert
                expect(result).toEqual(expectedResult);
            });
        
            test('when resolving a directory with package.json specifying only main, it should return a ResolvedPath instance with only absCjsFile path', () => {
                // Arrange
                const jsonFileContent = {main: "./cjs.js"};
                mock({
                    "c:\\project\\path\\packageMain\\package.json": JSON.stringify(jsonFileContent),
                    "c:\\project\\path\\packageMain\\cjs.js": "",
                });
                mockPackageManager(jsonFileContent)
                const path = "./packageMain";
                const from = "c:\\project\\path\\from.js";
                const expectedResult = {
                    absCjsFile: "c:\\project\\path\\packageMain\\cjs.js",
                    absEsmFile: "",
                    originalPath: ".\\path\\packageMain",
                    packageJsonExports: false
                }
        
                // Act
                const result = resolver.resolve(path, from);
        
                // Assert
                expect(result).toEqual(expectedResult);
            });
        
            test('when resolving a directory with package.json specifying type as module and main, it should return a ResolvedPath instance with only absEsmFile path', () => {
                // Arrange
                const jsonFileContent = {type: "module", main: "./esm.js"};
                mock({
                    "c:\\project\\path\\packageModule\\package.json": JSON.stringify(jsonFileContent),
                    "c:\\project\\path\\packageModule\\esm.js": "",
                });
                mockPackageManager(jsonFileContent)
                const path = "./packageModule";
                const from = "c:\\project\\path\\from.js";
                const expectedResult = {
                    absCjsFile: "",
                    absEsmFile: "c:\\project\\path\\packageModule\\esm.js",
                    originalPath: ".\\path\\packageModule",
                    packageJsonExports: false
                }
        
                // Act
                const result = resolver.resolve(path, from);
        
                // Assert
                expect(result).toEqual(expectedResult);
            }); 
        });

        describe('when resolving wrong path', () => {
            test('when resolving relative paths, it should throw a resolve error', () => {
                // Arrange
                mock({
                    "c:\\project\\path\\to.js": "",
                });
                const path = "./to_wrong_path";
                const from = "c:\\project\\path\\from.js";
                const expectedResult = `Unable to resolve the ${path} path from the ${from} file`;
        
                // Act
                const result = ()=> resolver.resolve(path,from)
        
                // Assert
                expect(result).toThrow(expectedResult);
            });
        });
    });
});