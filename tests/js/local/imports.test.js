const pluginTransform = require("../../pluginTransform");
const ospath = require("path");

describe("local package transformation", () => {
  test("transformation of renamed named import", () => {
    expect(
      pluginTransform(
        'import { RedText as NamedExported } from "./components/Texts";',
        __filename
      )
    ).toBe(`import { RedText as NamedExported } from \"${ospath.resolve(__dirname)}\\components\\Texts\\RedText\\RedText.js";`.replaceAll("\\","\\\\"));
  });

  test("transformation of named export that imported from a barrel file that has one line for the import and one line for the export of the same specifier", () => {
    expect(
      pluginTransform(
        'import { ImportedAndExported } from "./components/Texts";',
        __filename
      )
    ).toBe(`import { YellowText as ImportedAndExported } from \"${ospath.resolve(__dirname)}\\components\\Texts\\YellowText\\YellowText.js";`.replaceAll("\\","\\\\"));
  });

  test("transformation of a default import and a named import re-exporting the entire module namespace", () => {
    expect(
      pluginTransform(
        'import GreenTextDefault, { ImportedAllToNamespace } from "./components/Texts";',
        __filename
      )
    ).toBe([
    `import { GreenText as GreenTextDefault } from \"${ospath.resolve(__dirname)}\\components\\Texts\\GreenText\\GreenText.js";`,
    `import * as ImportedAllToNamespace from \"${ospath.resolve(__dirname)}\\components\\Texts\\BlueText\\BlueText.js";`
    ].join("\n").replaceAll("\\","\\\\"));
  });

  test("transformation of index.js file that doesn't have barrel file content (just a regular module), do nothing", () => {
    expect(
      pluginTransform(
        'import NotBarrelContent from "./components/NotBarrelContent";',
        __filename
      )
    ).toBe([
    `import NotBarrelContent from \"./components/NotBarrelContent";`
    ].join("\n").replaceAll("\\","\\\\"));
  });

  test("transformation of named import that in the barrel file is reexported all the other module", () => {
    expect(
      pluginTransform(
        'import { FirstReexported } from "./components/ReexportedAll";',
        __filename
      )
    ).toBe([
    `import { FirstReexported } from \"${ospath.resolve(__dirname)}\\components\\ReexportedAll\\ReexportedAll.js";`,
    ].join("\n").replaceAll("\\","\\\\"));
  });

  test("transformation of named import that in the barrel file is reexported all the other module. In the other module there is export of object pattern", () => {
    expect(
      pluginTransform(
        'import { firstKeyVar, secondKeyVar } from "./components/ReexportedAll";',
        __filename
      )
    ).toBe([
    `import { firstKeyVar } from \"${ospath.resolve(__dirname)}\\components\\ReexportedAll\\ReexportedAll.js";`,
    `import { secondKeyVar } from \"${ospath.resolve(__dirname)}\\components\\ReexportedAll\\ReexportedAll.js";`,
    ].join("\n").replaceAll("\\","\\\\"));
  });
});

describe("aliases", () => {
  test("transformation of webpack alias", () => {
    const alias = {
      components: ospath.resolve(__dirname, 'components'),
    }
    const pluginOptions = { executorName: "webpack", alias: alias };
    expect(
      pluginTransform(
        'import { Text } from "components/Texts";',
        __filename,
        pluginOptions
      )
    ).toBe([
      `import { Text } from \"${ospath.resolve(__dirname)}\\components\\Texts\\Text\\Text.js";`,
    ].join("\n").replaceAll("\\","\\\\"));
  });

  test("transformation of webpack alias - exact match", () => {
    const alias = {
      texts$: ospath.resolve(__dirname, 'components/Texts'),
    }
    const pluginOptions = { executorName: "webpack", alias: alias };
    expect(
      pluginTransform(
        'import { Text } from "texts";',
        __filename,
        pluginOptions
      )
    ).toBe([
      `import { Text } from \"${ospath.resolve(__dirname)}\\components\\Texts\\Text\\Text.js";`,
    ].join("\n").replaceAll("\\","\\\\"));
  });

  test("transformation of vite alias", () => {
    const alias = {
      components: ospath.resolve(__dirname, 'components'),
    }
    const pluginOptions = { executorName: "vite", alias: alias };
    expect(
      pluginTransform(
        'import { Text } from "components/Texts";',
        __filename,
        pluginOptions
      )
    ).toBe([
      `import { Text } from \"${ospath.resolve(__dirname)}\\components\\Texts\\Text\\Text.js";`,
    ].join("\n").replaceAll("\\","\\\\"));
  });

  test("transformation of jest alias", () => {
    const alias = Object.entries({
      "^abc/(.*)$": "./components/$1"
    });
    const pluginOptions = { executorName: "jest", alias: alias };
    expect(
      pluginTransform(
        'import { Text } from "abc/Texts";',
        __filename,
        pluginOptions
      )
    ).toBe([
      `import { Text } from \"${ospath.resolve(__dirname)}\\components\\Texts\\Text\\Text.js";`,
    ].join("\n").replaceAll("\\","\\\\"));
  });
});

