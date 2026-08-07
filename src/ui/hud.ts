/** On-screen keyboard-hint bar pinned to the bottom centre. */
export function createHUD(parent: HTMLElement) {
	const hud = document.createElement("div");
	hud.id = "hud-keys";
	hud.innerHTML = [
		"<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>",
		"<span>fly</span>",
		"<span>·</span>",
		"<kbd>Shift</kbd>",
		"<span>boost</span>",
		"<span>·</span>",
		"<kbd>Space</kbd><kbd>Ctrl</kbd>",
		"<span>up/down</span>",
		"<span>·</span>",
		"<span>scroll zoom</span>",
		"<span>·</span>",
		"<span>drag orbit</span>",
		"<span>·</span>",
		"<span>click body to follow</span>",
		"<span>·</span>",
		"<kbd>P</kbd>",
		"<span>pause</span>",
	].join(" ");
	parent.appendChild(hud);
	return hud;
}

/** "⏸ Paused" badge shown while the simulation is paused. */
export function createPauseBadge(parent: HTMLElement) {
	const badge = document.createElement("div");
	badge.id = "pause-badge";
	badge.textContent = "⏸ Paused";
	badge.style.display = "none";
	parent.appendChild(badge);
	return badge;
}
