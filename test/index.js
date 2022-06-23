import { build } from "esbuild";
import { readdirSync } from "fs";
import { join, resolve } from "path";
import { aliasRelative } from "../src";

const example1 = resolve("./test/example");

const files = readdirSync(example1).map(file => join(example1, file));

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
                "@test": resolve("./test"),
            },
        }),
    ],
});
