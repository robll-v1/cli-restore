import { CliType } from '../snapshot/model';

export type ResumeCommands = Readonly<Record<Exclude<CliType, 'unknown'>, string>>;

export const DEFAULT_RESUME_COMMANDS: ResumeCommands = {
  claude: 'claude -c',
  opencode: 'opencode -c',
  codex: 'codex resume --last',
};

export function resumeCommand(cli: CliType, overrides: Partial<ResumeCommands> = {}): string | undefined {
  if (cli === 'unknown') return undefined;
  const command = overrides[cli] ?? DEFAULT_RESUME_COMMANDS[cli];
  return command.trim() || undefined;
}
