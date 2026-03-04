const ospath = require("path");
const pluginTransform = require("../../pluginTransform");
const { mockLocalProjectPackageJSON } = require("../jestMockFS");

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readFileSync: jest.fn()
}));

describe("third-party package (@emotion/react) transformation for ESM", () => {
  beforeAll(() => {
    mockLocalProjectPackageJSON("esm");
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test("transformation of @emotion/react", () => {
    const pluginOptions = { executorName: "jest" };
    expect(
      pluginTransform(
        'import { css } from "./foo";',
        __filename,
        pluginOptions
      )
    ).toBe([
    `import { css } from \"${process.cwd()}${"\\node_modules\\@emotion\\react\\dist\\emotion-react.esm.js".split("\\").join(ospath.sep)}";`,
    ].join("\n").replaceAll("\\","\\\\"));
  });
  
});
