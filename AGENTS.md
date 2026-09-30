# Analystaff — AGENTS.md

> *Compact instruction file for OpenCode agents. Answers: "Would an agent likely miss this without help?"*

## Project overview

Analystaff = football staff technical tool. **Data-driven dashboard** (cold data) + **voice from the bench** (warm notes). Used by coaches at the stadium on weak networks.

**Two parts:**
- `backend/` — FastAPI monolith (Python 3.11+), PostgreSQL + Alembic
- `frontend/` — Next.js 16 (TypeScript), Tailwind CSS, Zustand

**Reference doc:** `DECISIONS_FIGEES.md` — *authoritative. All contradictions yield to this file.*

## Quick start

### Backend (API)

```bash
# Docker (recommended)
cd backend && docker compose up -d

# Or local
cp .env.example .env    # edit with your values
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
```

### Frontend (UI)

```bash
cd frontend
npm install          # first time only
npm run dev          # http://localhost:3001
```

### MVP mode

By default the app operates in **MVP mode**: the user's club is auto-resolved from `GET /api/v1/auth/me`. **Do not include `club_id` in URLs** for MVP routes (e.g. `/api/v1/ai/actions/...`, `/api/v1/dashboard/`). Use `/api/v1/clubs/{club_id}/...` only for multi-tenant integrations.

## Key API endpoints (MVP)

| Method | Path | Notes |
|---|---|---|
| `POST /api/v1/auth/register` | Register + auto-create club |
| `POST /api/v1/auth/login` | Login |
| `GET /api/v1/auth/me` | **Returns `club_id`, `club_nom`, `is_multi_club`** |
| `GET /api/v1/ai/actions` | List IA actions available |
| `POST /api/v1/ai/actions/{key}` | Trigger IA action *(see below)* |
| `GET /api/v1/ai/suggestions` | List suggestions for user |
| `POST /api/v1/ai/suggestions/{id}/feedback` | Coach accepts/modifies/rejects |

## IA actions (critical)

**9 button-triggered actions only. ZERO free prompt.**

| Key | Button | Permission needed |
|---|---|---|
| `SUGGEST_TRAINING_SESSION` | Préparer la séance de demain | `CREER_SEANCE_ENTRAINEMENT` |
| `SUGGEST_LINEUP` | Suggérer une composition | Match access |
| `ANALYZE_FATIGUE` | Analyser la fatigue | Données physiques |
| `SUMMARIZE_WEEK` | Résumer la semaine | None sup |
| `ADAPT_WORKLOAD` | Adapter la charge de travail | `VOIR_DONNEES_PHYSIQUES` |
| `PREPARE_PRE_MATCH` | Préparer l'avant-match | Match access |
| `ORGANIZE_WEEK` | Organiser la semaine | `CREER_PLAN_TRAVAIL` |
| `BALANCE_WORKLOAD` | Équilibrer la charge | `VOIR_DONNEES_PHYSIQUES` |
| `PARSE_UPLOADED_SESSION` | Analyser la séance uploadée | `IMPORTER_SEANCE_DU_JOUR` |

**Règles IA (toujours) :**
- IA **suggère jamais n'impose**
- Fallback dynamique si DeepSeek indisponible (règles métier, pas de réponses statiques)
- Réponses validées Pydantic avant affichage
- Le coach accepte/modifie/rejette

## Critical conventions (from DECISIONS_FIGEES.md)

### Isolation par `club_id`

**Every query must filter by `club_id`.** A user can never access another club's data. The `club_id` is auto-resolved from `GET /api/v1/auth/me` in MVP mode.

### Permissions are dynamic

- Managed by the HEAD_COACH
- Default per-role matrices in `MATRICE_PERMISSIONS_ET_REGLES_METIER.md`
- Coach can grant/revoke individual permissions
- **Always checked BEFORE building IA context** (backend only, never frontend alone)

### 4 pillars colors are FIXED

Physique=rouge, Technique=bleu, Tactique=violet, Mental=ambre. These never change across screens. Text on light backgrounds uses the `-text` variant.

### `tabular-nums` mandatory

All numbers in columns/KPIs must use `font-feature-numeric: tabular-nums`. **No hex in dur** in components — use semantic OKLCH tokens.

### Offline / context de saisie

- Evaluations can be saisie hors-ligne (`saisie_hors_ligne` BOOLEAN)
- Track `synchronisee` (BOOLEAN) and `contexte_saisie`
- Sync mechanism needed when network returns

### Rate limiting

- Nginx: 60 req/min global
- slowapi: 100 IA actions/jour/club

## Testing

```bash
# Docker container
docker exec -w /code analystaff_backend python -m pytest tests/ -v

# Expected: 48 passed, 3 skipped
```

## Directory ownership

- `backend/app/` — Python modules (auth, clubs, players, ai, etc.)
- `frontend/src/` — Next.js/TS components and logic
- `alembic/` — DB migrations
- `tests/` — pytest tests

## Common gotchas

1. **Always check `club_id`** — never assume it's passed in URL for MVP routes
2. **IA permissions** — verify `UTILISER_ASSISTANT_IA` + action-specific permissions before calling
3. **Fallback** — if DeepSeek fails, fallback uses dynamic rules, not static responses
4. **Pillar colors** — rouge/bleu/violet/ambre are fixed; use `-text` variants for badge/text on light backgrounds
5. **No width/height animations** — only transform/opacity (150-300ms) in frontend
6. **Dark mode** — surfaces rebalanced by luminosity, not inverted. Primary desaturated 10-20%. Text off-white, never pure white.

## Where to find more info

- `DECISIONS_FIGEES.md` — authoritative decisions (section 23 is stack, section 24 architecture)
- `SCHEMA_SQL.md` — definitive DB schema
- `SPECIFICATIONS_IA_ET_PROMPTS.md` — IA module specs
- `CHARTE_VISUELLE_FRONTEND.md` — visual design system
- `MATRICE_PERMISSIONS_ET_REGLES_METIER.md` — permissions matrix

## Agent skills

### Issue tracker

GitHub Issues (remote: `https://github.com/xalil05/analystaff.git`). See `docs/agents/issue-tracker.md`.

### Triage labels

Default triage vocabulary. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout (one `CONTEXT.md` + `docs/adr/` at repo root). See `docs/agents/domain.md`.