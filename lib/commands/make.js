// ─────────────────────────────────────────────────────────────
//  lib/commands/make.js  —  jdm-cli electron-flask make
//  Scaffolds a JDMBlueprint + Service  OR  a JDMEvent handler
//  depending on --switch_button="blueprint"|"socket".
//  Targets cwd (project root).
// ─────────────────────────────────────────────────────────────
import fs from "fs";
import path from "path";
import { checkCompat } from "../config.js";

// ── Helpers ───────────────────────────────────────────────────

function header(chalk) {
    console.log();
    console.log(
        chalk.cyan("  jdm") +
        chalk.gray(" / ") +
        chalk.white("electron-flask") +
        chalk.gray(" / ") +
        chalk.bold("make")
    );
    console.log(chalk.gray("  ─────────────────────────────────────"));
    console.log();
}

function ask(rl, question) {
    return new Promise((resolve) => rl.question(question, resolve));
}

function ok(chalk, msg) { console.log(chalk.green("  [OK]    ") + msg); }
function fail(chalk, msg) { console.log(chalk.red("  [FAIL]  ") + msg); }
function info(chalk, msg) { console.log(chalk.gray("  [INFO]  ") + msg); }
function skip(chalk, msg) { console.log(chalk.gray("  [SKIP]  ") + msg); }
function warn(chalk, msg) { console.log(chalk.yellow("  [WARN]  ") + msg); }

function toPascalCase(str) {
    return str
        .trim()
        .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase())
        .replace(/^(.)/, (c) => c.toUpperCase());
}

function toSnakeCase(pascal) {
    return pascal
        .replace(/([A-Z])/g, (c, offset) => (offset === 0 ? c : "_" + c))
        .toLowerCase();
}

// ── Flag parser ───────────────────────────────────────────────
// Handles:
//   --flag          → true
//   --flag=value    → "value"
//   --flag value    → "value"
//   positional      → stored as `name` if no --name seen yet

