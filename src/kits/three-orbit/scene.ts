import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";

/** Generic THREE scaffolding for a "3D scene with an orbit camera"
 * Defaults suit an AU-scaled scene(1 render unit = 1 AU); 
 * pass options to reuse this at a different scale. */
export function createScene(background: THREE.ColorRepresentation = 0x000000) {
	const scene = new THREE.Scene();
	scene.background = new THREE.Color(background);
	return scene;
}

export interface CameraOptions {
	fov?: number;
	near?: number;
	far?: number;
	position?: THREE.Vector3;
}

export function createCamera(opts: CameraOptions = {}) {
	const camera = new THREE.PerspectiveCamera(
		opts.fov ?? 45, // natural human FOV — at true scale this renders true angular sizes
		window.innerWidth / window.innerHeight,
		opts.near ?? 1e-7,
		opts.far ?? 5000,
	);
	camera.position.copy(opts.position ?? new THREE.Vector3(0, 1.2, 2.6));
	return camera;
}

export function createRenderer() {
	const renderer = new THREE.WebGLRenderer({
		antialias: true,
		logarithmicDepthBuffer: true,
	});
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	return renderer;
}

export interface ControlsOptions {
	zoomSpeed?: number;
	maxDistance?: number;
	target?: THREE.Vector3;
}

export function createControls(
	camera: THREE.PerspectiveCamera,
	renderer: THREE.WebGLRenderer,
	opts: ControlsOptions = {},
) {
	const controls = new OrbitControls(camera, renderer.domElement);
	controls.enableDamping = true;
	controls.dampingFactor = 0.05;
	controls.zoomSpeed = opts.zoomSpeed ?? 1.5;
	controls.maxDistance = opts.maxDistance ?? 500;
	controls.target.copy(opts.target ?? new THREE.Vector3(0, 0, 0));
	controls.mouseButtons = {
		LEFT: THREE.MOUSE.ROTATE,
		MIDDLE: THREE.MOUSE.ROTATE,
		RIGHT: THREE.MOUSE.PAN,
	};
	return controls;
}

export function createLighting(scene: THREE.Scene) {
	// Faint ambient lighting 
	const ambient = new THREE.AmbientLight(0x334466, 0.2);
	scene.add(ambient);
	return ambient;
}
