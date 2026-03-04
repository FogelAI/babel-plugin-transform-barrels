const ospath = require("path");
const pluginTransform = require("../../pluginTransform");
const { mockLocalProjectPackageJSON } = require("../jestMockFS");

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readFileSync: jest.fn()
}));

describe("third-party package (fast-json-patch) transformation for ESM", () => {
  beforeAll(() => {
    mockLocalProjectPackageJSON("esm");
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test("transformation of fast-json-patch", () => {
      const pluginOptions = { isCacheEnabled: true, logging: {type: "file"} };
      expect(
        pluginTransform(
          'import { compare } from "fast-json-patch";',
          __filename,
          pluginOptions
        )
      ).toBe([
      `import { compare } from \"${process.cwd()}${"\\node_modules\\fast-json-patch\\module\\duplex.mjs".split("\\").join(ospath.sep)}";`,
      ].join("\n").replaceAll("\\","\\\\"));
  });
});