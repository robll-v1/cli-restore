# CLI RESTORE

VS Code extension that snapshots integrated-terminal CLI sessions and resumes them after VS Code restores the terminal layout.

## Development

```bash
npm install
npm run check
npm test
npm run compile
```

The extension stores snapshots in VS Code `workspaceState`, detects CLI processes through a platform adapter, and uses `terminal.sendText` for interactive resume commands.

## Debugging and Packaging

Use the `Run CLI RESTORE` launch configuration in VS Code to open an Extension Development Host. Create an installable package with `npm run package`; the resulting `cli-restore.vsix` can be installed with VS Code's `Extensions: Install from VSIX...` command.
