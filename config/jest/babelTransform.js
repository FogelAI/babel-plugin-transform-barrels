const babelJest = require("babel-jest").default;

function normalizeExtensions(moduleFileExtensions, defaultPlatform) {
  if (!defaultPlatform) return moduleFileExtensions;
  const normalizedExtensions = moduleFileExtensions.map(ext => `${defaultPlatform}.${ext}`);
  return [...moduleFileExtensions, ...normalizedExtensions];
}

module.exports = {
  process(sourceText, sourcePath, options) {
    const alias = options?.config?.moduleNameMapper;
    const extensions = normalizeExtensions(options.config.moduleFileExtensions, options?.config?.haste?.defaultPlatform);
    const babelTransformer = babelJest.createTransformer({
      presets: [["@babel/preset-react"], ["@babel/preset-env"]],
      plugins: [["transform-barrels", { executorName: "jest", alias: alias, extensions: extensions }]],
      babelrc: false,
      configFile: false,
    });
    return babelTransformer.process(sourceText, sourcePath, options);
  },
};
