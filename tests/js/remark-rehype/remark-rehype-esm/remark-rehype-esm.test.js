const pluginTransform = require("../../../pluginTransform");
const ospath = require("path");

describe("third-party package (remark-rehype) transformation for ESM", () => {
  test("transformation of remark-rehype", () => {
      const pluginOptions = { isCacheEnabled: true };
      expect(
        pluginTransform(
          'import remarkRehype from "remark-rehype";',
          __filename,
          pluginOptions
        )
      ).toBe([
      `import remarkRehype from \"remark-rehype\\lib\\index.js";`,
      ].join("\n").replaceAll("\\","\\\\"));
  });
});