const ospath = require("path");
const pluginTransform = require("../../pluginTransform");
const { mockLocalProjectPackageJSON } = require("../jestMockFS");

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readFileSync: jest.fn()
}));

describe("third-party package (@mui/icons-material) transformation for CommonJS", () => {
  beforeAll(() => {
    mockLocalProjectPackageJSON("cjs");
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test("transformation of @mui/icons-material", () => {
      const pluginOptions = { isCacheEnabled: true };
      expect(
        pluginTransform(
          'import {ZoomIn} from "@mui/icons-material";',
          __filename,
          pluginOptions
        )
      ).toBe([
      `import ZoomIn from \"${process.cwd()}${"\\node_modules\\@mui\\icons-material\\ZoomIn.js".split("\\").join(ospath.sep)}";`,
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
      `import ZoomIn from \"${process.cwd()}${"\\node_modules\\@mui\\icons-material\\ZoomIn.js".split("\\").join(ospath.sep)}";`,
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
    `import CircularProgress from \"${process.cwd()}${"\\node_modules\\@mui\\material\\node\\CircularProgress\\CircularProgress.js".split("\\").join(ospath.sep)}";`,
    `import Dialog from \"${process.cwd()}${"\\node_modules\\@mui\\material\\node\\Dialog\\Dialog.js".split("\\").join(ospath.sep)}";`,
    `import DialogContent from \"${process.cwd()}${"\\node_modules\\@mui\\material\\node\\DialogContent\\DialogContent.js".split("\\").join(ospath.sep)}";`,
    `import List from \"${process.cwd()}${"\\node_modules\\@mui\\material\\node\\List\\List.js".split("\\").join(ospath.sep)}";`,
    `import ListItem from \"${process.cwd()}${"\\node_modules\\@mui\\material\\node\\ListItem\\ListItem.js".split("\\").join(ospath.sep)}";`,
    `import ListItemText from \"${process.cwd()}${"\\node_modules\\@mui\\material\\node\\ListItemText\\ListItemText.js".split("\\").join(ospath.sep)}";`,
    `import Stack from \"${process.cwd()}${"\\node_modules\\@mui\\material\\node\\Stack\\Stack.js".split("\\").join(ospath.sep)}";`,
    ].join("\n").replaceAll("\\","\\\\"));
  });
});