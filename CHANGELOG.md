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

[Unreleased]: https://github.com/meiyerDev/streamgrid/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/meiyerDev/streamgrid/releases/tag/v1.0.0
