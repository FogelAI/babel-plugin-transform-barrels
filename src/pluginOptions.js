let instance;

class PluginOptions {
    constructor() {
        this.options = {
            executorName: "",
            webpackAlias: {},
            webpackExtensions: [".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"],
            jestAlias: [],
            jestExtensions: ["js", "jsx", ".mjs", ".cjs", "ts", "tsx"],
            isCacheEnabled: false
        };
        if (instance) {
          throw new Error("You can only create one instance!");
        }
        instance = this;
    }

    setOptions(options) {
        this.executorName = this.getExecutorName(options);
        this.options= {
            ...this.options,
            ...options
        };
    }

    getExecutorName(options) {
        if (options.webpackAlias || options.webpackExtensions) {
            return "webpack";
        } else if (options.jestAlias || options.jestExtensions) {
            return "jest";
        } else {
            return "";
        }
    }
}

const singletonPluginOptions = new PluginOptions();

module.exports = singletonPluginOptions;