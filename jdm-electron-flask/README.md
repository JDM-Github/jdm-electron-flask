# jdm-electron-flask

> A `jdm-cli` plugin for scaffolding and managing full-stack desktop apps built with **Electron + Flask + React**.

---

## What is this?

`jdm-electron-flask` is a plugin for [`jdm-cli`](https://github.com/JDM-Github/jdm-cli) that gives you a complete workflow for building, running, and packaging desktop applications where:

- **Electron** is the desktop shell
- **Flask** (Python) is the backend API server
- **React** (Vite) is the frontend UI

The plugin handles everything — scaffolding, dev servers, production builds, and packaging the backend into a standalone `.exe` — so you never have to wire it up yourself.

---

## Project Structure

When you scaffold a project with `create`, this is the layout you get:

```
my-app/
├── backend/          # Python + Flask API server
│   ├── run.py        # Dev entry point
│   ├── production_run.py  # Production / PyInstaller entry point
│   ├── requirements.txt
│   └── .env
├── frontend/         # React + Vite UI
│   ├── src/
│   ├── package.json
│   └── .env
├── electron/         # Electron shell
│   ├── resources/
│   │   └── backend/  # flask_server.exe lands here after compile
│   ├── package.json
│   └── outputs/      # Versioned build outputs
├── .jdm-config.json  # Plugin version config (auto-generated)
└── run.bat           # Shortcut wrapper (Windows)
```

---

## Prerequisites

| Tool | Why |
|---|---|
| [Node.js](https://nodejs.org/) `>=18` | Electron + frontend build |
| [Python](https://www.python.org/) `>=3.9` | Flask backend |
| [Git](https://git-scm.com/) | Cloning templates during `create` |
| [PyInstaller](https://pyinstaller.org/) | Packaging backend to `.exe` via `toexe` |
| [jdm-cli](https://github.com/JDM-Github/jdm-cli) | The CLI host |

Install PyInstaller once globally:

```bash
pip install pyinstaller
```

---

## Installation

Install the plugin via `jdm-cli`:

```bash
jdm-cli install electron-flask
```

Or install the package directly:

```bash
npm install -g jdm-electron-flask
```

---

## Quick Start

```bash
# 1. Scaffold a new project
jdm-cli electron-flask create

# 2. Install all dependencies (Python + npm)
jdm-cli electron-flask install

# 3. Start the dev environment
jdm-cli electron-flask dev
```

That's it. Two terminal windows (or tabs) open — one for Flask, one for Vite — and Electron connects to them automatically.

---

## Commands

### `create`

Scaffolds a new project by cloning the three template repositories.

```bash
jdm-cli electron-flask create
# → prompts for a project name (or . to use current folder)

jdm-cli electron-flask create --install
# → also runs npm install / pip install after cloning
```

**What it does:**
- Clones `backend`, `frontend`, and `electron` template repos
- Strips `.git` history from each (clean slate)
- Copies `.env.example` → `.env` in backend and frontend
- Generates a `run.bat` shortcut for Windows
- Writes `.jdm-config.json` to track the plugin version used

---

### `install`

Installs dependencies for all three sub-projects.

```bash
jdm-cli electron-flask install
```

**What it does:**
- Runs `pip install -r requirements.txt` in `backend/`
- Runs `npm install` in `frontend/`
- Runs `npm install` in `electron/`

> Run this from the project root (the folder containing `backend/`, `frontend/`, `electron/`).

---

### `dev`

Launches both the Flask backend and the Vite frontend in separate terminal windows (or tabs).

```bash
jdm-cli electron-flask dev
```

**What it does:**
- Opens `backend/` running `python run.py` in a new terminal
- Opens `frontend/` running `npm run dev` in a new terminal
- On Windows: prefers Windows Terminal tabs, falls back to new CMD windows
- On macOS/Linux: tries `gnome-terminal`, `xterm`, then `osascript`

You can close the original command window once both servers are up.

---

### `prod`

Launches a production preview — same as `dev` but uses the production entry points.

```bash
jdm-cli electron-flask prod
```

**What it does:**
- Opens `backend/` running `python production_run.py`
- Opens `frontend/` running `npm run dev` with `VITE_MODE=production`

---

### `toexe`

Packages the Flask backend into a standalone Windows executable using PyInstaller. No Python installation needed on the target machine.

```bash
jdm-cli electron-flask toexe
```

**What it does:**
1. Cleans previous `build/`, `dist/`, and `.spec` artifacts from `backend/`
2. Validates that `backend/production_run.py` exists
3. Runs PyInstaller with `--onefile --noconsole`
4. Automatically bundles `app/`, `static/`, `resources/`, and `.env` if they exist

Output: `backend/dist/flask_server.exe`

---

### `compile`

Full production build in one command — frontend, backend EXE, and Electron installer.

```bash
jdm-cli electron-flask compile
```

**Steps:**
1. **Frontend** — `npm run build` with `VITE_MODE=deployed`
2. **Backend EXE** — runs `toexe` internally
3. **Move EXE** — copies `flask_server.exe` → `electron/resources/backend/`
4. **Electron** — `npm run dist` to build the installer
5. **Version output** — moves the build output to `electron/outputs/<version>/`

If a versioned output folder already exists, it will ask before overwriting.

Errors at any step are written to `compile.log` in the project root (auto-deleted on success).

---

### `clean`

Removes build artifacts.

```bash
jdm-cli electron-flask clean
```

**Targets:**
- `backend/build/`
- `backend/dist/`
- `backend/flask_server.spec`
- `electron/dist/`

Prints a summary of what was removed, skipped, or failed.

---

## Config & Compatibility

Every project created by this plugin contains a `.jdm-config.json` file:

```json
{
  "plugin": "electron-flask",
  "pluginVersion": "1.0.13",
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

This lets the plugin detect when a project was scaffolded with an older (or incompatible) version. If you update the plugin and run a command against an older project, you may see:

```
  ✖  Compatibility error for command: compile
     Project was created with plugin version 1.0.9,
     but "compile" requires >=1.0.10.

  Tip: Re-scaffold with jdm-cli electron-flask create
```

To resolve: re-run `create` in your project folder, or downgrade the plugin to the version that matches your project.

---

## Shortcut (Windows)

Every scaffolded project includes a `run.bat` wrapper so you can call commands without the full `jdm-cli electron-flask` prefix:

```bat
run dev
run compile
run clean
```

---

## Logs

Long-running commands write a log file to the project root on failure:

| Command | Log file |
|---|---|
| `create` | `install.log` |
| `install` | `install.log` |
| `compile` | `compile.log` |
| `toexe` | `toexe.log` |

Logs are automatically deleted if the command succeeds.

---

## Template Repositories

| Part | Repository |
|---|---|
| Backend | [jdm-electron-flask-backend](https://github.com/JDM-Github/jdm-electron-flask-backend) |
| Frontend | [jdm-electron-flask-frontend](https://github.com/JDM-Github/jdm-electron-flask-frontend) |
| Electron | [jdm-electron-flask-electron](https://github.com/JDM-Github/jdm-electron-flask-electron) |

---

## License

MIT © [JDM-Github](https://github.com/JDM-Github)