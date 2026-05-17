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

function resolveUniqueVersionDir(outputsDir, version) {
    const base = path.join(outputsDir, version);
    if (!fs.existsSync(base)) return base;
    let n = 2;
    while (fs.existsSync(path.join(outputsDir, `${version} (${n})`))) n++;
    return path.join(outputsDir, `${version} (${n})`);
}

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
    } catch (_) { /* non-fatal */ }
}

async function buildFrontend(chalk, root) {
    const frontendDir = path.join(root, "frontend");
    const backendDir = path.join(root, "backend");
    const electronDir = path.join(root, "electron");

    if (!fs.existsSync(frontendDir)) {
        fail(chalk, "frontend/ folder not found");
        return false;
    }

    appendLog("\n=== frontend ===");
    info(chalk, "npm install...");
    try {
        exec("npm install", { cwd: frontendDir });
        info(chalk, "npm run build -- --mode deployed...");
        exec("npm run build -- --mode deployed", { cwd: frontendDir });
        ok(chalk, "Frontend built");
    } catch {
        fail(chalk, "Frontend build failed");
        return false;
    }

    const reactDist = path.join(frontendDir, "dist");
    if (!fs.existsSync(reactDist)) {
        fail(chalk, "frontend/dist not found after build");
        return false;
    }

    // Copy to backend/static
    const backendStatic = path.join(backendDir, "static");
    fs.rmSync(backendStatic, { recursive: true, force: true });
    fs.cpSync(reactDist, backendStatic, { recursive: true });
    ok(chalk, `Copied to ${chalk.cyan("backend/static")}`);

    // Copy to electron/test/resources/backend/flask_server/_internal/static
    const testStatic = path.join(electronDir, "test", "resources", "backend", "flask_server", "_internal", "static");
    if (fs.existsSync(path.dirname(testStatic))) {
        fs.rmSync(testStatic, { recursive: true, force: true });
        fs.cpSync(reactDist, testStatic, { recursive: true });
        ok(chalk, `Copied to ${chalk.cyan("electron/test/resources/backend/flask_server/_internal/static")}`);
    } else {
        warn(chalk, "electron/test not found — skipping test copy (run compile --backend first)");
    }

    // Copy to electron/resources/backend/flask_server/_internal/static
    const syncStatic = path.join(electronDir, "resources", "backend", "flask_server", "_internal", "static");
    if (fs.existsSync(path.dirname(syncStatic))) {
        fs.rmSync(syncStatic, { recursive: true, force: true });
        fs.cpSync(reactDist, syncStatic, { recursive: true });
        ok(chalk, `Copied to ${chalk.cyan("electron/resources/backend/flask_server/_internal/static")}`);
    } else {
        warn(chalk, "electron/resources not found — skipping test copy (run compile --backend first)");
    }

    // Clean up frontend/dist
    fs.rmSync(reactDist, { recursive: true, force: true });
    ok(chalk, `Cleaned ${chalk.cyan("frontend/dist")}`);

    return true;
}

// ── Backend build + copy ──────────────────────────────────────
async function buildBackend(chalk, root) {
    const backendDir = path.join(root, "backend");
    const electronDir = path.join(root, "electron");

    // Run toexe
    await toexe(chalk);

    const builtDir = path.join(backendDir, "dist", "flask_server");
    if (!fs.existsSync(builtDir)) {
        fail(chalk, "backend/dist/flask_server not found after toexe");
        return false;
    }

    // Copy _internal and flask_server.exe to electron/resources/backend/flask_server
    const resourcesDest = path.join(electronDir, "resources", "backend", "flask_server");
    fs.rmSync(resourcesDest, { recursive: true, force: true });
    fs.mkdirSync(resourcesDest, { recursive: true });

    const exeSrc = path.join(builtDir, "flask_server.exe");
    const internalSrc = path.join(builtDir, "_internal");

    if (fs.existsSync(exeSrc)) {
        fs.copyFileSync(exeSrc, path.join(resourcesDest, "flask_server.exe"));
        ok(chalk, `Copied flask_server.exe to ${chalk.cyan("electron/resources/backend/flask_server")}`);
    }
    if (fs.existsSync(internalSrc)) {
        fs.cpSync(internalSrc, path.join(resourcesDest, "_internal"), { recursive: true });
        ok(chalk, `Copied _internal to ${chalk.cyan("electron/resources/backend/flask_server")}`);
    }

    // Also copy to electron/test/resources/backend/flask_server
    const testDest = path.join(electronDir, "test", "resources", "backend", "flask_server");
    fs.rmSync(testDest, { recursive: true, force: true });
    fs.mkdirSync(testDest, { recursive: true });

    if (fs.existsSync(exeSrc)) {
        fs.copyFileSync(exeSrc, path.join(testDest, "flask_server.exe"));
        ok(chalk, `Copied flask_server.exe to ${chalk.cyan("electron/test/resources/backend/flask_server")}`);
    }
    if (fs.existsSync(internalSrc)) {
        fs.cpSync(internalSrc, path.join(testDest, "_internal"), { recursive: true });
        ok(chalk, `Copied _internal to ${chalk.cyan("electron/test/resources/backend/flask_server")}`);
    }

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
    return true;
}

