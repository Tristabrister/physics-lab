import * as THREE from "three";
import {
	createScene,
	createCamera,
	createRenderer,
	createControls,
	createLighting,
} from "./renderer/scene";
import { createStarfield } from "./renderer/starfield";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { Router } from "./app/router";
import { createSidebar } from "./app/sidebar";
import { isPaused, togglePaused, onPauseChange } from "./app/pause";
import { createHUD, createPauseBadge } from "./ui/hud";
import "./style.css";

// ── Shared renderer (persists across sims) ─────────────
const app = document.getElementById("app")!;
const scene = createScene();
const camera = createCamera();
const renderer = createRenderer();
const controls = createControls(camera, renderer);
createLighting(scene);
createStarfield(scene);
app.appendChild(renderer.domElement);

// ── Post-processing: linear HDR render → bloom → tone map ──
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(
	new UnrealBloomPass(
		new THREE.Vector2(window.innerWidth, window.innerHeight),
		0.45, // strength — soft corona glow
		0.6, // radius
		1.0, // threshold — only the HDR sun (>1.0) blooms, planets never do
	),
);
composer.addPass(new OutputPass()); // applies ACES tone mapping + sRGB

window.addEventListener("resize", () => {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
	composer.setSize(window.innerWidth, window.innerHeight);
});

// ── Router ─────────────────────────────────────────────
const router = new Router(scene);
router.register("solar-system", () => import("./sims/solar-system/index"));
createSidebar(router, app);
router.start();

// ── Keyboard state ─────────────────────────────────────
const keys: Record<string, boolean> = {};
window.addEventListener("keydown", (e) => {
	// Prevent browser shortcuts while flying (Ctrl = find, Space = scroll)
	if (
		[
			"w",
			"a",
			"s",
			"d",
			"p",
			" ",
			"control",
			"arrowup",
			"arrowdown",
			"arrowleft",
			"arrowright",
		].includes(e.key.toLowerCase())
	) {
		e.preventDefault();
	}
	keys[e.key.toLowerCase()] = true;
});
window.addEventListener("keyup", (e) => {
	keys[e.key.toLowerCase()] = false;
});
window.addEventListener("blur", () => {
	// Release all keys when the window loses focus (prevents stuck keys)
	for (const k of Object.keys(keys)) keys[k] = false;
});

// ── Pause / play ──────────────────────────────────────
window.addEventListener("keydown", (e) => {
	if (e.key.toLowerCase() === "p" && !e.repeat) {
		e.preventDefault();
		togglePaused();
	}
});

// ── Prevent accidental text selection on Ctrl-click ────
document.addEventListener("selectstart", (e) => {
	if (keys["control"]) e.preventDefault();
});

// ── Middle-mouse drag rotates like left-mouse ───────────
controls.mouseButtons = {
	LEFT: THREE.MOUSE.ROTATE,
	MIDDLE: THREE.MOUSE.ROTATE,
	RIGHT: THREE.MOUSE.PAN,
};

// ── HUD ────────────────────────────────────────────────
createHUD(app);
const pauseBadge = createPauseBadge(app);
onPauseChange((p) => {
	pauseBadge.style.display = p ? "block" : "none";
});

// ── Click-to-follow + info panel ───────────────────────
const raycaster = new THREE.Raycaster();
let followTarget: THREE.Mesh | null = null;
const lastBodyPos = new THREE.Vector3();

/** True (unscaled) mesh radius in render units. */
function meshRadius(mesh: THREE.Mesh) {
	if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
	return mesh.geometry.boundingSphere!.radius;
}

// Info popup
const infoPanel = document.createElement("div");
infoPanel.id = "info-panel";
infoPanel.style.display = "none";
app.appendChild(infoPanel);

// Connector line from panel to followed body
const connectorLine = document.createElement("div");
connectorLine.id = "connector-line";
connectorLine.style.display = "none";
app.appendChild(connectorLine);

// Object-list pills
const objectList = document.createElement("div");
objectList.id = "object-list";
app.appendChild(objectList);