describe("logs", () => {
  test("log to screen - transformation of named export", () => {
    const log = {
      type: "screen",
    }
    const pluginOptions = { logging: log };
    expect(
      pluginTransform(
        'import { RedText as NamedExported } from "./components/Texts";',
        __filename,
        pluginOptions
      )
    ).toBe(`import { RedText as NamedExported } from \"${ospath.resolve(__dirname)}\\components\\Texts\\RedText\\RedText.js";`.replaceAll("\\","\\\\"));
  });

  test("log to file - transformation of named export", () => {
    const log = {
      type: "file",
    }
    const pluginOptions = { logging: log };
    expect(
      pluginTransform(
        'import { RedText as NamedExported } from "./components/Texts";',
        __filename,
        pluginOptions
      )
    ).toBe(`import { RedText as NamedExported } from \"${ospath.resolve(__dirname)}\\components\\Texts\\RedText\\RedText.js";`.replaceAll("\\","\\\\"));
  });
});

describe("modules directories", () => {
  test("resolve modules directories - relative path", () => {
    const modulesDirs = ["node_modules", "components"];
    const pluginOptions = { executorName: "webpack", modulesDirs: modulesDirs };
    expect(
      pluginTransform(
        'import { RedText as NamedExported } from "Texts";',
        __filename,
        pluginOptions
      )
    ).toBe(`import { RedText as NamedExported } from \"${ospath.resolve(__dirname)}\\components\\Texts\\RedText\\RedText.js";`.replaceAll("\\","\\\\"));
  });

  test("resolve modules directories - absolute path", () => {
    const modulesDirs = [ospath.resolve(__dirname, 'components'), 'node_modules'];
    const pluginOptions = { executorName: "webpack", modulesDirs: modulesDirs };
    expect(
      pluginTransform(
        'import { RedText as NamedExported } from "Texts";',
        __filename,
        pluginOptions
      )
    ).toBe(`import { RedText as NamedExported } from \"${ospath.resolve(__dirname)}\\components\\Texts\\RedText\\RedText.js";`.replaceAll("\\","\\\\"));
  });
});

describe("jest mock", () => {
  test("transformation of module path", () => {
    const pluginOptions = { executorName: "jest", logging: {type: "file"} };
    expect(
      pluginTransform([
        'import { RedText, Text } from "./components/Texts";', 
        `jest.mock('./components/Texts', () => ({`,
        `  RedText: jest.fn(),`,
        `  Text: jest.fn(),`,
        `}));`,
        `jest.mock('./components/Texts');`,
        `console.log("test");`
        ].join("\n"),
        __filename,
        pluginOptions
      )
    ).toBe([
      `import { RedText } from \"${ospath.resolve(__dirname)}\\components\\Texts\\RedText\\RedText.js";`,
      `import { Text } from \"${ospath.resolve(__dirname)}\\components\\Texts\\Text\\Text.js";`,
      `jest.mock(\"${ospath.resolve(__dirname)}\\components\\Texts\\RedText\\RedText.js", () => ({`,
      `  RedText: jest.fn()`,
      `}));`,
      `jest.mock(\"${ospath.resolve(__dirname)}\\components\\Texts\\Text\\Text.js", () => ({`,
      `  Text: jest.fn()`,
      `}));`,
      `jest.mock(\"${ospath.resolve(__dirname)}\\components\\Texts\\RedText\\RedText.js");`,
      `jest.mock(\"${ospath.resolve(__dirname)}\\components\\Texts\\Text\\Text.js");`,
      `console.log("test");`
    ].join("\n").replaceAll("\\","\\\\"));
  });
});
