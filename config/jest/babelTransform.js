const babelJest = require("babel-jest").default;

module.exports = {
  process(sourceText, sourcePath, options) {
    const alias = options?.config?.moduleNameMapper;
    const extensions = options.config.moduleFileExtensions;
    const babelTransformer = babelJest.createTransformer({
      presets: [["@babel/preset-react"], ["@babel/preset-env"]],
      plugins: [["transform-barrels", { executorName: "jest", alias: alias, extensions: extensions }]],
      babelrc: false,
      configFile: false,
    });
    return babelTransformer.process(sourceText, sourcePath, options);
  },
};