let lastBodyCount = 0;
function refreshObjectList() {
	const bodies = router.getBodyList();
	if (bodies.length !== lastBodyCount) {
		lastBodyCount = bodies.length;
		objectList.innerHTML = bodies
			.map(
				(b) =>
					`<button class="obj-pill${
						followTarget === b.mesh ? " active" : ""
					}">${b.name}</button>`,
			)
			.join("");
	}
}
objectList.addEventListener("click", (e) => {
	const btn = (e.target as HTMLElement).closest("button");
	if (!btn) return;
	const found = router.getBodyList().find((b) => b.name === btn.textContent);
	if (found) followBody(found.mesh);
});

// ── Fly-to animation (NASA Eyes style) ─────────────────
// Interpolates the camera's offset from the body: direction linearly,
// distance geometrically — so the zoom feels constant-rate even when
// covering four orders of magnitude.
const FLY_DURATION = 1.8; // s
let flyAnim: {
	t: number;
	startDir: THREE.Vector3;
	endDir: THREE.Vector3;
	startDist: number;
	endDist: number;
} | null = null;

function followBody(mesh: THREE.Mesh) {
	followTarget = mesh;
	lastBodyPos.copy(mesh.position);

	const radius = meshRadius(mesh);
	const offset = new THREE.Vector3().subVectors(camera.position, mesh.position);
	const startDist = offset.length();
	const startDir =
		startDist > 1e-12
			? offset.clone().divideScalar(startDist)
			: new THREE.Vector3(0.5, 0.5, 1).normalize();

	flyAnim = {
		t: 0,
		startDir,
		// Drift toward a slightly elevated approach for a nicer arrival angle
		endDir: startDir.clone().add(new THREE.Vector3(0, 0.35, 0)).normalize(),
		startDist,
		endDist: radius * 5, // body fills ~1/4 of the screen height on arrival
	};

	// Wheel can't push the camera inside the body while following
	controls.minDistance = radius * 1.4;

	infoPanel.style.display = "block";
	connectorLine.style.display = "block";
	lastBodyCount = -1; // force pill refresh
	refreshObjectList();
}

function clearFollow() {
	followTarget = null;
	flyAnim = null;
	controls.minDistance = 0;
	infoPanel.style.display = "none";
	connectorLine.style.display = "none";
	lastBodyCount = -1;
	refreshObjectList();
}

// Click to pick a body — but not when the mouse was dragged (orbiting),
// otherwise every drag-release would clear the current follow.
let downX = 0;
let downY = 0;
renderer.domElement.addEventListener("pointerdown", (e) => {
	downX = e.clientX;
	downY = e.clientY;
});
renderer.domElement.addEventListener("click", (e) => {
	if (e.button !== 0) return; // left-click only
	if (Math.hypot(e.clientX - downX, e.clientY - downY) > 5) return; // drag, not click

	const rect = renderer.domElement.getBoundingClientRect();
	const mouse = new THREE.Vector2(
		((e.clientX - rect.left) / rect.width) * 2 - 1,
		-((e.clientY - rect.top) / rect.height) * 2 + 1,
	);

	raycaster.setFromCamera(mouse, camera);
	for (const hit of raycaster.intersectObjects(scene.children, true)) {
		// Walk up in case the hit is a child of a body mesh
		let cur: THREE.Object3D | null = hit.object;
		while (cur) {
			if (cur.userData.body) {
				followBody(cur as THREE.Mesh);
				return;
			}
			cur = cur.parent;
		}
	}
	// Clicked empty space → unfollow
	clearFollow();
});

// ── Animation loop ─────────────────────────────────────
const easeInOut = (t: number) => t * t * (3 - 2 * t);
let lastTime = 0;

