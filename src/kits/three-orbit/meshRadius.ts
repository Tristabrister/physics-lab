import type { Mesh } from "three";

/** True (unscaled) mesh radius in render units. */
export function meshRadius(mesh: Mesh) {
	if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
	return mesh.geometry.boundingSphere!.radius;
}
