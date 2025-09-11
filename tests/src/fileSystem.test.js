const fs = require('fs');
const { BuildInFileSystem: FileSystem } = require('../../src/buildInFileSystem');
const PathFunctions = require('../../src/utils');

const fileSystem = new FileSystem(PathFunctions);

jest.mock('fs');

describe('FileSystem class', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    describe('pathExists static method', () => {
        test('when the path exists, then it should return true', () => {
            // Arrange
            const path = 'existingPath';
            const expectedResult = true;
            fs.accessSync.mockReturnValue(undefined);

            // Act
            const result = fileSystem.pathExists(path);

            // Assert
            expect(result).toBe(expectedResult);
        });

        test('when the path does not exist, then it should return false', () => {
            // Arrange
            const path = 'nonExistingPath';
            const expectedResult = false;
            fs.accessSync.mockImplementation(() => { throw new Error(); });

            // Act
            const result = fileSystem.pathExists(path);

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
            fileSystem.createFolderIfNotExists(folderPath);

            // Assert
            expect(fs.mkdirSync).toHaveBeenCalledWith(folderPath);
        });

        test('when the folder already exists, then it should not create the folder', () => {
            // Arrange
            const folderPath = 'existingFolder';
            fs.existsSync.mockReturnValue(true);

            // Act
            fileSystem.createFolderIfNotExists(folderPath);

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
            const result = fileSystem.fileExists(path);

            // Assert
            expect(result).toBe(expectedResult);
        });

        test('when the file does not exist, then it should return false', () => {
            // Arrange
            const path = 'nonExistingFile';
            const expectedResult = false;
            fs.accessSync.mockImplementation(() => { throw new Error(); });

            // Act
            const result = fileSystem.fileExists(path);

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
            const result = fileSystem.folderExists(path);

            // Assert
            expect(result).toBe(expectedResult);
        });

        test('when the folder does not exist, then it should return false', () => {
            // Arrange
            const path = 'nonExistingFolder';
            const expectedResult = false;
            fs.existsSync.mockReturnValue(false);

            // Act
            const result = fileSystem.folderExists(path);

            // Assert
            expect(result).toBe(expectedResult);
        });
    });
});