function parseFlags(args) {
    const flags = {
        name: null,
        switch_button: null,   // "blueprint" | "socket"
        prod: false,  // blueprint only
        deployed: false,  // blueprint only
    };

    for (let i = 0; i < args.length; i++) {
        const a = args[i];

        if (a.startsWith("--")) {
            // --key=value form
            const eq = a.indexOf("=");
            if (eq !== -1) {
                const key = a.slice(2, eq);
                const val = a.slice(eq + 1).replace(/^["']|["']$/g, ""); // strip quotes
                if (key in flags) flags[key] = val === "true" ? true : val === "false" ? false : val;
                continue;
            }

            // boolean flags
            const key = a.slice(2);
            if (key === "prod" || key === "deployed") { flags[key] = true; continue; }

            // --key value form
            if (key in flags && i + 1 < args.length && !args[i + 1].startsWith("--")) {
                flags[key] = args[++i].replace(/^["']|["']$/g, "");
                continue;
            }
        } else {
            // positional → name
            flags.name = flags.name ?? a;
        }
    }

    return flags;
}

// ── __init__.py updater (generic) ─────────────────────────────

function updateInitPy(chalk, dir, pascal, suffix, relPath) {
    const initPath = path.join(dir, "__init__.py");
    const className = `${pascal}${suffix}`;
    const importLine = `from .${toSnakeCase(pascal)} import ${className}`;
    const label = chalk.gray(`${relPath}/__init__.py`);

    if (!fs.existsSync(initPath)) {
        skip(chalk, label + chalk.dim(" — not found, skipping"));
        return;
    }

    let src = fs.readFileSync(initPath, "utf8");

    if (src.includes(importLine)) {
        skip(chalk, label + chalk.dim(` — ${className} already present`));
        return;
    }

    // Insert after last `from .x import Y` line
    const lastImportIdx = (() => {
        let idx = -1, match;
        const re = /^from \.[^\n]+$/gm;
        while ((match = re.exec(src)) !== null) idx = match.index + match[0].length;
        return idx;
    })();

    src = lastImportIdx !== -1
        ? src.slice(0, lastImportIdx) + "\n" + importLine + src.slice(lastImportIdx)
        : importLine + "\n" + src;

    // Append to __all__
    const allRe = /__all__\s*=\s*\[([^\]]*)\]/s;
    const allMatch = allRe.exec(src);
    if (allMatch) {
        const trimmed = allMatch[1].trimEnd().replace(/,\s*$/, "");
        src = src.replace(allRe, `__all__ = [${trimmed}, "${className}"]`);
    }

    try {
        fs.writeFileSync(initPath, src, "utf8");
        ok(chalk, label + chalk.dim(` — added ${className}`));
    } catch (err) {
        fail(chalk, label + chalk.red(` — ${err.message}`));
    }
}

// ── Blueprint templates ───────────────────────────────────────

function blueprintTemplate(pascal, snake) {
    return `from jdm_electron_flask import JDMBlueprint, success, error
from app.core.${snake}_service import ${pascal}Service


class ${pascal}Blueprint(JDMBlueprint):
    def __init__(self):
        super().__init__("${snake}", __name__)

    # ── GET ──────────────────────────────────────────────────

    @JDMBlueprint.get("/", auth=False)
    def get_all():
        """Return all ${snake} records."""
        # TODO: call ${pascal}Service.get_all()
        # return success(${pascal}Service.get_all(), "Fetched all ${snake}s")
        return success([], "Fetched all ${snake}s")

    @JDMBlueprint.get("/<int:id>", auth=False)
    def get_one(id):
        """Return a single ${snake} by ID."""
        # TODO: call ${pascal}Service.get_by_id(id)
        # item = ${pascal}Service.get_by_id(id)
        # if not item:
        #     return error("${pascal} not found", 404)
        # return success(item, "Fetched ${snake}")
        return success({"id": id}, "Fetched ${snake}")

    # ── POST ─────────────────────────────────────────────────

    @JDMBlueprint.post("/", auth=True, validate="data")
    def create(data):
        """Create a new ${snake}."""
        # TODO: validate required fields, then call ${pascal}Service.create(data)
        # name = data.get("name")
        # if not name or not isinstance(name, str):
        #     return error("'name' is required and must be a string", 400)
        # return success(${pascal}Service.create(data), "${pascal} created", 201)
        return success(data, "${pascal} created", 201)

    # ── PUT ──────────────────────────────────────────────────

    @JDMBlueprint.put("/<int:id>", auth=True, validate="data")
    def update(data, id):
        """Replace an existing ${snake} entirely."""
        # TODO: ensure record exists, then call ${pascal}Service.update(id, data)
        # item = ${pascal}Service.get_by_id(id)
        # if not item:
        #     return error("${pascal} not found", 404)
        # return success(${pascal}Service.update(id, data), "${pascal} updated")
        return success({"id": id, **data}, "${pascal} updated")

    # ── PATCH ────────────────────────────────────────────────

    @JDMBlueprint.patch("/<int:id>", auth=True, validate="data")
    def partial_update(data, id):
        """Partially update an existing ${snake}."""
        # TODO: merge only provided fields, then call ${pascal}Service.patch(id, data)
        # item = ${pascal}Service.get_by_id(id)
        # if not item:
        #     return error("${pascal} not found", 404)
        # return success(${pascal}Service.patch(id, data), "${pascal} patched")
        return success({"id": id, **data}, "${pascal} patched")

    # ── DELETE ───────────────────────────────────────────────

    @JDMBlueprint.delete("/<int:id>", auth=True)
    def delete(id):
        """Delete a ${snake} by ID."""
        # TODO: ensure record exists, then call ${pascal}Service.delete(id)
        # item = ${pascal}Service.get_by_id(id)
        # if not item:
        #     return error("${pascal} not found", 404)
        # ${pascal}Service.delete(id)
        # return success(None, "${pascal} deleted")
        return success(None, "${pascal} deleted")
`;
}

function serviceTemplate(pascal, snake) {
    return `class ${pascal}Service:
    """
    Service layer for ${pascal} business logic.
    All Blueprint methods should delegate to this class.
    """

    # ── READ ─────────────────────────────────────────────────

    @staticmethod
    def get_all():
        """Return all ${snake} records."""
        # TODO: query your database or data source
        # return [item.to_dict() for item in ${pascal}Model.query.all()]
        return []

    @staticmethod
    def get_by_id(id: int):
        """Return a single ${snake} by primary key, or None."""
        # TODO: query by ID
        # item = ${pascal}Model.query.get(id)
        # return item.to_dict() if item else None
        return None

    # ── WRITE ────────────────────────────────────────────────

    @staticmethod
    def create(data: dict):
        """Persist a new ${snake} and return the created record."""
        # TODO: insert into database
        # item = ${pascal}Model(**data)
        # db.session.add(item)
        # db.session.commit()
        # return item.to_dict()
        return data

    @staticmethod
    def update(id: int, data: dict):
        """Fully replace a ${snake} record and return the updated record."""
        # TODO: replace all fields
        # item = ${pascal}Model.query.get(id)
        # for key, value in data.items():
        #     setattr(item, key, value)
        # db.session.commit()
        # return item.to_dict()
        return {"id": id, **data}

    @staticmethod
    def patch(id: int, data: dict):
        """Partially update a ${snake} record and return the patched record."""
        # TODO: update only provided fields
        # item = ${pascal}Model.query.get(id)
        # for key, value in data.items():
        #     if hasattr(item, key):
        #         setattr(item, key, value)
        # db.session.commit()
        # return item.to_dict()
        return {"id": id, **data}

    # ── DELETE ───────────────────────────────────────────────

    @staticmethod
    def delete(id: int):
        """Remove a ${snake} record."""
        # TODO: delete from database
        # item = ${pascal}Model.query.get(id)
        # db.session.delete(item)
        # db.session.commit()
        pass
`;
}

// ── Socket template ───────────────────────────────────────────

function socketTemplate(pascal) {
    return `from jdm_electron_flask import JDMEvent


class ${pascal}Event(JDMEvent):

    def on_connect(self):
        # TODO: handle client connection
        pass

    def on_disconnect(self):
        # TODO: handle client disconnection
        pass
`;
}

// ── Scaffold: Blueprint ───────────────────────────────────────

async function scaffoldBlueprint(chalk, rl, flags, root) {
    const pascal = toPascalCase(flags.name);
    let snake = toSnakeCase(pascal);
    if (snake[0] === "_") snake = snake.slice(1);
    const link = `/api/${snake}`;

    console.log();
    info(chalk, `Blueprint : ${chalk.cyan(`${pascal}Blueprint`)}`);
    info(chalk, `Service   : ${chalk.cyan(`${pascal}Service`)}`);
    info(chalk, `Route     : ${chalk.cyan(link)}`);
    console.log();

    // Flags — skip prompt if already provided
    const onProd = flags.prod
        || (await ask(rl, chalk.white("  disabledOnProduction? [y/N]: "))) === "y";
    const onDep = flags.deployed
        || (await ask(rl, chalk.white("  disabledOnDeployed?   [y/N]: "))) === "y";
    console.log();

    // 1. Write Blueprint
    const apiDir = path.join(root, "backend", "app", "api");
    const bpFileName = `${snake}.py`;
    const bpPath = path.join(apiDir, bpFileName);

    if (!fs.existsSync(apiDir)) {
        fail(chalk, "backend/app/api/ not found — is this an electron-flask project?");
        console.log();
        return;
    }

    if (fs.existsSync(bpPath)) {
        skip(chalk, chalk.gray(`backend/app/api/${bpFileName}`) + chalk.dim(" already exists"));
    } else {
        try {
            fs.writeFileSync(bpPath, blueprintTemplate(pascal, snake), "utf8");
            ok(chalk, chalk.gray(`backend/app/api/${bpFileName}`));
        } catch (err) {
            fail(chalk, chalk.gray(`backend/app/api/${bpFileName}`) + chalk.red(` — ${err.message}`));
            return;
        }
    }

    // 2. Write Service
    const coreDir = path.join(root, "backend", "app", "core");
    const svcFileName = `${snake}_service.py`;
    const svcPath = path.join(coreDir, svcFileName);

    fs.mkdirSync(coreDir, { recursive: true });

    if (fs.existsSync(svcPath)) {
        skip(chalk, chalk.gray(`backend/app/core/${svcFileName}`) + chalk.dim(" already exists"));
    } else {
        try {
            fs.writeFileSync(svcPath, serviceTemplate(pascal, snake), "utf8");
            ok(chalk, chalk.gray(`backend/app/core/${svcFileName}`));
        } catch (err) {
            fail(chalk, chalk.gray(`backend/app/core/${svcFileName}`) + chalk.red(` — ${err.message}`));
        }
    }

    // 3. Update app/api/__init__.py
    updateInitPy(chalk, apiDir, pascal, "Blueprint", "backend/app/api");

    // 4. Register in api.json
    const apiJsonPath = path.join(root, "backend", "config", "api.json");
    const apiJsonLabel = chalk.gray("backend/config/api.json");

    if (!fs.existsSync(apiJsonPath)) {
        fail(chalk, apiJsonLabel + chalk.red(" — file not found"));
    } else {
        try {
            const apiJson = JSON.parse(fs.readFileSync(apiJsonPath, "utf8"));
            if (apiJson[snake]) {
                skip(chalk, apiJsonLabel + chalk.dim(` — "${snake}" already registered`));
            } else {
                apiJson[snake] = {
                    link,
                    masterEnabled: true,
                    disabledOnProduction: onProd,
                    disabledOnDeployed: onDep,
                };
                fs.writeFileSync(apiJsonPath, JSON.stringify(apiJson, null, 4), "utf8");
                ok(chalk, apiJsonLabel + chalk.dim(` — registered "${snake}"`));
            }
        } catch (err) {
            fail(chalk, apiJsonLabel + chalk.red(` — ${err.message}`));
        }
    }

    // Summary
    console.log("\n" + chalk.yellow("─".repeat(45)));
    console.log(chalk.green(`  ✔  ${pascal}Blueprint scaffolded.`));
    console.log(chalk.gray(`     Import it in your Flask app:`));
    console.log(chalk.dim(`     from app.api.${snake} import ${pascal}Blueprint`));
    console.log(chalk.yellow("─".repeat(45)) + "\n");
}

// ── Scaffold: Socket ──────────────────────────────────────────

async function scaffoldSocket(chalk, flags, root) {
    const pascal = toPascalCase(flags.name);
    const snake = (() => { const s = toSnakeCase(pascal); return s[0] === "_" ? s.slice(1) : s; })();
    const fileName = `${snake}.py`;
    const eventDir = path.join(root, "backend", "app", "event");

    console.log();
    info(chalk, `Event : ${chalk.cyan(`${pascal}Event`)}`);
    info(chalk, `File  : ${chalk.cyan(`backend/app/event/${fileName}`)}`);
    console.log();

    if (!fs.existsSync(eventDir)) {
        fail(chalk, "backend/app/event/ not found — is this an electron-flask project?");
        console.log();
        return;
    }

    const evtPath = path.join(eventDir, fileName);

    if (fs.existsSync(evtPath)) {
        skip(chalk, chalk.gray(`backend/app/event/${fileName}`) + chalk.dim(" already exists"));
    } else {
        try {
            fs.writeFileSync(evtPath, socketTemplate(pascal), "utf8");
            ok(chalk, chalk.gray(`backend/app/event/${fileName}`));
        } catch (err) {
            fail(chalk, chalk.gray(`backend/app/event/${fileName}`) + chalk.red(` — ${err.message}`));
            return;
        }
    }

    // Update app/event/__init__.py
    updateInitPy(chalk, eventDir, pascal, "Event", "backend/app/event");

    // Summary
    console.log("\n" + chalk.yellow("─".repeat(45)));
    console.log(chalk.green(`  ✔  ${pascal}Event scaffolded.`));
    console.log(chalk.gray(`     Import it in your Flask app:`));
    console.log(chalk.dim(`     from app.event.${snake} import ${pascal}Event`));
    console.log(chalk.yellow("─".repeat(45)) + "\n");
}

// ── Main ──────────────────────────────────────────────────────

export default async function make(chalk, rl, args = []) {
    header(chalk);
    if (!checkCompat(chalk, "make")) return;

    const root = process.cwd();
    const flags = parseFlags(args);

    // ── switch_button guard ───────────────────────────────────
    // If not provided via GUI/CLI, warn and abort — this flag is
    // required because it drives the entire scaffold path.
    if (!flags.switch_button) {
        warn(chalk, "No scaffold type specified.");
        console.log();
        console.log(chalk.gray("  This command is designed to be run from the jdm plugin manager"));
        console.log(chalk.gray("  which passes --switch_button automatically."));
        console.log();
        console.log(chalk.gray("  If running manually on jdm-cli, specify the type explicitly:"));
        console.log(chalk.dim('    jdm-cli electron-flask make --switch_button=blueprint --name person'));
        console.log(chalk.dim('    jdm-cli electron-flask make --switch_button=socket    --name chat'));
        console.log();
        return;
    }

    const mode = flags.switch_button.toLowerCase();

    if (mode !== "blueprint" && mode !== "socket") {
        fail(chalk, `Unknown --switch_button value: "${flags.switch_button}"`);
        console.log(chalk.gray('  Expected "blueprint" or "socket".'));
        console.log();
        return;
    }

    // ── Name ──────────────────────────────────────────────────
    // Only prompt if not already provided — GUI always passes --name,
    // but manual CLI runs may omit it.
    if (!flags.name) {
        const label = mode === "blueprint" ? "Blueprint name (e.g. person): " : "Event name (e.g. chat): ";
        flags.name = (await ask(rl, chalk.white(`  ${label}`))).trim();
    }

    if (!flags.name) {
        fail(chalk, "No name provided — aborting.");
        console.log();
        return;
    }

    // ── Dispatch ──────────────────────────────────────────────
    if (mode === "blueprint") {
        await scaffoldBlueprint(chalk, rl, flags, root);
    } else {
        await scaffoldSocket(chalk, flags, root);
    }
}