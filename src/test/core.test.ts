import * as assert from 'node:assert/strict';
import test from 'node:test';
import { resumeCommand } from '../restore/commands';
import { matchTerminals } from '../restore/matcher';
import { isSnapshot, TerminalSnapshot } from '../snapshot/model';

test('matches terminal names before cwd and consumes each live terminal once', () => {
  const snapshots: TerminalSnapshot[] = [
    { name: 'claude', cwd: 'C:/CODE', cli: 'claude' },
    { name: 'codex', cwd: 'C:/CODE', cli: 'codex' },
  ];
  const terminals = [
    { name: 'codex', cwd: 'C:/CODE' },
    { name: 'claude', cwd: 'C:/different' },
  ];
  const matches = matchTerminals(snapshots, terminals);
  assert.deepEqual(matches.map((match) => match.terminal.name), ['claude', 'codex']);
});

test('falls back to cwd only for unmatched snapshots', () => {
  const matches = matchTerminals(
    [{ name: 'old name', cwd: 'C:/CODE', cli: 'opencode' }],
    [{ name: 'new name', cwd: 'C:/CODE' }],
  );
  assert.equal(matches.length, 1);
  assert.equal(matches[0].terminal.name, 'new name');
});

test('uses defaults, honors overrides, and rejects unknown CLIs', () => {
  assert.equal(resumeCommand('claude'), 'claude -c');
  assert.equal(resumeCommand('codex', { codex: 'codex resume abc' }), 'codex resume abc');
  assert.equal(resumeCommand('unknown'), undefined);
  assert.equal(resumeCommand('opencode', { opencode: '  ' }), undefined);
});

test('validates the persisted snapshot schema', () => {
  assert.equal(isSnapshot({ schemaVersion: 1, capturedAt: '2026-09-01T00:00:00.000Z', terminals: [] }), true);
  assert.equal(isSnapshot({ schemaVersion: 2, capturedAt: 'now', terminals: [] }), false);
  assert.equal(isSnapshot({ schemaVersion: 1, capturedAt: 'now', terminals: [{ name: 'x', cwd: 'y', cli: 'other' }] }), false);
});
