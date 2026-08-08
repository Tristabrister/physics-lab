import "./style.css";
import { Router } from "./app/router";
import { createSidebar } from "./app/sidebar";
import { togglePaused, onPauseChange } from "./app/pause";
import { createPauseBadge } from "./ui/hud";

const app = document.getElementById("app")!;

// Sims mount their own canvas/DOM here
const viewport = document.createElement("div");
viewport.id = "sim-viewport";
app.appendChild(viewport);

const router = new Router(viewport);
router.register("solar-system", () => import("./sims/solar-system"));
createSidebar(router, app);
router.start();

// ── Pause / play (global — applies to whatever sim is mounted) ──
window.addEventListener("keydown", (e) => {
	if (e.key.toLowerCase() === "p" && !e.repeat) {
		e.preventDefault();
		togglePaused();
	}
});
const pauseBadge = createPauseBadge(app);
onPauseChange((paused) => {
	pauseBadge.style.display = paused ? "block" : "none";
});

// ── One rAF loop for the whole app; the active sim owns everything else ──
let lastTime = 0;
function tick(time: number) {
	const dt = Math.min((time - lastTime) / 1000, 0.1); // clamp huge gaps (e.g. backgrounded tab)
	lastTime = time;
	router.frame(dt);
	requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
