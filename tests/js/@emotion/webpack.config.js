const path = require('path');

module.exports = {
  mode: "production",
  devtool: false,
  optimization: {
    usedExports: true,
    sideEffects: true,
  },
  entry: "./bar.js",
  resolve: {
  },
  module: {
    rules: [
      {
        test: /\.(js|mjs|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        loader: require.resolve("babel-loader"),
        options: {
          plugins: [["../../../", { executorName: "webpack", logging: {type: "file"} }]],
        },
      },
    ],
  },
};