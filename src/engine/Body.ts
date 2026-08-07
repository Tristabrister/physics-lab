import { Mesh, Scene, Vector3 } from "three";

export class Body {
	mesh: Mesh;
	name: string;
	mass: number;
	/** Physics position in real metres — NOT scaled for rendering. */
	position: Vector3;
	velocity: Vector3;
	acceleration: Vector3;
	/** Multiplier applied only when syncing physics position → mesh. */
	renderScale = 1;

	constructor(
		mesh: Mesh,
		mass = 1.0,
		position = new Vector3(),
		velocity = new Vector3(),
		acceleration = new Vector3(),
		name = "Body",
	) {
		this.mesh = mesh;
		this.name = name;
		this.mass = mass;
		this.position = position;
		this.velocity = velocity;
		this.acceleration = acceleration;
	}

	update(dt: number) {
		// v = v + a * Δt   (all in real SI)
		this.velocity.addScaledVector(this.acceleration, dt);
		// x = x + v * Δt
		this.position.addScaledVector(this.velocity, dt);

		// Sync to Three.js mesh in render-space (avoid float32 issues with
		// huge raw metre values by scaling down before touching the GPU).
		this.mesh.position
			.set(
				this.position.x * this.renderScale,
				this.position.y * this.renderScale,
				this.position.z * this.renderScale,
			);

		// Reset accumulated forces
		this.acceleration.set(0, 0, 0);
	}

	applyForce(force: Vector3) {
		this.acceleration.addScaledVector(force, 1 / this.mass);
	}

	addToScene(scene: Scene) {
		scene.add(this.mesh);
		this.mesh.position.copy(this.position);
		this.mesh.userData._bodyMesh = true;
	}
}
