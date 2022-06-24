// https://medium.com/trabe/control-what-you-publish-inside-your-npm-packages-f30dff9e697c

const fs = require("fs");
const glob = require("fast-glob");
const packageJson = require("../package.json");
const path = require("path");
const { spawnSync } = require("child_process");

let status = 0;

try {
    const { filesGlob = {} } = packageJson;
    const { main = "dist", include = ["**/*.js"], exclude = [] } = filesGlob;

    const addToMain = file => fs.copyFileSync(file, path.resolve(main, file));

    const files = glob.sync([...include, "!**/node_modules/**", ...exclude.map(e => `!${e}`)], {
        onlyFiles: true,
        unique: true,
        braceExpansion: true,
        caseSensitiveMatch: false,
        dot: false,
        cwd: path.resolve("."),
    });

    files.forEach(addToMain);

    addToMain("package.json");

    const [cmd, ...args] = process.argv.slice(2);
    const proc = spawnSync(cmd, args, { stdio: "inherit", cwd: main });
    status = proc.status;
} catch (e) {
    console.error(e);
    status = 1;
}

process.exit(status);
