import chalk from "chalk";
import { Loader, Plugin } from "esbuild";
import path from "path";
import { dts_alias_relative_replacer } from "./lib/dts_replacer";
import { alias_relative_matcher, MatcherOpts } from "./lib/matcher";
import { GenOpts, gen_dts } from "./ts/gen_dts";
import { timer } from "./utils/timer";

type Options = {
    aliases?: MatcherOpts["aliases"];
    /**
     * The value of this property will be ignored when `watch` is set to true in the `esbuild` options. Hence, `*.d.ts` files will not be generated.
     */
    dts?: boolean;
    dts_dir?: string;
};

/**
 *
 * @example
 * plugins: [
 *    aliasRelative({
 *        aliases: {
 *            "@src": path.resolve("./src"),
 *            "@lib": path.resolve("./src/lib"),
 *            "@app": path.resolve("./src/app"),
 *        },
 *        dts: true,
 *    }),
 * ]
 */
const aliasRelative = (options: Options & Omit<GenOpts, "outdir">): Plugin => ({
    name: "alias-relative",
    setup: async build => {
        const buildOpt = build.initialOptions;
        if (!buildOpt.outdir && !buildOpt.outfile) {
            throw new Error("An out directory was not specified");
        }
        const outdir = path.resolve(
            (() => {
                try {
                    let out = buildOpt.outdir;
                    if (out) return out;
                    out = buildOpt.outfile;
                    if (out) return path.dirname(out);
                } catch (error) {}
                throw new Error("cannot find out directory");
            })()
        );
        const { aliases, dts, ...restOpts } = options;
        const dts_dir = options.dts_dir ? path.resolve(options.dts_dir) : undefined;
        const log_prefix = chalk.cyan("[Alias-Relative]");

        const loaders: Record<string, Loader> = {
            ts: "ts",
            tsx: "tsx",
            js: "js",
            jsx: "jsx",
            cjs: "js",
            mjs: "js",
        };
        const filters = Object.entries(loaders).map(([ext, loader]) => ({
            rgx: `\\.(${ext})$`,
            loader,
        }));
        const logD = (...args: any) => {
            if (buildOpt.logLevel !== "debug") return false;
            console.log(...args);
            return true;
        };

        const dts_gen =
            !buildOpt.watch && dts
                ? gen_dts({
                      ...restOpts,
                      outdir: (dts_dir ?? outdir)?.replace(path.join(process.cwd(), "/"), ""),
                  })
                : undefined;

        filters.forEach(({ rgx, loader }) => {
            build.onLoad({ filter: new RegExp(rgx) }, async ({ path: filePath }) => {
                dts_gen?.push(filePath);
                const contents = await alias_relative_matcher({
                    file_path: filePath,
                    aliases,
                    outdir,
                    log: logD,
                });
                return { contents, loader };
            });
        });

        if (!buildOpt.watch) timer.time("alias_rel");

        build.onEnd(async () => {
            if (dts_gen) {
                dts_gen.build({ log_prefix });
                if (aliases) {
                    await dts_alias_relative_replacer({
                        files: dts_gen?.output,
                        aliases,
                        outdir: dts_dir ?? outdir,
                        log: logD,
                        log_prefix,
                    });
                }
            }
            timer.timeLogCallback("alias_rel")(
                ({ str }) => `${log_prefix} ${chalk.green.dim(`Done in ${str}`)}`
            );
        });
    },
});

export { aliasRelative };
