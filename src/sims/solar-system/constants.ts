import * as THREE from "three";

// ═══════════════════════════════════════════════════════════
//  Unit system
//  • Physics runs in real SI units: metres, kilograms, seconds.
//  • Rendering converts once: 1 render unit = 1 AU (RENDER_SCALE).
//  Everything on screen is true scale — sizes, distances, light
//  falloff — like NASA Eyes. Never mix the two spaces.
// ═══════════════════════════════════════════════════════════

export const G = 6.6743e-11; // m³ kg⁻¹ s⁻²
export const AU = 1.496e11; // m
export const SECONDS_PER_DAY = 86400;

/** Multiply metres by this to get render units (1 render unit = 1 AU). */
export const RENDER_SCALE = 1 / AU;

// ── Masses (kg) ────────────────────────────────────────
export const MASS_SUN = 1.989e30;
export const MASS_EARTH = 5.972e24;
export const MASS_MOON = 7.348e22;
export const MASS_MARS = 6.417e23;

// ── Radii (m) ──────────────────────────────────────────
export const RADIUS_SUN = 6.957e8;
export const RADIUS_EARTH = 6.371e6;
export const RADIUS_MOON = 1.737e6;
export const RADIUS_MARS = 3.389e6;

// ── Orbit geometry (m) ─────────────────────────────────
// Perihelion / perigee — the bodies start here.
export const DIST_EARTH_SUN = 1.471e11;
export const DIST_EARTH_MOON = 3.626e8;
export const DIST_MARS_SUN = 2.067e11;

export const EARTH_SEMI_MAJOR = 1.496e11;
export const MARS_SEMI_MAJOR = 2.279e11;
export const MOON_SEMI_MAJOR = 3.84399e8;

// ── Rotation (sidereal period in s, axial tilt in rad) ─
export const SPIN_SUN = 25.38 * SECONDS_PER_DAY;
export const SPIN_EARTH = 86164;
export const SPIN_MOON = 27.322 * SECONDS_PER_DAY; // tidally locked
export const SPIN_MARS = 88643;

export const TILT_EARTH = THREE.MathUtils.degToRad(23.44);
export const TILT_MARS = THREE.MathUtils.degToRad(25.19);

export const SUN_TEMPERATURE = 5778; // K — solar photosphere

// ── Initial conditions ─────────────────────────────────
// Bodies start at perihelion on +X. Velocity along −Z makes the
// orbits counterclockwise seen from +Y (north), as in reality.
// Speeds come from vis-viva: v² = GM (2/r − 1/a).

const visViva = (M: number, r: number, a: number) =>
	Math.sqrt(G * M * (2 / r - 1 / a));

export const SUN_POSITION = new THREE.Vector3(0, 0, 0);
export const SUN_VELOCITY = new THREE.Vector3(0, 0, 0);

export const EARTH_POSITION = new THREE.Vector3(DIST_EARTH_SUN, 0, 0);
export const EARTH_VELOCITY = new THREE.Vector3(
	0,
	0,
	-visViva(MASS_SUN, DIST_EARTH_SUN, EARTH_SEMI_MAJOR),
);

export const MOON_POSITION = EARTH_POSITION.clone().add(
	new THREE.Vector3(DIST_EARTH_MOON, 0, 0),
);
export const MOON_VELOCITY = EARTH_VELOCITY.clone().add(
	new THREE.Vector3(
		0,
		0,
		-visViva(MASS_EARTH, DIST_EARTH_MOON, MOON_SEMI_MAJOR),
	),
);

export const MARS_POSITION = new THREE.Vector3(DIST_MARS_SUN, 0, 0);
export const MARS_VELOCITY = new THREE.Vector3(
	0,
	0,
	-visViva(MASS_SUN, DIST_MARS_SUN, MARS_SEMI_MAJOR),
);

// ── Simulation knobs ───────────────────────────────────
export const PLAYBACK_SPEED = 1; // sim-days per real second
export const MAX_STEP_SECONDS = 0.1 * SECONDS_PER_DAY; // physics substep cap
