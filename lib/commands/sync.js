// ─────────────────────────────────────────────────────────────
//  sync.js  —  jdm-cli electron-flask sync
//  Syncs version/name/appId/author from electron-flask.json
//  to electron/package.json, electron/loading.html, and
//  frontend/src/lib/constant.ts. Targets cwd (project root).
// ─────────────────────────────────────────────────────────────
import fs from "fs";
import path from "path";
import { checkCompat } from "../config.js";

function header(chalk) {
    console.log();
    console.log(
        chalk.cyan("  jdm") +
        chalk.gray(" / ") +
        chalk.white("electron-flask") +
        chalk.gray(" / ") +
        chalk.bold("sync")
    );
    console.log(chalk.gray("  ─────────────────────────────────────"));
    console.log();
}

function loadConfig(root, chalk) {
    const configPath = path.join(root, "electron-flask.json");

    if (!fs.existsSync(configPath)) {
        console.log(chalk.red("  [FAIL]  ") + chalk.gray("electron-flask.json") + chalk.red(" — file not found"));
        return null;
    }

    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    const { version, name, appId, author } = config;
    console.log(chalk.gray(`  Syncing version ${version} from electron-flask.json...\n`));
    return { version, name, appId, author };
}

function fixPackageElectron(root, { version, name, appId, author }, chalk) {
    const label = chalk.gray("electron/package.json");
    const filePath = path.join(root, "electron/package.json");

    if (!fs.existsSync(filePath)) {
        console.log(chalk.red("  [FAIL]  ") + label + chalk.red(" — file not found"));
        return false;
    }

    try {
        const pkg = JSON.parse(fs.readFileSync(filePath, "utf8"));
        pkg.version = version;
        pkg.build.productName = name;
        pkg.build.appId = appId;
        pkg.author = author;
        fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2));
        console.log(chalk.green("  [OK]    ") + label);
        return true;
    } catch (err) {
        console.log(chalk.red("  [FAIL]  ") + label + chalk.red(` — ${err.message}`));
        return false;
    }
}

function fixLoadingElectron(root, { version, name }, chalk) {
    const label = chalk.gray("electron/loading.html");
    const filePath = path.join(root, "electron/loading.html");

    if (!fs.existsSync(filePath)) {
        console.log(chalk.red("  [FAIL]  ") + label + chalk.red(" — file not found"));
        return false;
    }

    try {
        let html = fs.readFileSync(filePath, "utf8");

        html = html.replace(
            /v\d+\.\d+\.\d+(\s*&nbsp;·&nbsp;\s*)[^<]*/,
            `v${version}$1${name}`
        );
        html = html.replace(
            /<title>[^<]*<\/title>/,
            `<title>${name} | Loading</title>`
        );

        fs.writeFileSync(filePath, html);
        console.log(chalk.green("  [OK]    ") + label);
        return true;
    } catch (err) {
        console.log(chalk.red("  [FAIL]  ") + label + chalk.red(` — ${err.message}`));
        return false;
    }
}

function fixConstantFrontend(root, { version, name }, chalk) {
    const label = chalk.gray("frontend/src/lib/constant.ts");
    const filePath = path.join(root, "frontend/src/lib/constant.ts");

    try {
        if (!fs.existsSync(filePath)) {
            const constantTs =
                `// ╔══════════════════════════════════════════════════════════╗\n` +
                `// ║        AUTO-GENERATED — DO NOT MANUALLY EDIT             ║\n` +
                `// ║     Change values in electron-flask.json instead         ║\n` +
                `// ╚══════════════════════════════════════════════════════════╝\n` +
                `export const VERSION  = "${version}";\n` +
                `export const APP_NAME = "${name}";\n\n` +
                `// START CONSTANT HERE\n` +
                `// export const SOME_CONSTANT\n`;
            fs.writeFileSync(filePath, constantTs);
            console.log(chalk.green("  [OK]    ") + label + chalk.dim(" (created)"));
            return true;
        }

        let content = fs.readFileSync(filePath, "utf8");

        content = content.replace(
            /^export\s+const\s+VERSION\s*=\s*["'][^"']*["'];?/m,
            `export const VERSION  = "${version}";`
        );
        content = content.replace(
            /^export\s+const\s+APP_NAME\s*=\s*["'][^"']*["'];?/m,
            `export const APP_NAME = "${name}";`
        );

        fs.writeFileSync(filePath, content);
        console.log(chalk.green("  [OK]    ") + label);
        return true;
    } catch (err) {
        console.log(chalk.red("  [FAIL]  ") + label + chalk.red(` — ${err.message}`));
        return false;
    }
}

export default async function sync(chalk) {
    header(chalk);
    if (!checkCompat(chalk, "sync")) return;

    const root = process.cwd();
    const config = loadConfig(root, chalk);
    if (!config) return;

    const results = [
        fixPackageElectron(root, config, chalk),
        fixLoadingElectron(root, config, chalk),
        fixConstantFrontend(root, config, chalk),
    ];

    const synced = results.filter(Boolean).length;
    const failed = results.filter(r => !r).length;

    console.log("\n" + chalk.yellow("─".repeat(45)));
    console.log(
        chalk.green(`  ✔  Synced: ${synced}  `) +
        (failed > 0 ? chalk.red(`Failed: ${failed}`) : "")
    );
    console.log(chalk.yellow("─".repeat(45)) + "\n");
}