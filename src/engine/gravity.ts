import type { Body } from "./Body";
import { Vector3 } from "three";

// Softening floor — prevents division blow-up if bodies nearly
// coincide. (1 km)², far below any orbital separation.
const SOFTENING_SQ = 1e6;

const _dir = new Vector3();

/**
 * Accumulate pairwise gravitational acceleration (each pair visited
 * once — Newton's third law gives the opposite member for free),
 * then advance every body by dt.
 */
export default function applyGravity(bodies: Body[], dt: number, G: number) {
	for (let i = 0; i < bodies.length; i++) {
		for (let j = i + 1; j < bodies.length; j++) {
			const a = bodies[i];
			const b = bodies[j];
			_dir.subVectors(b.position, a.position);
			const distSq = Math.max(_dir.lengthSq(), SOFTENING_SQ);
			_dir.normalize();
			const gOverD2 = G / distSq;
			a.acceleration.addScaledVector(_dir, gOverD2 * b.mass);
			b.acceleration.addScaledVector(_dir, -gOverD2 * a.mass);
		}
	}
	for (const body of bodies) body.update(dt);
}
