# Changelog

## Unreleased

- Preserve the last snapshot when all terminals close during VS Code shutdown.
- Run the initial snapshot only after session restoration completes.
- Match Windows working directories case-insensitively and restore terminals concurrently.

## 0.0.1 - 2026-09-01

- Initial development release.
- Added workspace snapshots for integrated terminal CLI sessions.
- Added Windows process-tree detection and in-place session restoration.
