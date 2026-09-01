import * as vscode from 'vscode';
import { Logger } from './util/logger';
import { SnapshotStore } from './snapshot/SnapshotStore';
import { SnapshotService } from './snapshot/SnapshotService';
import { createDetector } from './detect';
import { RestoreService } from './restore/RestoreService';
import { ResumeCommands } from './restore/commands';

export function activate(context: vscode.ExtensionContext): void {
  const logger = new Logger();
  context.subscriptions.push(logger);
  try {
    const config = vscode.workspace.getConfiguration('cliResume');
    if (!config.get<boolean>('enabled', true)) {
      logger.info('Extension disabled by configuration.');
      return;
    }
    const interval = config.get<number>('snapshotIntervalSec', 60);
    const store = new SnapshotStore(context.workspaceState, logger);
    // Read the prior run before this activation can write a fresh snapshot.
    const priorSnapshot = store.load();
    const detector = createDetector();
    const snapshotDetector = { detect: async (processId: number | undefined) =>
      processId === undefined ? 'unknown' as const : detector.detect(processId) };
    const snapshots = new SnapshotService(store, logger, snapshotDetector, interval);
    const commands = config.get<Partial<ResumeCommands>>('commands', {});
    const quietMs = config.get<number>('restoreQuietMs', 2_000);
    const restore = new RestoreService(detector, logger, commands, quietMs);
    context.subscriptions.push(snapshots);
    context.subscriptions.push(restore);
    context.subscriptions.push(vscode.window.onDidCloseTerminal(() => { void snapshots.capture(); }));
    void restore.restore(priorSnapshot);
    void snapshots.capture();
    logger.info('CLI RESTORE activated.');
  } catch (error) {
    logger.error('Activation failed', error);
  }
}

export function deactivate(): void { /* disposables are owned by VS Code */ }
