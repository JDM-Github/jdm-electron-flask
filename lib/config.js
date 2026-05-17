// ─────────────────────────────────────────────────────────────
//  jdm-plugin-template  —  lib/config.js
// ─────────────────────────────────────────────────────────────

import fs from "fs";
import path from "path";
import { COMPAT, pluginVersion } from "./compat.js";

export const CONFIG_FILE = ".jdm-config.json";

const PLUGIN_NAME = "electron-flask";

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

export function configExists(root = process.cwd()) {
    return fs.existsSync(path.join(root, CONFIG_FILE));
}

export function readConfig(root = process.cwd()) {
    const p = path.join(root, CONFIG_FILE);
    if (!fs.existsSync(p)) return null;
    try {
        const full = JSON.parse(fs.readFileSync(p, "utf8"));
        return full[PLUGIN_NAME] ?? {};
    } catch {
        return null;
    }
}

export function writeConfig(root = process.cwd(), extra = {}) {
    const p = path.join(root, CONFIG_FILE);
    let full = {};
    if (fs.existsSync(p)) {
        try { full = JSON.parse(fs.readFileSync(p, "utf8")); } catch { /* start fresh */ }
    }

    const pluginData = {
        pluginVersion,
        createdAt: new Date().toISOString(),
        ...extra,
    };

    full[PLUGIN_NAME] = pluginData;
    fs.writeFileSync(p, JSON.stringify(full, null, 2) + "\n", "utf8");
    return pluginData;
}

export function checkCompat(chalk, command) {
    const root = process.cwd();
    const cfg = readConfig(root);

    if (cfg === null || !cfg.pluginVersion) {
        console.log();
        console.log(chalk.yellow("  ⚠  No .jdm-config.json entry found for this plugin."));
        console.log(chalk.gray(`     This may not be a jdm-${PLUGIN_NAME} project,`));
        console.log(chalk.gray("     or it was created before config tracking was introduced."));
        const globalRange = COMPAT.global ?? null;
        if (globalRange) {
            console.log(chalk.gray(`     Expected a project created with plugin ${chalk.white(globalRange)}.`));
        }
        console.log(chalk.gray("     Proceeding anyway — things may not work as expected.\n"));
        return true;
    }

    const projectVer = cfg.pluginVersion;
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
        console.log(chalk.yellow("  Tip: ") + chalk.gray("Re-scaffold with ") + chalk.white(`jdm-cli ${PLUGIN_NAME} create`));
        console.log(chalk.gray("       or update the plugin to a version that supports your project.\n"));
        return false;
    }
    return true;
}