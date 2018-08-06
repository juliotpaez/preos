const preos = require("./main");
const toml = require('toml');
const xml = require('fast-xml-parser');
const pug = require('pug');
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
function itselfExecuter(options) {
    var m = new module.constructor();
    m._compile(options.source, options.url);
    return m.exports;
}

async function transpileAndExecute(options) {
    options.source = (await preos.transpile(options)).source;
    return itselfExecuter(options);
}

function pugInterpreter(options) {
    const result = pug.compile(options.source, joinCompilerOptions(options, {
        filename: options.readFromUrl ? options.url : "Preos-Pug",
        basedir: preos.getRootDir(),
        debug: options.debug,
        compileDebug: options.debug,
        cache: false,
        pretty: options.debug
    }));
    return result;
}

function vueInterpreter(options) {
    return function (delegateStyles) {
        if (!(options.executerOptions.style)) {
            options.executerOptions.style = {};
        }

        options.executerOptions.style.delegateStyles = delegateStyles;
        return vueCompiler.interprete(options);
    };
}

function jsonInterpreter(options) {
    return JSON.parse(options.source);
}

function tomlInterpreter(options) {
    return toml.parse(options.source);
}

function xmlInterpreter(options) {
    return xml.parse(options.source, joinCompilerOptions(options, {
        ignoreAttributes: false,
        allowBooleanAttributes: true,
        parseAttributeValue: true
    }));
}

/***********/
/* Exports */
/***********/
module.exports = {
    js: itselfExecuter,
    json: jsonInterpreter,

    // Custom.
    ts: transpileAndExecute,
    pug: pugInterpreter,
    vue: vueInterpreter,
    toml: tomlInterpreter,
    xml: xmlInterpreter
};