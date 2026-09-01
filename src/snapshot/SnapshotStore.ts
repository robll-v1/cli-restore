import * as vscode from 'vscode';
import { Logger } from '../util/logger';
import { isSnapshot, Snapshot } from './model';

const STORAGE_KEY = 'cliResume.snapshot';

export class SnapshotStore {
  constructor(private readonly state: vscode.Memento, private readonly logger: Logger) {}

  async save(snapshot: Snapshot): Promise<void> {
    await this.state.update(STORAGE_KEY, JSON.stringify(snapshot));
  }

  load(): Snapshot | undefined {
    const raw = this.state.get<unknown>(STORAGE_KEY);
    if (raw === undefined) return undefined;
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!isSnapshot(parsed)) {
        this.logger.warn('Ignoring snapshot with an unsupported schema.');
        return undefined;
      }
      return parsed;
    } catch (error) {
      this.logger.warn(`Ignoring corrupted snapshot: ${String(error)}`);
      return undefined;
    }
  }
}
