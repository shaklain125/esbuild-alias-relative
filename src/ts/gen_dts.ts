import chalk from "chalk";
import ts from "typescript";
import { timer } from "../utils/timer";
import { getExtendedTSConfig, getTSConfig, TsConfigOpts } from "./config";

type TscOpts = Partial<TsConfigOpts>;

export type GenOpts = {
    tsconfig?: string | TscOpts;
    outdir?: string;
    extendCompilerOptions?: ts.CompilerOptions;
};

export const get_dts_copts = (config?: TscOpts, outdir?: string): ts.CompilerOptions => {
    if (!config) throw new Error("tsconfig file not found");
    const tsc = getExtendedTSConfig(config);
    const ts_copts = config.dirname
        ? ts.convertCompilerOptionsFromJson(tsc.compilerOptions, config.dirname).options
        : {};
    return { ...ts_copts, ...get_default_dts_copts(ts_copts, outdir) };
};

const get_default_dts_copts = (
    copts?: ts.CompilerOptions,
    outdir?: string
): ts.CompilerOptions => ({
    declaration: true,
    emitDeclarationOnly: true,
    incremental: true,
    listEmittedFiles: true,
    declarationDir: !copts?.declarationDir ? outdir ?? copts?.outDir : copts.declarationDir,
});

const gen_dts = ({ tsconfig, outdir, extendCompilerOptions }: GenOpts = {}) => {
    let options: TscOpts | undefined = undefined;
    let name: string | undefined = undefined;
    if (typeof tsconfig === "string") {
        name = tsconfig;
    } else if (typeof tsconfig === "object") {
        options = tsconfig;
    }
    if (!options && name) options = getTSConfig(name);
    let copts: ts.CompilerOptions = {};
    if (options) {
        copts = get_dts_copts(options, outdir);
    } else {
        if (extendCompilerOptions) {
            copts = {
                ...extendCompilerOptions,
                ...get_default_dts_copts(extendCompilerOptions, outdir),
            };
        }
    }
    const host = ts.createIncrementalCompilerHost({ ...copts, ...(extendCompilerOptions ?? {}) });
    const files: string[] = [];
    let output: string[] = [];
    return {
        get input() {
            return files;
        },
        get output() {
            return output;
        },
        push(ts_x_file: string) {
            files.push(ts_x_file);
            host.getSourceFile(
                ts_x_file,
                copts.target ?? ts.ScriptTarget.Latest,
                m => console.log(m),
                true
            );
        },
        build({ time = true, log_prefix }: { time?: boolean; log_prefix?: string } = {}) {
            const prog = ts.createIncrementalProgram({
                options: copts,
                host,
                rootNames: files,
            });
            if (time) timer.time("dts_gen");
            const emit = prog.emit();
            timer.timeLogCallback("dts_gen")(
                ({ str }) =>
                    `${log_prefix ? `${log_prefix} ` : ""}${chalk.green.dim(
                        `Generated .d.ts files in ${str}`
                    )}`
            );
            output.length = 0;
            output = output.concat(emit.emittedFiles ?? []);
        },
    };
};

export { gen_dts };
