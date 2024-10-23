const pluginTransform = require("../../../pluginTransform");
const ospath = require("path");

describe("third-party package (fast-json-patch) transformation for ESM", () => {
  test("transformation of fast-json-patch", () => {
      const pluginOptions = { isCacheEnabled: true, logging: {type: "file"} };
      expect(
        pluginTransform(
          'import { compare } from "fast-json-patch";',
          __filename,
          pluginOptions
        )
      ).toBe([
      `import { compare } from \"fast-json-patch\\module\\duplex.mjs";`,
      ].join("\n").replaceAll("\\","\\\\"));
  });
});