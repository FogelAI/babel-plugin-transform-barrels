let instance;

class PluginOptions {
    constructor() {
        this.options = {
            executorName: "other",
            alias: {},
            extensions: [".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"],
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
        this.options= {
            ...this.options,
            ...options
        };
    }
}

const singletonPluginOptions = new PluginOptions();

module.exports = singletonPluginOptions;