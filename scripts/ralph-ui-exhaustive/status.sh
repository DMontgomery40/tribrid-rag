#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
jq -r '
  "Ralph UI Exhaustive status",
  "--------------------------",
  (.userStories[] | "\(.id)  [\(.passes|tostring)]  \(.title)")
' "$SCRIPT_DIR/prd.json"

