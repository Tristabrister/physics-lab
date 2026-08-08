import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

export interface BloomOptions {
	strength?: number;
	radius?: number;
	threshold?: number;
}

/**
 * Linear HDR render → bloom → tone map. Only fragments brighter than
 * `threshold` glow — keep an emissive material (e.g. a sun shader) just
 * above it and everything else below so it never blooms.
 */
export function createBloomComposer(
	renderer: THREE.WebGLRenderer,
	scene: THREE.Scene,
	camera: THREE.Camera,
	opts: BloomOptions = {},
) {
	const composer = new EffectComposer(renderer);
	composer.addPass(new RenderPass(scene, camera));
	composer.addPass(
		new UnrealBloomPass(
			new THREE.Vector2(window.innerWidth, window.innerHeight),
			opts.strength ?? 0.45,
			opts.radius ?? 0.6,
			opts.threshold ?? 1.0,
		),
	);
	composer.addPass(new OutputPass()); // ACES tone mapping + sRGB
	return composer;
}
