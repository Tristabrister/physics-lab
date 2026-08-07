import type * as THREE from "three";
import type { Body } from "../../engine/Body";
import applyGravity from "../../engine/gravity";
import { createPanel } from "../../ui/gui";
import {
	createSun,
	createEarth,
	createMoon,
	createMars,
	temperatureToColor,
} from "./setup";
import {
	G,
	PLAYBACK_SPEED,
	MAX_PHYSICS_STEP,
	SUN_TEMPERATURE,
	RENDER_SCALE,
	SECONDS_PER_DAY,
} from "./constants";

// ── Module-level state ─────────────────────────────────
let sun: Body;
let earth: Body;
let moon: Body;
let mars: Body;
let bodies: Body[];
let sunMaterial: THREE.ShaderMaterial;
let sunLight: THREE.PointLight;

// Per-body min/max heliocentric distance (metres, updated each frame)
const helioRange = new Map<Body, { min: number; max: number }>();

const settings = {
	playbackSpeed: PLAYBACK_SPEED,
	sunTemp: SUN_TEMPERATURE,
};

// ── Public interface ───────────────────────────────────
export function init(scene: THREE.Scene) {
	sun = createSun(scene);
	earth = createEarth(scene);
	moon = createMoon(scene);
	mars = createMars(scene);
	bodies = [sun, earth, moon, mars];
	for (const b of bodies) {
		if (b !== sun) {
			const d = b.position.length();
			helioRange.set(b, { min: d, max: d });
		}
	}
	sunMaterial = sun.mesh.material as THREE.ShaderMaterial;
	sunLight = sun.mesh.userData.sunLight as THREE.PointLight;

	const gui = createPanel("Solar System");
	gui.add(settings, "playbackSpeed", 0.1, 60, 0.1).name("Sim speed (days/s)");
	gui.add(settings, "sunTemp", 2000, 50000, 100).name("Sun Temperature");
}

export function update(dt: number) {
	// Animate the procedural solar surface (real-time, not sim-time)
	sunMaterial.uniforms.uTime.value += dt;

	// Live-update base colour from the temperature slider
	const { r, g, b } = temperatureToColor(settings.sunTemp / 100);
	sunMaterial.uniforms.uBaseColor.value.set(r / 255, g / 255, b / 255);
	sunLight.color.setRGB(r / 255, g / 255, b / 255);

	const simSeconds = dt * settings.playbackSpeed * SECONDS_PER_DAY;
	const nSteps = Math.max(1, Math.ceil(simSeconds / MAX_PHYSICS_STEP));
	const step = simSeconds / nSteps;
	for (let i = 0; i < nSteps; i++) {
		applyGravity(bodies, step, G);
	}

	// Track min/max heliocentric distance per body
	for (const b of bodies) {
		if (b === sun) continue;
		const d = b.position.length();
		const range = helioRange.get(b)!;
		if (d < range.min) range.min = d;
		if (d > range.max) range.max = d;
	}

	// // Display-only: the true Moon–Earth offset (3.6e8 m → 0.036 render-u)
	// // is a fraction of Earth's mesh radius (0.16).  Without scaling the Moon
	// // is invisible inside Earth.  We scale up the offset so it visibly orbits.
	// // Real separation is ~60 Earth radii, but rendering that far would make
	// // the Moon hard to find; 35× (~8 Earth radii) is a workable compromise.
	// // Physics is untouched — moon.position stays at true scale.
	// const MOON_DISPLAY_SCALE = 35;
	// const moonOffset = moon.position.clone().sub(earth.position);
	// moon.mesh.position
	// 	.copy(earth.mesh.position)
	// 	.add(moonOffset.multiplyScalar(RENDER_SCALE * MOON_DISPLAY_SCALE));
}

export function destroy(scene: THREE.Scene) {
	for (const b of bodies) scene.remove(b.mesh);
}

export function getBodyInfo(mesh: THREE.Mesh): Record<string, string> | null {
	const b = bodies.find((b) => b.mesh === mesh);
	if (!b) return null;

	const speedMps = b.velocity.length(); // m/s
	const distM = b.position.length(); // m
	const massKg = b.mass; // kg

	const info: Record<string, string> = { Name: b.name };

	if (b === sun) {
		info.Temperature = `${settings.sunTemp} K`;
		info.Mass = massKg.toExponential(3) + " kg";
		info.Radius = "6.96 × 10⁸ m";
	} else {
		info.Mass = massKg.toExponential(3) + " kg";
		info["Orbital speed"] = `${(speedMps / 1000).toFixed(1)} km/s`;
		info["Heliocentric dist"] = `${(distM / 1000).toExponential(3)} km`;
		const range = helioRange.get(b);
		if (range) {
			info["Heliocentric range"] =
				`${(range.min / 1000).toExponential(3)} – ` +
				`${(range.max / 1000).toExponential(3)} km`;
		}
	}

	return info;
}

export function getBodyList(): { name: string; mesh: THREE.Mesh }[] {
	return bodies.map((b) => ({ name: b.name, mesh: b.mesh }));
}
