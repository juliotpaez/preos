const fs_path = require('path');
const preos = require('./main');
const cssom = require('cssom');
const crypto = require('crypto');
const vueTemplateCompiler = require("vue-template-compiler");


async function normalizeElement(options, element, defaultLang) {
	if ("src" in element.attrs) {
		const ops = {
			url: fs_path.resolve(fs_path.dirname(options.url), element.attrs["src"]),
			outputLang: defaultLang,
			debug: options.debug,
			allowCache: false,
			compilerOptions: options.compilerOptions[element.type] || {},
			executerOptions: options.executerOptions[element.type] || {}
		};

		if ("lang" in element.attrs) {
			ops.inputLang = element.attrs["lang"];
			delete element.attrs["lang"];
		}

		const result = await preos.transpile(ops);
		element.content = result.source;

		delete element.attrs["src"];
	}
	else {
		const ops = {
			source: element.content,
			inputLang: defaultLang,
			outputLang: defaultLang,
			debug: options.debug,
			allowCache: false,
			compilerOptions: options.compilerOptions[element.type] || {},
			executerOptions: options.executerOptions[element.type] || {}
		};

		if ("lang" in element.attrs) {
			ops.inputLang = element.attrs["lang"];
			delete element.attrs["lang"];
		}

		const result = await preos.transpile(ops);
		element.content = result.source;
	}
}

async function normalize(options, dom) {
	const promises = [];

	if (dom.template) {
		promises.push(normalizeElement(options, dom.template, "html"));
	}

	if (dom.script) {
		promises.push(normalizeElement(options, dom.script, "js"));
	}

	for (style of dom.styles) {
		promises.push(normalizeElement(options, style, "css"));
	}

	await Promise.all(promises);
}

async function scopeCode(mainTag, scopeId, css) {
	const dom = cssom.parse(css.content);
	const rules = dom.cssRules;
	const scopeAttr = "[" + scopeId + "]";

	for (var i = 0; i < rules.length; ++i) {
		var rule = rules[i];
		if (rule.type !== 1)
			continue;

		var scopedSelectors = [];

		for (var selector of rule.selectorText.split(",")) {
			if (/:(scope|root)/g.test(selector)) {
				scopedSelectors.push(selector.replace(/:(scope|root)/g, scopeAttr));
			}
			else {
				scopedSelectors.push(scopeAttr + ' ' + selector);
			}
		}

		var scopedRule = scopedSelectors.join(',');
		rule.selectorText = scopedRule;
	}

	css.content = dom.toString();
}

async function compile(options, dom) {
	if (!(dom.template)) {
		return; // No scope is necessary.
	}

	// Get main tag.
	var mainTag = dom.template.content.match(/^\s*<([\w_\-0-9]+)/);

	if (!(mainTag)) {
		throw new Error("The template requires a root element.");
	}

	mainTag = mainTag[1];

	// Add scope attribute to main tag.
	dom.template.content = dom.template.content.replace(/^\s*<(\w+)/, "<$1 " + dom.scopeId);

	const promises = [];

	for (var style of dom.styles) {
		if ("scoped" in style.attrs) {
			promises.push(scopeCode(mainTag, dom.scopeId, style));
		}
	}

	await Promise.all(promises);
}

function printDOM(dom, debug) {
	if (debug) {
		var result = [];

		if (dom.template) {
			result.push("<template>\n" + dom.template.content + "\n</template>");
		}

		if (dom.script) {
			result.push("<script>\n" + dom.script.content + "\n</script>");
		}

		for (var style of dom.styles) {
			result.push("<style>\n" + style.content + "\n</style>");
		}

		return result.join("\n\n");
	}
	else {
		var result = "";

		if (dom.template) {
			result += "<template>" + dom.template.content + "</template>";
		}

		if (dom.script) {
			result += "<script type='application/javascript'>" + dom.script.content + "</script>";
		}

		for (var style of dom.styles) {
			result += "<style type='text/css'>" + style.content + "</style>";
		}

		return result;
	}
}

async function execute(options, dom) {
	var exportsObject = dom.script ? await preos.interprete({
		source: dom.script.content,
		lang: "js",
		debug: options.debug,
		allowCache: false,
		compilerOptions: options.compilerOptions.script || {},
		executerOptions: options.executerOptions.script || {}
	}) : {};

	exportsObject = exportsObject.output;

	if (dom.template) {
		exportsObject.template = dom.template.content;
	}

	if (exportsObject.name === undefined && options.compilerOptions.name !== undefined) {
		exportsObject.name = options.compilerOptions.name;
	}

	const styleList = [];

	for (var style of dom.styles) {
		styleList.push(style.content);
	}

	exportsObject.styles = styleList;
	exportsObject._baseURI = options.url;

	// Styles.
	function insertStyles(domDocument) {
		const doc = domDocument || document;
		const head = doc.head || doc.getElementsByTagName('head')[0];

		for (var style of exportsObject.styles) {
			var tag = document.createElement('style');
			tag.type = 'text/css';
			tag.appendChild(document.createTextNode(style));

			head.appendChild(style);
		}

		return exportsObject;
	}

	if (options.executerOptions.style && options.executerOptions.style.delegateStyles === true) {
		exportsObject.insertStyles = insertStyles;
	}
	else {
		insertStyles();
	}

	return exportsObject;
}


/***********/
/* Exports */
/***********/
function interprete(options) {
	return compiler(options, false);
}

function transpile(options) {
	return compiler(options, true);
}

async function compiler(options, transpile) {
	const dom = vueTemplateCompiler.parseComponent(options.source);
	dom.scopeId = "data-vue-" + crypto.createHash('md5').update("sd").digest("base64").replace(/\+|\/|=/g, "j");

	await normalize(options, dom);
	await compile(options, dom);

	if (transpile) {
		return {
			source: printDOM(dom, options.debug),
			compilerOutput: dom
		};
	}
	else {
		return await execute(options, dom);
	}
}

module.exports = {
	transpile,
	interprete
};