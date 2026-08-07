import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";

export function createScene() {
	const scene = new THREE.Scene();
	scene.background = new THREE.Color(0x06080d);
	return scene;
}

export function createCamera() {
	const camera = new THREE.PerspectiveCamera(
		2,
		window.innerWidth / window.innerHeight,
		0.001,
		500,
	);
	camera.position.set(0, 1, 1);
	return camera;
}

export function createRenderer() {
	const renderer = new THREE.WebGLRenderer({
		logarithmicDepthBuffer: true,
	});
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFShadowMap;
	return renderer;
}

export function createControls(
	camera: THREE.PerspectiveCamera,
	renderer: THREE.WebGLRenderer,
) {
	const controls = new OrbitControls(camera, renderer.domElement);
	controls.enableDamping = true;
	controls.dampingFactor = 0.05;
	controls.enablePan = true;
	controls.enableZoom = true;
	controls.target.set(0, 0, 0);
	return controls;
}

export function createLighting(scene: THREE.Scene) {
	// Subtle fill so the dark side of bodies is visible (like NASA Eyes)
	const ambient = new THREE.AmbientLight(0x304870, 0.55);
	scene.add(ambient);
	return ambient;
}

export function setupResize(
	camera: THREE.PerspectiveCamera,
	renderer: THREE.WebGLRenderer,
) {
	window.addEventListener("resize", () => {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		renderer.setSize(window.innerWidth, window.innerHeight);
	});
}
