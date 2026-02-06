# Live Execution Ledger (Feb 6, 2026)

| timestamp (local) | step id | command run | pass/fail | next action |
|---|---|---|---|---|
| 2026-02-06T00:31:xx-0700 | L001 | `pwd && ls -la` | pass | inspect TODO + studio implementation files |
| 2026-02-06T00:32:xx-0700 | L002 | `sed -n '1,260p' TODO.md` + `rg --files web/src ...` + `sed -n '1,260p' server/models/tribrid_config_model.py` + `sed -n '1,260p' scripts/check_banned.py` | pass | inspect current fields/layout code |
| 2026-02-06T00:33:xx-0700 | L003 | `rg -n learning_reranker_* ...` + `sed -n '260,620p' scripts/check_banned.py` + `sed -n '1,620p' web/src/components/RerankerTraining/TrainingStudio.tsx` | pass | inspect remaining studio + style files |
| 2026-02-06T00:33:xx-0700 | L004 | `sed -n '620,1180p' TrainingStudio.tsx` + `sed -n '1,640p' NeuralVisualizer.tsx` + style file reads | pass | inspect tail sections + RAG tab files |
| 2026-02-06T00:34:xx-0700 | L005 | `wc -l` + `tail -n 220` TrainingStudio + `sed -n` on remaining `learning-studio.css` | pass | inspect subtab files/tests/deps |
| 2026-02-06T00:34:xx-0700 | L006 | read `RAGSubtabs.tsx`, `RAGTab.tsx`, `LearningRankerSubtab.tsx`, `.tests/web/learning-reranker-studio.spec.ts`, `web/package.json`, `playwright.config.ts` | pass (one expected missing-file read fail) | start edits (Pydantic-first, then frontend migration) |
| 2026-02-06T00:35:xx-0700 | L007 | `apply_patch TODO.md` (insert live ledger + new phase checklist) | pass | implement Pydantic/UI config updates |
| 2026-02-06T00:36:xx-0700 | L008 | `sed -n` on `server/models/tribrid_config_model.py` env/UI sections + `sed -n '1,120p' TODO.md` | pass | patch UIConfig + env mapping |
| 2026-02-06T00:36:xx-0700 | L009 | `apply_patch server/models/tribrid_config_model.py` (new dockview/log/preset fields + renderer enum + env serialization/import) | pass | update glossary + regenerate types |
| 2026-02-06T00:37:xx-0700 | L010 | glossary/style discovery (`rg` + `sed`) and studio inline-style scan (`rg style={`) | pass | patch glossary then frontend migration |
| 2026-02-06T00:37:xx-0700 | L011 | `git status --short` (workspace state check) | pass | continue local-only edits without reverting unrelated changes |
| 2026-02-06T00:38:xx-0700 | L012 | `apply_patch data/glossary.json` + `cp data/glossary.json web/public/glossary.json` | pass | regenerate/validate generated types and glossary |
| 2026-02-06T00:38:xx-0700 | L013 | `uv run scripts/generate_types.py` + `uv run scripts/validate_types.py` + `uv run scripts/validate_glossary.py` | pass | start frontend migration (dockview + modular visualizer + xterm) |
| 2026-02-06T00:39:xx-0700 | L014 | dependency/runtime discovery (`npm view` for `dockview` + `xterm` packages, Dockview typings inspection, style overlap scans) | pass | install frontend deps and implement dockview/xterm UI |
| 2026-02-06T00:39:xx-0700 | L015 | `npm --prefix web install dockview xterm @xterm/addon-fit @xterm/addon-search` | pass | wire dockview layout + xterm logs path |
| 2026-02-06T00:40:xx-0700 | L016 | `apply_patch server/models/tribrid_config_model.py` (add `learning_reranker_dockview_layout_json` + env mapping) | pass | regenerate types/glossary again |
| 2026-02-06T00:40:xx-0700 | L017 | `apply_patch data/glossary.json` + `cp` + `uv run scripts/generate_types.py` + `uv run scripts/validate_types.py` + `uv run scripts/validate_glossary.py` | pass | begin frontend code refactor |

# Learning Ranker Studio Recovery + Headline Upgrade (Feb 6, 2026)

