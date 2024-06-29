const pluginTransform = require("../../../pluginTransform");
const ospath = require("path");

describe("third-party package (@mui/icons-material) transformation for ESM", () => {
  test("transformation of @mui/icons-material", () => {
      const pluginOptions = { isCacheEnabled: true };
      expect(
        pluginTransform(
          'import {ZoomIn} from "@mui/icons-material";',
          __filename,
          pluginOptions
        )
      ).toBe([
      `import ZoomIn from \"@mui\\icons-material\\esm\\ZoomIn.js";`,
      ].join("\n").replaceAll("\\","\\\\"));
  });
});