export function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, milliseconds)));
}

/** Polls until a value becomes available, with a finite upper bound. */
export async function waitFor<T>(
  action: () => Promise<T | undefined> | T | undefined,
  timeoutMs: number,
  intervalMs = 100,
): Promise<T | undefined> {
  const deadline = Date.now() + Math.max(0, timeoutMs);
  while (true) {
    const value = await action();
    if (value !== undefined) return value;
    const remaining = deadline - Date.now();
    if (remaining <= 0) return undefined;
    await delay(Math.min(intervalMs, remaining));
  }
}
