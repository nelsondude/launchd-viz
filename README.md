# launchd-viz

A native macOS app for viewing, managing, and editing launch agents and daemons.

![Electron](https://img.shields.io/badge/electron-35-blue)
![Platform](https://img.shields.io/badge/platform-macOS-lightgrey)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- Browse all launch agents and daemons across user (`~/Library/LaunchAgents`), system (`/Library/LaunchAgents`), and system daemons (`/Library/LaunchDaemons`)
- See which services are loaded, running, or errored at a glance
- Load, unload, start, and stop services directly from the UI
- View and edit plist files (both structured form and raw XML)
- Create new launch agents with a guided form
- Delete agents you no longer need
- **Run history** — see service state, run count, last exit code, and recent system log activity
- **Human-readable schedules** — `StartInterval` and `StartCalendarInterval` shown as "Every 5 min", "Daily 3:00 AM", etc.
- Sortable table columns
- Dark mode support

## Install

### Homebrew (recommended)

```bash
brew tap nelsondude/tap
brew install --cask launchd-viz
```

Since the app is not code-signed, you'll need to allow it on first launch:

```bash
xattr -cr /Applications/Launchd\ Viz.app
```

Or: right-click the app > Open.

### Manual download

Grab the `.dmg` from the [latest release](https://github.com/nelsondude/launchd-viz/releases/latest).

## Development

```bash
# Install dependencies
npm install

# Run in dev mode (hot reload)
npm run dev

# Build the app
npm run build

# Package as .dmg (unsigned, for local testing)
npm run dist:unsigned
```

### Tech stack

- **Electron** with **electron-vite** for build tooling
- **React 18** + **TypeScript**
- **Mantine v7** for the UI component library
- **electron-builder** for packaging and distribution

### Project structure

```
src/
  main/           # Electron main process
    index.ts      # Window management, IPC handlers
    launchd-service.ts  # All launchctl interactions
  preload/        # Context bridge (IPC API exposed to renderer)
  renderer/       # React frontend
    src/
      App.tsx
      components/   # AgentList, AgentDetail, AgentForm, StatusBadge
      hooks/        # useAgents data fetching hook
  shared/         # Types shared between main and renderer
```

## Releases

Releases are automated via GitHub Actions. To publish a new version:

1. Bump the version in `package.json`
2. Commit and push to `main`
3. Create a release:
   ```bash
   gh release create v1.2.0 --generate-notes
   ```
4. The workflow builds a universal `.dmg`, attaches it to the release, and auto-updates the [Homebrew tap](https://github.com/nelsondude/homebrew-tap)

## License

MIT
