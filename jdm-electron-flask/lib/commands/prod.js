// ─────────────────────────────────────────────────────────────
//  prod.js  —  jdm-cli electron-flask prod
//  Start production preview: backend (new window) + frontend
//  Targets cwd as project root.
// ─────────────────────────────────────────────────────────────
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

// ── helpers ──────────────────────────────────────────────────

function header(chalk) {
    console.log();
    console.log(chalk.red("  jdm") + chalk.gray(" / ") + chalk.white("electron-flask") + chalk.gray(" / ") + chalk.bold("prod"));
    console.log(chalk.gray("  ─────────────────────────────────────"));
    console.log();
}

function ok(chalk, msg) { console.log(chalk.green("    ✔  ") + msg); }
function fail(chalk, msg) { console.log(chalk.red("    ✖  ") + msg); }
function info(chalk, msg) { console.log(chalk.gray("    ·  ") + msg); }

// ── main ─────────────────────────────────────────────────────

export default async function prod(chalk) {
    header(chalk);

    const root = process.cwd();
    const backendDir = path.join(root, "backend");
    const frontendDir = path.join(root, "frontend");

    if (!fs.existsSync(backendDir)) {
        fail(chalk, `backend/ not found in ${chalk.cyan(root)}`);
        process.exit(1);
    }
    if (!fs.existsSync(frontendDir)) {
        fail(chalk, `frontend/ not found in ${chalk.cyan(root)}`);
        process.exit(1);
    }

    const isWin = process.platform === "win32";

    // ── Backend: new terminal window ──────────────────────────
    info(chalk, "Launching backend in a new terminal window...");

    if (isWin) {
        const command = `cd /d ${backendDir} && set FLASK_ENV=production && python production_run.py`;
        spawn("cmd.exe", [
            "/c",
            "start",
            "cmd.exe",
            "/k",
            command
        ], {
            detached: true,
            stdio: "ignore",
            shell: false,
        }).unref();
    } else {
        const terminals = [
            ["gnome-terminal", ["--", "bash", "-c", `cd "${backendDir}" && FLASK_ENV=production python production_run.py; exec bash`]],
            ["xterm", ["-e", `bash -c 'cd "${backendDir}" && FLASK_ENV=production python production_run.py; exec bash'`]],
            ["osascript", ["-e", `tell application "Terminal" to do script "cd \\"${backendDir}\\" && FLASK_ENV=production python production_run.py"`]],
        ];
        let launched = false;
        for (const [term, args] of terminals) {
            try {
                spawn(term, args, { detached: true, stdio: "ignore" }).unref();
                launched = true;
                break;
            } catch { /* try next */ }
        }
        if (!launched) {
            fail(chalk, "Could not open a terminal. Run backend manually:");
            console.log(chalk.gray(`      cd "${backendDir}" && FLASK_ENV=production python production_run.py`));
        }
    }

    ok(chalk, "Backend launched  " + chalk.gray("(new window · production mode)"));

    // ── Frontend: current terminal ────────────────────────────
    console.log();
    info(chalk, "Starting frontend production preview...");
    console.log();
    console.log(chalk.gray("  ─────────────────────────────────────"));
    console.log();

    const frontend = spawn("npm", ["run", "dev"], {
        cwd: frontendDir,
        env: { ...process.env, VITE_MODE: "production" },
        stdio: "inherit",
        shell: isWin,
    });

    frontend.on("close", (code) => {
        console.log();
        if (code === 0 || code === null) {
            console.log(chalk.gray("    ·  Frontend stopped."));
        } else {
            console.log(chalk.red(`    ✖  Frontend exited with code ${code}`));
        }
        console.log();
    });
}