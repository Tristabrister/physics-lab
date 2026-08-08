import type * as THREE from "three";
import type { Body } from "../../engine/Body";
import type { Controller, GUI } from "lil-gui";
import applyGravity from "../../engine/gravity";
import { createPanel } from "../../ui/gui";
import { isPaused, setPaused, onPauseChange } from "../../app/pause";
import {
	createSun,
	createMercury,
	createVenus,
	createEarth,
	createMoon,
	createMars,
	createJupiter,
	createSaturn,
	createUranus,
	createNeptune,
	temperatureToColor,
	SUN_LIGHT_INTENSITY,
} from "./setup";
import {
	G,
	AU,
	SECONDS_PER_DAY,
	MAX_STEP_SECONDS,
	PLAYBACK_SPEED,
	SUN_TEMPERATURE,
	RADIUS_SUN,
	RADIUS_MERCURY,
	RADIUS_VENUS,
	RADIUS_EARTH,
	RADIUS_MOON,
	RADIUS_MARS,
	RADIUS_JUPITER,
	RADIUS_SATURN,
	RADIUS_URANUS,
	RADIUS_NEPTUNE,
	SPIN_SUN,
	SPIN_MERCURY,
	SPIN_VENUS,
	SPIN_EARTH,
	SPIN_MOON,
	SPIN_MARS,
	SPIN_JUPITER,
	SPIN_SATURN,
	SPIN_URANUS,
	SPIN_NEPTUNE,
} from "./constants";

// ── Module-level state ─────────────────────────────────
let sun: Body;
let earth: Body;
let bodies: Body[];
let sunMaterial: THREE.ShaderMaterial;
let sunLight: THREE.PointLight;
let gui: GUI;
let unsubscribePause: () => void;
let elapsedDays = 0;

// Sidereal spin, radians per sim-second
let spins: { body: Body; rate: number }[] = [];

const RADII_M: Record<string, number> = {
	Sun: RADIUS_SUN,
	Mercury: RADIUS_MERCURY,
	Venus: RADIUS_VENUS,
	Earth: RADIUS_EARTH,
	Moon: RADIUS_MOON,
	Mars: RADIUS_MARS,
	Jupiter: RADIUS_JUPITER,
	Saturn: RADIUS_SATURN,
	Uranus: RADIUS_URANUS,
	Neptune: RADIUS_NEPTUNE,
};

// Per-body min/max heliocentric distance (metres, updated each frame)
const helioRange = new Map<Body, { min: number; max: number }>();

const settings = {
	playbackSpeed: PLAYBACK_SPEED,
	sunTemp: SUN_TEMPERATURE,
};

// Sim speed is set via a log-scale slider — linear sliders can't cover
// both "watch Earth spin" (needs ~0.02 days/s) and "watch Earth orbit"
// (needs ~50+ days/s) usefully in one range.
const speedControl = { logSpeed: Math.log10(PLAYBACK_SPEED) };
const SPEED_LOG_MIN = -2; // 0.01 days/s — a full Earth day takes 100s
const SPEED_LOG_MAX = 2.3; // ~200 days/s — Mars' year in ~3.4s
let speedReadoutCtrl: Controller;

function formatSpeed(daysPerSec: number) {
	const unit = daysPerSec < 1 ? "day" : "days";
	return `${daysPerSec < 0.1 ? daysPerSec.toFixed(3) : daysPerSec < 10 ? daysPerSec.toFixed(2) : daysPerSec.toFixed(0)} ${unit}/s`;
}

function onSpeedChange(logValue: number) {
	settings.playbackSpeed = Math.pow(10, logValue);
	if (speedReadoutCtrl) {
		(speedReadoutCtrl.object as { display: string }).display = formatSpeed(
			settings.playbackSpeed,
		);
		speedReadoutCtrl.updateDisplay();
	}
}

// ── Diagnostics panel (live-updating readouts) ─────────
const diag = {
	units: "",
	physics: "",
	elapsed: "",
	earthDist: "",
	earthSpeed: "",
};
const diagCtrls: Record<string, Controller> = {};

function applySunColor() {
	const { r, g, b } = temperatureToColor(settings.sunTemp / 100);
	sunMaterial.uniforms.uBaseColor.value.set(r / 255, g / 255, b / 255);
	sunLight.color.setRGB(r / 255, g / 255, b / 255);
}

