# Tasks: MVP — Équipe Unique

## Phase 1: Setup
- [x] T001: Creer `MeResponse` dans `auth/schemas.py`
- [x] T002: Ajouter `get_current_club_id` dans `auth/dependencies.py`
- [x] T003: Ajouter `get_user_memberships` helper dans `roles/service.py`

## Phase 2: Auth
- [ ] T004: Modifier `/auth/me` pour retourner club_id + club_nom + is_multi_club
- [ ] T005: Ajouter `club_nom` optionnel dans `LoginRequest` → `RegisterRequest`
- [ ] T006: Ajouter `register_user_with_club` dans `auth/service.py`
- [ ] T007: Ajouter endpoint `POST /auth/register`

## Phase 3: Routes AI
- [ ] T008: Modifier `ai/router.py` — supprimer `{club_id}` des URLs (garder compatibilite)
- [ ] T009: Modifier `clubs/router.py` — supprimer `{club_id}` des URLs

## Phase 4: Tests + Push
- [ ] T010: Verifier tests pytest (48 passed, 3 skipped)
- [ ] T011: Commit + push GitHub
