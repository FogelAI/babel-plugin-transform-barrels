const pluginTransform = require("../../pluginTransform");
const { mockLocalProjectPackageJSON } = require("../jestMockFS");

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readFileSync: jest.fn()
}));

describe("third-party package (@ant-design/icons) transformation for ESM", () => {
  beforeAll(() => {
    mockLocalProjectPackageJSON("esm");
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
});