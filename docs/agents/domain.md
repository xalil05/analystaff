# Domain docs

Layout: **single-context** (one `CONTEXT.md` + `docs/adr/` at the repo root).

This fits almost every repo; the consumer rules for reading them are defined in the `triage` skill and assume this layout.

**Consumer rules:**
- Root `CONTEXT.md` describes the project scope and current decision points.
- `docs/adr/` contains Architecture Decision Records, one file per decision.
- Each ADR follows the standard format: title, status, context, decision, consequences.
- New agents should read `CONTEXT.md` first, then review recent ADRs before starting work.