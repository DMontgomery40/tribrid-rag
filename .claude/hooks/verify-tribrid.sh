#!/bin/bash

# Stop hook verifier for ragweld (TriBrid internal naming).
#
# Behaviour:
# - If a Ralph loop is active, delegate to the existing stop-hook.sh which feeds the
#   loop prompt back into the session.
# - Otherwise, block stopping until repo verification commands are green.
#
# This script is invoked by Claude Code via `.claude/settings.json` Stop hook.

set -euo pipefail

HOOK_INPUT="$(cat || true)"

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$PROJECT_DIR"

RALPH_STATE_FILE=".claude/ralph-loop.local.md"

if [[ -f "$RALPH_STATE_FILE" ]]; then
  # Delegate loop control to the existing hook.
  echo "$HOOK_INPUT" | "$PROJECT_DIR/.claude/hooks/stop-hook.sh"
  exit $?
fi

missing=()
[[ -f "AGENTS.md" ]] || missing+=("AGENTS.md")
[[ -f "docs/index.md" ]] || missing+=("docs/index.md")

if [[ ${#missing[@]} -gt 0 ]]; then
  msg=$'Verification blocked: missing required file(s):\n'
  for f in "${missing[@]}"; do
    msg+=$' - '"$f"$'\n'
  done
  msg+=$'\nCreate the missing file(s), then try stopping again.'
  if command -v jq >/dev/null 2>&1; then
    jq -n --arg reason "$msg" --arg sys "Repo verification failed (missing files)." \
      '{decision:"block", reason:$reason, systemMessage:$sys}'
  else
    printf '{"decision":"block","reason":%q,"systemMessage":"Repo verification failed (missing files)."}\n' "$msg"
  fi
  exit 0
fi

frontend_changed=0
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if git status --porcelain | grep -Eq '^(\\?\\?|[ MADRCU]{2}) (web/|playwright\\.config\\.ts)'; then
    frontend_changed=1
  fi
fi

fail_cmd=""
fail_out=""

run_check() {
  local cmd="$1"
  local out=""
  local status=0

  set +e
  out="$($cmd 2>&1)"
  status=$?
  set -e

  if [[ $status -ne 0 ]]; then
    fail_cmd="$cmd"
    fail_out="$out"
    return 1
  fi
  return 0
}

checks=(
  "uv run scripts/check_banned.py"
  "uv run scripts/validate_types.py"
  "uv run pytest -q"
)

for c in "${checks[@]}"; do
  run_check "$c" || break
done

if [[ -z "$fail_cmd" ]] && [[ $frontend_changed -eq 1 ]]; then
  run_check "npm --prefix web run lint" || true
  if [[ -z "$fail_cmd" ]]; then
    run_check "npm --prefix web run build" || true
  fi
fi

if [[ -n "$fail_cmd" ]]; then
  tail_out="$(printf '%s\n' "$fail_out" | tail -n 80)"
  msg=$'Verification blocked: command failed:\n\n'"$fail_cmd"$'\n\nOutput (tail):\n'"$tail_out"$'\n\nFix the failure, then try stopping again.'
  if command -v jq >/dev/null 2>&1; then
    jq -n --arg reason "$msg" --arg sys "Repo verification failed. Fix and retry stop." \
      '{decision:"block", reason:$reason, systemMessage:$sys}'
  else
    printf '{"decision":"block","reason":%q,"systemMessage":"Repo verification failed. Fix and retry stop."}\n' "$msg"
  fi
  exit 0
fi

# All checks passed; allow stop.
exit 0
