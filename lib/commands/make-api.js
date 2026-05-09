// ─────────────────────────────────────────────────────────────
//  lib/commands/make-api.js  —  jdm-cli electron-flask make-api
//  Scaffolds a JDMBlueprint + Service and registers it in
//  backend/config/api.json. Targets cwd (project root).
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
        chalk.bold("make-api")
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
        # Example validation:
        # name = data.get("name")
        # if not name or not isinstance(name, str):
        #     return error("'name' is required and must be a string", 400)
        # created = ${pascal}Service.create(data)
        # return success(created, "${pascal} created", 201)
        return success(data, "${pascal} created", 201)

    # ── PUT ──────────────────────────────────────────────────

    @JDMBlueprint.put("/<int:id>", auth=True, validate="data")
    def update(data, id):
        """Replace an existing ${snake} entirely."""
        # TODO: ensure record exists, then call ${pascal}Service.update(id, data)
        # item = ${pascal}Service.get_by_id(id)
        # if not item:
        #     return error("${pascal} not found", 404)
        # updated = ${pascal}Service.update(id, data)
        # return success(updated, "${pascal} updated")
        return success({"id": id, **data}, "${pascal} updated")

    # ── PATCH ────────────────────────────────────────────────

    @JDMBlueprint.patch("/<int:id>", auth=True, validate="data")
    def partial_update(data, id):
        """Partially update an existing ${snake}."""
        # TODO: merge only provided fields, then call ${pascal}Service.patch(id, data)
        # item = ${pascal}Service.get_by_id(id)
        # if not item:
        #     return error("${pascal} not found", 404)
        # patched = ${pascal}Service.patch(id, data)
        # return success(patched, "${pascal} patched")
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

// ─── Service template ─────────────────────────────────────────
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
        # Example (SQLAlchemy):
        # return [item.to_dict() for item in ${pascal}Model.query.all()]
        return []

    @staticmethod
    def get_by_id(id: int):
        """Return a single ${snake} by primary key, or None."""
        # TODO: query by ID
        # Example:
        # item = ${pascal}Model.query.get(id)
        # return item.to_dict() if item else None
        return None

    # ── WRITE ─────────────────────────────────────────────────

    @staticmethod
    def create(data: dict):
        """Persist a new ${snake} and return the created record."""
        # TODO: insert into database
        # Example:
        # item = ${pascal}Model(**data)
        # db.session.add(item)
        # db.session.commit()
        # return item.to_dict()
        return data

    @staticmethod
    def update(id: int, data: dict):
        """Fully replace a ${snake} record and return the updated record."""
        # TODO: replace all fields
        # Example:
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
        # Example:
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
        # Example:
        # item = ${pascal}Model.query.get(id)
        # db.session.delete(item)
        # db.session.commit()
        pass
`;
}

export default async function makeApi(chalk, rl, args = []) {
    header(chalk);
    if (!checkCompat(chalk, "make-api")) return;

    const root = process.cwd();

    // ── 1. Name ───────────────────────────────────────────────
    let rawName = args?.[0]?.trim() || "";
    if (!rawName) {
        rawName = await ask(rl, chalk.white("  API name (e.g. person): "));
    }
    if (!rawName) {
        fail(chalk, "No name provided — aborting.");
        console.log();
        return;
    }

    const pascal = toPascalCase(rawName);
    let snake = toSnakeCase(pascal);
    if (snake[0] === "_") snake = snake.slice(1);
    const link = `/api/${snake}`;

    console.log();
    info(chalk, `Blueprint : ${chalk.cyan(`${pascal}Blueprint`)}`);
    info(chalk, `Service   : ${chalk.cyan(`${pascal}Service`)}`);
    info(chalk, `Route     : ${chalk.cyan(link)}`);
    console.log();

    // ── 2. Flags ──────────────────────────────────────────────
    const onProd = (await ask(rl, chalk.white("  disabledOnProduction? [y/N]: "))) === "y";
    const onDep = (await ask(rl, chalk.white("  disabledOnDeployed?   [y/N]: "))) === "y";
    console.log();

    // ── 3. Write Blueprint ────────────────────────────────────
    const apiDir = path.join(root, "backend", "app", "api");
    const bpFileName = `${snake}_blueprint.py`;
    const bpPath = path.join(apiDir, bpFileName);

    if (!fs.existsSync(apiDir)) {
        fail(chalk, `backend/app/api/ not found — is this an electron-flask project?`);
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

    // ── 4. Write Service ──────────────────────────────────────
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

    // ── 5. Register in api.json ───────────────────────────────
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

    // ── Summary ───────────────────────────────────────────────
    console.log("\n" + chalk.yellow("─".repeat(45)));
    console.log(chalk.green(`  ✔  ${pascal} API scaffolded.`));
    console.log(chalk.gray(`     Register the blueprint in your Flask app:`));
    console.log(chalk.dim(`     from app.api.${snake}_blueprint import ${pascal}Blueprint`));
    console.log(chalk.yellow("─".repeat(45)) + "\n");
}