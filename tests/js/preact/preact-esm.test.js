const pluginTransform = require("../../pluginTransform");
const { mockLocalProjectPackageJSON } = require("../jestMockFS");

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readFileSync: jest.fn()
}));

const alias = {
  "react": "preact/compat",
  "react-dom": "preact/compat"
}

describe("third-party package (preact/compat) transformation for ESM", () => {
  beforeAll(() => {
    mockLocalProjectPackageJSON("esm");
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test("transformation of preact/compat 1", () => {
      const pluginOptions = { executorName: "webpack", alias: alias };
      expect(
        pluginTransform(
          'import { Suspense, lazy } from "react";',
          __filename,
          pluginOptions
        )
      ).toBe([
      `import { Suspense, lazy } from \"react";`,
      ].join("\n").replaceAll("\\","\\\\"));
  });
  test("transformation of preact/compat 2", () => {
    const pluginOptions = { executorName: "webpack", alias: alias };
    expect(
      pluginTransform(
        'import { createRoot } from "react-dom/client";',
        __filename,
        pluginOptions
      )
    ).toBe([
    `import { createRoot } from \"react-dom/client";`,
    ].join("\n").replaceAll("\\","\\\\"));
  });
});