---
name: commit
description: Run checks, agent code review, commit with AI message, and push
---

1. Run quality checks:
   `npm run lint:fix && npm run format && npm run lint && npm run typecheck`
   Fix ALL errors before continuing. Re-read any file touched by lint:fix/format.

2. Review changes: run git status and git diff --staged and git diff

3. Fast review gate: spawn ONE subagent with the full diff. Instructions: review ONLY
   the diff for real bugs, regressions, leftover debug code, and unintended changes.
   Score each issue 0-100 confidence (pre-existing issues and stylistic nitpicks = false
   positives, score low). Report ONLY issues with confidence >= 80, with file:line and a
   one-line fix. If none, reply "CLEAR". This is a last check, not a deep audit - be fast.

4. If CLEAR: proceed straight to step 5 and push WITHOUT asking the user anything.
   If issues >= 80 were reported: STOP, show the issues, and ask exactly:
   "Want me to fix this first, or commit and push anyway?
   A) Fix it first, then commit & push
   B) Commit & push anyway"
   On A: fix, re-run step 1, then continue (no re-review). On B: continue as-is.

5. Stage relevant files with git add (specific files, not -A).
   Never stage .env, secrets, or scratch/probe scripts.

6. Generate a commit message:
   - Start with verb (Add/Update/Fix/Remove/Refactor)
   - Be specific and concise, one line preferred

7. Commit AND push in one go - never pause for confirmation here:
   git commit -m "your generated message"
   git push
