import fs from "fs";
import path from "path";
import { execSync, spawn } from "child_process";
import toexe from "./toexe.js";
import sync from "./sync.js";
import { checkCompat } from "../config.js";

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
function warn(chalk, msg) { console.log(chalk.yellow("  ⚠  ") + msg); }

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

function findBuildOutput(electronDir) {
    const candidates = ["dist", "release", "out"];
    for (const candidate of candidates) {
        const fullPath = path.join(electronDir, candidate);
        if (fs.existsSync(fullPath)) return fullPath;
    }
    return null;
}

// ─── Auto-number an output folder if it already exists.
//     outputs/1.0.0 → outputs/1.0.0 (2) → outputs/1.0.0 (3) → …
function resolveUniqueVersionDir(outputsDir, version) {
    const base = path.join(outputsDir, version);
    if (!fs.existsSync(base)) return base;

    let n = 2;
    while (fs.existsSync(path.join(outputsDir, `${version} (${n})`))) n++;
    return path.join(outputsDir, `${version} (${n})`);
}

// ─── Open a folder in the OS file explorer (non-blocking).
function openExplorer(dir) {
    try {
        const platform = process.platform;
        if (platform === "win32") {
            spawn("explorer", [dir], { detached: true, stdio: "ignore" }).unref();
        } else if (platform === "darwin") {
            spawn("open", [dir], { detached: true, stdio: "ignore" }).unref();
        } else {
            spawn("xdg-open", [dir], { detached: true, stdio: "ignore" }).unref();
        }
    } catch (_) {
        // non-fatal
    }
}

export default async function compile(chalk, args = [], rl) {
    header(chalk);
    if (!checkCompat(chalk, "compile")) return;

    const root = process.cwd();

    // ─────────────────────────────────────────────
    // STEP 0: SYNC FIRST (BLOCKING)
    // ─────────────────────────────────────────────
    step(chalk, 0, 5, "Syncing project configuration");
    try {
        await sync(chalk);
        ok(chalk, "Sync completed");
    } catch (err) {
        fail(chalk, "Sync failed — aborting compile");
        console.log(chalk.yellow("\n    Full output written to: ") + chalk.white("sync/compile.log\n"));
        return;
    }

    const frontendDir = path.join(root, "frontend");
    const electronDir = path.join(root, "electron");
    const backendDir = path.join(root, "backend");

    initLog(root);

    // ─────────────────────────────────────────────
    // STEP 1: Frontend build
    // ─────────────────────────────────────────────
    // Pass --mode via the CLI flag so Vite sets import.meta.env.MODE correctly.
    // Setting MODE in process.env does NOT work — Vite ignores it.
    // The double-dash separates npm's own args from the script's args:
    //   npm run build -- --mode deployed
    step(chalk, 1, 5, "Building Frontend (deployed mode)");
    if (!fs.existsSync(frontendDir)) {
        fail(chalk, "frontend/ folder not found");
        return;
    }
    appendLog("\n=== frontend ===");
    info(chalk, "npm install...");
    try {
        exec("npm install", { cwd: frontendDir });
        info(chalk, "npm run build -- --mode deployed...");
        exec("npm run build -- --mode deployed", { cwd: frontendDir });
        ok(chalk, "Frontend build complete");
    } catch (err) {
        fail(chalk, "Frontend build failed");
        console.log(chalk.yellow("\n    Full output written to: ") + chalk.white("compile.log\n"));
        return;
    }

    // ─────────────────────────────────────────────
    // STEP 2: Backend EXE
    // ─────────────────────────────────────────────
    step(chalk, 2, 5, "Building Backend EXE");
    appendLog("\n=== backend EXE ===");
    await toexe(chalk);

    // ─────────────────────────────────────────────
    // STEP 3: Move EXE → electron/resources/backend
    // ─────────────────────────────────────────────
    step(chalk, 3, 5, "Moving EXE → electron/resources/backend");
    const src = path.join(backendDir, "dist", "flask_server.exe");
    const destDir = path.join(electronDir, "resources", "backend");
    const dest = path.join(destDir, "flask_server.exe");
    if (!fs.existsSync(src)) {
        fail(chalk, "flask_server.exe not found in backend/dist/");
        console.log(chalk.yellow("\n    Full output written to: ") + chalk.white("compile.log\n"));
        return;
    }
    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(src, dest);
    appendLog(`[OK] Copied ${src} → ${dest}`);
    ok(chalk, "EXE copied to " + chalk.cyan("electron/resources/backend/"));

    // ─────────────────────────────────────────────
    // STEP 4: Build Electron app
    // ─────────────────────────────────────────────
    step(chalk, 4, 5, "Building Electron App");
    if (!fs.existsSync(electronDir)) {
        fail(chalk, "electron/ folder not found");
        console.log(chalk.yellow("\n    Full output written to: ") + chalk.white("compile.log\n"));
        return;
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
        return;
    }

    // ─────────────────────────────────────────────
    // STEP 5: Move build output → outputs/{version}
    // ─────────────────────────────────────────────
    const outputsDir = path.join(electronDir, "outputs");
    const pkgJsonPath = path.join(electronDir, "package.json");
    let finalVersionDir = null;

    if (!fs.existsSync(pkgJsonPath)) {
        warn(chalk, "electron/package.json not found – cannot determine version");
    } else {
        const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
        const version = pkg.version || "unknown";

        const buildOutput = findBuildOutput(electronDir);
        if (!buildOutput) {
            warn(chalk, "Could not find electron build output folder (dist, release, out) – skipping move");
        } else {
            fs.mkdirSync(outputsDir, { recursive: true });

            // Auto-number instead of prompting: 1.0.0 → 1.0.0 (2) → 1.0.0 (3) …
            const versionDir = resolveUniqueVersionDir(outputsDir, version);
            const finalName = path.basename(versionDir);

            if (finalName !== version) {
                warn(chalk, `outputs/${version} already exists — saving as ${chalk.cyan(finalName)}`);
            }

            fs.renameSync(buildOutput, versionDir);
            appendLog(`[OK] Moved ${buildOutput} → ${versionDir}`);
            ok(chalk, `Build output moved to ${chalk.cyan(`outputs/${finalName}`)}`);
            finalVersionDir = versionDir;
        }
    }

    cleanLog();
    console.log("\n" + chalk.blue("─".repeat(45)));
    console.log(chalk.green.bold("  ✔  Full compile complete!"));
    console.log(chalk.blue("─".repeat(45)) + "\n");

    if (finalVersionDir) {
        info(chalk, `Opening ${chalk.cyan(path.basename(finalVersionDir))} in file explorer…`);
        openExplorer(finalVersionDir);
    }
}