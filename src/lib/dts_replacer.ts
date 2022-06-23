import chalk from "chalk";
import FastGlob from "fast-glob";
import fs from "fs";
import path from "path";
import { fslash } from "../utils/path";
import { timer } from "../utils/timer";
import { alias_relative_matcher, MatcherOpts } from "./matcher";

type DtsAliasRelOpts = {
    /**
     * Manually set the files that need to be modified.
     *
     * Files are read from the directory by default.
     */
    files?: string[];
    log_prefix?: string;
} & Omit<MatcherOpts, "file_path">;

const get_dts_files = async (outdir: string) =>
    (await FastGlob("**/*.d.ts", { cwd: outdir })).map(d => fslash(path.join(outdir, d)));

const dts_alias_relative_replacer = async ({
    files,
    outdir,
    log_prefix,
    ...rest
}: DtsAliasRelOpts) => {
    log_prefix = log_prefix ? `${log_prefix} ` : "";
    timer.time("dts_alias");
    files =
        typeof files === "undefined"
            ? await get_dts_files(outdir)
            : files.map(d => fslash(path.resolve(d)));
    await Promise.all(
        files.map(async file_path => {
            const contents = await alias_relative_matcher({
                file_path,
                outdir,
                ...rest,
            });
            if (contents) await fs.promises.writeFile(file_path, contents);
        })
    );

    timer.timeLogCallback("dts_alias")(
        ({ str }) => `${log_prefix}${chalk.green.dim(`Replaced aliases of .d.ts files in ${str}`)}`
    );
};

export { dts_alias_relative_replacer };
