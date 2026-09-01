import * as vscode from 'vscode';
import { Logger } from '../util/logger';
import { CliType, Snapshot } from './model';
import { SnapshotStore } from './SnapshotStore';

export interface CliDetector {
  detect(processId: number | undefined): Promise<CliType>;
}

const unknownDetector: CliDetector = { async detect(): Promise<CliType> { return 'unknown'; } };

function cwdOf(terminal: vscode.Terminal): string {
  const options = terminal.creationOptions;
  const configured = 'cwd' in options ? options.cwd : undefined;
  if (typeof configured === 'string') return configured;
  if (configured instanceof vscode.Uri) return configured.fsPath;
  const integrated = terminal.shellIntegration?.cwd;
  return integrated?.fsPath ?? '';
}

export class SnapshotService implements vscode.Disposable {
  private timer?: ReturnType<typeof setInterval>;
  private readonly detector: CliDetector;

  constructor(
    private readonly store: SnapshotStore,
    private readonly logger: Logger,
    detector?: CliDetector,
    intervalSeconds = 60,
  ) {
    this.detector = detector ?? unknownDetector;
    this.timer = setInterval(() => { void this.capture(); }, Math.max(5, intervalSeconds) * 1000);
  }

  async capture(): Promise<void> {
    const terminals = await Promise.all(vscode.window.terminals.map(async (terminal) => {
      try {
        const cli = await this.detector.detect(await terminal.processId);
        return { name: terminal.name, cwd: cwdOf(terminal), cli };
      } catch (error) {
        this.logger.warn(`Could not inspect terminal "${terminal.name}": ${String(error)}`);
        return { name: terminal.name, cwd: cwdOf(terminal), cli: 'unknown' as const };
      }
    }));
    const snapshot: Snapshot = { schemaVersion: 1, capturedAt: new Date().toISOString(), terminals };
    try {
      await this.store.save(snapshot);
      this.logger.info(`Captured ${terminals.length} terminal(s).`);
    } catch (error) {
      this.logger.error('Failed to persist terminal snapshot', error);
    }
  }

  dispose(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }
}