## Phase 0 — Safety + tracker discipline
- [x] Add strict live execution ledger at the top of this file and keep updating it per command bundle.
- [ ] Freeze brand + navigation invariants before studio edits.

## Phase 1 — Stabilize layout first
- [ ] Remove Learning Studio selector overlap from `web/src/styles/global.css` so studio styles live in `web/src/styles/learning-studio.css`.
- [ ] Keep explicit brand lock in `web/src/styles/main.css` for `.topbar .brand` + `.topbar .tagline`.
- [ ] Refactor `TrainingStudio.tsx` top chrome to compact command rail + optional setup drawer.
- [ ] Move setup-heavy detail cards into inspector/config surfaces by default.
- [ ] Add hard viewport constraints in `learning-studio.css` so panel engine cannot collapse below usable minimum.

## Phase 2 — Docking engine migration
- [ ] Add `dockview` dependency and studio-scoped stylesheet wiring.
- [ ] Replace `react-resizable-panels` layout in `TrainingStudio.tsx` with Dockview-based left/center/right/bottom pane model.
- [ ] Enable maximize/popout for visualizer/logs/inspector panes.
- [ ] Persist layout via Pydantic-backed UI config fields (`generated.ts`).

## Phase 3 — Neural visualizer renderer upgrade
- [ ] Split `NeuralVisualizer.tsx` into modular renderer files:
  - `web/src/components/RerankerTraining/NeuralVisualizerCore.tsx`
  - `web/src/components/RerankerTraining/NeuralVisualizerWebGPU.tsx`
  - `web/src/components/RerankerTraining/NeuralVisualizerWebGL2.tsx`
  - `web/src/components/RerankerTraining/NeuralVisualizerCanvas2D.tsx`
- [ ] Implement `auto` renderer routing: WebGPU → WebGL2 → Canvas2D.
- [ ] Keep deterministic ring buffer and add higher-density trajectory/glow pipeline.

## Phase 4 — Logs/timeline upgrade
- [ ] Add `xterm` logs renderer path with fit/search/copy/export/clear.
- [ ] Keep JSON logs fallback mode.
- [ ] Virtualize timeline and run list with `@tanstack/react-virtual`.
- [ ] Add pane expansion controls + keyboard shortcuts.

## Phase 5 — Regression guardrails
- [ ] Preserve all six RAG subtabs in `web/src/components/tabs/RAGTab.tsx` + `web/src/components/RAG/RAGSubtabs.tsx`.
- [ ] Add a regression check asserting all six subtabs are visible + routable.
- [ ] Add guard assertions for top-left brand typography/color lock.

## Phase 6 — Inline style policy (studio scope)
- [ ] Enforce no inline style for `web/src/components/RerankerTraining/*.tsx` and `web/src/components/RAG/LearningRankerSubtab.tsx`.
- [ ] Integrate studio-scope inline-style check into `scripts/check_banned.py`.
- [ ] Add staged backlog note for app-wide inline style migration.

## Phase 7 — Verification gates
- [ ] Run `uv run scripts/generate_types.py` + `uv run scripts/validate_types.py`.
- [ ] Run `uv run scripts/check_banned.py`.
- [ ] Run `uv run pytest -q`.
- [ ] Run `npm --prefix web run lint`.
- [ ] Run `npm --prefix web run build`.
- [ ] Run `npx playwright test .tests/web/learning-reranker-studio.spec.ts --project web`.
- [ ] Add and run additional studio Playwright specs:
  - 1280x720 baseline no-collapsed panes
  - visualizer popout
  - logs popout
  - dock layout persistence
  - RAG subtab non-regression

---

# MLX Qwen3 “Learning Reranker” (real training + real inference) — drift guard TODOs

**Note:** This TODO is being executed **incrementally in Cursor** (not Codex CLI) so we can iterate file-by-file, run the repo’s verification loop locally, and keep this checklist updated as we go.

## Phase 1 — Pydantic & types (lock the spec)
- [x] Add TrainingConfig fields + `/api/reranker/score` models in `server/models/tribrid_config_model.py`.
  - Verify: `uv run scripts/validate_types.py` (will fail until generated if types changed)
- [x] Regenerate TS types.
  - Verify: `uv run scripts/generate_types.py` then `uv run scripts/validate_types.py`
