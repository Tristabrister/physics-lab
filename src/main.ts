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

// ── Light boost ──────────────────────────────────────────
// Sunlight is real inverse-square, so a fixed light calibrated for Earth
// (~1 AU) leaves Mercury blown out and Neptune essentially black — both
// physically correct, both unwatchable. Like a camera's auto gain, the
// star's light scales with (distance from it)² while following a body,
// exactly cancelling the falloff so whatever you're looking at reads at
// Earth-equivalent brightness.
//
// This scales the actual light (via the sim's setLightBoost), not
// camera exposure — a global exposure multiplier was tried first, and
// broke the sun's own appearance both ways: at distance 0 (following
// the sun itself) it clamped to a dim floor and looked washed-out flat;
// while following a distant planet it grew to 100s–1000s and blew the
// sun into a flickering white blob whenever it re-entered frame, since
// exposure is a whole-frame multiplier and the sun's HDR shader was
// never meant to be part of that compensation. Scaling the light
// instead leaves the sun (a self-lit ShaderMaterial that ignores scene
// lights) untouched no matter what's followed.
//
// Assumes the star sits at the scene origin — true for this sim, worth
// revisiting if a future sim doesn't put its star there. Distance is
// read directly in render units since 1 render unit = 1 AU by
// construction (RENDER_SCALE).
const BASE_LIGHT_BOOST = 1;
let currentLightBoost = BASE_LIGHT_BOOST;

// ── Animation loop ─────────────────────────────────────
const easeInOut = (t: number) => t * t * (3 - 2 * t);
let lastTime = 0;

function animate(time: number) {
	const frameSeconds = Math.min((time - lastTime) / 1000, 0.1);
	lastTime = time;
	const vFov = THREE.MathUtils.degToRad(camera.fov);

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

	// ── Follow + fly-to: reposition the camera ───────
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
	}

	controls.update();

	// OrbitControls only touches camera.position/quaternion — matrixWorld
	// (and matrixWorldInverse, which .project() reads) isn't refreshed
	// until the renderer's next pass. Force it now so the label below is
	// projected through *this* frame's camera, not last frame's. Skipping
	// this makes the label lag behind the body by one frame's motion —
	// invisible at low sim speed, increasingly visible as speed (and thus
	// per-frame camera movement while following) goes up.
	camera.updateMatrixWorld();

	// ── Info panel + connector line ──────────────────
	if (followTarget) {
		const targetPos = followTarget.position;

		const info = router.getBodyInfo(followTarget);
		if (info) {
			infoPanel.innerHTML = Object.entries(info)
				.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`)
				.join("");
		}

		// Body's on-screen radius (px), so the panel is offset far enough
		// to clear its silhouette instead of sitting on top of it.
		const dist = camera.position.distanceTo(targetPos);
		const worldPerPixel = (2 * Math.tan(vFov / 2) * dist) / window.innerHeight;
		const bodyRadiusPx =
			(meshRadius(followTarget) * followTarget.scale.x) / worldPerPixel;

		const screenPos = targetPos.clone().project(camera);
		const sx = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
		const sy = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;

		// Anchor up-right of the body, clear of its silhouette.
		const margin = 16;
		const dirX = Math.SQRT1_2;
		const dirY = -Math.SQRT1_2;
		let px = sx + dirX * (bodyRadiusPx + margin);
		let py = sy + dirY * (bodyRadiusPx + margin);

		// Clamp fully on-screen. CSS anchors the panel's bottom-left
		// corner at (left, top) and grows up-right from there.
		const panelW = infoPanel.offsetWidth || 160;
		const panelH = infoPanel.offsetHeight || 90;
		px = THREE.MathUtils.clamp(px, margin, window.innerWidth - panelW - margin);
		py = THREE.MathUtils.clamp(py, panelH + margin, window.innerHeight - margin);

		infoPanel.style.left = `${px}px`;
		infoPanel.style.top = `${py}px`;

		// Connector line starts at the body's edge, not its centre, so it
		// never draws across the body itself.
		const lsx = sx + dirX * bodyRadiusPx;
		const lsy = sy + dirY * bodyRadiusPx;
		const dx = px - lsx;
		const dy = py - lsy;
		connectorLine.style.width = `${Math.hypot(dx, dy)}px`;
		connectorLine.style.left = `${lsx}px`;
		connectorLine.style.top = `${lsy}px`;
		connectorLine.style.transform = `rotate(${(Math.atan2(dy, dx) * 180) / Math.PI}deg)`;
	}

	// Ease the boost toward its target rather than snapping, so it settles
	// in over about the same beat as the fly-to camera move. Distance is
	// clamped away from 0 — a body's own distance from itself (following
	// the sun) would otherwise divide-by-zero-style blow up the target.
	const followDist = followTarget ? followTarget.position.length() : 0;
	const targetLightBoost = followTarget
		? THREE.MathUtils.clamp(Math.max(followDist, 0.3) ** 2, 0.05, 2000)
		: BASE_LIGHT_BOOST;
	const boostLerp = 1 - Math.pow(0.001, frameSeconds);
	currentLightBoost = THREE.MathUtils.lerp(
		currentLightBoost,
		targetLightBoost,
		boostLerp,
	);
	router.setLightBoost(currentLightBoost);

	// ── Distant-body visibility floor ────────────────
	// True scale means a planet is sub-pixel from across the system.
	// Scale meshes up just enough to stay a couple of pixels tall, so
	// bodies stay visible (and clickable) as dots — like NASA Eyes.
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
