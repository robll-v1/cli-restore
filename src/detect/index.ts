import type { CliType } from './CliType';
import type { Detector } from './Detector';
import { WindowsProcessTree } from './windows/WindowsProcessTree';

class UnknownDetector implements Detector {
  async detect(_pid: number): Promise<CliType> {
    return 'unknown';
  }
}

/** Selects the process-tree adapter supported by the current platform. */
export function createDetector(platform = process.platform): Detector {
  return platform === 'win32' ? new WindowsProcessTree() : new UnknownDetector();
}

export type { CliType } from './CliType';
export type { Detector } from './Detector';
export { WindowsProcessTree, classifyProcess, classifyProcessTree } from './windows/WindowsProcessTree';
