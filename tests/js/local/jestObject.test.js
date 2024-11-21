const pluginTransform = require("../../pluginTransform");
const ospath = require("path");

describe("jest mock", () => {
    test("transformation of local module path - specific specifiers", () => {
      const pluginOptions = { executorName: "jest", logging: {type: "file"} };
      expect(
        pluginTransform([
          `jest.mock('./components/Texts', () => ({`,
          `  RedText: jest.fn(),`,
          `  Text: jest.fn(),`,
          `}));`,
          ].join("\n"),
          __filename,
          pluginOptions
        )
      ).toBe([
        `jest.mock(\"${ospath.resolve(__dirname)}\\components\\Texts\\RedText\\RedText.js", () => ({`,
        `  RedText: jest.fn()`,
        `}));`,
        `jest.mock(\"${ospath.resolve(__dirname)}\\components\\Texts\\Text\\Text.js", () => ({`,
        `  Text: jest.fn()`,
        `}));`,
      ].join("\n").replaceAll("\\","\\\\"));
    });

    test("transformation of local module path - side effect import", () => {
      const pluginOptions = { executorName: "jest", logging: {type: "file"} };
      expect(
        pluginTransform([
          `jest.mock('./components/Texts');`,
          ].join("\n"),
          __filename,
          pluginOptions
        )
      ).toBe([
        `jest.mock(\"${ospath.resolve(__dirname)}\\components\\Texts\\YellowText\\YellowText.js");`,
        `jest.mock(\"${ospath.resolve(__dirname)}\\components\\Texts\\BlueText\\BlueText.js");`,
        `jest.mock(\"${ospath.resolve(__dirname)}\\components\\Texts\\GreenText\\GreenText.js");`,
        `jest.mock(\"${ospath.resolve(__dirname)}\\components\\Texts\\Text\\Text.js");`,
        `jest.mock(\"${ospath.resolve(__dirname)}\\components\\Texts\\RedText\\RedText.js");`,
      ].join("\n").replaceAll("\\","\\\\"));
    });

    test("transformation of third-party module path", () => {
        const pluginOptions = { executorName: "jest", logging: {type: "file"} };
        expect(
          pluginTransform([
            `jest.mock('@mui/material', () => ({`,
            `  Accordion: jest.fn(),`,
            `  Alert: jest.fn(),`,
            `}));`,
            ].join("\n"),
            __filename,
            pluginOptions
          )
        ).toBe([
          `jest.mock(\"@mui\\material\\node\\Accordion\\Accordion.js", () => ({`,
          `  Accordion: jest.fn()`,
          `}));`,
          `jest.mock(\"@mui\\material\\node\\Alert\\Alert.js", () => ({`,
          `  Alert: jest.fn()`,
          `}));`,
        ].join("\n").replaceAll("\\","\\\\"));
    });
});