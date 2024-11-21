const pluginTransform = require("../../../pluginTransform");
const ospath = require("path");

describe("third-party package (@apollo/client/testing) transformation for CommonJS", () => {
  test("transformation of @apollo/client/testing", () => {
      const pluginOptions = { isCacheEnabled: true };
      expect(
        pluginTransform(
          'import { MockedProvider } from "@apollo/client/testing";',
          __filename,
          pluginOptions
        )
      ).toBe([
      `import { MockedProvider } from "@apollo/client/testing";`,
      ].join("\n").replaceAll("\\","\\\\"));
  });
});