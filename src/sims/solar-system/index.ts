import type * as THREE from "three";
import type { Body } from "../../engine/Body";
import { type Controller } from "lil-gui";
import applyGravity from "../../engine/gravity";
import { createPanel } from "../../ui/gui";
import { isPaused, setPaused, onPauseChange } from "../../app/pause";
import {
	createSun,
	createEarth,
	createMoon,
	createMars,
	temperatureToColor,
} from "./setup";
import {
	scaledG,
	PLAYBACK_SPEED,
	MAX_PHYSICS_STEP,
	SUN_TEMPERATURE,
	LENGTH_SCALE,
	MASS_SCALE,
	TIME_SCALE,
} from "./constants";

// ── Module-level state ─────────────────────────────────
let sun: Body;
let earth: Body;
let moon: Body;
let mars: Body;
let bodies: Body[];
let sunMaterial: THREE.ShaderMaterial;
let sunLight: THREE.PointLight;

// Per-body min/max heliocentric distance (scaled units, updated each frame)
const helioRange = new Map<Body, { min: number; max: number }>();

// ── Diagnostics panel (live-updating readouts) ─────────
const diag = {
	// Static — set once
	lenScale: "",
	massScale: "",
	timeScale: "",
	gReal: "",
	gScaled: "",
	visNote: "",
	// Dynamic — updated each frame (Earth as reference)
	earthSimDist: "",
	earthRealDist: "",
	earthSimSpeed: "",
	earthRealSpeed: "",
};
const diagCtrls: Record<string, Controller> = {};

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

	const gui = createPanel("Solar System", 380);
	gui.add(settings, "playbackSpeed", 1, 300, 1).name("Sim speed (days/s)");
	gui.add(settings, "sunTemp", 2000, 50000, 100).name("Sun Temperature");

	// ── Pause / play toggle (synced with the global P key) ──
	const pauseState = { paused: isPaused() };
	const pauseCtrl = gui.add(pauseState, "paused").name("Paused");
	pauseCtrl.onChange((v: boolean) => setPaused(v));
	onPauseChange((p) => {
		pauseState.paused = p;
		pauseCtrl.updateDisplay();
	});

	// ── Diagnostics folder ──────────────────────────
	const dg = gui.addFolder("🔧 Scale Diagnostics");
	dg.domElement.classList.add("diag-folder");
	diag.lenScale = `1 sim-unit = ${(LENGTH_SCALE / 1000).toExponential(1)} km`;
	diag.massScale = `1 sim-unit = ${MASS_SCALE.toExponential(1)} kg`;
	diag.timeScale = `1 sim-unit = 1 day  (${TIME_SCALE} s)`;
	diag.gReal = `G real = 6.6743e-11 m³/(kg·s²)`;
	diag.gScaled = `G scaled = ${scaledG.toExponential(4)} su³/(su·su²)`;
	diag.visNote = "⚠ body mesh radii ~250× true scale for visibility";

	const staticKeys: (keyof typeof diag)[] = [
		"lenScale",
		"massScale",
		"timeScale",
		"gReal",
		"gScaled",
		"visNote",
	];
	for (const k of staticKeys) {
		diagCtrls[k] = dg.add(diag, k).disable();
	}

	// Earth reference (live)
	diagCtrls["earthRealDist"] = dg.add(diag, "earthRealDist").disable();
	diagCtrls["earthSimDist"] = dg.add(diag, "earthSimDist").disable();
	diagCtrls["earthRealSpeed"] = dg.add(diag, "earthRealSpeed").disable();
	diagCtrls["earthSimSpeed"] = dg.add(diag, "earthSimSpeed").disable();
	dg.close();
}

export function update(dt: number) {
	// Animate the procedural solar surface (real-time, not sim-time)
	sunMaterial.uniforms.uTime.value += dt;

	// Live-update base colour from the temperature slider
	const { r, g, b } = temperatureToColor(settings.sunTemp / 100);
	sunMaterial.uniforms.uBaseColor.value.set(r / 255, g / 255, b / 255);
	sunLight.color.setRGB(r / 255, g / 255, b / 255);

	const dtTotal = dt * settings.playbackSpeed;
	const nSteps = Math.max(1, Math.ceil(dtTotal / MAX_PHYSICS_STEP));
	const step = dtTotal / nSteps;
	for (let i = 0; i < nSteps; i++) {
		applyGravity(bodies, step, scaledG);
	}

	// Track min/max heliocentric distance per body
	for (const b of bodies) {
		if (b === sun) continue;
		const d = b.position.length();
		const range = helioRange.get(b)!;
		if (d < range.min) range.min = d;
		if (d > range.max) range.max = d;
	}

	// Refresh Earth diagnostics
	const ed = earth.position.length();
	const ev = earth.velocity.length();
	diag.earthSimDist = `Sim distance  = ${ed.toFixed(4)} su`;
	diag.earthRealDist = `Real distance = ${((ed * LENGTH_SCALE) / 1000).toExponential(4)} km`;
	diag.earthSimSpeed = `Sim speed  = ${ev.toExponential(4)} su/day`;
	diag.earthRealSpeed = `Real speed = ${((ev * LENGTH_SCALE) / TIME_SCALE / 1000).toFixed(3)} km/s`;
	for (const k of [
		"earthSimDist",
		"earthRealDist",
		"earthSimSpeed",
		"earthRealSpeed",
	]) {
		diagCtrls[k]?.updateDisplay();
	}

	// Display-only: the Moon's true orbit (0.0384 u) sits inside Earth's
	// mesh (0.22 u) at system scale.  Gently nudge the displayed offset
	// just enough so the Moon visibly circles outside Earth.  Physics is
	// untouched — moon.position stays at true scale.
	// const MOON_DISPLAY_SCALE = 12;
	// moon.mesh.position
	// 	.copy(earth.position)
	// 	.add(
	// 		moon.position
	// 			.clone()
	// 			.sub(earth.position)
	// 			.multiplyScalar(MOON_DISPLAY_SCALE),
	// 	);
}

export function destroy(scene: THREE.Scene) {
	for (const b of bodies) scene.remove(b.mesh);
}

export function getBodyInfo(mesh: THREE.Mesh): Record<string, string> | null {
	const b = bodies.find((b) => b.mesh === mesh);
	if (!b) return null;

	const speedMps = b.velocity.length() * (LENGTH_SCALE / TIME_SCALE);
	const distM = b.position.length() * LENGTH_SCALE;
	const massKg = b.mass * MASS_SCALE;

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
				`${((range.min * LENGTH_SCALE) / 1000).toExponential(3)} – ` +
				`${((range.max * LENGTH_SCALE) / 1000).toExponential(3)} km`;
		}
	}

	return info;
}

export function getBodyList(): { name: string; mesh: THREE.Mesh }[] {
	return bodies.map((b) => ({ name: b.name, mesh: b.mesh }));
}
