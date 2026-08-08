import * as THREE from "three";
import { Body } from "../../engine/Body";
import venusMap from "../../assets/4k_venus_atmosphere.jpg";
import earthDayMap from "../../assets/8k_earth_daymap.jpg";
import earthCloudsMap from "../../assets/8k_earth_clouds.jpg";
import moonMap from "../../assets/8k_moon.jpg";
import marsMap from "../../assets/8k_mars.jpg";
import jupiterMap from "../../assets/8k_jupiter.jpg";
import saturnMap from "../../assets/8k_saturn.jpg";
import saturnRingMap from "../../assets/8k_saturn_ring_alpha.png";
import neptuneMap from "../../assets/2k_neptune.jpg";
// No Mercury or Uranus texture assets exist yet — createMercury/createUranus
// below fall back to a flat colour until 8k_mercury.jpg / 2k_uranus.jpg (or
// similar) are dropped into src/assets and wired up the same way as Jupiter.
import mercuryMap from "../../assets/8k_mercury.jpg";
import uranusMap from "../../assets/2k_uranus.jpg";
import {
	RENDER_SCALE,
	MASS_SUN,
	MASS_MERCURY,
	MASS_VENUS,
	MASS_EARTH,
	MASS_MOON,
	MASS_MARS,
	MASS_JUPITER,
	MASS_SATURN,
	MASS_URANUS,
	MASS_NEPTUNE,
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
	RING_INNER_SATURN,
	RING_OUTER_SATURN,
	SUN_POSITION,
	SUN_VELOCITY,
	SUN_TEMPERATURE,
	MERCURY_POSITION,
	MERCURY_VELOCITY,
	VENUS_POSITION,
	VENUS_VELOCITY,
	EARTH_POSITION,
	EARTH_VELOCITY,
	MOON_POSITION,
	MOON_VELOCITY,
	MARS_POSITION,
	MARS_VELOCITY,
	JUPITER_POSITION,
	JUPITER_VELOCITY,
	SATURN_POSITION,
	SATURN_VELOCITY,
	URANUS_POSITION,
	URANUS_VELOCITY,
	NEPTUNE_POSITION,
	NEPTUNE_VELOCITY,
	TILT_VENUS,
	TILT_EARTH,
	TILT_MARS,
	TILT_JUPITER,
	TILT_SATURN,
	TILT_URANUS,
	TILT_NEPTUNE,
} from "./constants";

// Physical point light with inverse-square decay, in render units (AU).
// Illuminance at Earth (~0.98 AU) ≈ 2.5 / 0.98² ≈ 2.6 — bright daylight
// that stays below the bloom threshold after surface albedo. Exported so
// index.ts can scale it (its "light boost" for whatever body is
// followed) relative to this calibrated baseline.
export const SUN_LIGHT_INTENSITY = 2.5;
// HDR multiplier on the sun's surface shader — pushes the disc past the
// bloom threshold (1.0) so only the sun glows, never the planets — while
// staying low enough that ACES keeps the granulation detail visible.
const SUN_SURFACE_INTENSITY = 1.6;

const textureLoader = new THREE.TextureLoader();

function loadSurfaceTexture(url: string) {
	const tex = textureLoader.load(url);
	tex.colorSpace = THREE.SRGBColorSpace; // photo textures are sRGB
	tex.anisotropy = 8;
	return tex;
}

/** For alpha/data maps (cloud masks, ring alpha) — not colour, so no sRGB decode. */
function loadDataTexture(url: string) {
	const tex = textureLoader.load(url);
	tex.anisotropy = 8;
	return tex;
}

// ── Planets ────────────────────────────────────────────

interface PlanetSpec {
	name: string;
	/** Surface photo texture. Omit (and pass `color`) if none exists yet. */
	textureUrl?: string;
	/** Flat fallback colour, used only when `textureUrl` is omitted. */
	color?: number;
	/** Optional translucent cloud shell (Earth, Venus-style). */
	cloudsUrl?: string;
	radius: number; // m
	mass: number; // kg
	position: THREE.Vector3; // m
	velocity: THREE.Vector3; // m/s
	axialTilt?: number; // rad
}

