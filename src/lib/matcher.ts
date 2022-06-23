import fs from "fs";
import { entries } from "lodash";
import path from "path";
import { fslash } from "../utils/path";

export type MatcherOpts = {
    file_path: string;
    outdir: string;
    aliases?: Record<string, string>;
    log?: (...args: any) => any;
};

const alias_relative_matcher = async (matcherOpts: MatcherOpts) => {
    let { file_path, outdir } = matcherOpts;
    const { aliases, log } = matcherOpts;
    outdir = path.resolve(outdir);
    file_path = path.resolve(file_path);

    const alias_entries = Object.entries(aliases ?? {});

    if (entries.length === 0 || !outdir || !file_path) return undefined;

    let text = await fs.promises.readFile(file_path, "utf8");

    const from_rgx = (backticks = false) => {
        const q = (mark: string, i: number) => `(${mark}(?<From${i}>(.*?))${mark})`;
        const q_marks = ['"', "'", ...(backticks ? ["`"] : [])];
        return `(${q_marks.map(q).join("|")})`;
    };

    const rgx = [
        `(?:import|export)\\s+?(?:(?:(?:[\\w*\\s{},]*)\\s+from\\s+?)|)(${from_rgx(
            false
        )})[\\s]*?(?:;|$|)`,
        `(?:import|require)\\(${from_rgx(true)}\\)`,
    ];

    const replace_group_matches =
        (reg: RegExp, text: string) => (replacer: (match: string, group_match: string) => string) =>
            text.replace(reg, (match, ...args) => {
                const group: Record<string, string | undefined> | undefined = args.find(
                    g => typeof g === "object"
                );
                Object.values(group ?? {}).forEach(g => {
                    if (!g) return;
                    match = replacer(match, g);
                });
                return match;
            });

    const replaceFromPath = (cb: (from_path: string) => string | undefined) => {
        rgx.forEach(r => {
            text = replace_group_matches(
                new RegExp(r, "g"),
                text
            )(m =>
                replace_group_matches(
                    new RegExp(from_rgx(true), "g"),
                    m
                )((m1, g1) => m1?.replace(g1, cb(g1) ?? g1))
            );
        });
    };

    const file_outpath = (() => {
        const cwd = fslash(path.resolve(process.cwd()));
        const exclude_cwd = fslash(file_path).replace(cwd, "");
        const root = exclude_cwd.split("/").find(e => !!e);
        let full_root_path = root ? fslash(path.resolve(root)) : "";
        if (root) {
            full_root_path = fs.statSync(full_root_path).isFile()
                ? fslash(path.resolve(path.dirname(root)))
                : full_root_path;
        }
        const root_path = fslash(full_root_path?.replace(cwd, ""));
        const exclude_root = exclude_cwd.replace(root_path, "");
        return {
            file_path: fslash(path.resolve(path.join(outdir, exclude_root))),
            root_path,
            full_root_path,
        };
    })();

    let fname_logged = false;

    alias_entries.forEach(([alias, alias_path]) => {
        alias_path = path.resolve(alias_path);

        const alias_rgx = new RegExp(`^${alias}`);

        const root_sub_path = (() => {
            const alias_path_fslash = fslash(alias_path);
            const has_root = (root: string) => (p: string) =>
                !!root && !!p ? new RegExp(root).test(p) : false;
            let root_s = "";
            const f_root = file_outpath.full_root_path;
            if (has_root(f_root)(alias_path_fslash)) {
                root_s = alias_path_fslash.replace(f_root, "");
            }
            return path.join(outdir, root_s);
        })();

        replaceFromPath(from_path => {
            if (!from_path || !alias_rgx.test(from_path)) return undefined;

            if (!fname_logged) {
                log?.(path.basename(file_path));
                fname_logged = true;
            }

            const subpath = from_path.replace(alias_rgx, "");
            const n_subpath = fslash(path.join(root_sub_path, subpath));
            const f_o_path_dirname = path.dirname(file_outpath.file_path);

            let n_p = fslash(path.relative(f_o_path_dirname, n_subpath));
            if (!/^\./.test(n_p)) n_p = `./${n_p}`;

            log?.(from_path, n_p);

            return n_p;
        });
    });

    if (fname_logged) log?.();

    return text;
};

export { alias_relative_matcher };
