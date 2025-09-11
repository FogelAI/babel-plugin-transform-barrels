const pluginTransform = require("../../pluginTransform");
const { mockLocalProjectPackageJSON } = require("../jestMockFS");

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readFileSync: jest.fn()
}));

describe("third-party package (@apollo/client/testing) transformation for ESM", () => {
  beforeAll(() => {
    mockLocalProjectPackageJSON("esm");
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test("transformation of @apollo/client/testing", () => {
      const pluginOptions = { isCacheEnabled: true };
      expect(
        pluginTransform(
          'import { MockedProvider } from "@apollo/client/testing";',
          __filename,
          pluginOptions
        )
      ).toBe([
      `import { MockedProvider } from "@apollo/client/testing";`,
      ].join("\n").replaceAll("\\","\\\\"));
  });
});