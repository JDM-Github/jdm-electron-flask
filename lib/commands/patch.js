// ─────────────────────────────────────────────────────────────
//  patch.js  —  jdm-cli electron-flask patch
//  Bumps the patch version in electron-flask.json, rolls over
//  minor/major at 20, then runs sync. Targets cwd (project root).
//
//  Examples:
//    1.0.0  →  1.0.1
//    1.0.19 →  1.1.0
//    1.19.19 → 2.0.0
// ─────────────────────────────────────────────────────────────
import fs from "fs";
import path from "path";
import { checkCompat } from "../config.js";
import sync from "./sync.js";

const ROLLOVER = 20;
function header(chalk) {
    console.log();
    console.log(
        chalk.cyan("  jdm") +
        chalk.gray(" / ") +
        chalk.white("electron-flask") +
        chalk.gray(" / ") +
        chalk.bold("patch")
    );
    console.log(chalk.gray("  ─────────────────────────────────────"));
    console.log();
}

function bumpVersion(current) {
    const parts = current.split(".").map(Number);

    if (parts.length !== 3 || parts.some(isNaN)) {
        throw new Error(`Invalid version format: "${current}" — expected x.y.z`);
    }

    let [major, minor, patch] = parts;

    patch += 1;

    if (patch >= ROLLOVER) {
        patch = 0;
        minor += 1;
    }

    if (minor >= ROLLOVER) {
        minor = 0;
        major += 1;
    }

    return `${major}.${minor}.${patch}`;
}

export default async function patch(chalk) {
    header(chalk);
    if (!checkCompat(chalk, "patch")) return;

    const root = process.cwd();
    const configPath = path.join(root, "electron-flask.json");
    const label = chalk.gray("electron-flask.json");

    if (!fs.existsSync(configPath)) {
        console.log(chalk.red("  [FAIL]  ") + label + chalk.red(" — file not found"));
        console.log();
        return;
    }

    let config;
    try {
        config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    } catch (err) {
        console.log(chalk.red("  [FAIL]  ") + label + chalk.red(` — ${err.message}`));
        console.log();
        return;
    }

    const oldVersion = config.version;
    let newVersion;

    try {
        newVersion = bumpVersion(oldVersion);
    } catch (err) {
        console.log(chalk.red("  [FAIL]  ") + label + chalk.red(` — ${err.message}`));
        console.log();
        return;
    }

    config.version = newVersion;

    try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log(
            chalk.green("  [OK]    ") +
            label +
            chalk.gray("  ") +
            chalk.dim(oldVersion) +
            chalk.gray("  →  ") +
            chalk.cyan(newVersion)
        );
    } catch (err) {
        console.log(chalk.red("  [FAIL]  ") + label + chalk.red(` — ${err.message}`));
        console.log();
        return;
    }

    console.log("\n" + chalk.yellow("─".repeat(45)) + "\n");
    await sync(chalk);
}