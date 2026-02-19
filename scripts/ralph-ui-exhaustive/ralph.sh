#!/bin/bash
set -euo pipefail

MAX_ITERATIONS="${1:-20}"
ENABLE_SEARCH="false"
if [[ "${2:-}" == "--search" ]]; then
  ENABLE_SEARCH="true"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PRD_FILE="$SCRIPT_DIR/prd.json"
RUN_LOG="$SCRIPT_DIR/run.log"

get_current_story() {
  jq -r '.userStories[] | select(.passes==false) | .id' "$PRD_FILE" | head -1
}

get_story_title() {
  local id="$1"
  jq -r --arg id "$id" '.userStories[] | select(.id==$id) | .title' "$PRD_FILE"
}

echo "Starting Ralph UI exhaustive loop (iterations: $MAX_ITERATIONS)"

for i in $(seq 1 "$MAX_ITERATIONS"); do
  STORY_ID="$(get_current_story)"
  if [[ -z "$STORY_ID" ]]; then
    echo "<promise>COMPLETE</promise>"
    exit 0
  fi

  STORY_TITLE="$(get_story_title "$STORY_ID")"
  echo "Iteration $i: $STORY_ID - $STORY_TITLE"
  echo "[$(date -Iseconds)] Iteration $i: $STORY_ID - $STORY_TITLE" >> "$RUN_LOG"

  PROMPT="$(cat "$SCRIPT_DIR/CODEX.md")

Current story:
- ID: $STORY_ID
- Title: $STORY_TITLE

Do only this story in this iteration.
"

  ARGS=(
    exec
    -C "$REPO_ROOT"
    -m "${CODEX_MODEL:-gpt-5.2}"
    -c "model_reasoning_effort=\"${CODEX_REASONING_EFFORT:-high}\""
    -s workspace-write
  )

  if [[ "$ENABLE_SEARCH" == "true" ]]; then
    ARGS+=(--search)
  fi

  codex "${ARGS[@]}" "$PROMPT" 2>&1 | tee -a "$RUN_LOG" || true
done

echo "Reached max iterations without full completion."
exit 1