function createPlanet(scene: THREE.Scene, spec: PlanetSpec): Body {
	const renderRadius = spec.radius * RENDER_SCALE;
	const geo = new THREE.SphereGeometry(renderRadius, 64, 32);
	const mat = new THREE.MeshStandardMaterial(
		spec.textureUrl
			? { map: loadSurfaceTexture(spec.textureUrl), roughness: 1, metalness: 0 }
			: { color: spec.color ?? 0x999999, roughness: 1, metalness: 0 },
	);
	const mesh = new THREE.Mesh(geo, mat);
	if (spec.axialTilt) {
		// Order ZXY: tilt (z) stays fixed in world space while the daily
		// spin accumulates on y in the body's own tilted frame.
		mesh.rotation.order = "ZXY";
		mesh.rotation.z = spec.axialTilt;
	}
	if (spec.cloudsUrl) {
		// Slightly larger shell, alpha-blended. It's a child of the planet
		// mesh so it rides along in Body.syncMesh() and inherits the tilt.
		const cloudGeo = new THREE.SphereGeometry(renderRadius * 1.008, 64, 32);
		const cloudMat = new THREE.MeshStandardMaterial({
			color: 0xffffff,
			alphaMap: loadDataTexture(spec.cloudsUrl),
			transparent: true,
			depthWrite: false,
			roughness: 1,
		});
		mesh.add(new THREE.Mesh(cloudGeo, cloudMat));
	}
	const body = new Body(
		mesh,
		spec.name,
		spec.mass,
		spec.position,
		spec.velocity,
		RENDER_SCALE,
	);
	body.addToScene(scene);
	return body;
}

/**
 * Flat ring, radially UV-mapped so a banded texture (inner→outer) reads
 * correctly — RingGeometry's default UVs run across the bounding box, not
 * from inner to outer edge, which would smear the texture.
 */
function attachRing(
	planetMesh: THREE.Mesh,
	innerRadius: number,
	outerRadius: number,
	textureUrl: string,
) {
	const geo = new THREE.RingGeometry(innerRadius, outerRadius, 128, 1);
	const pos = geo.attributes.position;
	const uv = geo.attributes.uv;
	const v = new THREE.Vector3();
	for (let i = 0; i < pos.count; i++) {
		v.fromBufferAttribute(pos, i);
		const t = (v.length() - innerRadius) / (outerRadius - innerRadius);
		uv.setXY(i, t, 1);
	}
	const tex = loadSurfaceTexture(textureUrl);
	const mat = new THREE.MeshStandardMaterial({
		map: tex,
		alphaMap: tex,
		transparent: true,
		side: THREE.DoubleSide,
		roughness: 1,
	});
	const ring = new THREE.Mesh(geo, mat);
	// RingGeometry lies flat in the XY plane; rotate it into the planet's
	// equatorial (XZ) plane. The parent's axial-tilt rotation then carries
	// the ring along with it, same as any other child.
	ring.rotation.x = Math.PI / 2;
	planetMesh.add(ring);
	return ring;
}

export const createMercury = (scene: THREE.Scene) =>
	createPlanet(scene, {
		name: "Mercury",
		textureUrl: mercuryMap,
		radius: RADIUS_MERCURY,
		mass: MASS_MERCURY,
		position: MERCURY_POSITION,
		velocity: MERCURY_VELOCITY,
	});

export const createVenus = (scene: THREE.Scene) =>
	createPlanet(scene, {
		name: "Venus",
		// Venus is permanently cloud-covered, so the "atmosphere" texture
		// *is* the visible surface — 8k_venus_surface.jpg (radar terrain)
		// is never actually seen and is left unused for now.
		textureUrl: venusMap,
		radius: RADIUS_VENUS,
		mass: MASS_VENUS,
		position: VENUS_POSITION,
		velocity: VENUS_VELOCITY,
		axialTilt: TILT_VENUS,
	});

