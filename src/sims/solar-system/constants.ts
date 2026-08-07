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

// Semi-major axes (used by vis‑viva for initial velocity)
export const EARTH_SEMI_MAJOR = 1.496e11; // m
export const MARS_SEMI_MAJOR = 2.279e11; // m
export const MOON_SEMI_MAJOR = 3.84399e8; // m

// Radii
export const RADIUS_SUN = 6.96e8;
export const RADIUS_EARTH = 6.371e6;
export const RADIUS_MOON = 1.737e6;
export const RADIUS_MARS = 3.389e6;

// ═══════════════════════════════════════════════════════════
//  Rendering — maps physics metres → Three.js scene units
//  1 scene unit = 10¹⁰ m  (Earth orbit ≈ 15 u, Mars ≈ 23 u)
// ═══════════════════════════════════════════════════════════

export const RENDER_SCALE = 1e-10; // multiply real metres → scene units

// ═══════════════════════════════════════════════════════════
//  Time
// ═══════════════════════════════════════════════════════════

export const SECONDS_PER_DAY = 86400;

// Simulation knobs
export const PLAYBACK_SPEED = 10; // sim-days per real second
export const MAX_PHYSICS_STEP = 0.25 * SECONDS_PER_DAY; // max seconds per substep

// ═══════════════════════════════════════════════════════════
//  Initial conditions (real SI)
// ═══════════════════════════════════════════════════════════

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
