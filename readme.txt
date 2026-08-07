physics-lab/
├── index.html
├── package.json
├── tsconfig.json
└── src/
    ├── main.ts              ← app shell (router, WASD, animation loop)
    ├── style.css             ← dark space theme + navbar + GUI styles
    │
    ├── engine/               ← reusable physics (zero THREE dependency creep)
    │   ├── Body.ts           ← newtonian body: mass, pos/vel/acc, semi-implicit Euler
    │   └── gravity.ts        ← N-body gravitational force with softening
    │
    ├── renderer/             ← reusable THREE.js setup
    │   ├── scene.ts          ← scene, camera, renderer, OrbitControls, lighting, resize
    │   └── starfield.ts      ← additive-blended starfield
    │
    ├── app/                  ← app shell
    │   ├── router.ts         ← hash-based SPA router (SimModule interface)
    │   ├── sidebar.ts        ← collapsible nav tree
    │   └── pause.ts          ← global pause state (P key + GUI checkbox)
    │
    ├── ui/                   ← reusable UI components
    │   ├── gui.ts            ← lil-gui panel factory
    │   └── hud.ts            ← keyboard-hint overlay
    │
    └── sims/                 ← one folder per simulation
        ├── solar-system/
        │   ├── index.ts      ← SimModule: init / update / destroy
        │   ├── constants.ts  ← real SI constants + RENDER_SCALE (1 unit = 1 AU)
        │   └── setup.ts      ← planet factory + procedural sun for this sim
        └── _template/
            └── index.ts      ← copy this to start a new sim






