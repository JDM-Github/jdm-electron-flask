// ─────────────────────────────────────────────────────────────
//  install.js  —  jdm-cli electron-flask install
//  Installs dependencies (npm/pip) for an existing project.
//  Expects folders: backend/, frontend/, electron/ in current dir.
// ─────────────────────────────────────────────────────────────
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// ── logging ──────────────────────────────────────────────────

let logPath = null;

function initLog(targetDir) {
    logPath = path.join(targetDir, "install.log");
    fs.writeFileSync(logPath, `[jdm-cli install log — ${new Date().toISOString()}]\n\n`, "utf8");
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
        chalk.bold("install")
    );
    console.log(chalk.gray("  ─────────────────────────────────────"));
    console.log();
}

function ok(chalk, msg) { console.log(chalk.green("    ✔  ") + msg); }
function fail(chalk, msg) { console.log(chalk.red("    ✖  ") + msg); }
function info(chalk, msg) { console.log(chalk.gray("    ·  ") + msg); }

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

// ── main ─────────────────────────────────────────────────────

export default async function install(chalk) {
    header(chalk);

    const root = process.cwd();

    const dirs = {
        backend: path.join(root, "backend"),
        frontend: path.join(root, "frontend"),
        electron: path.join(root, "electron"),
    };

    const missing = Object.entries(dirs)
        .filter(([, dir]) => !fs.existsSync(dir))
        .map(([name]) => name);

    if (missing.length > 0) {
        fail(chalk, `Missing folders: ${missing.map((m) => chalk.cyan(m)).join(", ")}`);
        console.log(chalk.gray("    Run this command from the root of an electron-flask project."));
        process.exit(1);
    }

    initLog(root);

    // ── Backend ───────────────────────────────────────────────
    const req = path.join(dirs.backend, "requirements.txt");
    if (fs.existsSync(req)) {
        info(chalk, "Installing Python dependencies...");
        appendLog("\n=== backend ===");
        try {
            exec("pip install -r requirements.txt", { cwd: dirs.backend });
            ok(chalk, "Backend dependencies installed");
        } catch (err) {
            fail(chalk, `Backend install failed: ${err.message}`);
            console.log(chalk.yellow("\n    Full output written to: ") + chalk.white("install.log\n"));
            process.exit(1);
        }
    } else {
        info(chalk, "No requirements.txt — skipping backend");
    }

    // ── Frontend ──────────────────────────────────────────────
    info(chalk, "Installing frontend dependencies...");
    appendLog("\n=== frontend ===");
    try {
        exec("npm install", { cwd: dirs.frontend });
        ok(chalk, "Frontend dependencies installed");
    } catch (err) {
        fail(chalk, `Frontend install failed: ${err.message}`);
        console.log(chalk.yellow("\n    Full output written to: ") + chalk.white("install.log\n"));
        process.exit(1);
    }

    // ── Electron ──────────────────────────────────────────────
    info(chalk, "Installing Electron dependencies...");
    appendLog("\n=== electron ===");
    try {
        exec("npm install", { cwd: dirs.electron });
        ok(chalk, "Electron dependencies installed");
    } catch (err) {
        fail(chalk, `Electron install failed: ${err.message}`);
        console.log(chalk.yellow("\n    Full output written to: ") + chalk.white("install.log\n"));
        process.exit(1);
    }

    // ── Done ──────────────────────────────────────────────────
    cleanLog();

    console.log();
    console.log(chalk.gray("  ─────────────────────────────────────"));
    console.log(chalk.green("    ✔  All dependencies installed successfully!"));
    console.log(chalk.gray("  ─────────────────────────────────────"));
    console.log();
}