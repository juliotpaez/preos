const fs = require('fs');
const http = require('http');
const https = require('https');
const fs_path = require('path');
const assert = require('assert');
const crypto = require('crypto');
const cache = require("./cache");


/*****************/
/* Internal data */
/*****************/
var rootDirectory = fs_path.dirname(require.main.filename);
const preosObject = {
    getRootDir,
    setRootDir,

    loadFrom,

    transpile,
    interprete,

    transpiler: {
        execute: transpile,
        register: registerTranspiler,
        delete: deleteTranspiler,
        get: getTranspiler,
        list: listTranspilers,
        clearCache: clearTranspilerCache,
    },
    interpreter: {
        execute: interprete,
        register: registerInterpreter,
        delete: deleteInterpreter,
        get: getInterpreter,
        list: listInterpreters,
        clearCache: clearInterpreterCache
    },
};

const transpilers = require("./transpilers");
const transpilersCache = cache.create();
const interpreters = require("./interpreters");
const interpretersCache = cache.create();
const regexLang = /^[\w_]+$/;
const sourcePrefix = "/source/";



/**********************/
/* Internal functions */
/**********************/
function getRootDir() {
    return rootDirectory;
}

function setRootDir(path) {
    assert(typeof (path) == "string", "The path parameter is not a string.");
    assert(fs_path.isAbsolute(path), "The root directory must be an absolute path. Current: " + path);
    assert(fs.lstatSync(path).isDirectory(), "The path parameter is a file path not a directory path. Current: " + path);

    rootDirectory = path;
    return preosObject;
}

async function loadFrom(url) {
    assert(typeof (url) == "string", "The url parameter is not a string.");

    if (url.startsWith("http://") || url.startsWith("https://")) {
        return {
            protocol: "http",
            content: await loadFromHttp(url)
        }
    } else {
        return {
            protocol: "file",
            content: await loadFromFile(url)
        };
    }
}

async function loadFromFile(url) {
    url = fs_path.resolve(rootDirectory, url);
    assert(fs.existsSync(url), "The url parameter contains a path that does not exist. Current: " + url);
    assert(!fs.lstatSync(url).isDirectory(), "The url parameter is a directory path not a file path. Current: " + url);

    return new Promise(function (resolve, reject) {
        fs.readFile(url, function (err, data) {
            if (err) {
                reject(err);
            } else {
                resolve(data.toString());
            }
        });
    });
}

async function loadFromHttp(url) {
    assert(typeof (url) == "string", "The url parameter is not a string.");

    return new Promise(function (resolve, reject) {
        if (url.startsWith("http://")) {
            http.get(url, function (res) {
                const {
                    statusCode
                } = res;
                if (statusCode !== 200) {
                    res.resume();
                    reject('Request Failed.\n' + `Status Code: ${statusCode}`);
                } else {
                    res.setEncoding('utf8');
                    let rawData = '';
                    res.on('data', (chunk) => {
                        rawData += chunk;
                    });
                    res.on('end', () => {
                        resolve(rawData.toString());
                    });
                }
            });
        } else {
            https.get(url, function (res) {
                const {
                    statusCode
                } = res;
                if (statusCode !== 200) {
                    res.resume();
                    reject('Request Failed.\n' + `Status Code: ${statusCode}`);
                } else {
                    res.setEncoding('utf8');
                    let rawData = '';
                    res.on('data', (chunk) => {
                        rawData += chunk;
                    });
                    res.on('end', () => {
                        resolve(rawData.toString());
                    });
                }
            });
        }
    });
}

