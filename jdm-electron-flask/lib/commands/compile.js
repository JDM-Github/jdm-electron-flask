// ─────────────────────────────────────────────────────────────
//  compile.js  —  jdm-cli electron-flask compile
//  Full compile: frontend → backend EXE → electron dist
//  Targets cwd as project root.
// ─────────────────────────────────────────────────────────────
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import toexe from "./toexe.js";

// ── logging ──────────────────────────────────────────────────

let logPath = null;

function initLog(targetDir) {
    logPath = path.join(targetDir, "compile.log");
    fs.writeFileSync(logPath, `[jdm-cli compile log — ${new Date().toISOString()}]\n\n`, "utf8");
}

function appendLog(lines) {
    if (!logPath) return;
    fs.appendFileSync(logPath, lines + "\n", "utf8");
}

function cleanLog() {
    if (logPath && fs.existsSync(logPath)) {
        fs.unlinkSync(logPath);
        logPath = null;
    }
}

// ── helpers ──────────────────────────────────────────────────

function header(chalk) {
    console.log();
    console.log(
        chalk.cyan("  jdm") +
        chalk.gray(" / ") +
        chalk.white("electron-flask") +
        chalk.gray(" / ") +
        chalk.bold("compile")
    );
    console.log(chalk.gray("  ─────────────────────────────────────"));
    console.log();
}

function step(chalk, n, total, label) {
    console.log("\n" + chalk.bgBlue.white(` ${n}/${total} `) + " " + chalk.bold(label));
}

function ok(chalk, msg) { console.log(chalk.green("  ✔  ") + msg); }
function fail(chalk, msg) { console.log(chalk.red("  ✖  ") + msg); }
function info(chalk, msg) { console.log(chalk.gray("  ·  ") + msg); }

// ── silent exec with log ──────────────────────────────────────

function exec(cmd, opts = {}) {
    try {
        const result = execSync(cmd, { ...opts, stdio: "pipe" });
        if (result) appendLog(`[OK] ${cmd}\n${result.toString()}`);
        return result;
    } catch (err) {
        const output = [
            `[FAIL] ${cmd}`,
            err.stdout?.toString() || "",
            err.stderr?.toString() || "",
        ].join("\n");
        appendLog(output);
        throw err;
    }
}

export default async function compile(chalk) {
    header(chalk);

    const root = process.cwd();
    const frontendDir = path.join(root, "frontend");
    const electronDir = path.join(root, "electron");
    const backendDir = path.join(root, "backend");

    initLog(root);

    // ── Step 1: frontend build ─────────────────────────────────
    step(chalk, 1, 4, "Building Frontend (deployed mode)");

    if (!fs.existsSync(frontendDir)) {
        fail(chalk, "frontend/ folder not found");
        process.exit(1);
    }

    appendLog("\n=== frontend ===");
    info(chalk, "npm install...");
    try {
        exec("npm install", { cwd: frontendDir });
        info(chalk, "npm run build...");
        exec("npm run build", {
            cwd: frontendDir,
            env: { ...process.env, VITE_MODE: "deployed" },
        });
        ok(chalk, "Frontend build complete");
    } catch (err) {
        fail(chalk, "Frontend build failed");
        console.log(chalk.yellow("\n    Full output written to: ") + chalk.white("compile.log\n"));
        process.exit(1);
    }

    // ── Step 2: backend EXE ────────────────────────────────────
    step(chalk, 2, 4, "Building Backend EXE");
    appendLog("\n=== backend EXE ===");
    await toexe(chalk);

    // ── Step 3: move EXE to electron/resources ─────────────────
    step(chalk, 3, 4, "Moving EXE → electron/resources/backend");

    const src = path.join(backendDir, "dist", "flask_server.exe");
    const destDir = path.join(electronDir, "resources", "backend");
    const dest = path.join(destDir, "flask_server.exe");

    if (!fs.existsSync(src)) {
        fail(chalk, "flask_server.exe not found in backend/dist/");
        console.log(chalk.yellow("\n    Full output written to: ") + chalk.white("compile.log\n"));
        process.exit(1);
    }

    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(src, dest);
    appendLog(`[OK] Copied ${src} → ${dest}`);
    ok(chalk, "EXE copied to " + chalk.cyan("electron/resources/backend/"));

    // ── Step 4: electron dist ──────────────────────────────────
    step(chalk, 4, 4, "Building Electron App");

    if (!fs.existsSync(electronDir)) {
        fail(chalk, "electron/ folder not found");
        console.log(chalk.yellow("\n    Full output written to: ") + chalk.white("compile.log\n"));
        process.exit(1);
    }

    appendLog("\n=== electron ===");
    info(chalk, "npm install...");
    try {
        exec("npm install", { cwd: electronDir });
        info(chalk, "npm run dist...");
        exec("npm run dist", { cwd: electronDir });
        ok(chalk, "Electron build complete");
    } catch (err) {
        fail(chalk, "Electron build failed");
        console.log(chalk.yellow("\n    Full output written to: ") + chalk.white("compile.log\n"));
        process.exit(1);
    }

    // ── Done ──────────────────────────────────────────────────
    cleanLog();

    console.log("\n" + chalk.blue("─".repeat(45)));
    console.log(chalk.green.bold("  ✔  Full compile complete!"));
    console.log(chalk.blue("─".repeat(45)) + "\n");
}