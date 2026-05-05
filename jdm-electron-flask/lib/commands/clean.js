// ─────────────────────────────────────────────────────────────
//  clean.js  —  jdm-cli electron-flask clean
//  Removes build artifacts. Targets cwd (project root).
// ─────────────────────────────────────────────────────────────
import fs from "fs";
import path from "path";
import { checkCompat } from "../config.js";

const TARGETS = [
    { type: "dir", rel: "backend/build" },
    { type: "dir", rel: "backend/dist" },
    { type: "file", rel: "backend/flask_server.spec" },
    { type: "dir", rel: "electron/dist" },
];

function header(chalk) {
    console.log();
    console.log(
        chalk.cyan("  jdm") +
        chalk.gray(" / ") +
        chalk.white("electron-flask") +
        chalk.gray(" / ") +
        chalk.bold("clean")
    );
    console.log(chalk.gray("  ─────────────────────────────────────"));
    console.log();
}

export default async function clean(chalk) {
    header(chalk);
    if (!checkCompat(chalk, "clean")) return;

    const root = process.cwd();
    let removed = 0;
    let skipped = 0;
    let failed = 0;

    for (const target of TARGETS) {
        const full = path.join(root, target.rel);
        const label = chalk.gray(target.rel);

        if (!fs.existsSync(full)) {
            console.log(chalk.gray("  [SKIP]  ") + label);
            skipped++;
            continue;
        }

        try {
            if (target.type === "dir") {
                fs.rmSync(full, { recursive: true, force: true });
            } else {
                fs.unlinkSync(full);
            }
            console.log(chalk.green("  [OK]    ") + label);
            removed++;
        } catch (err) {
            console.log(chalk.red("  [FAIL]  ") + label + chalk.red(` — ${err.message}`));
            failed++;
        }
    }

    console.log("\n" + chalk.yellow("─".repeat(45)));
    console.log(
        chalk.green(`  ✔  Removed: ${removed}  `) +
        chalk.gray(`Skipped: ${skipped}  `) +
        (failed > 0 ? chalk.red(`Failed: ${failed}`) : "")
    );
    console.log(chalk.yellow("─".repeat(45)) + "\n");
}