async function prepareTranspilerOptions(options) {
    assert(typeof (options) == "object", "The options parameter is not an object.");

    const innerOptions = {
        debug: options.debug === true,
        allowCache: options.allowCache === false ? false : true,
        inputLang: null,
        outputLang: options.outputLang,
        compilerOptions: options.compilerOptions || {},
        executerOptions: options.executerOptions || {},
    };

    assert(typeof (innerOptions.outputLang) == "string", "The outputLang option is not a string.");
    assert(regexLang.test(options.outputLang), "The outputLang option can only contains letters, numbers and underscores (_).");
    assert(typeof (innerOptions.compilerOptions) == "object", "The compilerOptions option is not an object.");
    assert(typeof (innerOptions.executerOptions) == "object", "The executerOptions option is not an object.");

    if ("inputLang" in options) {
        assert(typeof (options.inputLang) == "string", "The inputLang option is not a string.");
        assert(regexLang.test(options.inputLang), "The inputLang option can only contains letters, numbers and underscores (_).");
        innerOptions.inputLang = options.inputLang;
    }

    if ("source" in options) {
        assert(typeof (options.source) == "string", "The source option is not a string.");
        assert("inputLang" in options, "The source option requires the inputLang option is set.");
        innerOptions.source = options.source;

        if ("url" in options) {
            innerOptions.url = options.url;
        } else {
            innerOptions.url = sourcePrefix + crypto.createHash('md5').update(options.source).digest("hex");
        }

        innerOptions.readFromUrl = false;
    } else if ("url" in options) {
        assert(typeof (options.url) == "string", "The url option is not a string.");
        innerOptions.url = options.url;
        innerOptions.readFromUrl = true;

        // Gets the lang from the path if it is required.
        if (innerOptions.inputLang == null) {
            const fileExtension = fs_path.extname(innerOptions.url);
            if (fileExtension.length > 1) {
                innerOptions.inputLang = fileExtension.substr(1);
            } else {
                if (innerOptions.debug) {
                    console.warn("Cannot retrieve the inputLang option from the url.");
                }

                throw new Error("Cannot retrieve the inputLang option from the url.");
            }
        }
    } else {
        throw new Error("The options object must contains at least the source or url fields.");
    }

    // Loads the file from cache if there is inside.
    if (innerOptions.allowCache) {
        innerOptions.cacheId = innerOptions.inputLang + "-" + innerOptions.outputLang + "/" + innerOptions.url;

        if (transpilersCache.has(innerOptions.cacheId)) {
            if (innerOptions.debug) {
                console.debug("(Preos) Returning from cache: " + innerOptions.url);
            }

            innerOptions.cached = transpilersCache.get(innerOptions.cacheId);

            if (innerOptions.debug) {
                console.debug("(Preos) Options: " + JSON.stringify(innerOptions));
            }

            return innerOptions;
        }
    }

    // Loads file if there's no local source.
    if (!innerOptions.url.startsWith(sourcePrefix)) {
        if (innerOptions.debug) {
            console.debug("(Preos) Loading file: " + innerOptions.url);
        }

        const data = await loadFrom(innerOptions.url);
        innerOptions.source = data.content;
    }

    if (innerOptions.debug) {
        console.debug("(Preos) Options: " + JSON.stringify(innerOptions));
    }

    return innerOptions;
}

async function transpile(options) {
    options = await prepareTranspilerOptions(options);

    // If cached return its value.
    if (options.cached) {
        return {
            source: options.cached.source,
            options,
            compilerOutput: options.cached.compilerOutput
        };
    }

    if (options.outputLang in transpilers && options.inputLang in transpilers[options.outputLang]) {
        var output = transpilers[options.outputLang][options.inputLang](options);

        if (Object.getPrototypeOf(output) === Promise.prototype) {
            output = await output;
        }

        assert(typeof (output) == "object", "Transpilers must return an object as result.");
        assert(output.source && typeof (output.source) == "string", "Transpilers must return an object with at least the source property with the string representation of the traspiled code.");

        if (options.allowCache && !transpilersCache.has(options.cacheId)) {
            if (options.debug) {
                console.debug("(Preos) Caching: " + options.url + " as " + options.cacheId);
            }

            transpilersCache.set(options.cacheId, output);
        }

        return {
            source: output.source,
            options,
            compilerOutput: output.compilerOutput
        };
    }

    if (options.debug) {
        console.warn("The lang pair (" + options.inputLang + "-" + options.outputLang + ") does not match any valid transpiler.");
    }

    throw Error("The lang pair (" + options.inputLang + "-" + options.outputLang + ") does not match any valid transpiler.");
}

