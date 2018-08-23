const preos = require("./main.js");
const fs = require('fs');
const fs_path = require('path');

var test = async function (prefix) {
    const src_dir = "src/";
    const output_dir = "output/"

    if (!fs.existsSync(output_dir)) {
        fs.mkdirSync(output_dir);
    }

    for (var directory of fs.readdirSync(src_dir)) {
        const outputLang = directory;
        directory = fs_path.resolve(src_dir, directory);

        if (!fs.statSync(directory).isDirectory()) {
            continue;
        }

        if (!fs.existsSync(directory.replace(src_dir, output_dir))) {
            fs.mkdirSync(directory.replace(src_dir, output_dir));
        }

        for (var file of fs.readdirSync(directory)) {
            file = fs_path.resolve(directory, file);

            if (!fs.statSync(file).isFile()) {
                continue;
            }

            try {
                result = await preos.transpile({
                    debug: true,
                    url: file,
                    outputLang,
                    executerOptions: {
                        // For .pug
                        name: "Preos",

                        // For .vue
                        template: {
                            name: "Preos"
                        }
                    }
                });

                console.log(prefix + " " + outputLang + "/" + fs_path.basename(file) + " ... OK");

                fs.writeFileSync(file.replace(src_dir, output_dir) + "." + outputLang, result.source);
            } catch (why) {
                console.log(prefix + " " + outputLang + "/" + fs_path.basename(file) + " failed because: " + why.stack);
            }
        }
    }

    var result;
}

var mainTest = async function () {
    // First test.
    await test("[Test 1]");

    // Second test: It's used to test the cache.
    await test("[Test 2]");
}

mainTest();