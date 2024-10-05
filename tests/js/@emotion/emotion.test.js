const pluginTransform = require("../../pluginTransform");
const ospath = require("path");

describe("third-party package (@emotion/react) transformation for ESM", () => {
  test("transformation of @emotion/react", () => {
    const pluginOptions = { executorName: "jest" };
    expect(
      pluginTransform(
        'import { css } from "./foo";',
        __filename,
        pluginOptions
      )
    ).toBe([
    `import { css } from \"@emotion\\react\\dist\\emotion-react.esm.js";`,
    ].join("\n").replaceAll("\\","\\\\"));
  });
  
});
