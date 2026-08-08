import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/Addons.js";
import { meshRadius } from "./meshRadius";

export interface FlyCameraOptions {
	camera: THREE.PerspectiveCamera;
	controls: OrbitControls;
	/** Obstacle meshes used to scale flight speed — gentle up close, fast in open space. */
	getObstacles?: () => THREE.Mesh[];
	/** Disable flying while something else (e.g. a follow-cam) owns the camera. */
	isEnabled?: () => boolean;
}

const FLY_KEYS = [
	"w",
	"a",
	"s",
	"d",
	"shift",
	" ",
	"control",
	"arrowup",
	"arrowdown",
	"arrowleft",
	"arrowright",
];

/** WASD + space/ctrl flight: position and orbit target move together; mouse drag still orbits. */
export function createFlyCamera(opts: FlyCameraOptions) {
	const { camera, controls } = opts;
	const keys: Record<string, boolean> = {};

	function onKeyDown(e: KeyboardEvent) {
		const k = e.key.toLowerCase();
		if (FLY_KEYS.includes(k)) e.preventDefault(); // block browser shortcuts (Space = scroll) while flying
		keys[k] = true;
	}
	function onKeyUp(e: KeyboardEvent) {
		keys[e.key.toLowerCase()] = false;
	}
	function onBlur() {
		for (const k of Object.keys(keys)) keys[k] = false; // release stuck keys on focus loss
	}
	function onSelectStart(e: Event) {
		if (keys["control"]) e.preventDefault(); // Ctrl-click shouldn't select page text mid-flight
	}

	window.addEventListener("keydown", onKeyDown);
	window.addEventListener("keyup", onKeyUp);
	window.addEventListener("blur", onBlur);
	document.addEventListener("selectstart", onSelectStart);

	function update(dt: number) {
		if (opts.isEnabled && !opts.isEnabled()) return;

		let nearestSurface = camera.position.distanceTo(controls.target);
		for (const mesh of opts.getObstacles?.() ?? []) {
			const d = camera.position.distanceTo(mesh.position) - meshRadius(mesh);
			if (d < nearestSurface) nearestSurface = d;
		}
		const speed = Math.max(nearestSurface, 1e-5) * 1.2 * dt * (keys["shift"] ? 4 : 1);

		const forward = new THREE.Vector3()
			.subVectors(controls.target, camera.position)
			.normalize();
		const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();

		const move = new THREE.Vector3();
		if (keys["w"] || keys["arrowup"]) move.addScaledVector(forward, speed);
		if (keys["s"] || keys["arrowdown"]) move.addScaledVector(forward, -speed);
		if (keys["a"] || keys["arrowleft"]) move.addScaledVector(right, -speed);
		if (keys["d"] || keys["arrowright"]) move.addScaledVector(right, speed);
		if (keys[" "]) move.addScaledVector(camera.up, speed);
		if (keys["control"]) move.addScaledVector(camera.up, -speed);

		controls.target.add(move);
		camera.position.add(move);
	}

	function dispose() {
		window.removeEventListener("keydown", onKeyDown);
		window.removeEventListener("keyup", onKeyUp);
		window.removeEventListener("blur", onBlur);
		document.removeEventListener("selectstart", onSelectStart);
	}

	return { update, dispose };
}
