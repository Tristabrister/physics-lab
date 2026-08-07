import GUI from "lil-gui";

/** Shorthand to create a lil-gui panel with a title. */
export function createPanel(title: string) {
	return new GUI({ title });
}
