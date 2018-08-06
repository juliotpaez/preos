# Preos API

## PreosObject

The Preos object is what exports the Preos module. It has the following interface:

```js
const PreosObject = {
    getRootDir: function() : String { ... },
    setRootDir: function(rootDirectory : String) : PreosObject { ... },

    loadFrom: function(url : String) : Promise<{protocol: String, content: String}> { ... },

    transpile: async function(options : TranspilerOptions) : Promise<String> { ... },
    interprete: async function(options : InterpreterOptions) : Promise<Any> { ... },

    transpiler: {
        execute: async function(options : TranspilerOptions) : Promise<String> { ... },
        register: function(inputLang : String, outputLang : String, compiler : TranspileFunction) : PreosObject { ... },
        remove: function(inputLang : String, outputLang : String) : PreosObject { ... },
        get: function(inputLang : String, outputLang : String) : TranspileFunction { ... },
        list: function() : [{inputLang : String, outputLang : String, compiler: TranspileFunction}] { ... },
        clearCache: function() : PreosObject { ... },
    },
    interpreter: {
        execute: async function(options : InterpreterOptions) : Promise<String> { ... },
        register: function(lang : String, compiler : InterpreteFunction) : PreosObject { ... },
        remove: function(lang : String) : PreosObject { ... },
        get: function(lang : String) : InterpreteFunction { ... },
        list: function() : [{lang : String, compiler: InterpreteFunction}] { ... },
        clearCache: function() : PreosObject { ... },
    }
}
```

- `getRootDir`: gets the directory path used by `preos` to resolve relative paths.
- `setRootDir`: sets the directory path used by `preos` to resolve relative paths. Returns the `preos` object.

> If the root directory is no registered, `preos` will use the project root location to resolve all relative paths.

<!-- separator -->

- `loadFrom`: returns a promise of the content obtained from a file or url and the protocol used: `http` for HTTP or HTTPS request and `file` for file system requests.

<!-- separator -->

- `transpile`: returns a promise of the compilation of a code in one language to its equivalent in another language, returning always its representation as a `string`.
- `interprete`: returns a promise of the compilation of a code returning the result of its interpretation. The actions of the interpreter depends on the compiled language.

<!-- separator -->

- `transpiler.execute`: same as `transpile`.
- `transpiler.register`: adds a transpiler associating its compiler function to an original-target language pair. Returns the `preos` object.
- `transpiler.remove`: removes a transpiler by its associated original-target language pair. Returns the `preos` object.
- `transpiler.get`: gets a transpiler by its associated original-target language pair returning its compiler function or `null` if it doesn't exists.
- `transpiler.list`: gets a list of the registered transpilers.
- `transpiler.clearCache`: erases all transpiler results stored in the cache. Returns the `preos` object.

<!-- separator -->

- `interpreter.execute`: same as `interprete`.
- `interpreter.register`: adds an interpreter associating its compiler function to a language. Returns the `preos` object.
- `interpreter.remove`: removes an interpreter by its associated language. Returns the `preos` object.
- `interpreter.get`: gets an interpreter by its associated language returning its compiler function or `null` if it doesn't exists.
- `interpreter.list`: gets a list of the registered interpreter returning a lang-compiler pair list.
- `interpreter.clearCache`: erases all interpreter results stored in the cache. Returns the `preos` object.

> The language is used to recognize a file by its extension, so the `lang` value must be that extension. For example, for JavaScript it must be `js`.

> Interpreter and Transpiler functions receive the refactored options that has been indicated to the `transpile` and `interprete` functions.

> The cache uses the url to identify the code, so if the code has been compiled from the `source` property, it will use the value set in the `url` to identify it.

## TranspileFunction

A function used as a traspiler must have one of the following interfaces:

```js
function sync(options : TranspilerOptions) : {source : String, compilerOutput : Any} { ... }
function async(options : TranspilerOptions) : Promise<{source : String, compilerOutput : Any}> { ... }
```

The output `options` are the same as the options you passed to the transpiler (see below) but with some differencies:

- `source`: is alwais filled with the value that is passed to the transpiler or with the content of the `url` property.
- `url`: is alwais filled with the value that is passed to the transpiler or with a custom one following the pattern: `/preos/inputLang-outputLang/id`, where `inputLang` is the original language, `outputLang` is the target language and `id` is a MD5 hash of the content.
- `readFromUrl`: a boolean value that indicates if the content has been passed by the user (`false`) or has been obtained from the `url` (`true`).

The output object must have the following properties:

- `source`: the transpiled code.
- `options` (computed): the final options used to transpiled the code. This is set by Preos so it can't be done by the transpiler function.
- `compilerOutput` (optional): the complex ouput of the compiler.

## TranspilerOptions

```ts
class Options
{
    url : String
    source : String
    inputLang : String
    outputLang : String
    compilerOptions : Object = null
    executerOptions : Object = null

    debug : Logic = false
    allowCache : Logic = true
}
```

- `url`: the path where the code is, it could be a system path or a `http` request. If `lang` is not defined, it tries to extract it from the file extension.
- `source`: the source code to be transpiled or interpreted. Requires `lang` to know the original language.
- `inputLang`: the original language.
- `outputLang`: the target language.
- `compilerOptions`: options to be passed to the compiler.
- `executerOptions`: auxiliary options for those compilers that return something that must be executed with custom parameters. For example, `html` template parsers like `pug` require the values to set in the template.

<!-- separator -->

- `debug`: allows the transpiler or interpreter to send messages for debugging.
- `allowCache`: allows the interpreter to keep the result of the files cached in memory.

> Note: always must have at least one of the `url` or `source` properties. If both exists, `source` has higher priority and `url` is used just only used to resolve relative dependencies.

## InterpreteFunction

A function used as an interpreter must have one of the following interfaces:

```js
function sync(options : InterpreterOptions) : Any (but Promise) { ... }
function async(options : InterpreterOptions) : Promise<Any> { ... }
```

The input `options` are the same as the options you passed to the interpreter (see below) but with some differencies:

- `source`: is alwais filled with the value that is passed to the interpreter or with the content of the `url` property.
- `url`: is alwais filled with the value that is passed to the interpreter or with a custom one in the pattern: `/preos/lang/id`, where `lang` is the language of the source code and `id` is a MD5 hash of the content.
- `readFromUrl`: a boolean value that indicates if the content has been passed by the user (`false`) or has been obtained from the `url` (`true`).

The output object must have the following properties:

- `output`: the interpreter's result.
- `options` (computed): the final options used to transpiled the code. This is set by Preos so it can't be done by the transpiler function.

## Options

```ts
class Options
{
    url : String
    source : String
    lang : String
    compilerOptions : Object = null
    executerOptions : Object = null

    debug : Logic = false
    allowCache : Logic = true
}
```

- `url`: the path where the code is, it could be a system path or a `http` request. If `lang` is not defined, it tries to extract it from the file extension.
- `source`: the source code to be transpiled or interpreted. Requires `lang` to know the original language.
- `lang`: the language of the source code.
- `compilerOptions`: options to be passed to the compiler.
- `executerOptions`: auxiliary options for those compilers that return something that must be executed with custom parameters. For example, `html` template parsers like `pug` require the values to set in the template.

<!-- separator -->

- `debug`: allows the transpiler or interpreter to send messages for debugging.
- `allowCache`: allows the interpreter to keep the result of the files cached in memory.

> Note: always must have at least one of the `url` or `source` properties. If both exists, `source` has higher priority and `url` is used just only used to resolve relative dependencies.