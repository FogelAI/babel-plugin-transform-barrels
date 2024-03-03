const babelJest = require("babel-jest").default;

module.exports = {
  process(sourceText, sourcePath, options) {
    const alias = options.config.moduleNameMapper;
    const babelTransformer = babelJest.createTransformer({
      presets: [["@babel/preset-react"], ["@babel/preset-env"]],
      plugins: [["transform-barrels", { jestAlias: alias }]],
      babelrc: false,
      configFile: false,
    });
    return babelTransformer.process(sourceText, sourcePath, options);
  },
};
