const pluginTransform = require("../../../pluginTransform");

describe("third-party package (redux-undo) transformation for CommonJS", () => {
  test("transformation of redux-undo", () => {
      const pluginOptions = { isCacheEnabled: true };
      expect(
        pluginTransform(
          'import { ActionCreators } from "../redux-experience";',
          __filename,
          pluginOptions
        )
      ).toBe([
      `import { ActionCreators } from \"redux-undo";`,
      ].join("\n").replaceAll("\\","\\\\"));
  });
});