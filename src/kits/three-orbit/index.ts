import {
	createScene,
	createCamera,
	createRenderer,
	createControls,
	createLighting,
	type CameraOptions,
	type ControlsOptions,
} from "./scene";
import { createStarfield } from "./starfield";
import { createBloomComposer, type BloomOptions } from "./bloom";

export interface ThreeOrbitStageOptions {
	background?: number;
	camera?: CameraOptions;
	controls?: ControlsOptions;
	/** Default true — set false for sims that don't want a starfield backdrop. */
	starfield?: boolean;
	/** Omit for no bloom; `true` for defaults, or pass strength/radius/threshold. */
	bloom?: BloomOptions | boolean;
}

/**
 * Convenience facade wiring the common "3D scene with an orbit camera" case —
 * everything the old shared main.ts render setup did, now opt-in per sim.
 * Sims that want finer control can import scene.ts/bloom.ts/etc. directly instead.
 */
export function createThreeOrbitStage(container: HTMLElement, opts: ThreeOrbitStageOptions = {}) {
	const scene = createScene(opts.background);
	const camera = createCamera(opts.camera);
	const renderer = createRenderer();
	const controls = createControls(camera, renderer, opts.controls);
	createLighting(scene);
	if (opts.starfield ?? true) createStarfield(scene);
	container.appendChild(renderer.domElement);

	const composer = opts.bloom
		? createBloomComposer(renderer, scene, camera, opts.bloom === true ? {} : opts.bloom)
		: null;

	function onResize() {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		renderer.setSize(window.innerWidth, window.innerHeight);
		composer?.setSize(window.innerWidth, window.innerHeight);
	}
	window.addEventListener("resize", onResize);

	function updateControls() {
		controls.update();
		// OrbitControls only touches camera position/quaternion — matrixWorld
		// isn't refreshed until the renderer's next pass. Anything projecting
		// camera space this frame (e.g. screen-space UI) needs it forced now.
		camera.updateMatrixWorld();
	}

	function render() {
		if (composer) composer.render();
		else renderer.render(scene, camera);
	}

	function dispose() {
		window.removeEventListener("resize", onResize);
		controls.dispose();
		renderer.dispose();
		renderer.domElement.remove();
	}

	return { scene, camera, renderer, controls, updateControls, render, dispose };
}
