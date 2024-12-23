const fs = require('fs');

const tsconfig = JSON.parse(fs.readFileSync('./tsconfig.json', 'utf-8'));

function convertPathsToModuleNameMapper(tsconfig) {
 const { paths } = tsconfig.compilerOptions || {};

 if (!paths) {
   return {};
 }

 const moduleNameMapper = {};
 for (const alias of Object.keys(paths)) {
   const cleanPaths = paths[alias].map(path=> path.replace('/*', '/$1'));
   const cleanAlias = alias.replace('/*', '/(.*)');
   moduleNameMapper[`^${cleanAlias}$`] = cleanPaths;
 }

 return moduleNameMapper;
}

module.exports = {
  verbose: true,
  roots: ["<rootDir>"],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  moduleNameMapper: {
    ...convertPathsToModuleNameMapper(tsconfig),
  },
  modulePaths: [tsconfig.compilerOptions.baseUrl],
  // for nx:
  // const path = require('path');
  // modulePaths: [path.resolve(tsconfig.compilerOptions.rootDir)],
  testMatch: [
    "<rootDir>/**/__tests__/**/*.{js,jsx,ts,tsx}",
    "<rootDir>/**/*.{spec,test}.{js,jsx,ts,tsx}",
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': require("path").resolve(__dirname, "./babelTransform.js"),
  },
  testPathIgnorePatterns: [
    "/node_modules/",
  ],
};
