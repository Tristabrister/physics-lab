import * as THREE from "three";
import { Body } from "../../engine/Body";
import earthDayMap from "../../assets/8k_earth_daymap.jpg";
import moonMap from "../../assets/8k_moon.jpg";
import marsMap from "../../assets/8k_mars.jpg";
import {
	scaledMassSun,
	scaledMassEarth,
	scaledMassMoon,
	scaledMassMars,
	SUN_POSITION,
	SUN_VELOCITY,
	SUN_ACCELERATION,
	SUN_TEMPERATURE,
	EARTH_POSITION,
	EARTH_VELOCITY,
	EARTH_ACCELERATION,
	MOON_POSITION,
	MOON_VELOCITY,
	MOON_ACCELERATION,
	MARS_POSITION,
	MARS_VELOCITY,
	MARS_ACCELERATION,
} from "./constants";

export function createSun(scene: THREE.Scene) {
	const light = new THREE.PointLight(0xffeedd, 80, 0, 1.5);
	light.position.set(0, 0, 0);
	light.castShadow = true;
	light.shadow.mapSize.width = 1024;
	light.shadow.mapSize.height = 1024;
	light.shadow.camera.near = 0.5;
	light.shadow.camera.far = 60;
	light.shadow.bias = -0.0001;
	scene.add(light);

	const geo = new THREE.SphereGeometry(1.2, 64, 64); // Sun

	const { r, g, b } = temperatureToColor(SUN_TEMPERATURE / 100); // formula uses K/100

	// Procedural solar surface — layered noise gives granulation / hot spots.
	// Fully self-illuminated (ShaderMaterial ignores scene lights — the PointLight
	// already provides the directional illumination for planets).
	const sunMat = new THREE.ShaderMaterial({
		uniforms: {
			uTime: { value: 0 },
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
				// ── Triplanar mapping — no UV seam, no pole pinch ───
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


				// Limb darkening (uses view-space normal for correct edge falloff)
				float limb = 1.0 - abs(vNormal.z) * 0.35;
				col *= 0.75 + 0.25 * limb;

				gl_FragColor = vec4(col, 1.0);
			}`,
	});

	const mesh = new THREE.Mesh(geo, sunMat);
	mesh.userData.sunLight = light; // expose for per-frame colour sync

	const sun = new Body(
		mesh,
		scaledMassSun,
		SUN_POSITION,
		SUN_VELOCITY,
		SUN_ACCELERATION,
		"Sun",
	);

	sun.addToScene(scene);
	return sun;
}

export function createEarth(scene: THREE.Scene) {
	const geo = new THREE.SphereGeometry(0.16); // Earth
	const loader = new THREE.TextureLoader();
	const mat = new THREE.MeshStandardMaterial({
		map: loader.load(earthDayMap),
		roughness: 1,
		metalness: 0.0,
	});
	const mesh = new THREE.Mesh(geo, mat);
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	const earth = new Body(
		mesh,
		scaledMassEarth,
		EARTH_POSITION,
		EARTH_VELOCITY,
		EARTH_ACCELERATION,
		"Earth",
	);
	earth.addToScene(scene);
	return earth;
}

export function createMoon(scene: THREE.Scene) {
	const geo = new THREE.SphereGeometry(0.045); // Moon
	const loader = new THREE.TextureLoader();
	const mat = new THREE.MeshStandardMaterial({
		map: loader.load(moonMap),
		roughness: 0.7,
		metalness: 0,
	});
	const mesh = new THREE.Mesh(geo, mat);
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	const moon = new Body(
		mesh,
		scaledMassMoon,
		MOON_POSITION,
		MOON_VELOCITY,
		MOON_ACCELERATION,
		"Moon",
	);
	moon.addToScene(scene);
	return moon;
}

export function createMars(scene: THREE.Scene) {
	const geo = new THREE.SphereGeometry(0.16); // Earth
	const loader = new THREE.TextureLoader();
	const mat = new THREE.MeshStandardMaterial({
		map: loader.load(marsMap),
		roughness: 0.65,
		metalness: 0.05,
	});
	const mesh = new THREE.Mesh(geo, mat);
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	const mars = new Body(
		mesh,
		scaledMassMars,
		MARS_POSITION,
		MARS_VELOCITY,
		MARS_ACCELERATION,
		"Mars",
	);
	mars.addToScene(scene);
	return mars;
}

export function temperatureToColor(T: number): {
	r: number;
	g: number;
	b: number;
} {
	let R = 0.0;
	let G = 0.0;
	let B = 0.0;

	// Calculate Red
	if (T <= 66.0) {
		R = 255.0;
	} else {
		R = 329.698727446 * Math.pow(T - 60.0, -0.1332047892);
	}

	// Calculate Green
	if (T <= 66.0) {
		G = 99.4708025861 * Math.log(T) - 161.1195681661;
	} else {
		G = 288.1221695283 * Math.pow(T - 60.0, -0.0755148492);
	}

	// Calculate Blue
	if (T >= 66.0) {
		B = 255.0;
	} else if (T <= 19.0) {
		B = 0.0;
	} else {
		B = 138.5177312231 * Math.log(T - 10.0) - 305.0447927307;
	}

	// Helper function to clamp values between 0 and 255 and round them
	const clampAndRound = (val: number) =>
		Math.round(Math.max(0, Math.min(255, val)));

	return {
		r: clampAndRound(R),
		g: clampAndRound(G),
		b: clampAndRound(B),
	};
}