function registerTranspiler(inputLang, outputLang, compiler) {
    assert(typeof (inputLang) == "string", "The inputLang parameter is not a string.");
    assert(regexLang.test(inputLang), "The inputLang parameter can only contains letters, numbers and underscores (_).");
    assert(typeof (outputLang) == "string", "The outputLang parameter is not a string.");
    assert(regexLang.test(outputLang), "The outputLang parameter can only contains letters, numbers and underscores (_).");
    assert(typeof (compiler) == "function", "The compiler parameter is not a function.");

    if (!(transpilers[outputLang])) {
        transpilers[outputLang] = {};
    }

    transpilers[outputLang][inputLang] = compiler;
    return preosObject;
}

function deleteTranspiler(inputLang, outputLang) {
    assert(typeof (inputLang) == "string", "The inputLang parameter is not a string.");
    assert(regexLang.test(inputLang), "The inputLang parameter can only contains letters, numbers and underscores (_).");
    assert(typeof (outputLang) == "string", "The outputLang parameter is not a string.");
    assert(regexLang.test(outputLang), "The outputLang parameter can only contains letters, numbers and underscores (_).");

    if (!(transpilers[outputLang]) || !(transpilers[outputLang][inputLang])) {
        return;
    }

    delete transpilers[outputLang][inputLang];

    if (transpilers[outputLang].length == 0) {
        delete transpilers[outputLang];
    }

    return preosObject;
}

function getTranspiler(inputLang, outputLang) {
    assert(typeof (inputLang) == "string", "The inputLang parameter is not a string.");
    assert(regexLang.test(inputLang), "The inputLang parameter can only contains letters, numbers and underscores (_).");
    assert(typeof (outputLang) == "string", "The outputLang parameter is not a string.");
    assert(regexLang.test(outputLang), "The outputLang parameter can only contains letters, numbers and underscores (_).");

    if (transpilers[outputLang] && transpilers[outputLang][inputLang]) {
        return transpilers[outputLang][inputLang];
    }

    return null;
}

function listTranspilers() {
    const result = [];

    for (outputLang in transpilers) {
        for (inputLang in transpilers[outputLang]) {
            result.push({
                inputLang,
                outputLang,
                compiler: transpilers[outputLang][inputLang]
            });
        }
    }

    return result;
}

function clearTranspilerCache() {
    transpilersCache = cache.create();
    return preosObject;
}

