let instance;

class PluginOptions {
    constructor() {
        this.options = {
            webpackAlias: {},
            jestAlias: [],
            isCacheEnabled: false
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