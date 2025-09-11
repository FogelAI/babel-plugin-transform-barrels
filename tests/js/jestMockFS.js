const fs = require("fs")
const ospath = require("path")

function mockLocalProjectPackageJSON(moduleType) {
    fs.readFileSync.mockImplementation((path, ...args) => {
        if (path === ospath.join(process.cwd(), 'package.json')) {
            const jsonFileContent = {
                main: "main.js",
                ...(moduleType === "esm" && { type: "module" })
            };
            return JSON.stringify(jsonFileContent);
        }
        return jest.requireActual("fs").readFileSync(path, ...args);
    })
}

module.exports = { mockLocalProjectPackageJSON };