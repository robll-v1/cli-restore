import type { CliType } from './CliType';

/** Resolves the CLI running below a terminal's process id. */
export interface Detector {
  detect(pid: number): Promise<CliType>;
}
