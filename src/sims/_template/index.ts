import type * as THREE from "three";
import type { Body } from "../../engine/Body";

// ── Copy this folder as a starting point for a new sim. ──
//   1. Duplicate this folder  →  src/sims/your-sim/
//   2. Register it in main.ts  →  router.register("your-sim", () => import("./sims/your-sim"));
//   3. Add it to the nav tree  →  src/app/sidebar.ts  NAV_TREE
//
// Optional (add these if your sim has clickable / focusable bodies):
//   export function getBodyInfo(mesh: THREE.Mesh): Record<string, string> | null { ... }
//   export function getBodyList(): { name: string; mesh: THREE.Mesh }[] { ... }

let bodies: Body[] = [];

export function init(_scene: THREE.Scene) {
	// Create bodies, meshes, GUI controls here; push to bodies[]
}

export function update(_dt: number) {
	// Advance the simulation by dt (real-time seconds)
}

export function destroy(scene: THREE.Scene) {
	// Remove ONLY what this sim added (NOT scene.clear() — that would wipe
	// the shared starfield / lighting / bloom).
	for (const b of bodies) scene.remove(b.mesh);
	bodies = [];
}
