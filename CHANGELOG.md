# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!--
  Maintainers: when tagging a new release (`vX.Y.Z`), move the relevant
  entries from [Unreleased] into a new versioned section below it, dated
  with the release day, then leave [Unreleased] empty for the next cycle.
-->

## [Unreleased]

### Added

### Changed

### Fixed

### Removed

## [1.2.0] - 2026-08-11

### Added

- **Auto-updates** — the app now checks GitHub Releases on launch and automatically downloads the latest version in the background.
  - Toast notification with download progress and a "Reiniciar e instalar" action once the new version is ready.
  - "Actualizaciones" section in the settings drawer showing the current version, a manual "Buscar" check, and install status.
  - `electron-updater` wired to the GitHub provider; only the `latest` release is considered.

### Changed

### Fixed

### Removed

## [1.1.0] - 2026-08-11

### Added

- **Live chat in the mosaic**
  - Optional chat tile inside the stream grid (toggle per profile), draggable and resizable with its layout persisted to disk.
  - Live IRC feed (Twitch) showing messages from all active streams in a single unified view.
  - Anonymous viewer mode: chat is readable without signing in.
  - Chat connection status with automatic reconnection and exponential backoff.
- **Twitch Chat account**
  - Dedicated "Twitch Chat" connect card on the Accounts page.
  - In-app Twitch OAuth login via a local HTTPS callback server with a pinned self-signed certificate.
  - Access token stored encrypted at rest using Electron's safeStorage.
  - Token scope validation and automatic expiry detection; log out of the chat connection.
- **Sending messages**
  - Write box with a channel picker (targets the active streams) and Enter-to-send.
  - Requires a connected Twitch Chat account; validated input (empty / over 500 characters).
  - Your own sent messages appear in the feed with other users' messages.

### Changed

### Fixed

### Removed

## [1.0.1] - 2026-08-03

### Added

- **Packaging & distribution**
  - Linux builds now ship both `x64` and `arm64` architectures (AppImage/deb).

### Changed

- **Packaging & distribution**
  - Release artifacts now use stable, predictable filenames (`StreamGrid-Setup.exe`, `StreamGrid.dmg`, `StreamGrid-x64.AppImage`, `StreamGrid-${arch}.deb`) so the direct "latest release" download links in the README always resolve.
- **Documentation**
  - Added a Downloads section to the README with per-platform direct download links and a latest-version badge.
  - Added the missing app screenshots (dashboard, editable grid, fullscreen).

### Fixed

- SwiftShader ICD/JSON files are no longer uploaded as GitHub release assets.

### Removed

## [1.0.0] - 2026-08-02

### Added

- **Live stream grid/mosaic**
  - Draggable and resizable grid of stream tiles with a responsive column count that adapts to the window size.
  - Edit mode with visual grid guide lines for rearranging tiles.
  - Per-stream tile position and size persisted to disk.
  - Manual "refresh mosaic" button to re-sync and reposition all embedded streams.
  - Empty-state screen with a call to action when no streams have been added yet.
  - Streams embedded as native views layered over the UI (not iframes), staying correctly positioned on scroll and window resize.
  - Links opened from within an embedded stream open in the system's default browser instead of in-app.
- **Stream management**
  - Add a stream by provider and channel name.
  - Remove a stream from the mosaic or from the stream management drawer.
- **Multi-profile support**
  - Create, rename, delete, and switch between named profiles, each with its own independent set of streams and layout.
  - Profile tabs bar with an overflow dropdown for when there are many profiles.
  - Automatic fallback to another profile when the active one is deleted.
  - Automatic migration of an existing single-profile configuration into the new profile format.
- **Twitch account integration**
  - Dedicated Accounts page for managing connected providers.
  - In-app Twitch login via an embedded webview with automatic login detection.
  - Persistent, isolated login session per provider.
  - Account status display (avatar and username) for a logged-in Twitch account.
  - Log out of a connected Twitch account.
- **App settings**
  - Windowed vs. fullscreen display mode, with window position/size restored when leaving fullscreen.
  - Monitor picker to choose which display is used for fullscreen mode.
  - Master volume control applied globally across all embedded stream players.
  - Quit application from within the app.
- **Packaging & distribution**
  - Multi-platform builds: Windows (NSIS installer), macOS (dmg), and Linux (AppImage/deb).
  - CI pipeline that builds all platforms and publishes a GitHub Release when a version tag is pushed.

### Changed

### Fixed

- Stream views are now cleanly torn down when the main window closes, eliminating "destroyed WebContents" errors on quit.

### Removed

[Unreleased]: https://github.com/meiyerDev/streamgrid/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/meiyerDev/streamgrid/releases/tag/v1.2.0
[1.1.0]: https://github.com/meiyerDev/streamgrid/releases/tag/v1.1.0
[1.0.1]: https://github.com/meiyerDev/streamgrid/releases/tag/v1.0.1
[1.0.0]: https://github.com/meiyerDev/streamgrid/releases/tag/v1.0.0
