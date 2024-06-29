const fs = require('fs');
const PathFunctions = require('../../src/path');

jest.mock('fs');

describe('PathFunctions class', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    describe('isObjectEmpty static method', () => {
        test('when argument is an empty object, then it should return true', () => {
            // Arrange
            const emptyObj = {};
            const expectedResult = true;

            // Act
            const result = PathFunctions.isObjectEmpty(emptyObj);

            // Assert
            expect(result).toBe(expectedResult);
        });

        test('when argument is a non-empty object, then it should return false', () => {
            // Arrange
            const obj = { key: 'value' };
            const expectedResult = false;

            // Act
            const result = PathFunctions.isObjectEmpty(obj);

            // Assert
            expect(result).toBe(expectedResult);
        });

        test('when argument is a non-object type, then it should throw a TypeError', () => {
            // Arrange
            const number = 5;
            const string = "test";
            const array = ["test"];
            const boolean = true;
            const undefinedValue = undefined;
            const nullValue = null;        

            // Act
            const actualNumberResult = () => PathFunctions.isObjectEmpty(number);
            const actualStringResult = () => PathFunctions.isObjectEmpty(string);
            const actualArrayResult = () => PathFunctions.isObjectEmpty(array);
            const actualBooleanResult = () => PathFunctions.isObjectEmpty(boolean);
            const actualUndefinedResult = () => PathFunctions.isObjectEmpty(undefinedValue);
            const actualNullResult = () => PathFunctions.isObjectEmpty(nullValue);
        

            // Assert
            expect(actualNumberResult).toThrow(TypeError);
            expect(actualStringResult).toThrow(TypeError);
            expect(actualArrayResult).toThrow(TypeError);
            expect(actualBooleanResult).toThrow(TypeError);
            expect(actualUndefinedResult).toThrow(TypeError);
            expect(actualNullResult).toThrow(TypeError);
        });
    });

    describe('pathExists static method', () => {
        test('when the path exists, then it should return true', () => {
            // Arrange
            const path = 'existingPath';
            const expectedResult = true;
            fs.accessSync.mockReturnValue(undefined);

            // Act
            const result = PathFunctions.pathExists(path);

            // Assert
            expect(result).toBe(expectedResult);
        });

        test('when the path does not exist, then it should return false', () => {
            // Arrange
            const path = 'nonExistingPath';
            const expectedResult = false;
            fs.accessSync.mockImplementation(() => { throw new Error(); });

            // Act
            const result = PathFunctions.pathExists(path);

            // Assert
            expect(result).toBe(expectedResult);
        });
    });

    describe('createFolderIfNotExists static method', () => {
        test('when the folder does not exist, then it should create the folder', () => {
            // Arrange
            const folderPath = 'newFolder';
            fs.existsSync.mockReturnValue(false);

            // Act
            PathFunctions.createFolderIfNotExists(folderPath);

            // Assert
            expect(fs.mkdirSync).toHaveBeenCalledWith(folderPath);
        });

        test('when the folder already exists, then it should not create the folder', () => {
            // Arrange
            const folderPath = 'existingFolder';
            fs.existsSync.mockReturnValue(true);

            // Act
            PathFunctions.createFolderIfNotExists(folderPath);

            // Assert
            expect(fs.mkdirSync).not.toHaveBeenCalled();
        });
    });

    describe('fileExists static method', () => {
        test('when the file exists, then it should return true', () => {
            // Arrange
            const path = 'existingFile';
            const expectedResult = true;
            fs.accessSync.mockReturnValue(undefined);
            fs.lstatSync.mockReturnValue({ isFile: () => true });

            // Act
            const result = PathFunctions.fileExists(path);

            // Assert
            expect(result).toBe(expectedResult);
        });

        test('when the file does not exist, then it should return false', () => {
            // Arrange
            const path = 'nonExistingFile';
            const expectedResult = false;
            fs.accessSync.mockImplementation(() => { throw new Error(); });

            // Act
            const result = PathFunctions.fileExists(path);

            // Assert
            expect(result).toBe(expectedResult);
        });
    });

    describe('folderExists static method', () => {
        test('when the folder exists, then it should return true', () => {
            // Arrange
            const path = 'existingFolder';
            const expectedResult = true;
            fs.existsSync.mockReturnValue(true);
            fs.lstatSync.mockReturnValue({ isDirectory: () => true });

            // Act
            const result = PathFunctions.folderExists(path);

            // Assert
            expect(result).toBe(expectedResult);
        });

        test('when the folder does not exist, then it should return false', () => {
            // Arrange
            const path = 'nonExistingFolder';
            const expectedResult = false;
            fs.existsSync.mockReturnValue(false);

            // Act
            const result = PathFunctions.folderExists(path);

            // Assert
            expect(result).toBe(expectedResult);
        });
    });

    describe('isRelativePath static method', () => {
        test('when the path is relative, then it should return true', () => {
            // Arrange
            const path = './relativePath';
            const expectedResult = true;

            // Act
            const result = PathFunctions.isRelativePath(path);

            // Assert
            expect(result).toBe(expectedResult);
        });

        test('when the path is absolute, then it should return false', () => {
            // Arrange
            const path = '/absolutePath';
            const expectedResult = false;

            // Act
            const result = PathFunctions.isRelativePath(path);

            // Assert
            expect(result).toBe(expectedResult);
        });
    });

    describe('isRegularPath static method', () => {
        test('when the path is regular, then it should return true', () => {
            // Arrange
            const path = '/regularPath';
            const expectedResult = true;

            // Act
            const result = PathFunctions.isRegularPath(path);

            // Assert
            expect(result).toBe(expectedResult);
        });

        test('when the path is irregular, then it should return false', () => {
            // Arrange
            const path = 'irregularPath';
            const expectedResult = false;

            // Act
            const result = PathFunctions.isRegularPath(path);

            // Assert
            expect(result).toBe(expectedResult);
        });
    });

    describe('isNodeModule static method', () => {
        test('when the path is node module, then it should return true', () => {
            // Arrange
            const path = 'node_modules/module';
            const expectedResult = true;

            // Act
            const result = PathFunctions.isNodeModule(path);

            // Assert
            expect(result).toBe(expectedResult);
        });

        test('when the path is regular, then it should return false', () => {
            // Arrange
            const path = '/regularPath';
            const expectedResult = false;

            // Act
            const result = PathFunctions.isNodeModule(path);

            // Assert
            expect(result).toBe(expectedResult);
        });
    });

    describe('removeLastSegment static method', () => {
        test('should remove the last segment of a path', () => {
            // Arrange
            const path = 'path/to/remove';
            const expectedResult = 'path/to';

            // Act
            const result = PathFunctions.removeLastSegment(path);

            // Assert
            expect(result).toBe(expectedResult);
        });
    });
});
