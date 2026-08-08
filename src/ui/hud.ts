import "./hud.css";

export interface Hint {
	keys?: string[];
	label: string;
}

/** Keyboard/mouse hint bar pinned to the bottom centre. Content is caller-supplied —
 * a sim lists whatever controls it actually has. */
export function createHintBar(parent: HTMLElement, hints: Hint[]) {
	const bar = document.createElement("div");
	bar.id = "hud-keys";
	bar.innerHTML = hints
		.map((h) => (h.keys ?? []).map((k) => `<kbd>${k}</kbd>`).join("") + `<span>${h.label}</span>`)
		.join("<span>·</span>");
	parent.appendChild(bar);
	return bar;
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
