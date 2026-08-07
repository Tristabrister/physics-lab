// ── Global pause state (shared across the shell and sims) ──
let paused = false;
const listeners = new Set<(paused: boolean) => void>();

export function isPaused() {
	return paused;
}

export function setPaused(v: boolean) {
	if (paused === v) return;
	paused = v;
	for (const l of listeners) l(paused);
}

export function togglePaused() {
	setPaused(!paused);
	return paused;
}

/** Subscribe to pause changes; returns an unsubscribe fn. */
export function onPauseChange(fn: (paused: boolean) => void) {
	listeners.add(fn);
	return () => listeners.delete(fn);
}
