const { SkippingCases } = require("./ast");
const { JestMock } = require("./jestMock");

class JestMockTransformer {
    constructor({ jestMock, pluginOptions, resolver }) {
      this.jestMock = jestMock;
      this.pluginOptions = pluginOptions;
      this.resolver = resolver;
    }

    transform(path, state) {
        if (!(this.pluginOptions.options.executorName === "jest")) return;
        if (!JestMock.isSpecificObjectFunctionCall(path.node.expression, "jest", "mock")) return;
        if (SkippingCases.isOneOfPathSkippingCases(path.node)) return;
        const parsedJSFile = state.filename;
        this.resolver.from = parsedJSFile;
        this.jestMock.load();
        if (!this.jestMock.barrelFile.isBarrelFileContent) return;
        this.jestMock.transformedExpressionStatement();      
    }
}

module.exports = { JestMockTransformer };