async function prepareInterpreterOptions(options) {
    assert(typeof (options) == "object", "The options parameter is not an object.");

    const innerOptions = {
        debug: options.debug === true,
        allowCache: options.allowCache === false ? false : true,
        lang: null,
        compilerOptions: options.compilerOptions || {},
        executerOptions: options.executerOptions || {},
    };

    assert(typeof (innerOptions.compilerOptions) == "object", "The compilerOptions option is not an object.");
    assert(typeof (innerOptions.executerOptions) == "object", "The executerOptions option is not an object.");

    if ("lang" in options) {
        assert(typeof (options.lang) == "string", "The lang option is not a string.");
        assert(regexLang.test(options.lang), "The lang option can only contains letters, numbers and underscores (_).");
        innerOptions.lang = options.lang;
    }

    if ("source" in options) {
        assert(typeof (options.source) == "string", "The source option is not a string.");
        assert("lang" in options, "The source option requires the lang option is set.");
        innerOptions.source = options.source;

        if ("url" in options) {
            innerOptions.url = options.url;
        } else {
            innerOptions.url = sourcePrefix + crypto.createHash('md5').update(options.source).digest("hex");
        }

        innerOptions.readFromUrl = false;
    } else if ("url" in options) {
        assert(typeof (options.url) == "string", "The url option is not a string.");
        innerOptions.url = options.url;
        innerOptions.readFromUrl = true;

        // Gets the lang from the path if it is required.
        if (innerOptions.lang == null) {
            const fileExtension = fs_path.extname(innerOptions.url);
            if (fileExtension.length > 1) {
                innerOptions.lang = fileExtension.substr(1);
            } else {
                if (innerOptions.debug) {
                    console.warn("Cannot retrieve the lang option from the url.");
                }

                throw new Error("Cannot retrieve the lang option from the url.");
            }
        }
    } else {
        throw new Error("The options object must contains at least the source or url fields.");
    }

    // Loads the file from cache if there is inside.
    if (innerOptions.allowCache) {
        innerOptions.cacheId = innerOptions.lang + "/" + innerOptions.url;

        if (interpretersCache.has(innerOptions.cacheId)) {
            if (innerOptions.debug) {
                console.debug("(Preos) Returning from cache: " + innerOptions.url);
            }

            innerOptions.cached = interpretersCache.get(innerOptions.cacheId);

            if (innerOptions.debug) {
                console.debug("(Preos) Options: " + JSON.stringify(innerOptions));
            }

            return innerOptions;
        }
    }

    // Loads file if there's no local source.
    if (!innerOptions.url.startsWith(sourcePrefix)) {
        if (innerOptions.debug) {
            console.debug("(Preos) Loading file: " + innerOptions.url);
        }

        const data = await loadFrom(innerOptions.url);
        innerOptions.source = data.content;
    }

    if (innerOptions.debug) {
        console.debug("(Preos) Options: " + JSON.stringify(innerOptions));
    }

    return innerOptions;
}

async function interprete(options) {
    options = await prepareInterpreterOptions(options);

    // If cached return its value.
    if (options.cached) {
        return {
            output: options.cached,
            options,
        };
    }

    if (options.lang in interpreters) {
        var output = interpreters[options.lang](options);

        if (Object.getPrototypeOf(output) === Promise.prototype) {
            output = await output;
        }

        if (options.allowCache && !transpilersCache.has(options.cacheId)) {
            if (options.debug) {
                console.debug("(Preos) Caching: " + options.url + " as " + options.cacheId);
            }

            interpretersCache.set(options.cacheId, output);
        }

        return {
            output,
            options,
        };
    }

    if (options.debug) {
        console.warn("The lang value (" + options.lang + ") does not match any valid interpreter.");
    }

    throw new Error("The lang value (" + options.lang + ") does not match any valid interpreter.");
}

function registerInterpreter(lang, compiler) {
    assert(typeof (lang) == "string", "The lang parameter is not a string.");
    assert(regexLang.test(lang), "The lang parameter can only contains letters, numbers and underscores (_).");
    assert(typeof (compiler) == "function", "The compiler parameter is not a function.");

    interpreters[lang] = compiler;
    return preosObject;
}

function deleteInterpreter(lang) {
    assert(typeof (lang) == "string", "The lang parameter is not a string.");
    assert(regexLang.test(lang), "The lang parameter can only contains letters, numbers and underscores (_).");

    if (lang in interpreters) {
        delete interpreters[lang];
    }

    return preosObject;
}

function getInterpreter(lang) {
    assert(typeof (lang) == "string", "The lang parameter is not a string.");
    assert(regexLang.test(lang), "The lang parameter can only contains letters, numbers and underscores (_).");

    if (lang in interpreters) {
        return interpreters[lang];
    }

    return null;
}

function listInterpreters() {
    const result = [];

    for (lang in interpreters) {
        result.push({
            lang,
            compiler: interpreters[lang]
        });
    }

    return result;
}

function clearInterpreterCache() {
    interpretersCache = cache.create();
    return preosObject;
}

/***********/
/* Exports */
/***********/
Object.assign(module.exports, preosObject);