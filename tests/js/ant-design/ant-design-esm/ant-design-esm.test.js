const pluginTransform = require("../../../pluginTransform");
const ospath = require("path");

describe("third-party package (@ant-design/icons) transformation for ESM", () => {
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