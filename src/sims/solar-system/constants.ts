import * as THREE from "three";

// ── Real constants ─────────────────────────────────────
export const G = 6.6743e-11; // m³ kg⁻¹ s⁻²

export const MASS_SUN = 1.989e30; // kg
export const MASS_EARTH = 5.972e24; // kg
export const MASS_MOON = 7.348e22; // kg
export const MASS_MARS = 6.417e23 // kg

// semi-major axes
export const DIST_EARTH_SUN = 1.496e11; // m
export const DIST_EARTH_MOON = 3.847e8; // m
export const DIST_MARS_SUN = 2.279e11; // m


// ── Scaling (1 time-unit = 1 day) ─────────────────────
export const LENGTH_SCALE = 1e10;
export const MASS_SCALE = 1e24;
export const TIME_SCALE = 86400; // seconds per day

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
const earthSpeed = Math.sqrt((scaledG * scaledMassSun) / scaledDistEarthSun);
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

// starting pos
export const MARS_POSITION = new THREE.Vector3(scaledDistMarsSun,0,0);


// Semi major axis = 2.279e11 m 
// Vis-viva -> V=sqrt(m(2/r - 1/a))
// if using semi major axis, then r = a 
// V = sqrt(GM(2/SEMI_MAJOR - 1/SEMI_MAJOR)) -> yields a circle 
// for an elliptical orbit, also need to consider the eccentricity of the orbit, but for simplicity, we can use the circular approximation here.
// eccentricity of mars orbit = 0.0934 
// eccentricity = (a - b)/a where a = semi major axis, b = semi minor axis
// b = a(1 - e) = 2.279e11 * (1 - 0.0934) = 2.065e11 m = perihelion distance
// V = sqrt((GM/a) * ((1+e)/(1-e))) = sqrt((GM/a) * ((1+0.0934)/(1-0.0934))) = 2.41e4 m/s

const e = 0.0934;
const marsSpeed = Math.sqrt(((scaledG * scaledMassSun)/(scaledDistMarsSun) * ((1+e)/(1-e))));
export const MARS_VELOCITY = new THREE.Vector3(0,0,marsSpeed);
export const MARS_ACCELERATION = new THREE.Vector3(0, 0, 0);


// ── Simulation knobs ───────────────────────────────────
export const PLAYBACK_SPEED = 10; // sim-days per real second
export const MAX_PHYSICS_STEP = 0.25; // max sim-days per substep
