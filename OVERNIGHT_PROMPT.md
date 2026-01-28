# Overnight Ralph Loop - Manual Installation

The ralph-wiggum plugin is now manually installed. Here's how to use it:

---

## Step 1: Start Claude Code

```bash
cd /Users/davidmontgomery/tribrid-rag
claude --dangerously-skip-permissions
```

---

## Step 2: Initialize the Ralph Loop

Run this in Claude Code to set up the loop state:

```bash
! .claude/ralph-loop.sh "BUILD TRIBRID-RAG FROM SCRATCH

═══════════════════════════════════════════════════════════
                    EVERY ITERATION - START HERE
═══════════════════════════════════════════════════════════

1. READ TODO.md → find first unchecked [ ] file
2. READ TRIBRID_CONTRACTS.md → find exact signature for that file
3. CREATE the file matching contract EXACTLY (no additions, no changes)
4. VERIFY → re-read contract, confirm file matches
5. UPDATE TODO.md → mark [x] complete
6. REPEAT until no unchecked files remain

═══════════════════════════════════════════════════════════
                         PHASE ORDER
═══════════════════════════════════════════════════════════

Work through TODO.md top-to-bottom:
1. server/models/*.py → Pydantic models
2. server/db/*.py → PostgresClient, Neo4jClient  
3. server/retrieval/*.py → Retrievers, Fusion, Reranker
4. server/indexing/*.py → Chunker, Embedder, GraphBuilder
5. server/services/*.py → Business logic
6. server/observability/*.py → Metrics, Tracing
7. server/api/*.py + main.py + config.py → API layer
8. web/src/types/*.ts → TypeScript types
9. web/src/stores/*.ts → Zustand stores
10. web/src/hooks/*.ts → React hooks
11. web/src/api/*.ts → API client
12. web/src/components/**/*.tsx → All components
13. Remaining files

═══════════════════════════════════════════════════════════
                        ABSOLUTE RULES
═══════════════════════════════════════════════════════════

✗ NEVER create files not in TRIBRID_STRUCTURE.md
✗ NEVER deviate from TRIBRID_CONTRACTS.md signatures  
✗ NEVER write adapters, transformers, or mappers
✗ NEVER use: card/cards, golden, ranker (without re), pip, qdrant, redis, langchain

✓ ALWAYS read the contract before creating each file
✓ ALWAYS mark TODO.md checkbox [x] after each file
✓ ALWAYS copy CSS patterns from ../agro-rag-engine

═══════════════════════════════════════════════════════════
                       ERROR HANDLING
═══════════════════════════════════════════════════════════

IF STUCK on a file for 3+ attempts:
→ Add to TODO.md Notes: BLOCKED: [filename] - [reason]
→ Skip to next file

═══════════════════════════════════════════════════════════
                        COMPLETION
═══════════════════════════════════════════════════════════

When ALL checkboxes in TODO.md are [x]:
→ Output: <promise>COMPLETE</promise>

BEGIN NOW: Read TODO.md. Find first [ ] file. Start building." --max-iterations 200 --completion-promise "COMPLETE"
```

---

## How It Works

1. The `.claude/ralph-loop.sh` script creates `.claude/ralph-loop.local.md` with your prompt
2. When Claude tries to exit, the Stop hook (`.claude/hooks/stop-hook.sh`) intercepts
3. The hook checks if the completion promise was output
4. If not, it blocks exit and feeds the SAME prompt back
5. Claude sees its previous work in files and continues
6. Repeats until `<promise>COMPLETE</promise>` or max iterations

---

## Monitor Progress

In another terminal:
```bash
# Check current iteration
head -10 /Users/davidmontgomery/tribrid-rag/.claude/ralph-loop.local.md

# Count completed files
grep -c "\[x\]" /Users/davidmontgomery/tribrid-rag/TODO.md
```

---

## Cancel the Loop

Delete the state file:
```bash
rm /Users/davidmontgomery/tribrid-rag/.claude/ralph-loop.local.md
```

Then Claude will exit normally.

---

## Alternative: Simple Direct Prompt

If the loop doesn't work, just give Claude this prompt directly and manually continue when it stops:

```
Read TODO.md and TRIBRID_CONTRACTS.md. Create all unchecked files in order, matching contracts exactly. Mark each [x] as you complete it. Continue until done.
```

Then when it stops, type:
```
Continue building. Read TODO.md for current progress.
```
