import GUI from "lil-gui";
import "./gui.css";

/** Shorthand to create a lil-gui panel with a title (and optional width). */
export function createPanel(title: string, width?: number) {
	return new GUI({ title, ...(width ? { width } : {}) });
}
