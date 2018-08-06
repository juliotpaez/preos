const preos = require("./main.js");
const fs = require('fs');
const fs_path = require('path');

(async function () {
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
                    debug: false,
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

                console.log(outputLang + "/" + fs_path.basename(file) + " ... OK");

                fs.writeFileSync(file.replace(src_dir, output_dir)+"." + outputLang, result.source);
            }
            catch (why) {
                console.log(outputLang + "/" + fs_path.basename(file) + " failed because: " + why.stack);
            }
        }
    }

    var result;
})();