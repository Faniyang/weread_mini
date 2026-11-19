# WeRead Mini

English | [简体中文](./README.zh-CN.md)

WeRead Mini is a minimalist desktop reader for WeRead on Windows 10/11 x64. It displays the [official WeRead website](https://weread.qq.com/) and does not scrape, download books, or modify the website's authentication or reading-progress mechanisms. This project is not affiliated with Tencent or WeRead.

## Features

- 420×640 frameless reading window (minimum 320×400) with an ~36px draggable toolbar and resizable edges.
- Global `Alt+Q` shortcut to hide/restore while preserving the same reading page instance; closing the main window hides to the system tray by default.
- System tray menu with Show, Hide, Always on Top, Settings, and Quit ("Quit" terminates the application completely).
- Native Windows window opacity from 10% to 100% in 5% steps (default 90%), selectable directly from the toolbar.
- Toolbar actions for Back, Forward, Refresh, Always on Top, Opacity, Minimize, and Hide (the three navigation buttons can be hidden in Settings).
- Configurable global shortcut, light/dark toolbar theme, and launch-visible or launch-hidden-to-tray behavior; window size, position, and settings persist in the user application data directory.
- Uses a persistent `persist:weread` session for the reading view; login state and reading progress are managed by the WeRead website and Chromium session rather than custom configs or logs.

## Development & Testing

Requires Node.js 22.12 or later, npm, and network access to npm and Electron downloads. Ubuntu development environments also require Electron's system graphics libraries and an X11/Wayland graphical session.

```bash
npm ci
npm run typecheck
npm run test
npm run build
npm run dev
```

`npm run dev` builds before launching Electron (hot reload is not configured). `npm run build` outputs the main process, preload script, and both local renderer views into `dist/`. Tests run via Node.js's built-in test runner; no linter is configured.

Because the sandbox npm environment could not resolve the npm registry directly, initial setup used a temporary offline cache; `package-lock.json` is a standard npm lockfile and regular environments or GitHub Actions can run `npm ci` directly. On the local Ubuntu container lacking `libnss3`/`libnspr4` and restricted from initializing Chromium's sandbox (`Operation not permitted`), Electron GUI smoke testing was not completed; the project keeps `sandbox: true` intact.

## Windows EXE Build

On Windows 10/11 x64 with Node.js 22 installed:

```powershell
npm ci
npm run typecheck
npm run test
npm run dist:win
```

`npm run dist:win` packages both an NSIS installer and a Portable executable via `electron-builder` (under `release/WeRead-Mini-Setup-1.0.0-x64.exe` and `release/WeRead-Mini-Portable-1.0.0-x64.exe`, depending on version). Even the Portable build persists settings and the login session inside the Windows user application data directory, so moving the EXE will not carry that data automatically. No code-signing certificate is included; Windows SmartScreen may warn on unsigned binaries—verify the source rather than disabling OS security protections.

A GitHub Actions workflow is configured at `.github/workflows/build-windows.yml` (supporting manual dispatch, `main` pushes, and pull requests), running `npm ci`, typecheck, tests, and Windows x64 packaging on `windows-latest` and uploading EXEs as the `weread-mini-windows-x64` artifact. Until the workflow executes successfully on GitHub, Windows CI builds remain unverified.

## Security & Data

The toolbar and settings windows are local pages, while WeRead runs in an isolated `WebContentsView` with no preload script or Node.js APIs. All renderers enable context isolation and sandboxing with Node integration disabled, and main-process IPC validates sender identity. Main-frame navigation in the reading view is restricted to WeRead and listed official WeChat auth domains; other valid HTTPS links open in the system browser, non-HTTPS navigations are blocked, and remote permission requests are denied by default.

Windows settings are typically stored at `%APPDATA%\WeRead Mini\settings.json` (determined by `app.getPath('userData')`), while cookies and cache reside in the `persist:weread` session. Deleting the user data directory removes saved preferences and session state.

## Verification Status

| Item | Status | Notes |
| --- | --- | --- |
| Source & Windows workflow | Implemented | Includes installer & portable targets |
| TypeScript typecheck | Passed on Ubuntu | `npm run typecheck` |
| Automated tests | Passed on Ubuntu | `npm run test`, 4 test files |
| Code build | Passed on Ubuntu | `npm run build` |
| Electron GUI launch | Not verified locally | Container restricts Chromium sandbox init |
| Windows EXE build | Pending Windows CI | Workflow configured, not yet executed |
| Login, page turning & sync | Needs Windows manual check | Depends on live WeRead website behavior |
| Global shortcut, tray, opacity, HiDPI | Needs Windows manual check | Ubuntu checks cannot replace Windows GUI testing |

## Windows Manual Acceptance Checklist

1. Install or launch the EXE and verify the ~420×640 window, drag handle, edge resizing, and layout under 100% and 150% DPI scaling.
2. Open WeRead, scan to sign in, open an accessible book, turn pages, then quit and relaunch to verify login and progress persistence.
3. Switch focus to another app, press `Alt+Q` to hide and again to restore to the same book/position; verify closing the window hides to the tray.
4. Change the global shortcut in tray Settings to an unused combination and test it, then test an occupied shortcut to verify conflict handling.
5. Cycle opacity between 10%, 90%, and 100%, toggle Always on Top, Light/Dark toolbar, and Start Hidden; relaunch and verify settings persist without reloading the book page.
6. Test Back, Forward, Refresh, `Ctrl + scroll` zoom, external HTTPS links opening in the default browser, and blocking of non-HTTPS URLs.
7. Click "Quit" from the tray menu and confirm no WeRead Mini processes remain in Task Manager.

## Known Limitations

- WeRead login and web behavior are controlled by the official site and may change over time; this project does not bypass authentication or security checks.
- Electron's `setOpacity()` has no effect on Linux; real opacity behavior requires verification on Windows.
- Global shortcuts, window positioning, and Always on Top on Linux Wayland depend on the desktop compositor; Windows is the primary target platform.
- If the system tray is unavailable, the main window remains visible; if global shortcut registration fails, conflicts are surfaced in Settings and the tray menu.
