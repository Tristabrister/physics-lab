/** On-screen keyboard-hint bar pinned to the bottom centre. */
export function createHUD(parent: HTMLElement) {
	const hud = document.createElement("div");
	hud.id = "hud-keys";
	hud.innerHTML = [
		"<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>",
		"<span>fly &nbsp;·&nbsp;</span>",
		"<kbd>Shift</kbd>",
		"<span>boost &nbsp;·&nbsp;</span>",
		"<kbd>Space</kbd><kbd>Ctrl</kbd>",
		"<span>up/down &nbsp;·&nbsp; scroll zoom &nbsp;·&nbsp; drag orbit</span>",
	].join(" ");
	parent.appendChild(hud);
	return hud;
}
