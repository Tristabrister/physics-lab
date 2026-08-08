// ── Copy this folder as a starting point for a new sim. ──
//   1. Duplicate this folder  →  src/sims/your-sim/
//   2. Register it in main.ts  →  router.register("your-sim", () => import("./sims/your-sim"));
//   3. Add it to the nav tree  →  src/app/sidebar.ts  NAV_TREE
//
// This stub is plain DOM — no rendering library assumed, so a 2D canvas,
// SVG, or any other viz approach is just as valid here as three.js.
//
// For a 3D scene with an orbit camera (scene/camera/optional bloom, WASD
// fly, click-to-follow) see src/kits/three-orbit/ and src/sims/solar-system/
// for a worked example — those pieces are opt-in, not required.

export function mount(_container: HTMLElement) {
	// Create your DOM/canvas/renderer here and append it to `container`.
}

export function frame(_dt: number) {
	// Advance + render one frame. Called every rAF tick regardless of pause —
	// check isPaused() from "../../app/pause" yourself if physics should freeze.
}

export function unmount(_container: HTMLElement) {
	// Tear down everything mount() created (listeners, GPU resources, DOM).
}
