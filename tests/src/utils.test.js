const { PathFunctions, TypesFunctions } = require('../../src/utils');

jest.mock('fs');

describe('TypesFunctions class', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    describe('isObjectEmpty static method', () => {
        test('when argument is an empty object, then it should return true', () => {
            // Arrange
            const emptyObj = {};
            const expectedResult = true;

            // Act
            const result = TypesFunctions.isObjectEmpty(emptyObj);

            // Assert
            expect(result).toBe(expectedResult);
        });

        test('when argument is a non-empty object, then it should return false', () => {
            // Arrange
            const obj = { key: 'value' };
            const expectedResult = false;

            // Act
            const result = TypesFunctions.isObjectEmpty(obj);

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
            const actualNumberResult = () => TypesFunctions.isObjectEmpty(number);
            const actualStringResult = () => TypesFunctions.isObjectEmpty(string);
            const actualArrayResult = () => TypesFunctions.isObjectEmpty(array);
            const actualBooleanResult = () => TypesFunctions.isObjectEmpty(boolean);
            const actualUndefinedResult = () => TypesFunctions.isObjectEmpty(undefinedValue);
            const actualNullResult = () => TypesFunctions.isObjectEmpty(nullValue);
        

            // Assert
            expect(actualNumberResult).toThrow(TypeError);
            expect(actualStringResult).toThrow(TypeError);
            expect(actualArrayResult).toThrow(TypeError);
            expect(actualBooleanResult).toThrow(TypeError);
            expect(actualUndefinedResult).toThrow(TypeError);
            expect(actualNullResult).toThrow(TypeError);
        });
    });
});

describe('PathFunctions class', () => {
    beforeEach(() => {
        jest.resetAllMocks();
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
