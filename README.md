# Readme

[![License badge](https://img.shields.io/github/license/mashape/apistatus.svg)](./LICENSE)

Preos is a `js` library to transpile and interprete other languages than `HTML`, `CSS` and `JS` in runtime.

## Installation

In your project type the following command to include it in your dependencies:

```bash
npm install --save preos
```

```js
const preos = require('preos');
```

## Documentation

To use this library just require it in your `js` file and start using it:

```js
const preos = require('preos');

// TypeScript to JavaScript transpiler example.
(async function () {
    var result;
    try {
        result = await preos.transpile({
            url: "path/to/file.ts",
            outputLang: "js"
        });
        console.log(result.source);
    }
    catch (why) {
        console.log("[ERROR]: ", why.stack);
    }
})();
```

If you want more details take a look at the [API](docs/api.md).

## Default configuration

`preos` comes with a set of pre-configured preprocessors to use just only requiring the library:

### Default transpilers:
- To JavaScript [`js`]:
    - [TypeScript](https://www.typescriptlang.org/) [`ts`]
- To CSS [`css`]:
    - [SASS](https://sass-lang.com/) [`sass`]
    - [SCSS](https://sass-lang.com/) [`scss`]
    - [LESS](http://lesscss.org/) [`less`]
- To HTML [`html`]:
    - [PUG](https://pugjs.org/): [`pug`]: require the `compilerOptions` property to fill the pattern.
    - [VUE](https://vuejs.org/): [`vue`]: returns a 'compiled' version of itself. More information [here](docs/vue_compiler.md).
- To JSON [`json`]:
    - [XML](https://www.w3.org/XML/) [`xml`]
    - [TOML](https://github.com/toml-lang/toml) [`toml`]

### Default interpreters:
- JavaScript [`js`]: executes itself.
- [TypeScript](https://www.typescriptlang.org/) [`ts`]: transpiles the code into `js` and then executes it.
- [PUG](https://pugjs.org/) [`pug`]: returns a `function` that accepts an `object` with the properties to fill the template and then returns its equivalent code in `html`.
- [VUE](https://vuejs.org/) [`vue`]: returns a function that lazily will compile the template and returns an `object` prepared for be use with the Vue library.
- JSON [`json`]: returns an `object` that represents its structure.
- [XML](https://www.w3.org/XML/) [`xml`]: returns an `object` that represents its structure. More information [here](docs/vue_compiler.md).
- [TOML](https://github.com/toml-lang/toml) [`toml`]: returns an `object` that represents its structure.


## Contributing

Fixes and improvements are always welcome, so if you want to contribute helping out or warning about an error, send me an email or open an issue.
