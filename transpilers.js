const preos = require("./main");
const fs_path = require('path');
const ts = require("typescript");
const pug = require("pug");
const sass = require("sass");
const less = require("less");
const toml = require('toml');
const xml = require('fast-xml-parser');
const vueCompiler = require('./vueCompiler');


function joinCompilerOptions(options, defaultOptions) {
    if (options.compilerOptions) {
        Object.assign(defaultOptions, options.compilerOptions);
    }

    options.compilerOptions = defaultOptions;
    return defaultOptions;
}


/*************/
/* Compilers */
/*************/
function itselfTranspiler(options) {
    return { source: options.source };
}

function typeScriptTranspiler(options) {
    const result = ts.transpileModule(options.source, joinCompilerOptions(options, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES5,
            paths: [fs_path.dirname(options.url), preos.getRootDir()],
            removeComments: !options.debug
        },
        reportDiagnostics: false,
    }));

    return {
        source: result.outputText,
        compilerOutput: result
    };
}

function pugTranspiler(options) {
    var templateFunction = pug.compile(options.source, joinCompilerOptions(options, {
        filename: options.readFromUrl ? options.url : "Preos-Pug",
        basedir: preos.getRootDir(),
        debug: options.debug,
        compileDebug: options.debug,
        cache: false,
        pretty: options.debug
    }));

    const result = templateFunction(options.executerOptions || {});
    return {
        source: result,
        compilerOutput: templateFunction
    };
}

function sassTranspiler(options) {
    var resultOptions = joinCompilerOptions(options, {
        data: options.source,
        indentedSyntax: true,
        includePaths: [fs_path.dirname(options.url), preos.getRootDir()],
        sourceComments: options.debug,
        outputStyle: options.debug ? "expanded" : "compressed"
    });
    resultOptions.data = options.source;

    const result = sass.renderSync(resultOptions);
    return {
        source: result.css.toString(),
        compilerOutput: result
    };
}

function scssTranspiler(options) {
    var resultOptions = joinCompilerOptions(options, {
        data: options.source,
        indentedSyntax: false,
        includePaths: [fs_path.dirname(options.url), preos.getRootDir()],
        sourceComments: options.debug,
        outputStyle: options.debug ? "expanded" : "compressed"
    });
    resultOptions.data = options.source;

    const result = sass.renderSync(resultOptions);
    return {
        source: result.css.toString(),
        compilerOutput: result
    };
}

function lessTranspiler(options) {
    return new Promise(function (resolve, reject) {
        less.render(options.source, joinCompilerOptions(options, {
            sourceMap: {
                sourceMapFileInline: options.debug,
                outputSourceFiles: options.debug
            },
            async: true,
            fileAsync: true,
            dumpLineNumbers: "comments",
            paths: [fs_path.dirname(options.url), preos.getRootDir()],
            relativeUrls: true,
        }), function (error, output) {
            if (error) {
                reject(error);
            }
            else {
                resolve({
                    source: output.css,
                    compilerOutput: output
                });
            }
        });
    });
}

function tomlTranspiler(options) {
    const result = JSON.stringify(toml.parse(options.source));
    return { source: result };
}

function xmlTranspiler(options) {
    const result = JSON.stringify(xml.parse(options.source, joinCompilerOptions(options, {
        ignoreAttributes: false,
        allowBooleanAttributes: true,
        parseAttributeValue: true
    })));

    return { source: result };
}


/***********/
/* Exports */
/***********/
module.exports = {
    // target-origin
    js: {
        js: itselfTranspiler,
        ts: typeScriptTranspiler,
    },
    html: {
        html: itselfTranspiler,
        pug: pugTranspiler,
        vue: vueCompiler.transpile,
    },
    css: {
        css: itselfTranspiler,
        sass: sassTranspiler,
        scss: scssTranspiler,
        less: lessTranspiler,
    },
    json: {
        json: itselfTranspiler,
        toml: tomlTranspiler,
        xml: xmlTranspiler
    },
};