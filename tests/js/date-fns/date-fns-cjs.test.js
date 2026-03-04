const ospath = require("path");
const pluginTransform = require("../../pluginTransform");
const { mockLocalProjectPackageJSON } = require("../jestMockFS");

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readFileSync: jest.fn()
}));

describe("third-party package (date-fns) transformation for CommonJS", () => {
  beforeAll(() => {
    mockLocalProjectPackageJSON("cjs");
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
      `import { compareAsc } from \"${process.cwd()}${"\\node_modules\\date-fns\\compareAsc.cjs".split("\\").join(ospath.sep)}";`,
      `import { format } from \"${process.cwd()}${"\\node_modules\\date-fns\\format.cjs".split("\\").join(ospath.sep)}";`,
      ].join("\n").replaceAll("\\","\\\\"));
  });
});