// ─────────────────────────────────────────────────────────────
//  toexe.js  —  jdm-cli electron-flask toexe
//  Build backend Python app into a standalone EXE via PyInstaller.
//  Targets cwd as project root.
// ─────────────────────────────────────────────────────────────
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

function header(chalk) {
    console.log();
    console.log(
        chalk.cyan("  jdm") +
        chalk.gray(" / ") +
        chalk.white("electron-flask") +
        chalk.gray(" / ") +
        chalk.bold("toexe")
    );
    console.log(chalk.gray("  ─────────────────────────────────────"));
    console.log();
}

function step(chalk, n, total, label) {
    console.log("\n" + chalk.bgMagenta.black(` ${n}/${total} `) + " " + chalk.bold(label));
}

function ok(chalk, msg) { console.log(chalk.green("  ✔  ") + msg); }
function fail(chalk, msg) { console.log(chalk.red("  ✖  ") + msg); }

export default async function toexe(chalk) {
    header(chalk);

    const root = process.cwd();
    const backendDir = path.join(root, "backend");

    // ── Step 1: clean ──────────────────────────────────────────
    step(chalk, 1, 3, "Cleaning previous build artifacts");
    const cleanTargets = [
        path.join(backendDir, "build"),
        path.join(backendDir, "dist"),
        path.join(backendDir, "flask_server.spec"),
    ];
    for (const t of cleanTargets) {
        if (fs.existsSync(t)) {
            fs.rmSync(t, { recursive: true, force: true });
            ok(chalk, `Removed ${chalk.gray(path.relative(root, t))}`);
        }
    }

    // ── Step 2: validate backend ───────────────────────────────
    step(chalk, 2, 3, "Validating backend directory");

    if (!fs.existsSync(backendDir)) {
        fail(chalk, `backend/ not found at: ${chalk.cyan(root)}`);
        process.exit(1);
    }

    const entryFile = path.join(backendDir, "production_run.py");
    if (!fs.existsSync(entryFile)) {
        fail(chalk, "production_run.py not found in backend/");
        process.exit(1);
    }

    ok(chalk, "backend/ validated");

    // ── Step 3: PyInstaller ────────────────────────────────────
    step(chalk, 3, 3, "Building EXE with PyInstaller");

    const cmd = [
        "pyinstaller",
        "--onefile",
        "--noconsole",
        "--name flask_server",
        "--add-data \"app;app\"",
        "--add-data \"static;static\"",
        "--add-data \".env;.\"",
        "production_run.py",
    ].join(" ");

    try {
        execSync(cmd, {
            cwd: backendDir,
            env: { ...process.env, FLASK_ENV: "production" },
            stdio: "inherit",
        });
        ok(chalk, "EXE built: " + chalk.cyan("backend/dist/flask_server.exe"));
    } catch {
        fail(chalk, "PyInstaller failed. Check output above.");
        process.exit(1);
    }

    console.log("\n" + chalk.magenta("─".repeat(45)));
    console.log(chalk.green.bold("  ✔  toexe complete!"));
    console.log(chalk.magenta("─".repeat(45)) + "\n");
}