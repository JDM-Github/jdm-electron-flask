import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { checkCompat } from "../config.js";

function header(chalk) {
    console.log();
    console.log(chalk.green("  jdm") + chalk.gray(" / ") + chalk.white("electron-flask") + chalk.gray(" / ") + chalk.bold("dev"));
    console.log(chalk.gray("  ─────────────────────────────────────"));
    console.log();
}

function ok(chalk, msg) { console.log(chalk.green("    ✔  ") + msg); }
function fail(chalk, msg) { console.log(chalk.red("    ✖  ") + msg); }
function info(chalk, msg) { console.log(chalk.gray("    ·  ") + msg); }

function launchInWindowsTerminal(title, cwd, command, args) {
    const fullCmd = `cd /d ${cwd} && ${command} ${args.join(" ")}`;
    const proc = spawn("wt.exe", [
        "-w", "0",
        "new-tab", "--title", title,
        "--",
        "cmd.exe", "/k", fullCmd
    ], {
        detached: true,
        stdio: "ignore",
        shell: false,
    });
    proc.unref();
}

function launchInCmdWindow(cwd, command, args) {
    const fullCmd = `cd /d ${cwd} && ${command} ${args.join(" ")}`;
    const proc = spawn("cmd.exe", [
        "/c", "start", "cmd.exe", "/k", fullCmd
    ], {
        detached: true,
        stdio: "ignore",
        shell: false,
    });
    proc.unref();
}

function launchInUnixTerminal(title, cwd, command, args) {
    const fullCmd = `cd "${cwd}" && ${command} ${args.join(" ")}; exec $SHELL`;
    const terminals = [
        ["gnome-terminal", ["--title", title, "--", "bash", "-c", fullCmd]],
        ["xterm", ["-title", title, "-e", `bash -c '${fullCmd}'`]],
        ["osascript", ["-e", `tell application "Terminal" to do script "cd \\"${cwd}\\" && ${command} ${args.join(" ")}"`]],
    ];
    for (const [term, termArgs] of terminals) {
        try {
            spawn(term, termArgs, { detached: true, stdio: "ignore" }).unref();
            return true;
        } catch { /* try next */ }
    }
    return false;
}

function tryLaunchInWindowsTerminal(title, cwd, command, args) {
    try {
        launchInWindowsTerminal(title, cwd, command, args);
        return true;
    } catch {
        return false;
    }
}

export default async function dev(chalk) {
    header(chalk);
    if (!checkCompat(chalk, "dev")) return;

    const root = process.cwd();
    const backendDir = path.join(root, "backend");
    const frontendDir = path.join(root, "frontend");

    if (!fs.existsSync(backendDir)) {
        fail(chalk, `backend/ not found in ${chalk.cyan(root)}`);
    }
    if (!fs.existsSync(frontendDir)) {
        fail(chalk, `frontend/ not found in ${chalk.cyan(root)}`);
    }

    const isWin = process.platform === "win32";
    const useWinTerminal = isWin;

    info(chalk, "Launching development environment...");
    console.log();

    if (useWinTerminal) {
        info(chalk, "Opening backend in Windows Terminal tab...");
        const launched = tryLaunchInWindowsTerminal(
            "Electron-Flask Backend", backendDir, "python", ["run.py"]
        );
        if (launched) {
            ok(chalk, "Backend launched in a new tab");
        } else {
            info(chalk, "wt.exe unavailable — falling back to new CMD window...");
            launchInCmdWindow(backendDir, "python", ["run.py"]);
            ok(chalk, "Backend launched in a new window");
        }
    } else if (isWin) {
        info(chalk, "Opening backend in a new CMD window...");
        launchInCmdWindow(backendDir, "python", ["run.py"]);
        ok(chalk, "Backend launched in a new window");
    } else {
        info(chalk, "Opening backend in a new terminal...");
        const success = launchInUnixTerminal(
            "Electron-Flask Backend", backendDir, "python3", ["run.py"]
        );
        if (!success) {
            fail(chalk, "Could not open terminal. Run backend manually:");
            console.log(chalk.gray(`      cd "${backendDir}" && python3 run.py`));
        } else {
            ok(chalk, "Backend launched in a new terminal");
        }
    }

    if (useWinTerminal) {
        info(chalk, "Opening frontend in Windows Terminal tab...");
        const launched = tryLaunchInWindowsTerminal(
            "Electron-Flask Frontend", frontendDir, "npm", ["run", "dev"]
        );
        if (launched) {
            ok(chalk, "Frontend launched in a new tab");
        } else {
            info(chalk, "wt.exe unavailable — falling back to new CMD window...");
            launchInCmdWindow(frontendDir, "npm", ["run", "dev"]);
            ok(chalk, "Frontend launched in a new window");
        }
    } else if (isWin) {
        info(chalk, "Opening frontend in a new CMD window...");
        launchInCmdWindow(frontendDir, "npm", ["run", "dev"]);
        ok(chalk, "Frontend launched in a new window");
    } else {
        info(chalk, "Opening frontend in a new terminal...");
        const success = launchInUnixTerminal(
            "Electron-Flask Frontend", frontendDir, "npm", ["run", "dev"]
        );
        if (!success) {
            fail(chalk, "Could not open terminal. Run frontend manually:");
            console.log(chalk.gray(`      cd "${frontendDir}" && npm run dev`));
        } else {
            ok(chalk, "Frontend launched in a new terminal");
        }
    }

    console.log();
    console.log(chalk.gray("  ─────────────────────────────────────"));
    console.log(chalk.green("    ✔  Dev environment started!"));
    console.log(chalk.gray("    Both servers are running in separate terminals / tabs."));
    console.log(chalk.gray("    You can close this command window safely."));
    console.log(chalk.gray("  ─────────────────────────────────────"));
    console.log();
}