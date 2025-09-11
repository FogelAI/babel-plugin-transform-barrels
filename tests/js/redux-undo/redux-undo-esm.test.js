const pluginTransform = require("../../pluginTransform");
const { mockLocalProjectPackageJSON } = require("../jestMockFS");

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readFileSync: jest.fn()
}));

describe("third-party package (redux-undo) transformation for ESM", () => {
  beforeAll(() => {
    mockLocalProjectPackageJSON("esm");
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test("transformation of redux-undo", () => {
      const pluginOptions = { isCacheEnabled: true };
      expect(
        pluginTransform(
          'import { ActionCreators } from "../redux-experience";',
          __filename,
          pluginOptions
        )
      ).toBe([
      `import { ActionCreators } from \"${process.cwd()}\\node_modules\\redux-undo\\dist\\redux-undo.mjs";`,
      ].join("\n").replaceAll("\\","\\\\"));
  });
});