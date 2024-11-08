const pluginTransform = require("../../../pluginTransform");
const ospath = require("path");

describe("third-party package (style-to-object) transformation for ESM", () => {
  test("transformation of style-to-object", () => {
      const pluginOptions = { isCacheEnabled: true, logging: {type: "file"} };
      expect(
        pluginTransform(
          'import style from "style-to-object";',
          __filename,
          pluginOptions
        )
      ).toBe([
      `import style from \"style-to-object";`,
      ].join("\n").replaceAll("\\","\\\\"));
  });
});