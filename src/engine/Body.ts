import { Mesh, Scene, Vector3 } from "three";

export class Body {
	mesh: Mesh;
	name: string;
	mass: number;
	position: Vector3;
	velocity: Vector3;
	acceleration = new Vector3();

	/** Metres → render units, applied only when syncing to the mesh. */
	renderScale: number;

	constructor(
		mesh: Mesh,
		name: string,
		mass: number,
		position: Vector3,
		velocity: Vector3,
		renderScale = 1,
	) {
		this.mesh = mesh;
		this.name = name;
		this.mass = mass;
		// Clone so re-initialising a sim never sees state mutated by a
		// previous run of the same constants.
		this.position = position.clone();
		this.velocity = velocity.clone();
		this.renderScale = renderScale;
	}

	/** Semi-implicit (symplectic) Euler step, then sync the mesh. */
	update(dt: number) {
		this.velocity.addScaledVector(this.acceleration, dt);
		this.position.addScaledVector(this.velocity, dt);
		this.syncMesh();

		this.acceleration.set(0, 0, 0);
	}

	/** Copy the physics position into render space. */
	syncMesh() {
		this.mesh.position.copy(this.position).multiplyScalar(this.renderScale);
	}

	applyForce(force: Vector3) {
		this.acceleration.addScaledVector(force, 1 / this.mass);
	}

	addToScene(scene: Scene) {
		scene.add(this.mesh);
		this.syncMesh();
		this.mesh.userData.body = this;
	}
}