export const createEarth = (scene: THREE.Scene) =>
	createPlanet(scene, {
		name: "Earth",
		textureUrl: earthDayMap,
		cloudsUrl: earthCloudsMap,
		radius: RADIUS_EARTH,
		mass: MASS_EARTH,
		position: EARTH_POSITION,
		velocity: EARTH_VELOCITY,
		axialTilt: TILT_EARTH,
	});

export const createMoon = (scene: THREE.Scene) =>
	createPlanet(scene, {
		name: "Moon",
		textureUrl: moonMap,
		radius: RADIUS_MOON,
		mass: MASS_MOON,
		position: MOON_POSITION,
		velocity: MOON_VELOCITY,
	});

export const createMars = (scene: THREE.Scene) =>
	createPlanet(scene, {
		name: "Mars",
		textureUrl: marsMap,
		radius: RADIUS_MARS,
		mass: MASS_MARS,
		position: MARS_POSITION,
		velocity: MARS_VELOCITY,
		axialTilt: TILT_MARS,
	});

export const createJupiter = (scene: THREE.Scene) =>
	createPlanet(scene, {
		name: "Jupiter",
		textureUrl: jupiterMap,
		radius: RADIUS_JUPITER,
		mass: MASS_JUPITER,
		position: JUPITER_POSITION,
		velocity: JUPITER_VELOCITY,
		axialTilt: TILT_JUPITER,
	});

export function createSaturn(scene: THREE.Scene) {
	const saturn = createPlanet(scene, {
		name: "Saturn",
		textureUrl: saturnMap,
		radius: RADIUS_SATURN,
		mass: MASS_SATURN,
		position: SATURN_POSITION,
		velocity: SATURN_VELOCITY,
		axialTilt: TILT_SATURN,
	});
	attachRing(
		saturn.mesh,
		RING_INNER_SATURN * RENDER_SCALE,
		RING_OUTER_SATURN * RENDER_SCALE,
		saturnRingMap,
	);
	return saturn;
}

export const createUranus = (scene: THREE.Scene) =>
	createPlanet(scene, {
		name: "Uranus",
		textureUrl: uranusMap,
		radius: RADIUS_URANUS,
		mass: MASS_URANUS,
		position: URANUS_POSITION,
		velocity: URANUS_VELOCITY,
		axialTilt: TILT_URANUS,
	});

export const createNeptune = (scene: THREE.Scene) =>
	createPlanet(scene, {
		name: "Neptune",
		textureUrl: neptuneMap,
		radius: RADIUS_NEPTUNE,
		mass: MASS_NEPTUNE,
		position: NEPTUNE_POSITION,
		velocity: NEPTUNE_VELOCITY,
		axialTilt: TILT_NEPTUNE,
	});

// ── Sun ────────────────────────────────────────────────

