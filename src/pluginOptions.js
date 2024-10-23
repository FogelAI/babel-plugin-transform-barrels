let instance;

class PluginOptions {
    static defaultOptions = {
        executorName: "other",
        alias: {},
        extensions: [".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"],
        modulesDirs: ["node_modules"],
        isCacheEnabled: false,
        logging: {
            type: "disabled",
            filePath: "log.txt"
        }
    };

    constructor() {
        this.options = PluginOptions.defaultOptions;
        if (instance) {
          throw new Error("You can only create one instance!");
        }
        instance = this;
    }

    setOptions(options) {
        this.options= {
            ...PluginOptions.defaultOptions,
            ...options
        };
    }
}

const singletonPluginOptions = new PluginOptions();

module.exports = singletonPluginOptions;