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
      const pluginOptions = { executorName: "webpack", alias: alias, isCacheEnabled: true };
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

  test("transformation of @mui/material", () => {
    const pluginOptions = { isCacheEnabled: true };
    expect(
      pluginTransform(
        'import { CircularProgress, Dialog, DialogContent, List, ListItem, ListItemText, Stack } from "@mui/material";',
        __filename,
        pluginOptions
      )
    ).toBe([
    `import CircularProgress from \"@mui\\material\\node\\CircularProgress\\CircularProgress.js";`,
    `import Dialog from \"@mui\\material\\node\\Dialog\\Dialog.js";`,
    `import DialogContent from \"@mui\\material\\node\\DialogContent\\DialogContent.js";`,
    `import List from \"@mui\\material\\node\\List\\List.js";`,
    `import ListItem from \"@mui\\material\\node\\ListItem\\ListItem.js";`,
    `import ListItemText from \"@mui\\material\\node\\ListItemText\\ListItemText.js";`,
    `import Stack from \"@mui\\material\\node\\Stack\\Stack.js";`,
    ].join("\n").replaceAll("\\","\\\\"));
  });
});