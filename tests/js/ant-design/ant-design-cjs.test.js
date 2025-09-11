const pluginTransform = require("../../pluginTransform");
const { mockLocalProjectPackageJSON } = require("../jestMockFS");

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readFileSync: jest.fn()
}));

describe("third-party package (@ant-design/icons) transformation for CommonJS", () => {
  beforeAll(() => {
    mockLocalProjectPackageJSON("cjs");
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test("transformation of @ant-design/icons", () => {
      const pluginOptions = { isCacheEnabled: true };
      expect(
        pluginTransform(
          'import { ZoomInOutlined } from "@ant-design/icons";',
          __filename,
          pluginOptions
        )
      ).toBe([
      `import { ZoomInOutlined } from \"@ant-design/icons";`,
      ].join("\n").replaceAll("\\","\\\\"));
  });

  test("transformation of webpack alias", () => {
      const alias = {
        icons: "@ant-design/icons",
      }
      const pluginOptions = { executorName: "webpack", alias: alias, isCacheEnabled: true };
      expect(
        pluginTransform(
          'import { ZoomInOutlined } from "icons";',
          __filename,
          pluginOptions
        )
      ).toBe([
      `import { ZoomInOutlined } from \"icons";`,
      ].join("\n").replaceAll("\\","\\\\"));
  });
});