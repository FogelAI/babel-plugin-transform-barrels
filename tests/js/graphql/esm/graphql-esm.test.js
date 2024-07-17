const pluginTransform = require("../../../pluginTransform");

describe("third-party package (graphql) transformation for ESM", () => {
  test("transformation of graphql", () => {
      const pluginOptions = { isCacheEnabled: true };
      expect(
        pluginTransform(
          'import { graphql } from "graphql";',
          __filename,
          pluginOptions
        )
      ).toBe([
      `import { graphql } from \"graphql\\graphql.mjs";`,
      ].join("\n").replaceAll("\\","\\\\"));
  });
});