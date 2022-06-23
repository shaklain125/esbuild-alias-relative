import { build } from "esbuild";
import FastGlob from "fast-glob";
import path from "path";
import { aliasRelative } from "../src";

const example1 = path.resolve("./test/example");

const getFiles = async dir =>
    (await FastGlob("**/*", { cwd: dir })).map(file => path.join(dir, file));

(async () => {
    const files = await getFiles(example1);

    build({
        entryPoints: files,
        outdir: "./test/out",
        watch: false,
        platform: "node",
        format: "cjs",
        logLevel: "info",
        bundle: false,
        plugins: [
            aliasRelative({
                aliases: {
                    "@base": path.resolve("."),
                    "@test": path.resolve("./test"),
                    "@app": path.resolve("./test/example/app"),
                    "@example": path.resolve("./test/example"),
                },
            }),
        ],
    });
})();
