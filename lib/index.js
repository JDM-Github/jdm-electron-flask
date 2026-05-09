// ─────────────────────────────────────────────────────────────
//  jdm-electron-flask  —  lib/index.js
// ─────────────────────────────────────────────────────────────
import create from "./commands/create.js";
import clean from "./commands/clean.js";
import compile from "./commands/compile.js";
import dev from "./commands/dev.js";
import prod from "./commands/prod.js";
import toexe from "./commands/toexe.js";
import install from "./commands/install.js";
import sync from "./commands/sync.js";
import patch from "./commands/patch.js";
import makeApi from "./commands/make-api.js";

export const namespace = "electron-flask";

export const commands = {
    create,
    clean,
    compile,
    dev,
    prod,
    toexe,
    install,
    sync,
    patch,
    "make-api": makeApi,
};

export async function run(command, args, chalk, rl) {
    if (command === "help" || command === "--help" || command === "-h") {
        return showDesign(chalk);
    }
    const fn = commands[command];
    if (!fn) {
        console.log(chalk.red(`\n  ✖  Unknown command: "${command}"`));
        console.log(chalk.gray(`     Available commands: ${Object.keys(commands).join(", ")}`));
        return;
    }
    if (["create", "make-api"].includes(command)) {
        return fn(chalk, rl, args);
    }
    return fn(chalk, args);
}

export async function showDesign(chalk) {
    console.log(chalk.cyan("\n  ⚡ Electron-Flask Plugin"));
    console.log(chalk.gray("     Create full-stack apps with:"), chalk.white("Electron + Flask + React"));
    console.log(chalk.gray("     Available commands:\n"));
    console.log(`  ${chalk.green("create")}      ${chalk.dim("Scaffold a new project")}`);
    console.log(`  ${chalk.green("dev")}         ${chalk.dim("Start dev servers")}`);
    console.log(`  ${chalk.green("prod")}        ${chalk.dim("Build for production")}`);
    console.log(`  ${chalk.green("toexe")}       ${chalk.dim("Package as executable")}`);
    console.log(`  ${chalk.green("clean")}       ${chalk.dim("Clean build artifacts")}`);
    console.log(`  ${chalk.green("install")}     ${chalk.dim("Install dependencies")}`);
    console.log(`  ${chalk.green("sync")}        ${chalk.dim("Sync version & name from electron-flask.json")}`);
    console.log(`  ${chalk.green("patch")}       ${chalk.dim("Bump patch version and sync")}`);
    console.log(`  ${chalk.green("make-api")}    ${chalk.dim("Scaffold a Blueprint + Service for the backend")}\n`);
}