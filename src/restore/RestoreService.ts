import * as vscode from 'vscode';
import { Detector } from '../detect';
import { CliType, Snapshot } from '../snapshot/model';
import { Logger } from '../util/logger';
import { delay, waitFor } from '../util/timing';
import { resumeCommand, ResumeCommands } from './commands';
import { matchTerminals, RestoredTerminal } from './matcher';

const MAX_LAYOUT_WAIT_MS = 15_000;
const SHELL_READY_WAIT_MS = 5_000;

function cwdOf(terminal: vscode.Terminal): string {
  const options = terminal.creationOptions;
  const configured = 'cwd' in options ? options.cwd : undefined;
  if (typeof configured === 'string') return configured;
  if (configured instanceof vscode.Uri) return configured.fsPath;
  return terminal.shellIntegration?.cwd?.fsPath ?? '';
}

interface LiveTerminal extends RestoredTerminal {
  readonly terminal: vscode.Terminal;
}

export class RestoreService implements vscode.Disposable {
  private disposed = false;

  constructor(
    private readonly detector: Detector,
    private readonly logger: Logger,
    private readonly commands: Partial<ResumeCommands> = {},
    private readonly quietMs = 2_000,
  ) {}

  async restore(snapshot: Snapshot | undefined): Promise<void> {
    if (!snapshot?.terminals.length) {
      this.logger.info('No terminal snapshot to restore.');
      return;
    }

    await this.waitForLayoutQuiet();
    if (this.disposed) return;

    const terminals: LiveTerminal[] = vscode.window.terminals.map((terminal) => ({
      name: terminal.name,
      cwd: cwdOf(terminal),
      terminal,
    }));
    const matches = matchTerminals(snapshot.terminals, terminals);
    this.logger.info(`Matched ${matches.length} of ${snapshot.terminals.length} terminal snapshot(s).`);
    for (const match of matches) {
      this.logger.info(`Match: "${match.snapshot.name}" (${match.snapshot.cwd}) -> "${match.terminal.name}" (${match.terminal.cwd}), CLI=${match.snapshot.cli}.`);
    }

    await Promise.all(matches.map(async (match) => {
      if (!this.disposed) await this.restoreTerminal(match.terminal.terminal, match.snapshot.cli);
    }));
  }

  dispose(): void { this.disposed = true; }

  private async waitForLayoutQuiet(): Promise<void> {
    const quietMs = Math.max(0, this.quietMs);
    if (!quietMs) return;
    let lastOpenedAt = Date.now();
    const subscription = vscode.window.onDidOpenTerminal(() => { lastOpenedAt = Date.now(); });
    try {
      const deadline = Date.now() + MAX_LAYOUT_WAIT_MS;
      while (!this.disposed) {
        const elapsed = Date.now() - lastOpenedAt;
        if (elapsed >= quietMs || Date.now() >= deadline) return;
        await delay(Math.min(quietMs - elapsed, deadline - Date.now()));
      }
    } finally {
      subscription.dispose();
    }
  }

  private async restoreTerminal(terminal: vscode.Terminal, expectedCli: CliType): Promise<void> {
    const command = resumeCommand(expectedCli, this.commands);
    if (!command) {
      this.logger.info(`Skipping terminal "${terminal.name}": no resumable CLI was recorded.`);
      return;
    }
    try {
      const existing = await this.detect(terminal);
      if (existing !== 'unknown') {
        this.logger.warn(`Skipping terminal "${terminal.name}": ${existing} is already running.`);
        return;
      }
      const processId = await waitFor(async () => terminal.processId, SHELL_READY_WAIT_MS);
      if (processId === undefined) {
        this.logger.warn(`Skipping terminal "${terminal.name}": shell did not become ready in time.`);
        return;
      }
      terminal.sendText(command, true);
      this.logger.info(`Sent restore command to terminal "${terminal.name}".`);
    } catch (error) {
      this.logger.warn(`Could not restore terminal "${terminal.name}": ${String(error)}`);
    }
  }

  private async detect(terminal: vscode.Terminal): Promise<CliType> {
    const processId = await terminal.processId;
    return processId === undefined ? 'unknown' : this.detector.detect(processId);
  }
}
