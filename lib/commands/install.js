import fs from "fs";
import path from "path";
import { execSync } from "child_process";

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
function warn(chalk, msg) { console.log(chalk.yellow("    ⚠  ") + msg); }

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

// ── Parse install flags ───────────────────────────────────────
// --install-all              → install all three
// --frontend-install         → install frontend only
// --backend-install          → install backend only
// --electron-install         → install electron only
// If NO flags are passed at all, fall back to installing all three
// (preserves original behaviour when called without a GUI).

function parseInstallFlags(args) {
    const installAll = args.includes("--install-all");
    const hasAny =
        installAll ||
        args.includes("--frontend-install") ||
        args.includes("--backend-install") ||
        args.includes("--electron-install");

    return {
        backend: !hasAny || installAll || args.includes("--backend-install"),
        frontend: !hasAny || installAll || args.includes("--frontend-install"),
        electron: !hasAny || installAll || args.includes("--electron-install"),
    };
}

export default async function install(chalk, args = [], rl) {
    header(chalk);

    const root = process.cwd();
    const installFlags = parseInstallFlags(args);

    const dirs = {
        backend: path.join(root, "backend"),
        frontend: path.join(root, "frontend"),
        electron: path.join(root, "electron"),
    };

    // Only check existence of folders we actually intend to install
    const needed = Object.entries(installFlags).filter(([, v]) => v).map(([k]) => k);
    const missing = needed.filter((name) => !fs.existsSync(dirs[name]));

    if (missing.length > 0) {
        fail(chalk, `Missing folders: ${missing.map((m) => chalk.cyan(m)).join(", ")}`);
        console.log(chalk.gray("    Run this command from the root of an electron-flask project."));
        return;
    }

    initLog(root);
    let anyFailed = false;

    // ── Backend ───────────────────────────────────────────────
    if (installFlags.backend) {
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
                anyFailed = true;
            }
        } else {
            warn(chalk, "No requirements.txt — skipping backend");
        }
    }

    // ── Frontend ──────────────────────────────────────────────
    if (installFlags.frontend) {
        info(chalk, "Installing frontend dependencies...");
        appendLog("\n=== frontend ===");
        try {
            exec("npm install", { cwd: dirs.frontend });
            ok(chalk, "Frontend dependencies installed");
        } catch (err) {
            fail(chalk, `Frontend install failed: ${err.message}`);
            console.log(chalk.yellow("\n    Full output written to: ") + chalk.white("install.log\n"));
            anyFailed = true;
        }
    }

    // ── Electron ──────────────────────────────────────────────
    if (installFlags.electron) {
        info(chalk, "Installing Electron dependencies...");
        appendLog("\n=== electron ===");
        try {
            exec("npm install", { cwd: dirs.electron });
            ok(chalk, "Electron dependencies installed");
        } catch (err) {
            fail(chalk, `Electron install failed: ${err.message}`);
            console.log(chalk.yellow("\n    Full output written to: ") + chalk.white("install.log\n"));
            anyFailed = true;
        }
    }

    if (anyFailed) return;
    cleanLog();

    const installed = needed.join(", ");
    console.log();
    console.log(chalk.gray("  ─────────────────────────────────────"));
    console.log(chalk.green(`    ✔  Dependencies installed successfully! `) + chalk.gray(`(${installed})`));
    console.log(chalk.gray("  ─────────────────────────────────────"));
    console.log();
}