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
  private debounceTimer?: ReturnType<typeof setTimeout>;
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
    const liveTerminals = [...vscode.window.terminals];
    if (liveTerminals.length === 0) {
      this.logger.info('Skipping empty terminal snapshot to preserve the last restorable state.');
      return;
    }
    const terminals = await Promise.all(liveTerminals.map(async (terminal) => {
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

  requestCapture(delayMs = 250): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = undefined;
      void this.capture();
    }, Math.max(0, delayMs));
  }

  dispose(): void {
    if (this.timer) clearInterval(this.timer);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.timer = undefined;
    this.debounceTimer = undefined;
  }
}
