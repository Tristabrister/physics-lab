import * as THREE from "three";

// ═══════════════════════════════════════════════════════════
//  Physics — all real SI units (m, kg, s)
// ═══════════════════════════════════════════════════════════

export const G = 6.6743e-11; // m³ kg⁻¹ s⁻²

export const MASS_SUN = 1.989e30; // kg
export const MASS_EARTH = 5.972e24; // kg
export const MASS_MOON = 7.348e22; // kg
export const MASS_MARS = 6.417e23; // kg

// Perihelion / perigee distances
export const DIST_EARTH_SUN = 1.471e11; // m
export const DIST_EARTH_MOON = 3.626e8; // m
export const DIST_MARS_SUN = 2.067e11; // m

// ── Scaling (1 time-unit = 1 day) ─────────────────────
export const LENGTH_SCALE = 1.496e11; // 1 Astronomical Unit (AU)
export const MASS_SCALE = 1.989e30; //1 Solar Mass
export const TIME_SCALE = 86400; // seconds per day

// ── Semi-major Axes ─────────────────────
export const marssemimajor = 2.279e11 / LENGTH_SCALE; // m
export const earthsemimajor = 1.496e11 / LENGTH_SCALE; // m
export const moonSemiMajor = 3.84399e8 / LENGTH_SCALE; // m

export const RADIUS_SUN = 6.957e8 / LENGTH_SCALE; // m
export const RADIUS_EARTH = 6.371e6 / LENGTH_SCALE; // m
export const RADIUS_MOON = 1.737e6 / LENGTH_SCALE; // m
export const RADIUS_MARS = 3.389e6 / LENGTH_SCALE; // m

export const scaledG =
	(G * TIME_SCALE * TIME_SCALE * MASS_SCALE) /
	(LENGTH_SCALE * LENGTH_SCALE * LENGTH_SCALE);

export const scaledMassSun = MASS_SUN / MASS_SCALE;
export const scaledMassEarth = MASS_EARTH / MASS_SCALE;
export const scaledMassMoon = MASS_MOON / MASS_SCALE;
export const scaledMassMars = MASS_MARS / MASS_SCALE;

export const scaledDistEarthSun = DIST_EARTH_SUN / LENGTH_SCALE;
export const scaledDistEarthMoon = DIST_EARTH_MOON / LENGTH_SCALE;
export const scaledDistMarsSun = DIST_MARS_SUN / LENGTH_SCALE;

// ── Initial conditions ─────────────────────────────────
export const SUN_POSITION = new THREE.Vector3(0, 0, 0);
export const SUN_VELOCITY = new THREE.Vector3(0, 0, 0);
export const SUN_ACCELERATION = new THREE.Vector3(0, 0, 0);
export const SUN_TEMPERATURE = 5778; // K — solar photosphere

// Earth — starts at perihelion with speed from vis‑viva
export const EARTH_POSITION = new THREE.Vector3(DIST_EARTH_SUN, 0, 0);
const _earthSpeed = Math.sqrt(
	G * MASS_SUN * (2 / DIST_EARTH_SUN - 1 / EARTH_SEMI_MAJOR),
);
export const EARTH_VELOCITY = new THREE.Vector3(0, 0, _earthSpeed);
export const EARTH_ACCELERATION = new THREE.Vector3(0, 0, 0);

// Moon — circular orbit around Earth (starting at perigee)
export const MOON_POSITION = EARTH_POSITION.clone().add(
	new THREE.Vector3(DIST_EARTH_MOON, 0, 0),
);
const _moonSpeed = Math.sqrt((G * MASS_EARTH) / DIST_EARTH_MOON);
export const MOON_VELOCITY = EARTH_VELOCITY.clone().add(
	new THREE.Vector3(0, 0, _moonSpeed),
);
export const MOON_ACCELERATION = new THREE.Vector3(0, 0, 0);

// Mars — starts at perihelion with speed from vis‑viva
export const MARS_POSITION = new THREE.Vector3(DIST_MARS_SUN, 0, 0);
const _marsSpeed = Math.sqrt(
	G * MASS_SUN * (2 / DIST_MARS_SUN - 1 / MARS_SEMI_MAJOR),
);
export const MARS_VELOCITY = new THREE.Vector3(0, 0, _marsSpeed);
export const MARS_ACCELERATION = new THREE.Vector3(0, 0, 0);

// ── Simulation knobs ───────────────────────────────────
export const PLAYBACK_SPEED = 1; // sim-days per real second
export const MAX_PHYSICS_STEP = 0.25; // max sim-days per substep