async function buildElectron(chalk, root) {
    const electronDir = path.join(root, "electron");

    if (!fs.existsSync(electronDir)) {
        fail(chalk, "electron/ folder not found");
        return null;
    }

    appendLog("\n=== electron ===");
    info(chalk, "npm install...");
    try {
        exec("npm install", { cwd: electronDir });
        info(chalk, "npm run dist...");
        exec("npm run dist", { cwd: electronDir });
        ok(chalk, "Electron build complete");
    } catch {
        fail(chalk, "Electron build failed");
        return null;
    }

    // Move build output to outputs/{version}
    const outputsDir = path.join(electronDir, "outputs");
    const pkgJsonPath = path.join(electronDir, "package.json");

    if (!fs.existsSync(pkgJsonPath)) {
        warn(chalk, "electron/package.json not found — cannot determine version");
        return null;
    }

    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
    const version = pkg.version || "unknown";
    const buildOutput = findBuildOutput(electronDir);

    if (!buildOutput) {
        warn(chalk, "Could not find electron build output folder — skipping move");
        return null;
    }

    // Copy win-unpacked to electron/test before moving the build output
    const winUnpacked = path.join(buildOutput, "win-unpacked");
    const testDir = path.join(electronDir, "test");
    if (fs.existsSync(winUnpacked)) {
        fs.rmSync(testDir, { recursive: true, force: true });
        fs.cpSync(winUnpacked, testDir, { recursive: true });
        ok(chalk, `Copied win-unpacked to ${chalk.cyan("electron/test")}`);
    } else {
        warn(chalk, "win-unpacked not found in build output — skipping test copy");
    }

    fs.mkdirSync(outputsDir, { recursive: true });
    const versionDir = resolveUniqueVersionDir(outputsDir, version);
    const finalName = path.basename(versionDir);

    if (finalName !== version) {
        warn(chalk, `outputs/${version} already exists — saving as ${chalk.cyan(finalName)}`);
    }

    fs.renameSync(buildOutput, versionDir);
    ok(chalk, `Build output moved to ${chalk.cyan(`outputs/${finalName}`)}`);
    return versionDir;
}

export default async function compile(chalk, args = [], rl) {
    header(chalk);
    if (!checkCompat(chalk, "compile")) return;

    const root = process.cwd();

    const doFrontend = args.includes("--frontend") || args.includes("--full");
    const doBackend = args.includes("--backend") || args.includes("--full");
    const doElectron = args.includes("--electron") || args.includes("--full");

    if (!doFrontend && !doBackend && !doElectron) {
        console.log(chalk.yellow("  Usage:"));
        console.log(chalk.gray("    jdm compile --frontend"));
        console.log(chalk.gray("    jdm compile --backend"));
        console.log(chalk.gray("    jdm compile --electron"));
        console.log(chalk.gray("    jdm compile --frontend --backend"));
        console.log(chalk.gray("    jdm compile --frontend --backend --electron"));
        console.log(chalk.gray("    jdm compile --full"));
        return;
    }

    initLog(root);

    // ── Sync ─────────────────────────────────────────────────
    step(chalk, 0, "?", "Syncing project configuration");
    try {
        await sync(chalk);
        ok(chalk, "Sync completed");
    } catch {
        fail(chalk, "Sync failed — aborting compile");
        return;
    }

    let stepN = 1;
    const totalSteps = (doFrontend ? 1 : 0) + (doBackend ? 1 : 0) + (doElectron ? 1 : 0);

    // ── Frontend ──────────────────────────────────────────────
    if (doFrontend) {
        step(chalk, stepN++, totalSteps, "Building Frontend");
        const ok_ = await buildFrontend(chalk, root);
        if (!ok_) { cleanLog(); return; }
    }

    // ── Backend ───────────────────────────────────────────────
    if (doBackend) {
        step(chalk, stepN++, totalSteps, "Building Backend EXE");
        const ok_ = await buildBackend(chalk, root);
        if (!ok_) { cleanLog(); return; }
    }

    // ── Electron ──────────────────────────────────────────────
    let finalVersionDir = null;
    if (doElectron) {
        step(chalk, stepN++, totalSteps, "Building Electron App");
        finalVersionDir = await buildElectron(chalk, root);
    }

    cleanLog();
    console.log("\n" + chalk.blue("─".repeat(45)));
    console.log(chalk.green.bold("  ✔  Compile complete!"));
    console.log(chalk.blue("─".repeat(45)) + "\n");

    if (finalVersionDir) {
        info(chalk, `Opening ${chalk.cyan(path.basename(finalVersionDir))} in file explorer…`);
        openExplorer(finalVersionDir);
    }
}