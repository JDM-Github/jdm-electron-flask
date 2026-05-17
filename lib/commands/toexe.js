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

function generateEnvPy(backendDir, chalk) {
    const dotenvPath = path.join(backendDir, ".env");
    if (!fs.existsSync(dotenvPath)) {
        fail(chalk, ".env not found in backend/ — cannot generate env.py");
        return false;
    }

    const lines = fs.readFileSync(dotenvPath, "utf-8").split("\n");
    const secrets = {};
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const idx = trimmed.indexOf("=");
        if (idx === -1) continue;
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (key && val) secrets[key] = val;
    }

    if (Object.keys(secrets).length === 0) {
        fail(chalk, ".env is empty — nothing to bundle");
        return false;
    }

    const envLines = ["import os", "", "def load_secrets():"];
    for (const [k, v] of Object.entries(secrets)) {
        envLines.push(`    os.environ["${k}"] = "${v}"`);
        info(chalk, `Bundling: ${chalk.yellow(k)}`);
    }

    fs.writeFileSync(path.join(backendDir, "env.py"), envLines.join("\n"), "utf-8");
    ok(chalk, "env.py generated from .env");
    return true;
}

function cleanEnvFiles(backendDir, chalk) {
    const toDelete = [
        path.join(backendDir, "env.py"),
        path.join(backendDir, "dist"),
    ];
    for (const f of toDelete) {
        if (fs.existsSync(f)) {
            fs.rmSync(f, { recursive: true, force: true });
            info(chalk, `Cleaned: ${chalk.gray(f)}`);
        }
    }

    // Clean pyarmor runtime if copied to backendDir
    const runtimeDir = fs.readdirSync(backendDir).find(f => f.startsWith("pyarmor_runtime"));
    if (runtimeDir) {
        const runtimePath = path.join(backendDir, runtimeDir);
        fs.rmSync(runtimePath, { recursive: true, force: true });
        info(chalk, `Cleaned: ${chalk.gray(runtimePath)}`);
    }
}

export default async function toexe(chalk, args = [], rl) {
    header(chalk);
    if (!checkCompat(chalk, "toexe")) return;

    const root = process.cwd();
    const backendDir = path.join(root, "backend");

    // ── Step 1: Clean ────────────────────────────────────────
    step(chalk, 1, 5, "Cleaning previous build artifacts");
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

    // ── Step 2: Validate ─────────────────────────────────────
    step(chalk, 2, 5, "Validating backend directory");
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

    // ── Step 3: Generate env.py from .env ───────────────────
    step(chalk, 3, 5, "Generating env.py from .env");
    if (!generateEnvPy(backendDir, chalk)) return;

    // ── Step 4: Obfuscate env.py with PyArmor ───────────────
    step(chalk, 4, 5, "Obfuscating env.py with PyArmor");
    let obfRuntimeDir = null;
    try {
        exec("pyarmor gen env.py", { cwd: backendDir });
        ok(chalk, "env.py obfuscated with PyArmor");

        // PyArmor outputs to dist/ directly
        const obfDist = path.join(backendDir, "dist");
        const obfEnvPy = path.join(obfDist, "env.py");

        if (!fs.existsSync(obfEnvPy)) {
            throw new Error("Obfuscated env.py not found in dist/");
        }

        // Overwrite plain env.py with obfuscated version
        fs.copyFileSync(obfEnvPy, path.join(backendDir, "env.py"));
        ok(chalk, "Obfuscated env.py copied to backend/");

        // Copy pyarmor runtime folder next to env.py
        const obfRuntime = fs.readdirSync(obfDist).find(f => f.startsWith("pyarmor_runtime"));
        if (obfRuntime) {
            const runtimeSrc = path.join(obfDist, obfRuntime);
            const runtimeDst = path.join(backendDir, obfRuntime);
            fs.cpSync(runtimeSrc, runtimeDst, { recursive: true });
            obfRuntimeDir = obfRuntime;
            ok(chalk, `PyArmor runtime copied: ${chalk.gray(obfRuntime)}`);
        }

        // Clean PyArmor's dist/ output — PyInstaller will make its own dist/
        fs.rmSync(path.join(backendDir, "dist"), { recursive: true, force: true });

    } catch (err) {
        fail(chalk, `Obfuscation failed: ${err.message}`);
        cleanEnvFiles(backendDir, chalk);
        return;
    }

    // ── Step 5: Build with PyInstaller ───────────────────────
    step(chalk, 5, 5, "Building with PyInstaller");
    initLog(root);
    appendLog("=== PyInstaller build ===");

    const cmdParts = [
        "pyinstaller",
        "--onedir",
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
        ["env.py", "."],
    ];

    // Include pyarmor runtime if present
    if (obfRuntimeDir) {
        possibleData.push([obfRuntimeDir, obfRuntimeDir]);
        info(chalk, `Including PyArmor runtime: ${chalk.yellow(obfRuntimeDir)}`);
    }

    for (const [src, dst] of possibleData) {
        const fullSrc = path.join(backendDir, src);
        if (fs.existsSync(fullSrc)) {
            cmdParts.splice(-1, 0, `--add-data "${src};${dst}"`);
            info(chalk, `Including ${chalk.yellow(src)} → ${dst}`);
        } else {
            info(chalk, `Skipping missing: ${chalk.gray(src)}`);
        }
    }

    try {
        exec(cmdParts.join(" "), { cwd: backendDir, env: { ...process.env, FLASK_ENV: "deployed" } });
        ok(chalk, `Built: ${chalk.cyan(path.join(backendDir, "dist", "flask_server", "flask_server.exe"))}`);
    } catch {
        fail(chalk, "PyInstaller failed – check toexe.log for details");
        console.log(chalk.yellow("\n    Full output written to: ") + chalk.white("toexe.log\n"));
    } finally {
        // Always clean sensitive files regardless of success or failure
        info(chalk, "Cleaning up sensitive files...");
        const envPy = path.join(backendDir, "env.py");
        if (fs.existsSync(envPy)) {
            fs.unlinkSync(envPy);
            info(chalk, `Cleaned: ${chalk.gray(envPy)}`);
        }
        if (obfRuntimeDir) {
            const runtimePath = path.join(backendDir, obfRuntimeDir);
            if (fs.existsSync(runtimePath)) {
                fs.rmSync(runtimePath, { recursive: true, force: true });
                info(chalk, `Cleaned: ${chalk.gray(runtimePath)}`);
            }
        }
        cleanLog();
    }

    console.log("\n" + chalk.magenta("─".repeat(45)));
    console.log(chalk.green.bold("  ✔  Backend compile complete!"));
    console.log(chalk.magenta("─".repeat(45)) + "\n");
}