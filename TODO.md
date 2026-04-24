# JDM Electron-Flask | TODO

## Phase 1 — Core Stability (High Priority)

### Plugin System

* [ ] Standardize plugin interface (choose one):

  * [ ] `run(command, args)` only (recommended)
  * [ ] OR `register()` only (Commander-style)
* [ ] Remove duplicated command definitions between `register` and `run`
* [ ] Add validation:

  * [ ] Ensure plugin exports `namespace`
  * [ ] Ensure plugin exports `run()`

### Error Handling

* [ ] Normalize error output across all commands
* [ ] Add consistent exit codes
* [ ] Wrap all `execSync` calls with safe logging

---

## Phase 2 — Project Manifest System (jdm.json)

### Create Manifest

* [ ] Generate `jdm.json` in `create.js`
* [ ] Include:

  * [ ] project name
  * [ ] template (`electron-flask`)
  * [ ] CLI version
  * [ ] createdAt
  * [ ] structure (backend/frontend/electron)

### Project Loader

* [ ] Create `lib/project.js`
* [ ] Implement `loadProject(cwd)`
* [ ] Validate project before running commands

### Integration

* [ ] Update all commands:

  * [ ] `dev`
  * [ ] `compile`
  * [ ] `install`
  * [ ] `clean`
* [ ] Fail if `jdm.json` is missing

---

## Phase 3 — Feature System (IMPLEMENT command)

### Base Command

* [ ] Add `implement` command to plugin
* [ ] Parse: `jdm-cli electron-flask implement <feature>`

### Feature Loader

* [ ] Create `/features` directory
* [ ] Dynamic loader:

  * [ ] `features/<name>/index.js`
* [ ] Validate feature exists before running

### Initial Features

* [ ] sequelize (ORM setup)
* [ ] sql (basic DB config)
* [ ] auth (JWT login system)
* [ ] api (route scaffold)
* [ ] socket (websocket setup)

### Safety

* [ ] Do NOT overwrite existing files
* [ ] Add file existence checks
* [ ] Add warnings instead of destructive actions

### Manifest Integration

* [ ] Add `features: []` to `jdm.json`
* [ ] Track installed features

---

## Phase 4 — Developer Experience

### CLI Improvements

* [ ] Improve help output per plugin
* [ ] Add:

  * [ ] `jdm-cli electron-flask help`
* [ ] Show available commands dynamically

### Shortcuts

* [ ] Generate `.bat` helper in `create`

  * [ ] `dev.bat`
  * [ ] `compile.bat`
  * [ ] `prod.bat`

### Logging

* [ ] Improve `install.log`
* [ ] Add verbose mode (`--verbose`)
* [ ] Add silent mode (`--silent`)

---

## Phase 5 — Dev Runtime Improvements

### Backend Launch

* [ ] Stabilize Windows `spawn` logic
* [ ] Avoid fragile `cmd /c start` quoting issues
* [ ] Consider:

  * [ ] PowerShell fallback
  * [ ] Separate runner script

### Process Management

* [ ] Track running processes
* [ ] Add:

  * [ ] `jdm-cli electron-flask stop`
* [ ] Graceful shutdown handling

---

## Phase 6 — Build System Improvements

### Compile Pipeline

* [ ] Add step validation between stages
* [ ] Cache frontend build if unchanged
* [ ] Validate EXE before moving

### toexe

* [ ] Configurable PyInstaller options
* [ ] Detect missing Python dependencies
* [ ] Support custom entry file

---

## Phase 7 — Configuration System

### Config File

* [ ] Add `jdm.config.json` (optional)
* [ ] Allow overrides:

  * [ ] ports
  * [ ] build paths
  * [ ] environment modes

### Env Handling

* [ ] Improve `.env` setup:

  * [ ] Validate required keys
  * [ ] Add defaults

---

## Phase 8 — Plugin Ecosystem (Future)

### Compatibility

* [ ] Add plugin compatibility rules:

  * [ ] CLI version
  * [ ] template support

### External Features

* [ ] Allow installing feature packs:

  * [ ] `jdm-cli add feature-auth`
* [ ] Load external feature modules

---

## Phase 9 — Quality & Safety

### Validation

* [ ] Ensure required folders exist before commands
* [ ] Add sanity checks before destructive operations

### Testing

* [ ] Create test script for:

  * [ ] create
  * [ ] dev
  * [ ] compile
* [ ] Add automated CLI tests

---

## Phase 10 — Long-Term Vision

### Multi-Template Support

* [ ] Add new stacks:

  * [ ] electron-fastapi
  * [ ] electron-node
  * [ ] pure flask

### CLI Evolution

* [ ] Turn CLI into:

  * [ ] full project orchestrator
  * [ ] modular stack builder

---

## Notes

* Keep commands predictable and consistent
* Avoid hidden side-effects
* Prefer composition over hardcoding
* Every new feature should be modular

---
