# babel-plugin-transform-barrels

[![npm](https://badgen.net/npm/v/babel-plugin-transform-barrels)](https://www.npmjs.com/package/babel-plugin-transform-barrels)
[![downloads](https://badgen.net/npm/dt/babel-plugin-transform-barrels)](https://www.npmjs.com/package/babel-plugin-transform-barrels)

This Babel plugin transforms indirect imports through a barrel file (index.js) into direct imports.

### Note
This plugin is intended for developers who use barrel files (index.js) with the Webpack or Vite bundlers, or when running tests with Jest. I don't know if it's beneficial to use with other bundlers such as Parcel, Rollup, etc.

## Example

Before transformation:

```javascript
import { Button, List } from './components'
```

After transformation:

```javascript
import { Button } from './components/Button/Button'
import { List } from './components/List/List'
```


## Installation

1. Install the package using npm:

    ```bash
      npm install --save-dev babel-plugin-transform-barrels
    ```

2. Add the following to your Webpack config file in the rule with a `babel-loader` loader:

    ```javascript
    "plugins": [["transform-barrels", "Options (object) - see below"]]
    ```

   Alternatively, you can add `babel-plugin-transform-barrels` to your babel config file:

    ```javascript
    "plugins": [["babel-plugin-transform-barrels", "Options (object) - see below"]]
    ```

3. Add the following configuration to your Jest config file:

    ```javascript
    "transform": {
    "^.+\\.(js|jsx|mjs|cjs|ts|tsx)$": require("path").resolve(
      "./config/jest/babelTransform.js")
    }
    ```

   Copy the [`config`](config) folder to the same folder as the Jest config file.
   <br>
   Adapt the `config/jest/babelTransform.js` file according to code transformation needs.

## Options

|     **Name**     |  **Type** |                    **Default**                   |                                                                                            **Description**                                                                                           |
|:----------------:|:---------:|:------------------------------------------------:|:----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------:|
|  `executorName`  |  `string` |                     `"other"`                    |                                                     It should be assigned with one of the supported executor values: `webpack`, `vite` or `jest`.                                                    |
|      `alias`     |  `object` |                       `{}`                       |                                                             It should be assigned with the `alias` value option from the executor config.                                                            |
|   `extensions`   |  `array`  | `[".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"]` |                                                          It should be assigned with the `extensions` value option from the executor config.                                                          |
| `isCacheEnabled` | `boolean` |                      `false`                     |                                                                                 If `true`, enables file-based cache.                                                                                 |
|     `logging`    |  `object` |    `{ type: "disabled", filePath: "log.txt" }`   | Specifies logging options.<br>`type` can be `disabled` for no logging, `file` for logs to a file, or `screen` for logs to the console.<br>If type is `file`, `filePath` specifies the log file path. |

## The Problem

### In Webpack
There are two issues that can occur in bundle files created by Webpack when using barrel files:
1. Unused CSS content in the CSS bundle file - this occurs when a CSS file is imported in a re-exported module of a barrel file.
2. Unused Javascript code in Javascript bundle files when using dynamic imports - this occurs when a barrel file is imported inside two different dynamically imported modules. This barrel file and its re-exported modules will be included twice in the two bundle files.

### In Jest
There are two issues that can occur in Jest when using barrel files:
1. Unrelated errors - Unused modules from barrel files will be loaded during testing, potentially leading to errors unrelated to the actual test and causing unpredictable behavior.
2. Performance impact - The presence of unused modules from barrel files can slow down starting test suites due to unnecessary loading overhead.

### Note
I recommend reading my articles [*Potential issues with barrel files in Webpack*](https://dev.to/fogel/potential-issues-with-barrel-files-in-webpack-4bf2) and [*Potential issues with barrel files in Jest*](https://dev.to/fogel/potential-issues-with-barrel-files-in-jest-1nkl) for more information on possible issues can caused by barrel files.

## Possible Solutions

1. Use Babel plugins to convert import statements from indirect imports through barrel files to direct imports - this solution requires specific configuration for each package.
2. Use Webpack's built-in solution of `sideEffects: ["*.css", "*.scss"]` - this solution should replace the first solution above. However, it causes a new issue where the order of imported modules is not based on the order of import statements, but on usage order. This can cause unexpected visual issues due to changes in the import order of CSS.

Both solutions above are not optimal, so I decided to develop my own plugin that does not require specific configuration for each package.

## My Plugin Solution
My plugin examines every import in the Javascript project files and transforms it from an indirect import through a barrel file to a direct import from the module where the original export is declared.
