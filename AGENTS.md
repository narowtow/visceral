# Visceral: agent guide

Visceral is a portfolio data-science project. It is an interactive 3D human body whose organs are colored by global public-health burden (WHO Global Health Estimates 2023), filterable by country, sex, age group, year and measure.

## Layout
- `contracts/`: **the data contract** between pipeline and web. Read `contracts/README.md` and `contracts/organs.json` before touching data code. Never change the contract silently; if a change is required, say so in your final response.
- `pipeline/`: Python 3.14, managed by **uv** (`uv run …`, `uv run pytest`). Package `visceral_pipeline` in `pipeline/src/`. Config in `pipeline/config/`. Raw data in `pipeline/data/raw/` (git-ignored, already downloaded; never fetch from the network).
- `web/`: Vite + React 19 + TypeScript + React Three Fiber + drei + Zustand + Recharts + Tailwind 4. `npm run build`, `npm test` (Vitest), `npm run lint` (oxlint).
- `assets/`: 3D model build (BodyParts3D → GLB via Blender headless script).

## Rules
- There is **no network access** in the sandbox. Dependencies are preinstalled (`web/node_modules`, `pipeline/.venv`). Do not add new dependencies unless the task allows it. If you truly need one, stop and say which and why.
- Keep changes inside the files and directories your task owns.
- Missing data is `null`, never `0`. Never invent statistics. Synthetic data must be labeled as such.
- Medical framing: colors show *burden associated with causes mapped to an organ*, never "organ health". No diagnosis or advice.
- Accessibility is required: everything doable on the 3D canvas must also be doable via the HTML organ list and keyboard.
- Write tests for logic you add. Run the relevant checks before finishing and report their results honestly.
- Write code a reviewer can read: small modules, clear names, brief comments only where the "why" is not obvious.
