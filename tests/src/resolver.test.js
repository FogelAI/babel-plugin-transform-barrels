// https://medium.com/@sanketmeghani/mocking-file-system-in-node-js-b9eb920d71e6
const mock = require('mock-fs');
const ospath = require('path');
const { ResolverFactory } = require('../../src/resolver');

const resolver = ResolverFactory.createResolver("default");

const MOCK_ROOT = process.platform === 'win32' ? 'c:\\project' : '/project';

// https://stackoverflow.com/questions/70566676/jest-mock-doesnt-work-inside-tests-only-outside-tests

describe('Resolver class', () => {
    beforeAll(() => {
        // https://github.com/tschaub/mock-fs/issues/234#issuecomment-377862172
        console.log()
        jest.clearAllMocks();
        jest.spyOn(process, 'cwd').mockReturnValue(MOCK_ROOT);
    })

    afterEach(() => {
        resolver.resetDefaults();
    })

    afterAll(() => {
        jest.spyOn(process, 'cwd').mockRestore();
        mock.restore();
    });

    describe('resolve method of regular resolver', () => {
        describe('when resolving relative regular paths (not node_modules)', () => {
            test(`when resolving a relative path without extension "./to" from a regular path ("${ospath.join(MOCK_ROOT, "path", "from.js")}") when a file with js extension exists ("${ospath.join(MOCK_ROOT, "path", "to.js")}"), it should return a file path with js extension ("c:\\project\\path\\to.js")`, () => {
                // Arrange
                mock({
                    [ospath.join(MOCK_ROOT, "path", "to.js")]: "",
                });
                const path = "./to";
                const from = ospath.join(MOCK_ROOT, "path", "from.js");
                const expectedResult = ospath.join(MOCK_ROOT, "path", "to.js");
        
                // Act
                const result = resolver.resolve(path,from);
        
                // Assert
                expect(result).toEqual(expectedResult);
            });

            test('when resolving a path of a directory with an barrel file (index.js) inside it, it should return a file path of the barrel file (index.js)', () => {
                // Arrange
                mock({
                    [ospath.join(MOCK_ROOT, "path", "barrel", "index.js")]: "",
                });
                const path = "./barrel";
                const from = ospath.join(MOCK_ROOT, "path", "from.js");
                const expectedResult = ospath.join(MOCK_ROOT, "path", "barrel", "index.js");
        
                // Act
                const result = resolver.resolve(path,from);
        
                // Assert
                expect(result).toEqual(expectedResult);
            });
        
            test('when resolving a directory with package.json specifying both main and module when the "moduleType" argument equal to "module", it should return the file path of the "module" key', () => {
                // Arrange
                const jsonFileContent = {main: "./cjs.js", module: "./esm.js"};
                mock({
                    [ospath.join(MOCK_ROOT, "path", "packageMainAndModule", "package.json")]: JSON.stringify(jsonFileContent),
                    [ospath.join(MOCK_ROOT, "path", "packageMainAndModule", "cjs.js")]: "",
                    [ospath.join(MOCK_ROOT, "path", "packageMainAndModule", "esm.js")]: "",
                });
                const path = "./packageMainAndModule";
                const from = ospath.join(MOCK_ROOT, "path", "from.js");
                const expectedResult = ospath.join(MOCK_ROOT, "path", "packageMainAndModule", "esm.js");
        
                // Act
                const result = resolver.resolve(path, from);
        
                // Assert
                expect(result).toEqual(expectedResult);
            });
        });

        describe('when resolving packages', () => {
            test('when resolving a package from a regular path when the "moduleType" argument equal to "commonjs", it should return a file path of the "main" key from the package.json file (if it exists and the "type" key is not equal to "module")', () => {
                // Arrange
                const jsonFileContent = { main: "./main.js"};
                mock({
                    [ospath.join(MOCK_ROOT, "path", "node_modules", "nodeModule", "main.js")]: "",
                    [ospath.join(MOCK_ROOT, "path", "node_modules", "nodeModule", "package.json")]: JSON.stringify(jsonFileContent),
                });
                const path = "nodeModule";
                const from = ospath.join(MOCK_ROOT, "path", "from.js");
                const expectedResult = ospath.join(MOCK_ROOT, "path", "node_modules", "nodeModule", "main.js");
        
                // Act
                const result = resolver.resolve(path,from, "commonjs");
        
                // Assert
                expect(result).toEqual(expectedResult);
            });

            test('when resolving a package from a regular path when the "moduleType" argument equal to "module" and "module" key in the package.json file exist, it should return a file path of the "module" key from the package.json file.', () => {
                // Arrange
                const jsonFileContent = { main: "./main.js", module: "./module.js" };
                mock({
                    [ospath.join(MOCK_ROOT, "path", "node_modules", "nodeModule", "module.js")]: "",
                    [ospath.join(MOCK_ROOT, "path", "node_modules", "nodeModule", "package.json")]: JSON.stringify(jsonFileContent),
                });
                const path = "nodeModule";
                const from = ospath.join(MOCK_ROOT, "path", "from.js");
                const expectedResult = ospath.join(MOCK_ROOT, "path", "node_modules", "nodeModule", "module.js");
        
                // Act
                const result = resolver.resolve(path,from, "module");
        
                // Assert
                expect(result).toEqual(expectedResult);
            });

            test('when resolving a package from a regular path when the "moduleType" argument equal to "module", and in the package.json file the "module" key is not exists but "type" key is equal to "module", it should return a file path of the "main" key from the package.json file.', () => {
                // Arrange
                const jsonFileContent = { main: "./main.js", type: "module" };
                mock({
                    [ospath.join(MOCK_ROOT, "path", "node_modules", "nodeModule", "main.js")]: "",
                    [ospath.join(MOCK_ROOT, "path", "node_modules", "nodeModule", "package.json")]: JSON.stringify(jsonFileContent),
                });
                const path = "nodeModule";
                const from = ospath.join(MOCK_ROOT, "path", "from.js");
                const expectedResult = ospath.join(MOCK_ROOT, "path", "node_modules", "nodeModule", "main.js");
        
                // Act
                const result = resolver.resolve(path,from, "module");
        
                // Assert
                expect(result).toEqual(expectedResult);
            });

            test('when resolving a package from a regular path when the "moduleType" argument equal to "module", and in the package.json file the "module" key is not exists but "type" key is not equal to "module", it should throw an error of ResolveError.', () => {
                // Arrange
                const jsonFileContent = { main: "./main.js" };
                mock({
                    [ospath.join(MOCK_ROOT, "path", "node_modules", "nodeModule", "main.js")]: "",
                    [ospath.join(MOCK_ROOT, "path", "node_modules", "nodeModule", "package.json")]: JSON.stringify(jsonFileContent),
                });
                const path = "nodeModule";
                const from = ospath.join(MOCK_ROOT, "path", "from.js");
                const expectedResult = `Unable to resolve from package.json the entry file of module type "module" in the ${ospath.join(MOCK_ROOT, "path", "node_modules", "nodeModule")} path from the ${from} file`;
        
                // Act
                const result = () => resolver.resolve(path, from, "module");
        
                // Assert
                expect(result).toThrow(expectedResult);
            });
        });
    
        describe('when resolving aliases', () => {
            test('when resolving an alias from a regular path, it should return a file path', () => {
                // Arrange
                mock({
                    [ospath.join(MOCK_ROOT, "path", "alias", "aliasfile.js")]: "",
                });
                const path = "alias";
                const from = ospath.join(MOCK_ROOT, "path", "from.js");
                const expectedResult = ospath.join(MOCK_ROOT, "path", "alias", "aliasfile.js");
        
                // Act
                resolver.appendAlias({ alias: ospath.join(MOCK_ROOT, "path", "alias", "aliasfile.js") })
                const result = resolver.resolve(path, from);
        
                // Assert
                expect(result).toEqual(expectedResult);
            });
        });
    
        describe('when resolving wrong path', () => {
            test('when resolving relative paths that does\'nt exists, it should throw a resolve error', () => {
                // Arrange
                mock({
                    [ospath.join(MOCK_ROOT, "path", "to.js")]: "",
                });
                const path = "./to_wrong_path";
                const from = ospath.join(MOCK_ROOT, "path", "from.js");
                const expectedResult = `Unable to resolve the ${path} path from the ${from} file`;
        
                // Act
                const result = ()=> resolver.resolve(path,from)
        
                // Assert
                expect(result).toThrow(expectedResult);
            });
        });
    });
});