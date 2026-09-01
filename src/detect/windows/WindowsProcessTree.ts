import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { CliType } from '../CliType';
import type { Detector } from '../Detector';

const execFileAsync = promisify(execFile);
const CACHE_TTL_MS = 30_000;
const QUERY_TIMEOUT_MS = 3_000;

export interface ProcessRecord {
  name?: string;
  commandLine?: string;
  parentProcessId?: number;
  processId?: number;
}

interface CachedResult {
  value: CliType;
  expiresAt: number;
}

/** Pure process-name/command-line classification, exported for unit tests. */
export function classifyProcess(name = '', commandLine = ''): CliType {
  const executable = name.toLowerCase().replace(/\.exe$/, '');
  const command = commandLine.toLowerCase();

  // This is an internal Codex helper, not the user-facing CLI.
  if (executable === 'codex-code-mode-host') return 'unknown';
  if (executable === 'claude' || executable === 'opencode' || executable === 'codex') {
    return executable;
  }
  if (executable === 'node') {
    if (/codex(?:[\\/]|\.js\b|\s)/i.test(command)) return 'codex';
    if (/claude(?:[\\/]|\.js\b|\s)/i.test(command)) return 'claude';
    if (/opencode(?:[\\/]|\.js\b|\s)/i.test(command)) return 'opencode';
  }
  return 'unknown';
}

/** Finds the first recognized CLI in a process tree (depth-first, max depth 3). */
export function classifyProcessTree(rootPid: number, records: ProcessRecord[], maxDepth = 3): CliType {
  const children = new Map<number, ProcessRecord[]>();
  for (const record of records) {
    if (typeof record.parentProcessId !== 'number') continue;
    const list = children.get(record.parentProcessId) ?? [];
    list.push(record);
    children.set(record.parentProcessId, list);
  }

  const visit = (pid: number, depth: number): CliType => {
    if (depth > maxDepth) return 'unknown';
    for (const child of children.get(pid) ?? []) {
      const found = classifyProcess(child.name, child.commandLine);
      if (found !== 'unknown') return found;
      const nested = typeof child.processId === 'number' ? visit(child.processId, depth + 1) : 'unknown';
      if (nested !== 'unknown') return nested;
    }
    return 'unknown';
  };
  return visit(rootPid, 1);
}

/** Windows implementation using Get-CimInstance Win32_Process. */
export class WindowsProcessTree implements Detector {
  private readonly cache = new Map<number, CachedResult>();

  async detect(pid: number): Promise<CliType> {
    if (!Number.isInteger(pid) || pid <= 0) return 'unknown';
    const cached = this.cache.get(pid);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    let result: CliType = 'unknown';
    try {
      const { stdout } = await execFileAsync('powershell.exe', [
        '-NoProfile', '-NonInteractive', '-Command', this.queryScript(pid),
      ], { timeout: QUERY_TIMEOUT_MS, windowsHide: true, maxBuffer: 1024 * 1024 });
      const parsed = JSON.parse(stdout.trim() || '[]');
      const records: ProcessRecord[] = Array.isArray(parsed) ? parsed : [parsed];
      result = classifyProcessTree(pid, records);
    } catch {
      result = 'unknown';
    }
    this.cache.set(pid, { value: result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  }

  private queryScript(pid: number): string {
    // PID is validated as an integer before this method is called.
    return `$p=Get-CimInstance Win32_Process; $root=${pid}; $front=@($root); $out=@(); for($d=0;$d -lt 3 -and $front.Count -gt 0;$d++){ $kids=@($p | Where-Object { $front -contains $_.ParentProcessId }); if($kids.Count -eq 0){break}; $out += $kids | Select-Object Name,CommandLine,ParentProcessId,ProcessId; $front=@($kids | ForEach-Object ProcessId) }; $out | ConvertTo-Json -Compress`;
  }
}
