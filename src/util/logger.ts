import * as vscode from 'vscode';

export class Logger implements vscode.Disposable {
  private readonly channel = vscode.window.createOutputChannel('cli-resume');

  info(message: string): void { this.channel.appendLine(`[info] ${message}`); }
  warn(message: string): void { this.channel.appendLine(`[warn] ${message}`); }
  error(message: string, error?: unknown): void {
    const detail = error instanceof Error ? `: ${error.stack ?? error.message}` : error ? `: ${String(error)}` : '';
    this.channel.appendLine(`[error] ${message}${detail}`);
  }

  dispose(): void { this.channel.dispose(); }
}
