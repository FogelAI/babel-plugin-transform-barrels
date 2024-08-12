const pluginTransform = require("../../../pluginTransform");
const ospath = require("path");

describe("third-party package (@ant-design/icons) transformation for CommonJS", () => {
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