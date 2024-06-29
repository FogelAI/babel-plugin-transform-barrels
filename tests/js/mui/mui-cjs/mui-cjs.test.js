const pluginTransform = require("../../../pluginTransform");
const ospath = require("path");

describe("third-party package (@mui/icons-material) transformation for CommonJS", () => {
  test("transformation of @mui/icons-material", () => {
      const pluginOptions = { isCacheEnabled: true };
      expect(
        pluginTransform(
          'import {ZoomIn} from "@mui/icons-material";',
          __filename,
          pluginOptions
        )
      ).toBe([
      `import ZoomIn from \"@mui\\icons-material\\ZoomIn.js";`,
      ].join("\n").replaceAll("\\","\\\\"));
  });

  test("transformation of webpack alias", () => {
      const alias = {
        icons: "@mui/icons-material",
      }
      const pluginOptions = { webpackAlias: alias, isCacheEnabled: true };
      expect(
        pluginTransform(
          'import { ZoomIn } from "icons";',
          __filename,
          pluginOptions
        )
      ).toBe([
      `import ZoomIn from \"@mui\\icons-material\\ZoomIn.js";`,
      ].join("\n").replaceAll("\\","\\\\"));
  });
});