import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { writeConfig } from "../config.js";

const REPOS = {
    backend: "https://github.com/JDM-Github/jdm-electron-flask-backend",
    frontend: "https://github.com/JDM-Github/jdm-electron-flask-frontend",
    electron: "https://github.com/JDM-Github/jdm-electron-flask-electron",
};

const CONFLICT_FOLDERS = ["backend", "frontend", "electron"];

let logPath = null;

function appendLog(lines) {
    if (!logPath) return;
    fs.appendFileSync(logPath, lines + "\n", "utf8");
}

function initLog(targetDir) {
    logPath = path.join(targetDir, "install.log");
    fs.writeFileSync(logPath, `[jdm-cli install log — ${new Date().toISOString()}]\n\n`, "utf8");
}

function cleanLog() {
    if (logPath && fs.existsSync(logPath)) {
        fs.unlinkSync(logPath);
        logPath = null;
    }
}

function ask(rl, question) {
    return new Promise((resolve) => rl.question(question, resolve));
}

function header(chalk) {
    console.log();
    console.log(chalk.cyan("  jdm") + chalk.gray(" / ") + chalk.white("electron-flask") + chalk.gray(" / ") + chalk.bold("create"));
    console.log(chalk.gray("  ─────────────────────────────────────"));
    console.log();
}

function step(chalk, n, total, label) {
    console.log();
    console.log(chalk.cyan(`  [${n}/${total}]`) + "  " + chalk.bold(label));
}

function ok(chalk, msg) { console.log(chalk.green("    ✔  ") + msg); }
function warn(chalk, msg) { console.log(chalk.yellow("    ⚠  ") + msg); }
function fail(chalk, msg) { console.log(chalk.red("    ✖  ") + msg); }
function info(chalk, msg) { console.log(chalk.gray("    ·  ") + msg); }

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
// Combinations of the manual flags are supported.
// --install-all takes precedence and sets all three to true.

function parseInstallFlags(args) {
    const installAll = args.includes("--install-all");
    return {
        backend: installAll || args.includes("--backend-install"),
        frontend: installAll || args.includes("--frontend-install"),
        electron: installAll || args.includes("--electron-install"),
    };
}

function cloneOnly(chalk, name, url, targetDir) {
    const dir = path.join(targetDir, name);
    fs.mkdirSync(dir, { recursive: true });

    info(chalk, `Cloning ${chalk.cyan(name)}...`);
    appendLog(`\n=== ${name} ===`);
    exec(`git clone ${url} .`, { cwd: dir });

    const gitFolder = path.join(dir, ".git");
    if (fs.existsSync(gitFolder)) {
        fs.rmSync(gitFolder, { recursive: true, force: true });
        info(chalk, `Removed .git from ${chalk.cyan(name)}`);
        appendLog(`Removed .git from ${name}`);
    }

    ok(chalk, `Cloned  ${chalk.cyan(name)}`);
}

function installDeps(chalk, name, targetDir) {
    const dir = path.join(targetDir, name);
    if (!fs.existsSync(dir)) return;

    info(chalk, `Installing dependencies for ${chalk.cyan(name)}...`);
    if (name === "backend") {
        const req = path.join(dir, "requirements.txt");
        if (fs.existsSync(req)) {
            exec("pip install -r requirements.txt", { cwd: dir });
            ok(chalk, "Python dependencies installed");
        } else {
            warn(chalk, "No requirements.txt — skipping pip install");
        }
    } else {
        exec("npm install", { cwd: dir });
        ok(chalk, "npm dependencies installed");
    }
}

function setupEnvFiles(chalk, targetDir) {
    const pairs = [
        ["backend", ".env.example", ".env"],
        ["frontend", ".env.example", ".env"],
    ];
    for (const [folder, from, to] of pairs) {
        const src = path.join(targetDir, folder, from);
        const dest = path.join(targetDir, folder, to);
        if (fs.existsSync(src)) {
            try {
                fs.copyFileSync(src, dest);
                fs.unlinkSync(src);
                info(chalk, `Created ${chalk.cyan(folder + "/" + to)} from ${from}`);
            } catch (err) {
                warn(chalk, `Failed to setup ${folder} env: ${err.message}`);
            }
        } else {
            warn(chalk, `${folder}/${from} not found, skipping env setup`);
        }
    }
}

function createShortcutBat(targetDir) {
    const batPath = path.join(targetDir, "run.bat");
    const content = `@echo off\n:: JDM Electron-Flask shortcut wrapper\njdm-cli electron-flask %*\n`;
    fs.writeFileSync(batPath, content, "utf8");
}

function createJDMElectronConfig(targetDir) {
    const configPath = path.join(targetDir, "electron-flask.json");
    const content = `{
    "version": "1.0.0",
    "name": "JDM | Flask & Electron Template",
    "appId": "com.jdm-flask-electron-template.app",
    "author": "JDM"
}`;
    fs.writeFileSync(configPath, content, "utf8");
}

