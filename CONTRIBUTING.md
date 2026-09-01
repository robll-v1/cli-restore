# Contributing

Thanks for helping improve CLI RESTORE.

## Development

Requirements: Node.js 20 or newer and VS Code 1.125 or newer.

```bash
npm ci
npm run check
npm test
npm run compile
```

Use the `Run CLI RESTORE` launch configuration to test in an Extension Development Host. Manual testing should include terminal layout restoration, duplicate terminal names, an already-running CLI, a missing working directory, and a first launch with no snapshot.

## Pull Requests

Keep changes focused, add or update tests for behavior changes, and explain manual VS Code testing in the pull request. Do not include secrets, workspace state, generated `.vsix` files, or `dist` output in commits.

## Issues

Include VS Code version, operating system, extension version, CLI and shell versions, relevant Output Channel logs, and minimal reproduction steps. Remove personal paths and secrets before posting.
