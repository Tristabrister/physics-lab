import * as THREE from "three";

/** Adds a distant static starfield to the scene (additive-blended points). */
export function createStarfield(scene: THREE.Scene, count = 3000) {
	const positions = new Float32Array(count * 3);
	for (let i = 0; i < count * 3; i += 3) {
		const r = 200 + Math.random() * 200;
		const theta = Math.random() * Math.PI * 2;
		const phi = Math.acos(2 * Math.random() - 1);
		positions[i] = r * Math.sin(phi) * Math.cos(theta);
		positions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
		positions[i + 2] = r * Math.cos(phi);
	}
	const geo = new THREE.BufferGeometry();
	geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
	const mat = new THREE.PointsMaterial({
		color: 0xffffff,
		size: 0.45,
		transparent: true,
		opacity: 0.8,
		blending: THREE.AdditiveBlending,
		depthWrite: false,
	});
	const stars = new THREE.Points(geo, mat);
	scene.add(stars);
	return stars;
}
