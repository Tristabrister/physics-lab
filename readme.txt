physics-lab/
├── index.html
├── package.json
├── tsconfig.json
└── src/
    ├── main.ts              ← app shell: mount point, router, sidebar, pause, one rAF loop
    ├── style.css             ← reset + base theme only — everything else is colocated CSS
    │
    ├── engine/               ← reusable physics, zero rendering dependency
    │   ├── Body.ts            ← newtonian body: mass, pos/vel/acc, semi-implicit Euler
    │   └── gravity.ts         ← N-body gravitational force with softening
    │
    ├── app/                  ← always-on app shell — every sim gets this for free
    │   ├── router.ts           ← hash-based SPA router; SimModule = mount/frame/unmount
    │   ├── sidebar.ts          ← collapsible nav tree
    │   └── pause.ts            ← global pause state (P key + GUI checkbox)
    │
    ├── ui/                   ← generic, content-free DOM widgets
    │   ├── gui.ts               ← lil-gui panel factory
    │   └── hud.ts               ← data-driven hint bar + pause badge
    │
    ├── kits/                 ← OPT-IN bundles a sim can adopt — not every sim needs these
    │   └── three-orbit/        ← "3D scene with an orbit camera"
    │       ├── scene.ts          ← scene/camera/renderer/OrbitControls/lighting factories
    │       ├── starfield.ts      ← additive-blended starfield
    │       ├── bloom.ts          ← optional HDR bloom post-processing
    │       ├── flyCamera.ts      ← optional WASD/space/ctrl flight
    │       ├── bodyExplorer.ts   ← optional click-to-follow, fly-to camera, info panel,
    │       │                       object-list pills, light-boost, distant-body visibility floor
    │       └── index.ts          ← createThreeOrbitStage() — convenience facade wiring the above
    │
    └── sims/                 ← one folder per simulation
        ├── solar-system/       ← uses kits/three-orbit/ end to end — reference example
        │   ├── index.ts          ← SimModule: mount / frame / unmount
        │   ├── constants.ts      ← real SI constants + RENDER_SCALE (1 unit = 1 AU)
        │   └── setup.ts          ← planet factory + procedural sun for this sim
        └── _template/
            └── index.ts          ← copy this to start a new sim

A sim implements mount(container) / frame(dt) / unmount(container) and owns
everything about how it renders — 3D via kits/three-orbit/, a 2D canvas, SVG,
or anything else. engine/, app/, and ui/ are the only pieces every sim shares
by default; kits/ is reusable but always opt-in — pull in only what a given
sim actually needs (e.g. skip bloom, skip three.js entirely).
