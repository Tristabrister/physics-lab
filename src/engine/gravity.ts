import { Body } from "./Body";
import { Vector3 } from "three";

export default function applyGravity(bodies: Body[], dt: number, G: number) {
	const accelerations = bodies.map(() => new Vector3());

	for (let i = 0; i < bodies.length; i++) {
		for (let j = 0; j < bodies.length; j++) {
			if (i === j) continue;
			const direction = new Vector3().subVectors(
				bodies[j].position,
				bodies[i].position,
			);
			// Softening floor — prevents division blow-up when bodies
			// nearly coincide.  1e6 = (1 km)², far below any orbital
			// separation (Earth–Moon ≈ 1.3e17 m²).
			const distanceSq = Math.max(direction.lengthSq(), 1e6);
			const gravityForce = (G * bodies[i].mass * bodies[j].mass) / distanceSq;
			accelerations[i].addScaledVector(
				direction.normalize(),
				gravityForce / bodies[i].mass,
			);
		}
	}

	for (let i = 0; i < bodies.length; i++) {
		bodies[i].acceleration.copy(accelerations[i]);
		bodies[i].update(dt);
	}
}