- [x] Add tooltips for new keys in `data/glossary.json` and sync `web/public/glossary.json` if required by repo workflow.
  - Verify: `uv run scripts/check_banned.py` (and `uv run scripts/validate_glossary.py` if present)

## Phase 2 — MLX backend module (inference first, no training yet)
- [x] Create `server/reranker/mlx_qwen3.py`:
  - Canonical prompt constants
  - Truncation preserving suffix
  - Yes/no id resolution + validations
  - Batched scoring (right-pad + gather logits at `lengths-1`)
  - Hot-reload fingerprinting (`adapter.npz`) with monotonic throttle
  - Idle unload guard (no unload mid-flight; lock/refcount)
  - Cold loads in `asyncio.to_thread`
  - Verify: `uv run pytest -q tests/unit/test_learning_backend_resolution.py` (once added)

## Phase 3 — Wire MLX inference into reranking pipeline
- [x] Update `server/retrieval/rerank.py`:
  - Accept `training_config`
  - Resolve backend: `auto|mlx_qwen3|transformers`
  - If MLX: call `MLXQwen3Reranker.score_pairs_batched`
  - Include backend fields in chunk metadata
  - Verify: `uv run pytest -q` (targeted reranker tests)
- [x] Update `server/retrieval/fusion.py` to pass `cfg.training` into `Reranker`.
  - Verify: `uv run pytest -q` (targeted reranker tests)

## Phase 4 — Training + eval + promotion (MLX)
- [x] Create `server/training/mlx_qwen3_trainer.py`:
  - Triplet→pair conversion with `negative_ratio=5` and deterministic sampling
  - Deterministic dev split (seed=0) reused for baseline/new eval
  - LoRA training with correct gradient accumulation (tree-add → avg → single update/eval)
  - Emit existing `RerankerTrainMetricEvent` shape
  - Write run artifact dir with `adapter.npz`, `adapter_config.json`, `tribrid_reranker_manifest.json`
  - Verify: `uv run pytest -q tests/unit/test_mlx_grad_accum_contract.py`
