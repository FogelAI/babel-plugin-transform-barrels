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

  test("transformation of @mui/material", () => {
    const pluginOptions = { isCacheEnabled: true };
    expect(
      pluginTransform(
        'import { CircularProgress, Dialog, DialogContent, List, ListItem, ListItemText, Stack } from "@mui/material";',
        __filename,
        pluginOptions
      )
    ).toBe([
    `import CircularProgress from \"@mui\\material\\CircularProgress\\CircularProgress.js";`,
    `import Dialog from \"@mui\\material\\Dialog\\Dialog.js";`,
    `import DialogContent from \"@mui\\material\\DialogContent\\DialogContent.js";`,
    `import List from \"@mui\\material\\List\\List.js";`,
    `import ListItem from \"@mui\\material\\ListItem\\ListItem.js";`,
    `import ListItemText from \"@mui\\material\\ListItemText\\ListItemText.js";`,
    `import Stack from \"@mui\\material\\Stack\\Stack.js";`,
    ].join("\n").replaceAll("\\","\\\\"));
  });
});