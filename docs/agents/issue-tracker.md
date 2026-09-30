# Issue tracker

GitHub Issues. This repo has a remote pointing at GitHub (`https://github.com/xalil05/analystaff.git`), so issues live in the repo's GitHub Issues (uses the `gh` CLI).

**Command reference:**
- `gh issue create --title "..." --body "..."` — create a new issue
- `gh issue view <number>` — view an issue
- `gh issue list --label "..."` — list issues by label
- `gh issue close <number>` — close an issue

**PRs as a request surface:** Not configured by default. If external PRs are needed in the triage queue, flip the flag in `docs/agents/issue-tracker.md` later.