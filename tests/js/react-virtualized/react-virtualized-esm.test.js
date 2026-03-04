const ospath = require("path");
const pluginTransform = require("../../pluginTransform");
const { mockLocalProjectPackageJSON } = require("../jestMockFS");

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readFileSync: jest.fn()
}));

describe("third-party package (react-virtualized) transformation for ESM", () => {
  beforeAll(() => {
    mockLocalProjectPackageJSON("esm");
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test("transformation of react-virtualized", () => {
      const pluginOptions = { logging: {type: "file"} };
      expect(
        pluginTransform(
          'import { AutoSizer, List } from "react-virtualized";',
          __filename,
          pluginOptions
        )
      ).toBe([
      `import AutoSizer from \"${process.cwd()}${"\\node_modules\\react-virtualized\\dist\\es\\AutoSizer\\AutoSizer.js".split("\\").join(ospath.sep)}";`,
      `import List from \"${process.cwd()}${"\\node_modules\\react-virtualized\\dist\\es\\List\\List.js".split("\\").join(ospath.sep)}";`,
      ].join("\n").replaceAll("\\","\\\\"));
  });
});