import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { checkCompat } from "../config.js";

let logPath = null;

function initLog(targetDir) {
    logPath = path.join(targetDir, "toexe.log");
    fs.writeFileSync(logPath, `[jdm-cli toexe log — ${new Date().toISOString()}]\n\n`, "utf8");
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
function info(chalk, msg) { console.log(chalk.gray("  ·  ") + msg); }

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

export default async function toexe(chalk, args = [], rl) {
    header(chalk);
    if (!checkCompat(chalk, "toexe")) return;

    const root = process.cwd();
    const backendDir = path.join(root, "backend");

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

    step(chalk, 2, 3, "Validating backend directory");
    if (!fs.existsSync(backendDir)) {
        fail(chalk, `backend/ not found at: ${chalk.cyan(root)}`);
        return;
    }

    const entryFile = path.join(backendDir, "production_run.py");
    if (!fs.existsSync(entryFile)) {
        fail(chalk, "production_run.py not found in backend/");
        return;
    }
    ok(chalk, "backend/ validated");

    step(chalk, 3, 3, "Building EXE with PyInstaller");
    initLog(root);
    appendLog("=== PyInstaller build ===");

    const cmdParts = [
        "pyinstaller",
        "--onefile",
        "--noconsole",
        "--name flask_server",
        "--hidden-import simple_websocket",
        "--hidden-import engineio.async_drivers.threading",
        "production_run.py"
    ];

    const possibleData = [
        ["app", "app"],
        ["static", "static"],
        ["resources", "resources"],
        ["config", "config"],
        [".env", "."]
    ];

    for (const [src, dst] of possibleData) {
        const fullSrc = path.join(backendDir, src);
        if (fs.existsSync(fullSrc)) {
            cmdParts.splice(-1, 0, `--add-data "${src};${dst}"`);
            info(chalk, `Including ${chalk.yellow(src)} → ${dst}`);
        } else {
            info(chalk, `Skipping missing: ${chalk.gray(src)}`);
        }
    }

    const cmd = cmdParts.join(" ");
    try {
        exec(cmd, { cwd: backendDir, env: { ...process.env, FLASK_ENV: "deployed" } });
        ok(chalk, `EXE built: ${chalk.cyan(path.join(backendDir, "dist", "flask_server.exe"))}`);
    } catch {
        fail(chalk, "PyInstaller failed – check toexe.log for details");
        console.log(chalk.yellow("\n    Full output written to: ") + chalk.white("toexe.log\n"));
        return;
    }

    cleanLog();
    console.log("\n" + chalk.magenta("─".repeat(45)));
    console.log(chalk.green.bold("  ✔  toexe complete!"));
    console.log(chalk.magenta("─".repeat(45)) + "\n");
}