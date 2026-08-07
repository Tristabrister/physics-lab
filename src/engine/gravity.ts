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
			// Softening floor to avoid division blowups when bodies nearly coincide.
			// Must stay well below the smallest physical separation in the sim
			// (Earth-Moon = 0.0384 units -> distanceSq ≈ 0.00148).
			const distanceSq = Math.max(direction.lengthSq(), 1e-6);
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
