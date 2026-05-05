import fs from "fs";
import path from "path";
import { COMPAT, pluginVersion } from "./compat.js";

export const CONFIG_FILE = ".jdm-config.json";

function parseVer(v) {
    return String(v).split(".").map(Number);
}

function cmpVer(a, b) {
    const pa = parseVer(a);
    const pb = parseVer(b);
    for (let i = 0; i < 3; i++) {
        const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
        if (diff !== 0) return diff < 0 ? -1 : 1;
    }
    return 0;
}

export function satisfies(version, range) {
    if (!range) return true;
    const rangeList = range.split("||").map(r => r.trim());
    return rangeList.some(r => {
        if (r.startsWith(">=")) return cmpVer(version, r.slice(2)) >= 0;
        if (r.startsWith("<=")) return cmpVer(version, r.slice(2)) <= 0;
        if (r.startsWith(">")) return cmpVer(version, r.slice(1)) > 0;
        if (r.startsWith("<")) return cmpVer(version, r.slice(1)) < 0;
        return cmpVer(version, r) === 0; // exact match
    });
}

export function readConfig(root = process.cwd()) {
    const p = path.join(root, CONFIG_FILE);
    if (!fs.existsSync(p)) return null;
    try {
        return JSON.parse(fs.readFileSync(p, "utf8"));
    } catch {
        return null;
    }
}

export function writeConfig(root = process.cwd(), extra = {}) {
    const p = path.join(root, CONFIG_FILE);
    const data = {
        plugin: "electron-flask",
        pluginVersion,
        createdAt: new Date().toISOString(),
        ...extra,
    };
    fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n", "utf8");
    return data;
}

export function checkCompat(chalk, command) {
    const root = process.cwd();
    const cfg = readConfig(root);
    if (!cfg) {
        console.log();
        console.log(chalk.yellow("  ⚠  No .jdm-config.json found in this directory."));
        console.log(chalk.gray("     This may not be a jdm-electron-flask project,"));
        console.log(chalk.gray("     or it was created before config tracking was introduced."));
        const globalRange = COMPAT.global ?? null;
        if (globalRange) {
            console.log(chalk.gray(`     Expected a project created with plugin ${chalk.white(globalRange)}.`));
        }
        console.log(chalk.gray("     Proceeding anyway — things may not work as expected.\n"));
        return true;
    }
    const projectVer = cfg.pluginVersion;

    if (cfg.plugin && cfg.plugin !== "electron-flask") {
        console.log();
        console.log(chalk.red("  ✖  Config mismatch: this project belongs to plugin") +
            chalk.cyan(` "${cfg.plugin}"`) +
            chalk.red(", not electron-flask."));
        console.log();
        return false;
    }

    const range = COMPAT.commands?.[command] ?? COMPAT.global ?? null;
    if (!range) return true;

    if (!satisfies(projectVer, range)) {
        const cmdLabel = COMPAT.commands?.[command] ? `"${command}"` : "this plugin";
        console.log();
        console.log(chalk.red(`  ✖  Compatibility error for command: ${chalk.bold(command)}`));
        console.log(
            chalk.gray("     Project was created with plugin version ") +
            chalk.cyan(projectVer) +
            chalk.gray(",")
        );
        console.log(
            chalk.gray(`     but ${cmdLabel} requires `) +
            chalk.white(range) +
            chalk.gray(".")
        );
        console.log();
        console.log(chalk.yellow("  Tip: ") + chalk.gray("Re-scaffold with ") + chalk.white("jdm-cli electron-flask create"));
        console.log(chalk.gray("       or update the plugin to a version that supports your project.\n"));
        return false;
    }
    return true;
}
