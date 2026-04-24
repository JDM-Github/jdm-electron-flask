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

export const namespace = "electron-flask";

export const commands = {
    create,
    clean,
    compile,
    dev,
    prod,
    toexe,
    install
};

export async function run(command, args, chalk) {
    const fn = commands[command];
    if (!fn) throw new Error(`Unknown command: ${command}`);
    return fn(chalk, args);
}