export function createSun(scene: THREE.Scene) {
	const geo = new THREE.SphereGeometry(RADIUS_SUN * RENDER_SCALE, 64, 32);

	const { r, g, b } = temperatureToColor(SUN_TEMPERATURE / 100); // formula uses K/100

	// Procedural solar surface — layered noise gives granulation / hot
	// spots. Self-illuminated: ShaderMaterial ignores scene lights; the
	// PointLight below lights the planets.
	const sunMat = new THREE.ShaderMaterial({
		uniforms: {
			uTime: { value: 0 },
			uIntensity: { value: SUN_SURFACE_INTENSITY },
			uBaseColor: {
				value: new THREE.Vector3(r / 255, g / 255, b / 255),
			},
			uHotColor: { value: new THREE.Vector3(1.0, 0.95, 0.7) },
		},
		vertexShader: /* glsl */ `
			varying vec3 vPos;
			varying vec3 vNormal;
			void main() {
				vPos = position;
				vNormal = normalize(normalMatrix * normal);
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			}`,
		fragmentShader: /* glsl */ `
			varying vec3 vPos;
			varying vec3 vNormal;
			uniform float uTime;
			uniform float uIntensity;
			uniform vec3 uBaseColor;
			uniform vec3 uHotColor;

			// Hash → smooth value noise (2D)
			float hash(vec2 p) {
				return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
			}
			float noise(vec2 p) {
				vec2 i = floor(p);
				vec2 f = fract(p);
				f = f * f * (3.0 - 2.0 * f);
				return mix(
					mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
					mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
					f.y
				);
			}

			// FBM — 4 octaves
			float fbm(vec2 p) {
				float v = 0.0, a = 0.5, f = 1.0;
				for (int i = 0; i < 4; i++) {
					v += a * noise(p * f);
					f *= 2.0;
					a *= 0.5;
				}
				return v;
			}

			void main() {
				// Triplanar mapping — no UV seam, no pole pinch
				vec3 dir = normalize(vPos);
				float s = 4.0;
				float t = uTime * 0.012;

				float nx = fbm(dir.yz * s + t) + 0.3 * fbm(dir.yz * s * 2.3 + t + 1.7);
				float ny = fbm(dir.xz * s + t) + 0.3 * fbm(dir.xz * s * 2.3 + t + 1.7);
				float nz = fbm(dir.xy * s + t) + 0.3 * fbm(dir.xy * s * 2.3 + t + 1.7);

				float wx = abs(dir.x), wy = abs(dir.y), wz = abs(dir.z);
				float n = (nx * wx + ny * wy + nz * wz) / (wx + wy + wz);

				// Temperature-derived base colour, noise modulates brightness
				float brightness = 0.7 + 0.3 * n;
				vec3 col = uBaseColor * brightness;
				// Hottest granules glow toward white-hot
				col = mix(col, uHotColor, smoothstep(0.85, 1.0, n));

				// Limb darkening — the disc dims toward the edge, where the
				// line of sight exits through cooler, higher photosphere.
				// abs(vNormal.z) is 1 at disc centre, 0 at the limb.
				col *= 0.55 + 0.45 * abs(vNormal.z);

				// HDR output — tone mapping rolls this off to white-hot,
				// and the bloom pass picks up everything above 1.0.
				gl_FragColor = vec4(col * uIntensity, 1.0);
			}`,
	});

	const mesh = new THREE.Mesh(geo, sunMat);

	// The light travels as a child of the sun mesh, so removing the mesh
	// on sim destroy removes the light too.
	const light = new THREE.PointLight(0xffeedd, SUN_LIGHT_INTENSITY, 0, 2);
	mesh.add(light);
	mesh.userData.sunLight = light; // exposed for per-frame colour sync

	const sun = new Body(
		mesh,
		"Sun",
		MASS_SUN,
		SUN_POSITION,
		SUN_VELOCITY,
		RENDER_SCALE,
	);
	sun.addToScene(scene);
	return sun;
}

/** Blackbody temperature (K/100) → RGB, Tanner Helland's approximation. */
export function temperatureToColor(T: number): {
	r: number;
	g: number;
	b: number;
} {
	let R = 0.0;
	let G = 0.0;
	let B = 0.0;

	if (T <= 66.0) {
		R = 255.0;
	} else {
		R = 329.698727446 * Math.pow(T - 60.0, -0.1332047892);
	}

	if (T <= 66.0) {
		G = 99.4708025861 * Math.log(T) - 161.1195681661;
	} else {
		G = 288.1221695283 * Math.pow(T - 60.0, -0.0755148492);
	}

	if (T >= 66.0) {
		B = 255.0;
	} else if (T <= 19.0) {
		B = 0.0;
	} else {
		B = 138.5177312231 * Math.log(T - 10.0) - 305.0447927307;
	}

	const clampAndRound = (val: number) =>
		Math.round(Math.max(0, Math.min(255, val)));

	return {
		r: clampAndRound(R),
		g: clampAndRound(G),
		b: clampAndRound(B),
	};
}
