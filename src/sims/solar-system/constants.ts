import * as THREE from "three";

// ── Real constants ─────────────────────────────────────
export const G = 6.6743e-11; // m³ kg⁻¹ s⁻²

export const MASS_SUN = 1.989e30; // kg
export const MASS_EARTH = 5.972e24; // kg
export const MASS_MOON = 7.348e22; // kg
export const MASS_MARS = 6.417e23; // kg

// Perihelion/perigree Distance
export const DIST_EARTH_SUN = 1.471e11; // m
export const DIST_EARTH_MOON = 3.626e8; //   m
export const DIST_MARS_SUN = 2.067e11; // m

// ── Scaling (1 time-unit = 1 day) ─────────────────────
export const LENGTH_SCALE = 1e10;
export const MASS_SCALE = 1e21;
export const TIME_SCALE = 86400; // seconds per day

// ── Semi-major Axes ─────────────────────
export const marssemimajor = 2.279e11 / LENGTH_SCALE; // m
export const earthsemimajor = 1.496e11 / LENGTH_SCALE; // m
export const moonSemiMajor = 3.84399e8 / LENGTH_SCALE; // m

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

// Earth
export const EARTH_POSITION = new THREE.Vector3(scaledDistEarthSun, 0, 0);
const earthSpeed = Math.sqrt(
	scaledG * scaledMassSun * (2 / scaledDistEarthSun - 1 / earthsemimajor),
);
export const EARTH_VELOCITY = new THREE.Vector3(0, 0, earthSpeed);
export const EARTH_ACCELERATION = new THREE.Vector3(0, 0, 0);

// Moon
export const MOON_POSITION = EARTH_POSITION.clone().add(
	new THREE.Vector3(scaledDistEarthMoon, 0, 0),
);
const moonSpeed = Math.sqrt((scaledG * scaledMassEarth) / scaledDistEarthMoon);
export const MOON_VELOCITY = EARTH_VELOCITY.clone().add(
	new THREE.Vector3(0, 0, moonSpeed),
);
export const MOON_ACCELERATION = new THREE.Vector3(0, 0, 0);

// Mars
export const MARS_POSITION = new THREE.Vector3(scaledDistMarsSun, 0, 0);

const marsSpeed = Math.sqrt(
	scaledG * scaledMassSun * (2 / scaledDistMarsSun - 1 / marssemimajor),
);
export const MARS_VELOCITY = new THREE.Vector3(0, 0, marsSpeed);
export const MARS_ACCELERATION = new THREE.Vector3(0, 0, 0);

// ── Simulation knobs ───────────────────────────────────
export const PLAYBACK_SPEED = 10; // sim-days per real second
export const MAX_PHYSICS_STEP = 0.25; // max sim-days per substep
