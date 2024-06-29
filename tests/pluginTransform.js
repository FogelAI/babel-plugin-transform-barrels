const babel = require("@babel/core");
const plugin = require("../");

function transform(input, fileName, options) {
    const transformedCode = babel.transformSync(input, {
        plugins: [[plugin, options]],
        filename: fileName
      });
    return transformedCode.code;
}

module.exports = transform;