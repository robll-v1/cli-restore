import { TerminalSnapshot } from '../snapshot/model';

export interface RestoredTerminal {
  readonly name: string;
  readonly cwd: string;
}

export interface TerminalMatch<T extends RestoredTerminal> {
  readonly snapshot: TerminalSnapshot;
  readonly terminal: T;
}

/**
 * Matches each snapshot at most once. Terminal names are stable under VS Code
 * layout restoration, while cwd provides a useful fallback for renamed shells.
 */
export function matchTerminals<T extends RestoredTerminal>(
  snapshots: readonly TerminalSnapshot[],
  terminals: readonly T[],
): TerminalMatch<T>[] {
  const remaining = new Set(terminals);
  const matches: TerminalMatch<T>[] = [];

  for (const snapshot of snapshots) {
    const terminal = [...remaining].find((candidate) => candidate.name === snapshot.name);
    if (terminal) {
      matches.push({ snapshot, terminal });
      remaining.delete(terminal);
    }
  }

  for (const snapshot of snapshots) {
    if (matches.some((match) => match.snapshot === snapshot) || !snapshot.cwd) continue;
    const terminal = [...remaining].find((candidate) => candidate.cwd === snapshot.cwd);
    if (terminal) {
      matches.push({ snapshot, terminal });
      remaining.delete(terminal);
    }
  }

  return matches;
}
