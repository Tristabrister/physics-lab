import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/Addons.js";
import { meshRadius } from "./meshRadius";
import "./bodyExplorer.css";

export interface ExplorerBody {
	name: string;
	mesh: THREE.Mesh;
}

export interface BodyExplorerOptions {
	container: HTMLElement;
	domElement: HTMLElement;
	camera: THREE.PerspectiveCamera;
	scene: THREE.Scene;
	controls: OrbitControls;
	getBodies: () => ExplorerBody[];
	getInfo: (mesh: THREE.Mesh) => Record<string, string> | null;
	onLightBoostChange?: (factor: number) => void;
}

const FLY_DURATION = 1.8; // s
const easeInOut = (t: number) => t * t * (3 - 2 * t);

/**
 * Click a body to fly the camera in and lock onto it
 * info panel + connector line + object-list pills, an eased fly-to
 * approach, light-boost compensation, and a visibility floor so distant
 * bodies stay visible as dots instead of going sub-pixel.
 */
export function createBodyExplorer(opts: BodyExplorerOptions) {
	const { container, domElement, camera, scene, controls, getBodies, getInfo, onLightBoostChange } =
		opts;

	const raycaster = new THREE.Raycaster();
	let followTarget: THREE.Mesh | null = null;
	const lastBodyPos = new THREE.Vector3();
	let flyAnim: {
		t: number;
		startDir: THREE.Vector3;
		endDir: THREE.Vector3;
		startDist: number;
		endDist: number;
	} | null = null;
	let currentLightBoost = 1;

	// ── Overlay DOM ──────────────────────────────────────
	const infoPanel = document.createElement("div");
	infoPanel.id = "info-panel";
	infoPanel.style.display = "none";
	container.appendChild(infoPanel);

	const connectorLine = document.createElement("div");
	connectorLine.id = "connector-line";
	connectorLine.style.display = "none";
	container.appendChild(connectorLine);

	const objectList = document.createElement("div");
	objectList.id = "object-list";
	container.appendChild(objectList);

	let lastBodyCount = 0;
	function refreshObjectList() {
		const bodies = getBodies();
		if (bodies.length !== lastBodyCount) {
			lastBodyCount = bodies.length;
			objectList.innerHTML = bodies
				.map(
					(b) =>
						`<button class="obj-pill${followTarget === b.mesh ? " active" : ""}">${b.name}</button>`,
				)
				.join("");
		}
	}
	function onObjectListClick(e: MouseEvent) {
		const btn = (e.target as HTMLElement).closest("button");
		if (!btn) return;
		const found = getBodies().find((b) => b.name === btn.textContent);
		if (found) followBody(found.mesh);
	}
	objectList.addEventListener("click", onObjectListClick);

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

		controls.minDistance = radius * 1.4; // wheel can't push inside the body while following
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

	let downX = 0;
	let downY = 0;
	function onPointerDown(e: PointerEvent) {
		downX = e.clientX;
		downY = e.clientY;
	}
	function onClick(e: MouseEvent) {
		if (e.button !== 0) return;
		if (Math.hypot(e.clientX - downX, e.clientY - downY) > 5) return; 

		const rect = domElement.getBoundingClientRect();
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
		clearFollow(); // clicked empty space
	}
	domElement.addEventListener("pointerdown", onPointerDown);
	domElement.addEventListener("click", onClick);

	function isFollowing() {
		return followTarget !== null;
	}

	/** Camera-affecting step — call before controls.update(). */
	function preRender(dt: number) {
		if (!followTarget) return;
		const targetPos = followTarget.position;

		if (flyAnim) {
			// Interpolate direction linearly, distance geometrically, so the
			// zoom feels constant-rate even across orders of magnitude.
			flyAnim.t = Math.min(flyAnim.t + dt / FLY_DURATION, 1);
			const k = easeInOut(flyAnim.t);
			const dist = flyAnim.startDist * Math.pow(flyAnim.endDist / flyAnim.startDist, k);
			const dir = flyAnim.startDir.clone().lerp(flyAnim.endDir, k).normalize();
			camera.position.copy(targetPos).addScaledVector(dir, dist);
			if (flyAnim.t >= 1) flyAnim = null;
		} else {
			// Locked on: ride along with the body
			camera.position.add(targetPos.clone().sub(lastBodyPos));
		}
		controls.target.copy(targetPos);
		lastBodyPos.copy(targetPos);
	}

	/** DOM/visual step — call after controls.update() + camera.updateMatrixWorld(). */
	function postRender(dt: number) {
		refreshObjectList();
		const vFov = THREE.MathUtils.degToRad(camera.fov);

		if (followTarget) {
			const targetPos = followTarget.position;
			const info = getInfo(followTarget);
			if (info) {
				infoPanel.innerHTML = Object.entries(info)
					.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`)
					.join("");
			}

			// Body's on-screen radius (px), so the panel is offset far enough
			// to clear its silhouette instead of sitting on top of it.
			const dist = camera.position.distanceTo(targetPos);
			const worldPerPixel = (2 * Math.tan(vFov / 2) * dist) / window.innerHeight;
			const bodyRadiusPx = (meshRadius(followTarget) * followTarget.scale.x) / worldPerPixel;

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

		if (onLightBoostChange) {
			const followDist = followTarget ? followTarget.position.length() : 0;
			const targetBoost = followTarget
				? THREE.MathUtils.clamp(Math.max(followDist, 0.3) ** 2, 0.05, 2000)
				: 1;
			const lerp = 1 - Math.pow(0.001, dt);
			currentLightBoost = THREE.MathUtils.lerp(currentLightBoost, targetBoost, lerp);
			onLightBoostChange(currentLightBoost);
		}

		const minScreenPixels = 2;
		for (const body of getBodies()) {
			const mesh = body.mesh;
			const dist = camera.position.distanceTo(mesh.position);
			const worldPerPixel = (2 * Math.tan(vFov / 2) * dist) / window.innerHeight;
			const minDiameter = worldPerPixel * minScreenPixels;
			mesh.scale.setScalar(Math.max(1, minDiameter / (2 * meshRadius(mesh))));
		}
	}

	function dispose() {
		domElement.removeEventListener("pointerdown", onPointerDown);
		domElement.removeEventListener("click", onClick);
		objectList.removeEventListener("click", onObjectListClick);
		infoPanel.remove();
		connectorLine.remove();
		objectList.remove();
	}

	return { preRender, postRender, isFollowing, dispose };
}
