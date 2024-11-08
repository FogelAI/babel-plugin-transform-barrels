const pluginTransform = require("../../../pluginTransform");

describe("third-party package (react-virtualized) transformation for ESM", () => {
  test("transformation of react-virtualized", () => {
      const pluginOptions = { logging: {type: "file"} };
      expect(
        pluginTransform(
          'import { AutoSizer, List } from "react-virtualized";',
          __filename,
          pluginOptions
        )
      ).toBe([
      `import AutoSizer from \"react-virtualized\\dist\\es\\AutoSizer\\AutoSizer.js";`,
      `import List from \"react-virtualized\\dist\\es\\List\\List.js";`,
      ].join("\n").replaceAll("\\","\\\\"));
  });
});