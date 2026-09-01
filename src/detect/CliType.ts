/** CLI processes that can be resumed by the extension. */
export type CliType = 'claude' | 'opencode' | 'codex' | 'unknown';

export const CLI_TYPES: readonly CliType[] = [
  'claude',
  'opencode',
  'codex',
  'unknown',
] as const;
