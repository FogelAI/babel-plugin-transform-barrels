const pluginTransform = require("../../pluginTransform");
const { mockLocalProjectPackageJSON } = require("../jestMockFS");

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readFileSync: jest.fn()
}));

describe("third-party package (remark-rehype) transformation for ESM", () => {
  beforeAll(() => {
    mockLocalProjectPackageJSON("esm");
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test("transformation of remark-rehype", () => {
      const pluginOptions = { isCacheEnabled: true };
      expect(
        pluginTransform(
          'import remarkRehype from "remark-rehype";',
          __filename,
          pluginOptions
        )
      ).toBe([
      `import remarkRehype from \"${process.cwd()}\\node_modules\\remark-rehype\\lib\\index.js";`,
      ].join("\n").replaceAll("\\","\\\\"));
  });
});