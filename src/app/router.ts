export interface SimModule {
	mount(container: HTMLElement): void;
	/** Called every animation frame; the sim decides internally what pause means for it. */
	frame(dt: number): void;
	unmount(container: HTMLElement): void;
}

type SimLoader = () => Promise<SimModule>;

export class Router {
	private container: HTMLElement;
	private current: SimModule | null = null;
	private currentName: string | null = null;
	private sims = new Map<string, SimLoader>();
	private navigating = false;

	constructor(container: HTMLElement) {
		this.container = container;
	}

	register(name: string, loader: SimLoader) {
		this.sims.set(name, loader);
	}

	async navigate(name: string) {
		if (this.currentName === name) return;
		const loader = this.sims.get(name);
		if (!loader) return;

		if (this.current) this.current.unmount(this.container);

		const mod = await loader();
		this.current = mod;
		this.currentName = name;
		mod.mount(this.container);

		// Set hash without re-triggering hashchange
		this.navigating = true;
		window.location.hash = name;
		setTimeout(() => (this.navigating = false), 0);
	}

	frame(dt: number) {
		this.current?.frame(dt);
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
