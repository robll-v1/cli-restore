export type CliType = 'claude' | 'opencode' | 'codex' | 'unknown';

export interface TerminalSnapshot {
  name: string;
  cwd: string;
  cli: CliType;
}

export interface Snapshot {
  schemaVersion: 1;
  capturedAt: string;
  terminals: TerminalSnapshot[];
}

export function isSnapshot(value: unknown): value is Snapshot {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<Snapshot>;
  return candidate.schemaVersion === 1 && typeof candidate.capturedAt === 'string' &&
    Array.isArray(candidate.terminals) && candidate.terminals.every((terminal) => {
      if (!terminal || typeof terminal !== 'object') return false;
      const item = terminal as Partial<TerminalSnapshot>;
      return typeof item.name === 'string' && typeof item.cwd === 'string' &&
        (item.cli === 'claude' || item.cli === 'opencode' || item.cli === 'codex' || item.cli === 'unknown');
    });
}
