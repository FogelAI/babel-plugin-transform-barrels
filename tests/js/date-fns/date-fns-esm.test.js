const ospath = require("path");
const pluginTransform = require("../../pluginTransform");
const { mockLocalProjectPackageJSON } = require("../jestMockFS");

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readFileSync: jest.fn()
}));

describe("third-party package (date-fns) transformation for ESM", () => {
  beforeAll(() => {
    mockLocalProjectPackageJSON("esm");
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test("transformation of date-fns", () => {
      const pluginOptions = { isCacheEnabled: true };
      expect(
        pluginTransform(
          'import { compareAsc, format } from "date-fns";',
          __filename,
          pluginOptions
        )
      ).toBe([
      `import { compareAsc } from \"${process.cwd()}${"\\node_modules\\date-fns\\compareAsc.js".split("\\").join(ospath.sep)}";`,
      `import { format } from \"${process.cwd()}${"\\node_modules\\date-fns\\format.js".split("\\").join(ospath.sep)}";`,
      ].join("\n").replaceAll("\\","\\\\"));
  });
});