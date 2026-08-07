import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";

export function createScene() {
	const scene = new THREE.Scene();
	scene.background = new THREE.Color(0x06080d);
	return scene;
}

export function createCamera() {
	// Natural human FOV. At true scale this renders true angular sizes —
	// from Earth the sun subtends ~0.5°, exactly as in real life.
	const camera = new THREE.PerspectiveCamera(
		45,
		window.innerWidth / window.innerHeight,
		1e-7, // close approaches to moon-sized bodies (~1e-5 render units)
		5000, // beyond the starfield shell
	);
	// Overview of the inner system (render units = AU).
	camera.position.set(0, 1.2, 2.6);
	return camera;
}

export function createRenderer() {
	const renderer = new THREE.WebGLRenderer({
		antialias: true,
		// One scene spans ~1e-5 render units (Moon) to ~400 (starfield);
		// a logarithmic depth buffer keeps z-fighting away across it all.
		logarithmicDepthBuffer: true,
	});
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	return renderer;
}

export function createControls(
	camera: THREE.PerspectiveCamera,
	renderer: THREE.WebGLRenderer,
) {
	const controls = new OrbitControls(camera, renderer.domElement);
	controls.enableDamping = true;
	controls.dampingFactor = 0.05;
	controls.zoomSpeed = 1.5; // AU → planet surface is a long way to scroll
	controls.maxDistance = 500; // stay inside the starfield shell
	controls.target.set(0, 0, 0);
	return controls;
}

export function createLighting(scene: THREE.Scene) {
	// Faint cool fill so night sides read as silhouettes, not voids.
	const ambient = new THREE.AmbientLight(0x334466, 0.2);
	scene.add(ambient);
	return ambient;
}
