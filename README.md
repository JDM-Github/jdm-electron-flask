# JDM Electron-Flask | README

A full-stack project generator and CLI workflow built on top of **jdm-cli**.

This template combines:

* Electron (desktop shell)
* Flask (Python backend)
* React + Vite (frontend)

It provides a complete development and build pipeline out of the box.

---

## Overview

This project is generated via:

```
jdm-cli electron-flask create
```

It scaffolds a full working environment with:

* Backend API (Flask)
* Frontend UI (React + Vite)
* Desktop wrapper (Electron)
* CLI automation for dev, build, and packaging

---

## Project Structure

```
backend/    → Flask API + business logic
frontend/   → React (Vite) application
electron/   → Electron app wrapper
run.bat     → Quick command shortcuts
```

### Backend (Flask)

```
backend/
  app/
    api/        → routes
    core/       → services / logic
    models/     → database models
    utils/      → helpers
  run.py        → development entry
  production_run.py → production entry
```

### Frontend (React + Vite)

```
frontend/
  src/
    layout/     → UI structure
    routes/     → pages
    lib/        → utilities
```

### Electron

```
electron/
  main.js       → main process
  resources/    → packaged backend EXE
```

---

## Commands

### Development

Start full development environment:

```
jdm-cli electron-flask dev
```

Or using shortcut:

```
run dev
```

This will:

* Start Flask backend (new terminal)
* Start frontend dev server

---

### Install Dependencies

```
jdm-cli electron-flask install
```

---

### Build / Compile

Full production build:

```
jdm-cli electron-flask compile
```

This runs:

1. Frontend build
2. Backend → EXE (PyInstaller)
3. Electron packaging

---

### Backend EXE Only

```
jdm-cli electron-flask toexe
```

---

### Clean Build Artifacts

```
jdm-cli electron-flask clean
```

---

## Environment Setup

After creation:

* `.env.example` is automatically converted to `.env`
* Configure environment variables in:

  * `backend/.env`
  * `frontend/.env`

---

## Feature System (Planned)

Future support:

```
jdm-cli electron-flask implement <feature>
```

Examples:

```
implement sequelize
implement sql
implement auth
```

This will:

* Install dependencies
* Generate boilerplate
* Update project config

---

## Requirements

* Node.js (18+ recommended)
* Python (3.10+)
* pip
* Git
* PyInstaller (`pip install pyinstaller`)

---

## Notes

* Backend runs independently (Flask)
* Frontend communicates via API
* Electron bundles backend EXE for production

---

## Philosophy

This project aims to:

* Remove repetitive setup
* Standardize full-stack desktop apps
* Provide a clean CLI-driven workflow
* Enable modular feature expansion

---

## Future Improvements

* Feature modules (auth, DB, sockets)
* Plugin ecosystem
* Project manifest (`jdm.json`)
* Better process management
* Cross-platform improvements

---

## License

MIT
