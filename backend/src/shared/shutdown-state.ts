let shuttingDown = false;

export function markShuttingDown(): void {
  shuttingDown = true;
}

export function isShuttingDown(): boolean {
  return shuttingDown;
}

/** Vitest only — module state must not leak between tests. */
export function resetShutdownStateForTests(): void {
  shuttingDown = false;
}
