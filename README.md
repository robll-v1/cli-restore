# CLI RESTORE

Restore interactive CLI sessions in VS Code integrated terminals.

CLI RESTORE relies on VS Code to restore terminal layout and working directories, then detects and resumes supported CLI sessions in place.

Supported CLIs: Claude, OpenCode, and Codex. Windows process-tree detection is available today; other platforms safely skip detection until their adapters are implemented.

VS Code extension that snapshots integrated-terminal CLI sessions and resumes them after VS Code restores the terminal layout.

## Development

```bash
npm install
npm run check
npm test
npm run compile
```

Snapshots are stored only in VS Code `workspaceState`. No project files or session IDs are written. Interactive commands are sent with `terminal.sendText`.

## Project Status

This project is in early development. Feedback, reproduction steps, tests, and platform adapter contributions are welcome.

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## Debugging and Packaging

Use the `Run CLI RESTORE` launch configuration in VS Code to open an Extension Development Host. Create an installable package with `npm run package`; the resulting `cli-restore.vsix` can be installed with VS Code's `Extensions: Install from VSIX...` command.