function animate(time: number) {
	const frameSeconds = Math.min((time - lastTime) / 1000, 0.1);
	lastTime = time;

	// WASD — fly the camera through space (position + orbit target move
	// together; mouse drag still orbits). Speed scales with the distance
	// to the nearest body surface: gentle glide up close, AUs per second
	// in deep space. Skipped while following — the camera is locked on.
	if (!followTarget) {
		let nearestSurface = camera.position.distanceTo(controls.target);
		for (const body of router.getBodyList()) {
			const d =
				camera.position.distanceTo(body.mesh.position) - meshRadius(body.mesh);
			if (d < nearestSurface) nearestSurface = d;
		}
		const flySpeed =
			Math.max(nearestSurface, 1e-5) *
			1.2 *
			frameSeconds *
			(keys["shift"] ? 4 : 1);

		const forward = new THREE.Vector3()
			.subVectors(controls.target, camera.position)
			.normalize();
		const right = new THREE.Vector3()
			.crossVectors(forward, camera.up)
			.normalize();
		const up = camera.up;

		const move = new THREE.Vector3();
		if (keys["w"] || keys["arrowup"]) move.addScaledVector(forward, flySpeed);
		if (keys["s"] || keys["arrowdown"])
			move.addScaledVector(forward, -flySpeed);
		if (keys["a"] || keys["arrowleft"]) move.addScaledVector(right, -flySpeed);
		if (keys["d"] || keys["arrowright"]) move.addScaledVector(right, flySpeed);
		if (keys[" "]) move.addScaledVector(up, flySpeed);
		if (keys["control"]) move.addScaledVector(up, -flySpeed);

		controls.target.add(move);
		camera.position.add(move);
	}

	// Advance the current sim (skipped while paused)
	if (!isPaused()) {
		router.update(frameSeconds);
	}

	refreshObjectList();

	// ── Follow + fly-to ──────────────────────────────
	if (followTarget) {
		const targetPos = followTarget.position;

		if (flyAnim) {
			// Animated approach in body-relative space
			flyAnim.t = Math.min(flyAnim.t + frameSeconds / FLY_DURATION, 1);
			const k = easeInOut(flyAnim.t);
			const dist =
				flyAnim.startDist * Math.pow(flyAnim.endDist / flyAnim.startDist, k);
			const dir = flyAnim.startDir
				.clone()
				.lerp(flyAnim.endDir, k)
				.normalize();
			camera.position.copy(targetPos).addScaledVector(dir, dist);
			if (flyAnim.t >= 1) flyAnim = null;
		} else {
			// Locked on: ride along with the body
			camera.position.add(targetPos.clone().sub(lastBodyPos));
		}
		controls.target.copy(targetPos);
		lastBodyPos.copy(targetPos);

		// Info panel content
		const info = router.getBodyInfo(followTarget);
		if (info) {
			infoPanel.innerHTML = Object.entries(info)
				.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`)
				.join("");
		}

		// Pin panel near the body on screen
		const screenPos = targetPos.clone().project(camera);
		const sx = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
		const sy = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;
		const px = sx + 28;
		const py = sy - 48;
		infoPanel.style.left = `${px}px`;
		infoPanel.style.top = `${py}px`;

		// Connector line from body to panel
		const dx = px - sx;
		const dy = py - sy;
		connectorLine.style.width = `${Math.hypot(dx, dy)}px`;
		connectorLine.style.left = `${sx}px`;
		connectorLine.style.top = `${sy}px`;
		connectorLine.style.transform = `rotate(${(Math.atan2(dy, dx) * 180) / Math.PI}deg)`;
	}

	controls.update();

	// ── Distant-body visibility floor ────────────────
	// True scale means a planet is sub-pixel from across the system.
	// Scale meshes up just enough to stay a couple of pixels tall, so
	// bodies stay visible (and clickable) as dots — like NASA Eyes.
	const vFov = (camera.fov * Math.PI) / 180;
	const minScreenPixels = 2;
	for (const body of router.getBodyList()) {
		const mesh = body.mesh;
		const dist = camera.position.distanceTo(mesh.position);
		const worldPerPixel =
			(2 * Math.tan(vFov / 2) * dist) / window.innerHeight;
		const minDiameter = worldPerPixel * minScreenPixels;
		mesh.scale.setScalar(Math.max(1, minDiameter / (2 * meshRadius(mesh))));
	}

	composer.render();
	requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
