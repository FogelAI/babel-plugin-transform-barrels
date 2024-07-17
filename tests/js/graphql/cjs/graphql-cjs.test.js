const pluginTransform = require("../../../pluginTransform");

describe("third-party package (graphql) transformation for CommonJS", () => {
  test("transformation of graphql", () => {
      const pluginOptions = { isCacheEnabled: true };
      expect(
        pluginTransform(
          'import { graphql } from "graphql";',
          __filename,
          pluginOptions
        )
      ).toBe([
      `import { graphql } from \"graphql\\graphql.js";`,
      ].join("\n").replaceAll("\\","\\\\"));
  });
});