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
        `jest.mock(\"${ospath.resolve(__dirname)}${"\\components\\Texts\\RedText\\RedText.js".split("\\").join(ospath.sep)}", () => ({`,
        `  RedText: jest.fn()`,
        `}));`,
        `jest.mock(\"${ospath.resolve(__dirname)}${"\\components\\Texts\\Text\\Text.js".split("\\").join(ospath.sep)}", () => ({`,
        `  Text: jest.fn()`,
        `}));`,
      ].join("\n").replaceAll("\\","\\\\"));
    });

    test("transformation of local module path - specific specifiers with return statement", () => {
      const pluginOptions = { executorName: "jest", logging: {type: "file"} };
      expect(
        pluginTransform([
          `jest.mock('./components/Texts', () => {`,
          `  return { RedText: jest.fn(),`,
          `  Text: jest.fn() }`,
          `});`,
          ].join("\n"),
          __filename,
          pluginOptions
        )
      ).toBe([
        `jest.mock(\"${ospath.resolve(__dirname)}${"\\components\\Texts\\RedText\\RedText.js".split("\\").join(ospath.sep)}", () => {`,
        `  return {`,
        `    RedText: jest.fn()`,
        `  };`,
        `});`,
        `jest.mock(\"${ospath.resolve(__dirname)}${"\\components\\Texts\\Text\\Text.js".split("\\").join(ospath.sep)}", () => {`,
        `  return {`,
        `    Text: jest.fn()`,
        `  };`,
        `});`,
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
        `jest.mock(\"${ospath.resolve(__dirname)}${"\\components\\Texts\\YellowText\\YellowText.js".split("\\").join(ospath.sep)}");`,
        `jest.mock(\"${ospath.resolve(__dirname)}${"\\components\\Texts\\BlueText\\BlueText.js".split("\\").join(ospath.sep)}");`,
        `jest.mock(\"${ospath.resolve(__dirname)}${"\\components\\Texts\\GreenText\\GreenText.js".split("\\").join(ospath.sep)}");`,
        `jest.mock(\"${ospath.resolve(__dirname)}${"\\components\\Texts\\Text\\Text.js".split("\\").join(ospath.sep)}");`,
        `jest.mock(\"${ospath.resolve(__dirname)}${"\\components\\Texts\\RedText\\RedText.js".split("\\").join(ospath.sep)}");`,
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
          `jest.mock(\"${process.cwd()}${"\\node_modules\\@mui\\material\\node\\Accordion\\Accordion.js".split("\\").join(ospath.sep)}", () => ({`,
          `  default: jest.fn()`,
          `}));`,
          `jest.mock(\"${process.cwd()}${"\\node_modules\\@mui\\material\\node\\Alert\\Alert.js".split("\\").join(ospath.sep)}", () => ({`,
          `  default: jest.fn()`,
          `}));`,
        ].join("\n").replaceAll("\\","\\\\"));
    });

    test("transformation of third-party module path", () => {
        const pluginOptions = { executorName: "jest", logging: {type: "file"} };
        expect(
          pluginTransform([
            `jest.mock('@react-native-google-signin/google-signin', () => ({`,
            `  statusCode: 'SUCCESS',`,
            `}));`,
            ].join("\n"),
            __filename,
            pluginOptions
          )
        ).toBe([
          `jest.mock(\"${process.cwd()}${"\\node_modules\\@react-native-google-signin\\google-signin\\lib\\commonjs\\errors\\errorCodes.js".split("\\").join(ospath.sep)}", () => ({`,
          `  statusCode: 'SUCCESS'`,
          `}));`,
          `jest.mock(\"${process.cwd()}${"\\node_modules\\@react-native-google-signin\\google-signin\\lib\\commonjs\\buttons\\GoogleSigninButton.js".split("\\").join(ospath.sep)}", () => ({`,
          `  statusCode: 'SUCCESS'`,
          `}));`,
          `jest.mock(\"${process.cwd()}${"\\node_modules\\@react-native-google-signin\\google-signin\\lib\\commonjs\\functions.js".split("\\").join(ospath.sep)}", () => ({`,
          `  statusCode: 'SUCCESS'`,
          `}));`,
          `jest.mock(\"${process.cwd()}${"\\node_modules\\@react-native-google-signin\\google-signin\\lib\\commonjs\\signIn\\GoogleSignin.js".split("\\").join(ospath.sep)}", () => ({`,
          `  statusCode: 'SUCCESS'`,
          `}));`,
        ].join("\n").replaceAll("\\","\\\\"));
    });

    test("transformation of local module path using the spread operator in jest.requireActual", () => {
      const pluginOptions = { executorName: "jest", logging: {type: "file"} };
      expect(
        pluginTransform([
          `jest.mock('./components/Texts', () => ({`,
          `  ...jest.requireActual('./components/Texts'),`,
          `}));`,
          ].join("\n"),
          __filename,
          pluginOptions
        )
      ).toBe([
        `jest.mock(\"${ospath.resolve(__dirname)}${"\\components\\Texts\\YellowText\\YellowText.js".split("\\").join(ospath.sep)}", () => ({`,
        `  ...jest.requireActual(\"${ospath.resolve(__dirname)}${"\\components\\Texts\\YellowText\\YellowText.js".split("\\").join(ospath.sep)}")`,
        `}));`,
        `jest.mock(\"${ospath.resolve(__dirname)}${"\\components\\Texts\\BlueText\\BlueText.js".split("\\").join(ospath.sep)}", () => ({`,
        `  ...jest.requireActual(\"${ospath.resolve(__dirname)}${"\\components\\Texts\\BlueText\\BlueText.js".split("\\").join(ospath.sep)}")`,
        `}));`,
        `jest.mock(\"${ospath.resolve(__dirname)}${"\\components\\Texts\\GreenText\\GreenText.js".split("\\").join(ospath.sep)}", () => ({`,
        `  ...jest.requireActual(\"${ospath.resolve(__dirname)}${"\\components\\Texts\\GreenText\\GreenText.js".split("\\").join(ospath.sep)}")`,
        `}));`,
        `jest.mock(\"${ospath.resolve(__dirname)}${"\\components\\Texts\\Text\\Text.js".split("\\").join(ospath.sep)}", () => ({`,
        `  ...jest.requireActual(\"${ospath.resolve(__dirname)}${"\\components\\Texts\\Text\\Text.js".split("\\").join(ospath.sep)}")`,
        `}));`,
        `jest.mock(\"${ospath.resolve(__dirname)}${"\\components\\Texts\\RedText\\RedText.js".split("\\").join(ospath.sep)}", () => ({`,
        `  ...jest.requireActual(\"${ospath.resolve(__dirname)}${"\\components\\Texts\\RedText\\RedText.js".split("\\").join(ospath.sep)}")`,
        `}));`,
      ].join("\n").replaceAll("\\","\\\\"));
    });

    test("transformation of local module path using the jest.requireActual", () => {
      const pluginOptions = { executorName: "jest", logging: {type: "file"} };
      expect(
        pluginTransform([
          `jest.mock('./components/Texts', () => jest.requireActual('./components/Texts'))`,
          ].join("\n"),
          __filename,
          pluginOptions
        )
      ).toBe([
        `jest.mock(\"${ospath.resolve(__dirname)}${"\\components\\Texts\\YellowText\\YellowText.js".split("\\").join(ospath.sep)}", () => jest.requireActual(\"${ospath.resolve(__dirname)}${"\\components\\Texts\\YellowText\\YellowText.js".split("\\").join(ospath.sep)}"));`,
        `jest.mock(\"${ospath.resolve(__dirname)}${"\\components\\Texts\\BlueText\\BlueText.js".split("\\").join(ospath.sep)}", () => jest.requireActual(\"${ospath.resolve(__dirname)}${"\\components\\Texts\\BlueText\\BlueText.js".split("\\").join(ospath.sep)}"));`,
        `jest.mock(\"${ospath.resolve(__dirname)}${"\\components\\Texts\\GreenText\\GreenText.js".split("\\").join(ospath.sep)}", () => jest.requireActual(\"${ospath.resolve(__dirname)}${"\\components\\Texts\\GreenText\\GreenText.js".split("\\").join(ospath.sep)}"));`,
        `jest.mock(\"${ospath.resolve(__dirname)}${"\\components\\Texts\\Text\\Text.js".split("\\").join(ospath.sep)}", () => jest.requireActual(\"${ospath.resolve(__dirname)}${"\\components\\Texts\\Text\\Text.js".split("\\").join(ospath.sep)}"));`,
        `jest.mock(\"${ospath.resolve(__dirname)}${"\\components\\Texts\\RedText\\RedText.js".split("\\").join(ospath.sep)}", () => jest.requireActual(\"${ospath.resolve(__dirname)}${"\\components\\Texts\\RedText\\RedText.js".split("\\").join(ospath.sep)}"));`,
      ].join("\n").replaceAll("\\","\\\\"));
    });

    test("transformation of local module path using the spread operator in jest.requireActual and specifiers", () => {
      const pluginOptions = { executorName: "jest", logging: {type: "file"} };
      expect(
        pluginTransform([
          `jest.mock('./components/Texts', () => ({`,
          `  ...jest.requireActual('./components/Texts'),`,
          `  RedText: jest.fn(),`,
          `  Text: jest.fn(),`,
          `}));`,
          ].join("\n"),
          __filename,
          pluginOptions
        )
      ).toBe([
        `jest.mock(\"${ospath.resolve(__dirname)}${"\\components\\Texts\\RedText\\RedText.js".split("\\").join(ospath.sep)}", () => ({`,
        `  ...jest.requireActual(\"${ospath.resolve(__dirname)}${"\\components\\Texts\\RedText\\RedText.js".split("\\").join(ospath.sep)}"),`,
        `  RedText: jest.fn()`,
        `}));`,
        `jest.mock(\"${ospath.resolve(__dirname)}${"\\components\\Texts\\Text\\Text.js".split("\\").join(ospath.sep)}", () => ({`,
        `  ...jest.requireActual(\"${ospath.resolve(__dirname)}${"\\components\\Texts\\Text\\Text.js".split("\\").join(ospath.sep)}"),`,
        `  Text: jest.fn()`,
        `}));`,
      ].join("\n").replaceAll("\\","\\\\"));
    });
});