import * as THREE from "three";
import { Body } from "../../engine/Body";
import earthDayMap from "../../assets/8k_earth_daymap.jpg";
import moonMap from "../../assets/8k_moon.jpg";
import marsMap from "../../assets/8k_mars.jpg";
import {
	RENDER_SCALE,
	MASS_SUN,
	MASS_EARTH,
	MASS_MOON,
	MASS_MARS,
	RADIUS_SUN,
	RADIUS_EARTH,
	RADIUS_MOON,
	RADIUS_MARS,
	SUN_POSITION,
	SUN_VELOCITY,
	SUN_TEMPERATURE,
	EARTH_POSITION,
	EARTH_VELOCITY,
	MOON_POSITION,
	MOON_VELOCITY,
	MARS_POSITION,
	MARS_VELOCITY,
	TILT_EARTH,
	TILT_MARS,
} from "./constants";

// Physical point light with inverse-square decay, in render units (AU).
// Illuminance at Earth (~0.98 AU) ≈ 2.5 / 0.98² ≈ 2.6 — bright daylight
// that stays below the bloom threshold after surface albedo.
const SUN_LIGHT_INTENSITY = 2.5;
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

// ── Planets ────────────────────────────────────────────

interface PlanetSpec {
	name: string;
	textureUrl: string;
	radius: number; // m
	mass: number; // kg
	position: THREE.Vector3; // m
	velocity: THREE.Vector3; // m/s
	axialTilt?: number; // rad
}

function createPlanet(scene: THREE.Scene, spec: PlanetSpec): Body {
	const geo = new THREE.SphereGeometry(spec.radius * RENDER_SCALE, 64, 32);
	const mat = new THREE.MeshStandardMaterial({
		map: loadSurfaceTexture(spec.textureUrl),
		roughness: 1,
		metalness: 0,
	});
	const mesh = new THREE.Mesh(geo, mat);
	if (spec.axialTilt) {
		// Order ZXY: tilt (z) stays fixed in world space while the daily
		// spin accumulates on y in the body's own tilted frame.
		mesh.rotation.order = "ZXY";
		mesh.rotation.z = spec.axialTilt;
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

export const createEarth = (scene: THREE.Scene) =>
	createPlanet(scene, {
		name: "Earth",
		textureUrl: earthDayMap,
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
