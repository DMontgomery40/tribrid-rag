# Exhaustive UI Realness Suite (Playwright)

## Goal

Build and run a literal UI test program that interacts with every reachable button, dropdown, toggle, radio, text field, and subtab in the React app, with strict post-change persistence checks and retrieval-quality probes.

This plan intentionally assumes long runtime and high cost (hours to days) as acceptable.

## Non-Negotiable Rules

1. Every route and declared subtab is visited.
2. For each setting mutation (`select`, `checkbox`, `radio`, `range`, `number`, `text`, `textarea`), the suite executes:
   - `Apply All Changes`
   - refresh/reload
   - double-check persisted state
3. Retrieval-impacting mutations trigger real user-style chat probes.
4. Probe prompts must be real-world questions, not toy strings (`"hi"`, `"test"`, `"query"` are forbidden).
5. Each probe response receives feedback (`thumbsup` or `thumbsdown`) with honest signal only.
6. API key / webhook / secret input surfaces are excluded from mutation.
7. Trivial obvious fixes can be auto-applied by follow-up remediation loop; non-obvious failures are logged with structured findings.

## Implemented Canonical Suite

- Config: `/Users/davidmontgomery/ragweld/playwright.exhaustive.config.ts`
- Suite: `/Users/davidmontgomery/ragweld/web/tests/e2e/exhaustive/coverage.spec.ts`
- Harness: `/Users/davidmontgomery/ragweld/web/tests/e2e/exhaustive/harness.ts`
- Output sink: `/Users/davidmontgomery/ragweld/web/tests/e2e/exhaustive/outcome_sink.ts`
- Surface catalog and question bank: `/Users/davidmontgomery/ragweld/web/tests/e2e/exhaustive/suite_config.ts`
- Runner doc: `/Users/davidmontgomery/ragweld/web/tests/e2e/exhaustive/README.md`

## What the Canonical Suite Does Today

1. Navigates all known surfaces from route config.
2. Enumerates visible controls and assigns fingerprints.
3. Executes deterministic action per control.
4. On mutations, applies save/reload/double-check against UI and backend config.
5. Runs a propagation scan across other surfaces when mirror controls share id/name.
6. For retrieval-like controls, runs chat probe + feedback + eval/mcp smoke checks.
7. Writes `ndjson` action log and aggregate summary.

## Cost/Runtime Expectations

- Full run can take many hours (or multi-day with all options and destructive mode).
- Retrieval/indexing-heavy settings may cause repeated expensive operations.
- CPU/GPU/API costs scale with:
  - number of controls changed,
  - number of retrieval probes,
  - number of model variants tested,
  - propagation scan breadth.

## Model Coverage Strategy

Target behavior for this functional suite:
1. Validate local model path works.
2. Validate at least one cloud model per enabled provider path.
3. Prefer cheapest available model in each source group for functional checks.

Current canonical suite does not yet auto-switch every provider/model path; this should be added as a dedicated phase that:
- discovers live model options from runtime API,
- picks one local + one cloud per source/provider,
- replays probe subset per selected model.

## Known Gaps To Close Next

1. Full option cartesian coverage for large dropdown families is not yet default (guarded by env knobs).
2. Some hidden controls behind conditional render paths may require additional reveal actions.
3. Propagation checks currently key by matching `id`/`name`; this catches many mirrors but not all semantic equivalents.
4. Model-catalog freshness check against external provider pricing/model pages is not yet automated in this suite.
5. Metric-level Grafana/Prometheus assertion matrix needs explicit allowlist and cardinality budget.

## Locked Decisions (2026-02-17)

1. Destructive actions stay separate from default runs.
   - Default: `EXHAUSTIVE_DESTRUCTIVE=0`.
   - Destructive sweep: explicit separate run with `EXHAUSTIVE_DESTRUCTIVE=1`.
2. Retrieval-impacting changes use 3 chat probes per mutation.
   - Default: `RETRIEVAL_PROBES_PER_MUTATION=3`.
3. Mandatory cloud-provider coverage targets:
   - OpenAI
   - OpenRouter
   - Cohere
4. Dropdown handling stays single-alternative by default.
   - No global “select all options” behavior in default run.
   - Deep option sweeps remain opt-in via `EXHAUSTIVE_SELECT_ALL_OPTIONS=1`.
5. Metrics budget is medium.
   - Operationalized as core metric allowlist checks every 3 retrieval-impacting mutations.

## Ralph Loop Integration

Recommended loop shape:
- Loop input: latest `outcomes.ndjson` + `summary.json`.
- Step A: auto-fix only obvious syntax/import/wiring issues.
- Step B: rerun targeted failing surfaces.
- Step C: write structured findings for non-obvious failures (cause, reproduction, likely fix, risk).

This mirrors the "apply trivial fix, otherwise structured audit record" pattern.

## Open Item

1. If Cohere is not currently exposed as an executable chat-model path in `/api/chat/models`, decide whether to:
   - treat as hard failure (strict mode), or
   - log as blocked and continue remaining coverage.