// ── Public interface ───────────────────────────────────
export function init(scene: THREE.Scene) {
	sun = createSun(scene);
	const mercury = createMercury(scene);
	const venus = createVenus(scene);
	earth = createEarth(scene);
	const moon = createMoon(scene);
	const mars = createMars(scene);
	const jupiter = createJupiter(scene);
	const saturn = createSaturn(scene);
	const uranus = createUranus(scene);
	const neptune = createNeptune(scene);

	bodies = [
		sun,
		mercury,
		venus,
		earth,
		moon,
		mars,
		jupiter,
		saturn,
		uranus,
		neptune,
	];

	elapsedDays = 0;
	helioRange.clear();
	for (const b of bodies) {
		if (b === sun) continue;
		const d = b.position.length();
		helioRange.set(b, { min: d, max: d });
	}

	const TWO_PI = 2 * Math.PI;
	spins = [
		{ body: sun, rate: TWO_PI / SPIN_SUN },
		{ body: mercury, rate: TWO_PI / SPIN_MERCURY },
		{ body: venus, rate: TWO_PI / SPIN_VENUS },
		{ body: earth, rate: TWO_PI / SPIN_EARTH },
		{ body: moon, rate: TWO_PI / SPIN_MOON },
		{ body: mars, rate: TWO_PI / SPIN_MARS },
		{ body: jupiter, rate: TWO_PI / SPIN_JUPITER },
		{ body: saturn, rate: TWO_PI / SPIN_SATURN },
		{ body: uranus, rate: TWO_PI / SPIN_URANUS },
		{ body: neptune, rate: TWO_PI / SPIN_NEPTUNE },
	];

	sunMaterial = sun.mesh.material as THREE.ShaderMaterial;
	sunLight = sun.mesh.userData.sunLight as THREE.PointLight;
	applySunColor();

	gui = createPanel("Solar System", 380);
	gui
		.add(speedControl, "logSpeed", SPEED_LOG_MIN, SPEED_LOG_MAX, 0.01)
		.name("Sim speed")
		.onChange(onSpeedChange);
	const speedReadout = { display: "" };
	speedReadoutCtrl = gui.add(speedReadout, "display").name("→").disable();
	onSpeedChange(speedControl.logSpeed); // initialise readout + settings
	gui
		.add(settings, "sunTemp", 2000, 40000, 100)
		.name("Sun temperature (K)")
		.onChange(applySunColor);

	// ── Pause / play toggle (synced with the global P key) ──
	const pauseState = { paused: isPaused() };
	const pauseCtrl = gui.add(pauseState, "paused").name("Paused");
	pauseCtrl.onChange((v: boolean) => setPaused(v));
	unsubscribePause = onPauseChange((p) => {
		pauseState.paused = p;
		pauseCtrl.updateDisplay();
	});

	// ── Diagnostics folder ──────────────────────────
	const dg = gui.addFolder("🔧 Diagnostics");
	dg.domElement.classList.add("diag-folder");
	diag.units = `1 render unit = 1 AU = ${(AU / 1000).toExponential(3)} km — true scale`;
	diag.physics = `Real SI · semi-implicit Euler · substep ≤ ${MAX_STEP_SECONDS / 3600} h`;
	for (const k of Object.keys(diag) as (keyof typeof diag)[]) {
		diagCtrls[k] = dg.add(diag, k).disable();
	}
	dg.close();
}

export function update(dt: number) {
	// Animate the procedural solar surface (real-time, not sim-time)
	sunMaterial.uniforms.uTime.value += dt;

	const simSeconds = dt * settings.playbackSpeed * SECONDS_PER_DAY;
	if (simSeconds > 0) {
		const nSteps = Math.ceil(simSeconds / MAX_STEP_SECONDS);
		const step = simSeconds / nSteps;
		for (let i = 0; i < nSteps; i++) {
			applyGravity(bodies, step, G);
		}
		elapsedDays += simSeconds / SECONDS_PER_DAY;

		for (const { body, rate } of spins) {
			body.mesh.rotation.y += rate * simSeconds;
		}

		// Track min/max heliocentric distance per body
		for (const b of bodies) {
			if (b === sun) continue;
			const d = b.position.length();
			const range = helioRange.get(b)!;
			if (d < range.min) range.min = d;
			if (d > range.max) range.max = d;
		}
	}

	// Live Earth diagnostics (sanity anchors: ~1 AU, ~30 km/s)
	const ed = earth.position.length();
	const ev = earth.velocity.length();
	diag.elapsed = `Elapsed: ${elapsedDays.toFixed(1)} sim-days`;
	diag.earthDist = `Earth–Sun: ${(ed / AU).toFixed(4)} AU  (${(ed / 1000).toExponential(4)} km)`;
	diag.earthSpeed = `Earth speed: ${(ev / 1000).toFixed(2)} km/s`;
	for (const k of ["elapsed", "earthDist", "earthSpeed"]) {
		diagCtrls[k]?.updateDisplay();
	}
}

export function destroy(scene: THREE.Scene) {
	// The sun's light is a child of its mesh, so this removes it too.
	for (const b of bodies) scene.remove(b.mesh);
	gui.destroy();
	unsubscribePause();
}

export function getBodyInfo(mesh: THREE.Mesh): Record<string, string> | null {
	const b = bodies.find((b) => b.mesh === mesh);
	if (!b) return null;

	const info: Record<string, string> = { Name: b.name };
	info.Mass = b.mass.toExponential(3) + " kg";
	const radius = RADII_M[b.name];
	if (radius) info.Radius = `${(radius / 1000).toLocaleString()} km`;

	if (b === sun) {
		info.Temperature = `${settings.sunTemp} K`;
	} else {
		info["Orbital speed"] = `${(b.velocity.length() / 1000).toFixed(1)} km/s`;
		info["Heliocentric dist"] = `${(b.position.length() / AU).toFixed(4)} AU`;
		const range = helioRange.get(b);
		if (range) {
			info["Observed range"] =
				`${(range.min / AU).toFixed(4)} – ${(range.max / AU).toFixed(4)} AU`;
		}
	}

	return info;
}

export function getBodyList(): { name: string; mesh: THREE.Mesh }[] {
	return bodies.map((b) => ({ name: b.name, mesh: b.mesh }));
}

/**
 * Scale the sun's actual PointLight intensity — not camera exposure — so
 * only lit bodies are affected. The sun's own disc is a self-illuminated
 * ShaderMaterial that ignores scene lights entirely, so it's untouched
 * regardless of what factor is passed here (crucial: a global exposure
 * multiplier was tried first and blew out/blacked out the sun itself
 * depending on what was followed).
 */
export function setLightBoost(factor: number) {
	if (sunLight) sunLight.intensity = SUN_LIGHT_INTENSITY * factor;
}
