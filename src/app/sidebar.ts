import type { Router } from "./router";
import "./sidebar.css";

// ── Navigation tree (edit this to add / reorganise sims) ──
export interface NavNode {
	id: string;
	label: string;
	type: "folder" | "sim";
	children?: NavNode[];
}

export const NAV_TREE: NavNode[] = [
	{
		id: "newtonian",
		label: "Classical Physics",
		type: "folder",
		children: [
			{
				id: "solar-system",
				label: "N-body Simulation - Solar System",
				type: "sim",
			},
		],
	},
];

// ── Sidebar ─────────────────────────────────────────────
export function createSidebar(router: Router, parent: HTMLElement) {
	// Hamburger toggle
	const toggle = document.createElement("button");
	toggle.id = "sidebar-toggle";
	toggle.innerHTML = "☰";
	toggle.setAttribute("aria-label", "Toggle navigation");

	// Overlay backdrop (closes sidebar on click)
	const backdrop = document.createElement("div");
	backdrop.id = "sidebar-backdrop";

	// Panel
	const panel = document.createElement("nav");
	panel.id = "sidebar";

	// Build tree
	const ul = buildTree(NAV_TREE, router);
	panel.appendChild(ul);

	// Open / close
	let open = false;
	function setOpen(v: boolean) {
		open = v;
		panel.classList.toggle("open", v);
		backdrop.classList.toggle("open", v);
		toggle.classList.toggle("open", v);
	}
	toggle.addEventListener("click", () => setOpen(!open));
	backdrop.addEventListener("click", () => setOpen(false));

	parent.appendChild(toggle);
	parent.appendChild(backdrop);
	parent.appendChild(panel);

	// Highlight active sim
	window.addEventListener("hashchange", highlight);
	highlight();
	function highlight() {
		const active = window.location.hash.slice(2);
		panel.querySelectorAll("a").forEach((a) => {
			a.classList.toggle("active", (a as HTMLElement).dataset.sim === active);
		});
	}

	return panel;
}

function buildTree(nodes: NavNode[], router: Router): HTMLUListElement {
	const ul = document.createElement("ul");
	for (const node of nodes) {
		const li = document.createElement("li");

		if (node.type === "folder") {
			const summary = document.createElement("button");
			summary.className = "folder-toggle";
			summary.innerHTML = `<span class="arrow">▸</span> ${node.label}`;

			const sub = document.createElement("div");
			sub.className = "folder-children";
			if (node.children) {
				sub.appendChild(buildTree(node.children, router));
			}

			summary.addEventListener("click", () => {
				const expanded = summary.classList.toggle("expanded");
				sub.classList.toggle("open", expanded);
			});

			li.appendChild(summary);
			li.appendChild(sub);
		} else {
			const a = document.createElement("a");
			a.href = `#/${node.id}`;
			a.dataset.sim = node.id;
			a.textContent = node.label;
			a.addEventListener("click", (e) => {
				e.preventDefault();
				router.navigate(node.id);
				// Close sidebar on sim selection
				document.getElementById("sidebar")?.classList.remove("open");
				document.getElementById("sidebar-backdrop")?.classList.remove("open");
				document.getElementById("sidebar-toggle")?.classList.remove("open");
			});
			li.appendChild(a);
		}

		ul.appendChild(li);
	}
	return ul;
}
