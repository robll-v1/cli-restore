# Changelog

## 0.0.3 - 2026-09-01

- Preserve the last snapshot when all terminals close during VS Code shutdown.
- Run the initial snapshot only after session restoration completes.
- Match Windows working directories case-insensitively and restore terminals concurrently.
- Fixed Windows process-tree JSON field casing so real CLI processes are detected.

## Unreleased

## 0.0.1 - 2026-09-01

- Initial development release.
- Added workspace snapshots for integrated terminal CLI sessions.
- Added Windows process-tree detection and in-place session restoration.
