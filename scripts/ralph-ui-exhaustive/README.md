# Ralph UI Exhaustive Loop

Long-running remediation loop for the exhaustive Playwright UI suite.

## Purpose

- Run exhaustive UI suite.
- Auto-apply only trivial obvious fixes.
- Re-run impacted surfaces.
- Record non-obvious failures as structured findings.

## Files

- `ralph.sh`: loop runner
- `CODEX.md`: per-iteration execution contract
- `prd.json`: story list and progress flags
- `progress.txt`: append-only loop notes

## Run

```bash
cd /Users/davidmontgomery/ragweld/scripts/ralph-ui-exhaustive
./ralph.sh 30
```

Optional:

```bash
CODEX_MODEL=gpt-5.2 ./ralph.sh 50 --search
```

