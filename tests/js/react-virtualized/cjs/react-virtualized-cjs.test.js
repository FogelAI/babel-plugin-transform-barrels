const pluginTransform = require("../../../pluginTransform");

describe("third-party package (react-virtualized) transformation for CommonJS", () => {
  test("transformation of react-virtualized", () => {
      const pluginOptions = { isCacheEnabled: true };
      expect(
        pluginTransform(
          'import { AutoSizer, List } from "react-virtualized";',
          __filename,
          pluginOptions
        )
      ).toBe([
      `import AutoSizer from \"react-virtualized\\dist\\commonjs\\AutoSizer\\AutoSizer.js";`,
      `import List from \"react-virtualized\\dist\\commonjs\\List\\List.js";`,
      ].join("\n").replaceAll("\\","\\\\"));
  });
});