export default async function create(chalk, rl, args = []) {
    header(chalk);

    const installFlags = parseInstallFlags(args);
    const anyInstall = installFlags.backend || installFlags.frontend || installFlags.electron;

    // ── Resolve --name flag ───────────────────────────────────
    const nameIdx = args.indexOf("--name");
    const nameArg = nameIdx !== -1 ? args[nameIdx + 1] : null;

    let targetDir;
    step(chalk, 1, 4, "Target Directory");
    const answer = nameArg ?? (await ask(rl, chalk.white("\n  Project name (or . for current folder): "))).trim();

    if (answer === ".") {
        targetDir = process.cwd();
        info(chalk, `Using current directory: ${chalk.cyan(targetDir)}`);

        const entries = fs.readdirSync(targetDir);
        if (entries.length > 0) {
            const conflicts = entries.filter(
                (e) => CONFLICT_FOLDERS.includes(e) && fs.statSync(path.join(targetDir, e)).isDirectory()
            );

            if (conflicts.length > 0) {
                fail(chalk, `Conflicting folders found: ${conflicts.map((c) => chalk.red(c)).join(", ")}`);
                console.log(chalk.yellow("\n    These folders would be overwritten by the installer."));
                const confirm = (await ask(rl, chalk.white("  Remove them and continue? [y/N]: "))).trim().toLowerCase();
                if (confirm !== "y") {
                    console.log(chalk.gray("\n  Aborted.\n"));
                    return;
                }
                for (const conflict of conflicts) {
                    fs.rmSync(path.join(targetDir, conflict), { recursive: true, force: true });
                    ok(chalk, `Removed ${chalk.red(conflict)}`);
                }
            } else {
                warn(chalk, "Current folder is not empty.");
                const confirm = (await ask(rl, chalk.white("  Continue anyway? [y/N]: "))).trim().toLowerCase();
                if (confirm !== "y") {
                    console.log(chalk.gray("\n  Aborted.\n"));
                    return;
                }
            }
        }
    } else {
        if (!answer || answer.includes("/") || answer.includes("\\")) {
            fail(chalk, "Invalid project name.");
            return;
        }
        targetDir = path.join(process.cwd(), answer);
        if (fs.existsSync(targetDir)) {
            warn(chalk, `Folder ${chalk.cyan(answer)} already exists.`);
            const confirm = (await ask(rl, chalk.white("  Continue anyway? [y/N]: "))).trim().toLowerCase();
            if (confirm !== "y") {
                console.log(chalk.gray("\n  Aborted.\n"));
                return;
            }
        } else {
            fs.mkdirSync(targetDir, { recursive: true });
            ok(chalk, `Created folder: ${chalk.cyan(targetDir)}`);
        }
    }

    initLog(targetDir);

    const entries = Object.entries(REPOS);
    for (let i = 0; i < entries.length; i++) {
        const [name, url] = entries[i];
        step(chalk, i + 2, 4, `Installing ${name}`);
        try {
            cloneOnly(chalk, name, url, targetDir);
            if (installFlags[name]) installDeps(chalk, name, targetDir);
        } catch (err) {
            fail(chalk, `Failed to install ${chalk.cyan(name)}: ${err.message}`);
            console.log();
            console.log(chalk.yellow("    Full output written to: ") + chalk.white("install.log"));
            console.log();
            throw err;
        }
    }

    setupEnvFiles(chalk, targetDir);
    createShortcutBat(targetDir);
    createJDMElectronConfig(targetDir);

    writeConfig(targetDir);
    info(chalk, `Created ${chalk.cyan(".jdm-config.json")}`);

    cleanLog();

    console.log();
    console.log(chalk.gray("  ─────────────────────────────────────"));
    console.log(chalk.green("    ✔  Project ready!"));
    console.log(chalk.gray(`    Location: ${targetDir}`));
    console.log(chalk.gray("  ─────────────────────────────────────"));
    console.log();

    if (!anyInstall) {
        console.log(chalk.white("  Next steps:"));
        console.log(chalk.gray("    jdm-cli electron-flask install  →  install dependencies (npm/pip)"));
        console.log(chalk.gray("    jdm-cli electron-flask dev       →  start dev mode"));
        console.log(chalk.gray("    jdm-cli electron-flask compile   →  full build"));
    } else {
        const skipped = Object.entries(installFlags)
            .filter(([, v]) => !v)
            .map(([k]) => k);

        if (skipped.length > 0) {
            console.log(chalk.white("  Dependencies not installed:") + chalk.gray(` ${skipped.join(", ")}`));
            console.log(chalk.gray("    jdm-cli electron-flask install  →  install remaining dependencies"));
        }
        console.log(chalk.white("  Next steps:"));
        console.log(chalk.gray("    jdm-cli electron-flask dev      →  start dev mode"));
        console.log(chalk.gray("    jdm-cli electron-flask compile  →  full build"));
    }
    console.log();
}