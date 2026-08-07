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

// ── Bloom post-processing ──────────────────────────────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
	new THREE.Vector2(window.innerWidth, window.innerHeight),
	1, // strength  — glow intensity   (tweak me)
	1, // radius   — glow spread        (tweak me)
	0.7, // threshold — only bright pixels bloom
);
composer.addPass(bloomPass);

window.addEventListener("resize", () => {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
	composer.setSize(window.innerWidth, window.innerHeight);
	bloomPass.resolution.set(window.innerWidth, window.innerHeight);
});

// ── Router ─────────────────────────────────────────────
const router = new Router(scene);
router.register("solar-system", () => import("./sims/solar-system/index"));
createSidebar(router, app);
router.start();

// ── WASD camera panning ────────────────────────────────
const keys: Record<string, boolean> = {};
window.addEventListener("keydown", (e) => {
	// Prevent browser shortcuts when flying (Ctrl = find, Space = scroll, WASD = scroll)
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

// ── Pause / play ──────────────────────────────────────
window.addEventListener("keydown", (e) => {
	if (e.key.toLowerCase() === "p" && !e.repeat) {
		e.preventDefault();
		togglePaused();
	}
});

// ── Prevent accidental text selection on Ctrl‑click ────
document.addEventListener("selectstart", (e) => {
	if (keys["control"]) e.preventDefault();
});
window.addEventListener("blur", () => {
	// Release all keys when the window loses focus (prevents stuck keys)
	for (const k of Object.keys(keys)) keys[k] = false;
});

// ── Middle‑mouse drag rotates like left‑mouse ───────────
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

// Object‑list pills
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
	const name = btn.textContent!;
	const found = router.getBodyList().find((b) => b.name === name);
	if (found) {
		followTarget = found.mesh;
		zoomToBody(followTarget);
		infoPanel.style.display = "block";
		connectorLine.style.display = "block";
		refreshObjectList();
	}
});

function clearFollow() {
	followTarget = null;
	infoPanel.style.display = "none";
	connectorLine.style.display = "none";
	refreshObjectList();
}

/** Pull the camera to a comfortable viewing distance from a followed body. */
function zoomToBody(body: THREE.Mesh) {
	const radius = body.geometry.boundingSphere?.radius ?? 1;
	const targetDist = radius * 8;

	// Use the current camera→body direction, or default to a 45° overhead view
	const dir = new THREE.Vector3()
		.subVectors(camera.position, body.position)
		.normalize();
	if (dir.length() < 0.01) dir.set(0.5, 0.5, 1).normalize();

	camera.position.copy(body.position).addScaledVector(dir, targetDist);
	controls.target.copy(body.position);
	lastBodyPos.copy(body.position);
}

// Click to pick a body
renderer.domElement.addEventListener("click", (e) => {
	if (e.button !== 0) return; // left-click only

	const rect = renderer.domElement.getBoundingClientRect();
	const mouse = new THREE.Vector2(
		((e.clientX - rect.left) / rect.width) * 2 - 1,
		-((e.clientY - rect.top) / rect.height) * 2 + 1,
	);

	raycaster.setFromCamera(mouse, camera);
	const hits = raycaster.intersectObjects(scene.children, true);

	for (const hit of hits) {
		const obj = hit.object;
		// Walk up to find a mesh that might belong to a Body
		let cur: THREE.Object3D | null = obj;
		while (cur) {
			if ((cur as THREE.Mesh).isMesh && cur.userData._bodyMesh) {
				followTarget = cur as THREE.Mesh;
				zoomToBody(followTarget);
				infoPanel.style.display = "block";
				connectorLine.style.display = "block";
				refreshObjectList();
				return;
			}
			cur = cur.parent;
		}
	}
	// Clicked empty space → unfollow
	clearFollow();
});

// ── Animation loop ─────────────────────────────────────
let lastTime = 0;

function animate(time: number) {
	const frameSeconds = Math.min((time - lastTime) / 1000, 0.1);
	lastTime = time;

	// WASD — fly the camera through space (move position + target together).
	// Mouse drag still orbits around the current target as usual.
	// Skip when following — the camera is locked to the body.
	if (!followTarget) {
		const flySpeed = 5 * frameSeconds * (keys["shift"] ? 2 : 1);
		const forward = new THREE.Vector3()
			.subVectors(controls.target, camera.position)
			.normalize();
		const right = new THREE.Vector3()
			.crossVectors(forward, camera.up)
			.normalize();
		const up = camera.up.clone();

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

	// Update current sim (skipped while paused)
	if (!isPaused()) {
		router.update(frameSeconds);
	}

	// Refresh object list (cheap DOM check, runs once per frame)
	refreshObjectList();

	// ── Third‑person follow ──────────────────────────
	if (followTarget) {
		const targetPos = followTarget.position;
		const delta = targetPos.clone().sub(lastBodyPos);
		camera.position.add(delta);
		controls.target.copy(targetPos);
		lastBodyPos.copy(targetPos);

		// Update info panel content
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
		const len = Math.hypot(dx, dy);
		const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
		connectorLine.style.width = `${len}px`;
		connectorLine.style.left = `${sx}px`;
		connectorLine.style.top = `${sy}px`;
		connectorLine.style.transform = `rotate(${ang}deg)`;

		refreshObjectList();
	}

	controls.update();
	composer.render();
	requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
