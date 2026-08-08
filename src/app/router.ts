import type * as THREE from "three";

import type { Mesh } from "three";

export interface SimModule {
	init(scene: THREE.Scene): void;
	update(dt: number): void;
	destroy(scene: THREE.Scene): void;
	/** Optional — return extra info for a clicked body (shown in the info panel). */
	getBodyInfo?(mesh: Mesh): Record<string, string> | null;
	/** Optional — list all bodies so the object‑list pills can render. */
	getBodyList?(): { name: string; mesh: Mesh }[];
	/**
	 * Optional — scale the star's light by this factor, so whatever body
	 * the camera is following reads at consistent brightness regardless
	 * of how far it orbits from the star (real inverse-square light means
	 * Mercury would otherwise blow out and Neptune would render black).
	 */
	setLightBoost?(factor: number): void;
}

type SimLoader = () => Promise<SimModule>;

export class Router {
	private scene: THREE.Scene;
	private current: SimModule | null = null;
	private currentName: string | null = null;
	private sims = new Map<string, SimLoader>();
	private navigating = false;

	constructor(scene: THREE.Scene) {
		this.scene = scene;
	}

	register(name: string, loader: SimLoader) {
		this.sims.set(name, loader);
	}

	async navigate(name: string) {
		if (this.currentName === name) return;
		const loader = this.sims.get(name);
		if (!loader) return;

		if (this.current) this.current.destroy(this.scene);

		const mod = await loader();
		this.current = mod;
		this.currentName = name;
		mod.init(this.scene);

		// Set hash without re-triggering hashchange
		this.navigating = true;
		window.location.hash = name;
		setTimeout(() => (this.navigating = false), 0);
	}

	update(dt: number) {
		this.current?.update(dt);
	}

	getBodyInfo(mesh: Mesh): Record<string, string> | null {
		return this.current?.getBodyInfo?.(mesh) ?? null;
	}

	getBodyList(): { name: string; mesh: Mesh }[] {
		return this.current?.getBodyList?.() ?? [];
	}

	setLightBoost(factor: number) {
		this.current?.setLightBoost?.(factor);
	}

	start(defaultSim = "solar-system") {
		const hash = window.location.hash.slice(1) || defaultSim;
		this.navigate(hash);
		window.addEventListener("hashchange", () => {
			if (this.navigating) return; // programmatic change, skip
			const name = window.location.hash.slice(1);
			this.navigate(name);
		});
	}
}
