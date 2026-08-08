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

export const MASS_MERCURY = 3.301e23;
export const MASS_VENUS = 4.867e24;
export const MASS_EARTH = 5.972e24;
export const MASS_MOON = 7.348e22;
export const MASS_MARS = 6.417e23;
export const MASS_JUPITER = 1.898e27;
export const MASS_SATURN = 5.683e26;
export const MASS_URANUS = 8.681e25;
export const MASS_NEPTUNE = 1.024e26;

// ── Radii (m) ──────────────────────────────────────────
export const RADIUS_SUN = 6.957e8;
export const RADIUS_MERCURY = 2.44e6;
export const RADIUS_VENUS = 6.052e6;
export const RADIUS_EARTH = 6.371e6;
export const RADIUS_MARS = 3.389e6;
export const RADIUS_JUPITER = 6.991e7;
export const RADIUS_SATURN = 5.823e7;
export const RADIUS_URANUS = 2.536e7;
export const RADIUS_NEPTUNE = 2.462e7;
export const RADIUS_MOON = 1.737e6;

// Saturn's ring system — C ring inner edge to A ring outer edge.
export const RING_INNER_SATURN = 7.0e7;
export const RING_OUTER_SATURN = 1.4e8;

// ── Orbit geometry (m) ─────────────────────────────────
// Perihelion / perigee — the bodies start here.
export const DIST_EARTH_SUN = 1.471e11;
export const DIST_EARTH_MOON = 3.626e8;
export const DIST_MARS_SUN = 2.067e11;
export const DIST_MERCURY_SUN = 4.6e10;
export const DIST_VENUS_SUN = 1.075e11;
export const DIST_JUPITER_SUN = 7.406e11;
export const DIST_SATURN_SUN = 1.353e12;
export const DIST_URANUS_SUN = 2.736e12;
export const DIST_NEPTUNE_SUN = 4.46e12;

export const MERCURY_SEMI_MAJOR = 5.791e10;
export const VENUS_SEMI_MAJOR = 1.082e11;
export const EARTH_SEMI_MAJOR = 1.496e11;
export const MARS_SEMI_MAJOR = 2.279e11;
export const JUPITER_SEMI_MAJOR = 7.783e11;
export const SATURN_SEMI_MAJOR = 1.427e12;
export const URANUS_SEMI_MAJOR = 2.871e12;
export const NEPTUNE_SEMI_MAJOR = 4.498e12;
export const MOON_SEMI_MAJOR = 3.844e8;

// ── Sidereal Spin Periods ──────────────────────────────
export const SPIN_SUN = 25.38 * SECONDS_PER_DAY;
export const SPIN_MERCURY = 58.646 * SECONDS_PER_DAY;
export const SPIN_VENUS = -243.025 * SECONDS_PER_DAY; // Retrograde
export const SPIN_EARTH = 86164;
export const SPIN_MOON = 27.322 * SECONDS_PER_DAY; // tidally locked
export const SPIN_MARS = 88643;
export const SPIN_JUPITER = 0.41354 * SECONDS_PER_DAY; // 9h 55m
export const SPIN_SATURN = 0.44 * SECONDS_PER_DAY; // 10h 34m
export const SPIN_URANUS = -0.71833 * SECONDS_PER_DAY; // 17h 14m — Retrograde
export const SPIN_NEPTUNE = 0.67125 * SECONDS_PER_DAY; // 16h 7m

// ── Axial Tilts (Radians) ──────────────────────────────
export const TILT_MERCURY = THREE.MathUtils.degToRad(0.034);
export const TILT_VENUS = THREE.MathUtils.degToRad(177.4);
export const TILT_EARTH = THREE.MathUtils.degToRad(23.44);
export const TILT_MARS = THREE.MathUtils.degToRad(25.19);
export const TILT_JUPITER = THREE.MathUtils.degToRad(3.13);
export const TILT_SATURN = THREE.MathUtils.degToRad(26.73);
export const TILT_URANUS = THREE.MathUtils.degToRad(97.77);
export const TILT_NEPTUNE = THREE.MathUtils.degToRad(28.32);

export const SUN_TEMPERATURE = 5778; // K — solar photosphere

// ── Initial conditions ─────────────────────────────────
// Bodies start at perihelion on +X. Velocity along −Z makes the
// orbits counterclockwise seen from +Y (north), as in reality.

// Speeds come from vis-viva: v² = GM (2/r − 1/a).
const visViva = (M: number, r: number, a: number) =>
	Math.sqrt(G * M * (2 / r - 1 / a));

// Sun
export const SUN_POSITION = new THREE.Vector3(0, 0, 0);
export const SUN_VELOCITY = new THREE.Vector3(0, 0, 0);

// Mercury
export const MERCURY_POSITION = new THREE.Vector3(DIST_MERCURY_SUN, 0, 0);
export const MERCURY_VELOCITY = new THREE.Vector3(
	0,
	0,
	-visViva(MASS_SUN, DIST_MERCURY_SUN, MERCURY_SEMI_MAJOR),
);

// Venus
export const VENUS_POSITION = new THREE.Vector3(DIST_VENUS_SUN, 0, 0);
export const VENUS_VELOCITY = new THREE.Vector3(
	0,
	0,
	-visViva(MASS_SUN, DIST_VENUS_SUN, VENUS_SEMI_MAJOR),
);

// Earth
export const EARTH_POSITION = new THREE.Vector3(DIST_EARTH_SUN, 0, 0);
export const EARTH_VELOCITY = new THREE.Vector3(
	0,
	0,
	-visViva(MASS_SUN, DIST_EARTH_SUN, EARTH_SEMI_MAJOR),
);
// Moon
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

// Mars
export const MARS_POSITION = new THREE.Vector3(DIST_MARS_SUN, 0, 0);
export const MARS_VELOCITY = new THREE.Vector3(
	0,
	0,
	-visViva(MASS_SUN, DIST_MARS_SUN, MARS_SEMI_MAJOR),
);

// Jupiter
export const JUPITER_POSITION = new THREE.Vector3(DIST_JUPITER_SUN, 0, 0);
export const JUPITER_VELOCITY = new THREE.Vector3(
	0,
	0,
	-visViva(MASS_SUN, DIST_JUPITER_SUN, JUPITER_SEMI_MAJOR),
);

// Saturn
export const SATURN_POSITION = new THREE.Vector3(DIST_SATURN_SUN, 0, 0);
export const SATURN_VELOCITY = new THREE.Vector3(
	0,
	0,
	-visViva(MASS_SUN, DIST_SATURN_SUN, SATURN_SEMI_MAJOR),
);

// Uranus
export const URANUS_POSITION = new THREE.Vector3(DIST_URANUS_SUN, 0, 0);
export const URANUS_VELOCITY = new THREE.Vector3(
	0,
	0,
	-visViva(MASS_SUN, DIST_URANUS_SUN, URANUS_SEMI_MAJOR),
);

// Neptune
export const NEPTUNE_POSITION = new THREE.Vector3(DIST_NEPTUNE_SUN, 0, 0);
export const NEPTUNE_VELOCITY = new THREE.Vector3(
	0,
	0,
	-visViva(MASS_SUN, DIST_NEPTUNE_SUN, NEPTUNE_SEMI_MAJOR),
);

// ── Simulation knobs ───────────────────────────────────
export const PLAYBACK_SPEED = 1; // sim-days per real second
export const MAX_STEP_SECONDS = 0.1 * SECONDS_PER_DAY; // physics substep cap
