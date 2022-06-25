import fs from "fs";
import path from "path";
import ts from "typescript";

export const configFileExists = (dirname: string, filename: string = "tsconfig.json") =>
    !!ts.findConfigFile(dirname, ts.sys.fileExists, filename);

const getTSConfig = (conf_file = "tsconfig.json") => {
    conf_file = path.resolve(conf_file);
    const p = path.dirname(conf_file);
    let loc = ts.findConfigFile(p, ts.sys.fileExists, conf_file);
    if (!loc) throw new Error(`tsconfig.json not found in ${p}`);
    if (loc.startsWith(".")) loc = require.resolve(loc);
    const c = ts.readConfigFile(loc, filePath => fs.readFileSync(filePath, "utf-8"));
    if (c.error) throw c.error;
    const _conf = c.config;
    const config = ts.parseJsonConfigFileContent(_conf, ts.sys, p);
    return { path: loc, dirname: p, config, json: _conf };
};

export type TsConfigOpts = ReturnType<typeof getTSConfig>;

const getExtendedTSConfig = (config: Partial<TsConfigOpts>) => {
    const tsc = config.json ?? {};
    if (!("extends" in tsc) || !config.path) return tsc;
    const extLoc = path.resolve(path.dirname(config.path), tsc.extends);
    const extended = getTSConfig(extLoc).json;
    const hasComp = "compilerOptions" in extended && "compilerOptions" in tsc;
    if (hasComp) tsc.compilerOptions = { ...extended.compilerOptions, ...tsc.compilerOptions };
    return tsc;
};

const get_path_aliases = (tsc: TsConfigOpts) => tsc.config.options.paths;

const parse_path_aliases = (copts: ts.CompilerOptions) => {
    const rmglob = (str: string | undefined) => str?.replace(/\*/g, "");
    return Object.fromEntries(
        Object.entries(copts.paths ?? {})
            .map(([alias, alias_path]) => [rmglob(alias), rmglob(alias_path?.[0])])
            .map(([alias, alias_path]) => [
                alias,
                alias_path ? path.resolve(alias_path) : undefined,
            ])
            .filter(([alias, alias_path]) => !!alias && !!alias_path)
    ) as Record<string, string>;
};

const get_filenames_from_config_json = (config: Record<string, any>, basePath = process.cwd()) =>
    ts.parseJsonConfigFileContent(config, ts.sys, basePath).fileNames;

export {
    getTSConfig,
    getExtendedTSConfig,
    parse_path_aliases,
    get_path_aliases,
    get_filenames_from_config_json,
};
