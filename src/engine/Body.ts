import { Mesh, Scene, Vector3 } from "three";

export class Body {
	mesh: Mesh;
	name: string;
	mass: number;
	position: Vector3;
	velocity: Vector3;
	acceleration: Vector3;

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
		// v = v + a * Δt
		this.velocity.addScaledVector(this.acceleration, dt);
		// x = x + v * Δt
		this.position.addScaledVector(this.velocity, dt);
		this.mesh.position.copy(this.position);
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
