# JDM Electron-Flask | INSTALL

## Overview

This project is powered by **jdm-cli**, a plugin-based CLI that scaffolds and manages full-stack Electron + Flask applications.

Before using this template, you must install the CLI.

---

## 1. Install jdm-cli

### Option A — Install from npm (recommended)

```bash
npm install -g jdm-cli
```

Verify installation:

```bash
jdm-cli --help
```

---

### Option B — Install from source (GitHub)

```bash
git clone https://github.com/JDM-Github/jdm-cli
cd jdm-cli
npm install
npm link
```

This will make `jdm-cli` available globally on your system.

---

### Reference

* GitHub: https://github.com/JDM-Github/jdm-cli

---

## 2. Install Electron-Flask Plugin

Install the plugin via CLI:

```bash
jdm-cli add jdm-electron-flask
```

Verify:

```bash
jdm-cli list
```

You should see:

```text
electron-flask
```

---

### Reference

* Plugin Repo: https://github.com/JDM-Github/jdm-electron-flask

---

## 3. Create a New Project

```bash
jdm-cli electron-flask create
```

Follow the prompts to generate your project.

---

## 4. Install Project Dependencies

Inside your generated project:

```bash
jdm-cli electron-flask install
```

This installs:

* Python dependencies (backend)
* npm dependencies (frontend + electron)

---

## 5. Run Development Environment

```bash
jdm-cli electron-flask dev
```

Or using shortcut (if generated):

```bash
run dev
```

---

## 6. Build Production App

```bash
jdm-cli electron-flask compile
```

This will:

1. Build frontend
2. Convert backend to EXE
3. Package Electron app

---

## 7. Requirements

Ensure the following are installed:

### Node.js

* Version: 18+
* Download: https://nodejs.org/

### Python

* Version: 3.10+
* Download: https://www.python.org/

### pip

Usually bundled with Python

### Git

* Required for cloning repositories
* Download: https://git-scm.com/

### PyInstaller

```bash
pip install pyinstaller
```

---

## 8. Related Repositories (Transparency)

These are the underlying components used by the generator:

### Backend Template

https://github.com/JDM-Github/jdm-electron-flask-backend

### Frontend Template

https://github.com/JDM-Github/jdm-electron-flask-frontend

### Electron Template

https://github.com/JDM-Github/jdm-electron-flask-electron

### CLI Plugin

https://github.com/JDM-Github/jdm-electron-flask

---

## 9. Notes

* The project is modular — each part (backend, frontend, electron) can be modified independently
* CLI commands orchestrate everything for convenience
* You can still run each part manually if needed

---

## 10. Troubleshooting

### Command not found: jdm-cli

* Ensure npm global bin is in PATH
* Try reinstalling:

  ```bash
  npm install -g jdm-cli
  ```

### Python not found

* Ensure Python is added to PATH
* Check:

  ```bash
  python --version
  ```

### npm install fails

* Delete `node_modules` and retry
* Ensure correct Node version

---

End of setup.
