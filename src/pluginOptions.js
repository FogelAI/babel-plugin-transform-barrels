let instance;

class PluginOptions {
    constructor() {
        this.executorName = "";
        this.options = {
            webpackAlias: {},
            webpackExtensions: [".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"],
            viteAlias: {},
            viteExtensions: [".mjs", ".js", ".mts", ".ts", ".jsx", ".tsx", ".json"],
            jestAlias: [],
            jestExtensions: ["js", "jsx", ".mjs", ".cjs", "ts", "tsx"],
            isCacheEnabled: false,
            logging: {
                type: "disabled",
                filePath: "log.txt"
            }
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
        } else if (options.viteAlias || options.viteExtensions) {
            return "vite";
        } else if (options.jestAlias || options.jestExtensions) {
            return "jest";
        } else {
            return "";
        }
    }
}

const singletonPluginOptions = new PluginOptions();

module.exports = singletonPluginOptions;