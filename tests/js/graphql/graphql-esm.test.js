const pluginTransform = require("../../pluginTransform");
const { mockLocalProjectPackageJSON } = require("../jestMockFS");

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readFileSync: jest.fn()
}));

describe("third-party package (graphql) transformation for ESM", () => {
  beforeAll(() => {
    mockLocalProjectPackageJSON("esm");
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test("transformation of graphql", () => {
      const pluginOptions = { isCacheEnabled: true };
      expect(
        pluginTransform(
          'import { graphql } from "graphql";',
          __filename,
          pluginOptions
        )
      ).toBe([
      `import { graphql } from \"${process.cwd()}\\node_modules\\graphql\\graphql.mjs";`,
      ].join("\n").replaceAll("\\","\\\\"));
  });
});