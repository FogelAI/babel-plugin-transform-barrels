const pluginTransform = require("../../pluginTransform");
const { mockLocalProjectPackageJSON } = require("../jestMockFS");

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readFileSync: jest.fn()
}));

describe("third-party package (@mui/icons-material) transformation for ESM", () => {
  beforeAll(() => {
    mockLocalProjectPackageJSON("esm");
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
      `import ZoomIn from \"${process.cwd()}\\node_modules\\@mui\\icons-material\\esm\\ZoomIn.js";`,
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
    `import CircularProgress from \"${process.cwd()}\\node_modules\\@mui\\material\\CircularProgress\\CircularProgress.js";`,
    `import Dialog from \"${process.cwd()}\\node_modules\\@mui\\material\\Dialog\\Dialog.js";`,
    `import DialogContent from \"${process.cwd()}\\node_modules\\@mui\\material\\DialogContent\\DialogContent.js";`,
    `import List from \"${process.cwd()}\\node_modules\\@mui\\material\\List\\List.js";`,
    `import ListItem from \"${process.cwd()}\\node_modules\\@mui\\material\\ListItem\\ListItem.js";`,
    `import ListItemText from \"${process.cwd()}\\node_modules\\@mui\\material\\ListItemText\\ListItemText.js";`,
    `import Stack from \"${process.cwd()}\\node_modules\\@mui\\material\\Stack\\Stack.js";`,
    ].join("\n").replaceAll("\\","\\\\"));
  });
});