- [x] Update `server/api/reranker.py`:
  - Backend selection for training/eval
  - Baseline gating via manifest (Bug Trap #2)
  - Promotion gating by primary metric + epsilon
  - Atomic promotion via existing helper
  - Add `POST /api/reranker/train/run/{run_id}/promote`
  - Verify: `uv run pytest -q` (targeted API + unit tests)

## Phase 5 — Debug proof endpoint
- [x] Add `POST /api/reranker/score` in `server/api/reranker.py`.
  - Verify: `uv run pytest -q tests/api/test_reranker_score_endpoint.py`

## Phase 6 — Dependencies & ignore rules
- [x] Update `pyproject.toml` with optional `mlx` extras.
- [x] Update `.gitignore` to ignore `*.npz`, `adapters/`, and MLX adapter artifacts.
  - Verify: `uv run scripts/check_banned.py`

## Phase 7 — Web/Playwright obligations (only if web changes)
- [x] If `web/` changed: `npm --prefix web run lint` and `npm --prefix web run build`
- [x] If GUI-affecting changes occurred: `./start.sh --with-observability` and Playwright E2E.
- [x] Final: `uv run scripts/check_banned.py` + `uv run scripts/validate_types.py` + `uv run pytest -q`

## Phase 8 — Frontend surfacing (learning backend + score proof + studio promote)
- [x] Export `RerankerScoreRequest/Response` in `web/src/types/generated.ts` (via `scripts/generate_types.py` model list).
- [x] Surface MLX learning backend knobs in UI (backend/base model/LoRA/promotion/unload).
- [x] Add “debug proof” UI using `POST /api/reranker/score`.
- [x] Add Training Studio “Promote” button wired to `POST /api/reranker/train/run/{run_id}/promote`.
- [x] Add Welch-labs-style projection panel (`proj_x/proj_y`) + pass-through progress metrics for live telemetry.

---

# Studio V3 Overhaul (Feb 2026 execution tracker)

## Phase 1 — Pydantic-first studio controls
- [x] Add `TrainingConfig.learning_reranker_telemetry_interval_steps` to `server/models/tribrid_config_model.py`.
- [x] Add `UIConfig` studio/visualizer controls to `server/models/tribrid_config_model.py`.
- [x] Wire env export/import for all new studio fields in `TriBridConfig.to_env_dict` + `TriBridConfig.from_env`.
- [x] Add glossary entries for all new studio/visualizer keys in `data/glossary.json`.
- [x] Regenerate and validate TS types.
  - Verify: `uv run scripts/generate_types.py` then `uv run scripts/validate_types.py`

## Phase 2 — Frontend dependencies + app shell hygiene
- [x] Add React-18 compatible visualizer/layout deps in `web/package.json`:
  - `three`, `@react-three/fiber@^8`, `@react-three/drei@^9`, `@react-three/postprocessing@^2`, `postprocessing`
  - `react-resizable-panels`, `@tanstack/react-virtual`, `camera-controls`, `motion`, `gl-matrix`
- [x] Add expressive studio fonts via package deps and tokens (non-default stack).
- [x] Remove global wildcard “nuke” overrides in `web/src/styles/tokens.css` that flatten the entire app.
- [x] Replace touched inline style blocks with class-based styling in:
  - `web/src/App.tsx`
  - `web/src/components/RAG/RAGSubtabs.tsx`

## Phase 3 — Learning Ranker layout rebuild (real usability)
- [x] Rebuild `web/src/components/RerankerTraining/TrainingStudio.tsx` with resizable panel groups:
  - Left dock (runs), center hero (visualizer), right inspector, bottom timeline/logs.
- [x] Persist panel ratios via Pydantic-backed config fields.
- [x] Ensure triplet mining/training actions are first-class and always visible.
- [x] Fix RAG subtab visibility regression by replacing hidden-default dependency with explicit `data-state="visible"` contract in `RAGSubtabs`.
- [x] Replace stacked header action rail with compact command bar + layout presets (`Balanced`, `Focus Viz`, `Focus Logs`) to recover hero/log space.
- [ ] Use virtualized lists for large run/event/log collections.
- [x] Eliminate clipping/scroll dead zones in studio and parent containers.

## Phase 4 — Neural Visualizer V3 (library-backed)
- [ ] Replace monolithic `NeuralVisualizer.tsx` with modular renderer architecture:
  - `NeuralVisualizer3D.tsx`
  - `NeuralVisualizerFallback2D.tsx`
  - shared telemetry projection/util modules
- [x] Implement cinematic trajectory scene (grid/field/trail/point energy).
- [x] Implement robust controls: live, play/pause, scrub, zoom/pan/reset, quality mode.
- [x] Keep deterministic ring-buffer behavior + renderer decimation.
- [x] Preserve “Awaiting telemetry…” state and WebGL2 fallback.
- [x] Add fullscreen pop-out modal for Neural Visualizer from Learning Ranker studio.

## Phase 5 — Tests + verification
- [ ] Add/refresh backend tests for new Pydantic fields and telemetry cadence.
- [ ] Add Playwright web tests under `.tests/web/` for:
  - panel resize + persistence
  - visibility/discoverability of mine/train/evaluate/promote controls
  - visualizer telemetry + controls + fallback
- [ ] Run validation suite:
  - `uv run scripts/check_banned.py`
  - `uv run scripts/validate_types.py`
  - `uv run pytest -q`
  - `npm --prefix web run lint`
  - `npm --prefix web run build`
  - `npx playwright test --project web`

## Emergency Fixes — Live tracking (current)
- [x] Restore brand lock for top-left logo typography/color in `web/src/styles/main.css`.
- [x] Fix studio grid row mismatch (`training-studio-root` has 4 children, CSS rows currently 3) in `web/src/styles/learning-studio.css`.
- [x] Fix Learning Ranker right inspector scroll in `Paths + Config` tab (`.studio-inspector-body` block flow + auto overflow) in `web/src/styles/learning-studio.css`.
- [ ] Verify no pointer interception from setup cards over visualizer controls.
- [ ] Ensure Learning Reranker default layout shows functional center/right/bottom content (no blank collapsed panes).
- [ ] Re-run web verification:
  - `npm --prefix web run lint`
  - `npm --prefix web run build`
  - `npx playwright test .tests/web/learning-reranker-studio.spec.ts --project web`
