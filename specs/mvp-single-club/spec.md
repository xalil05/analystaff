# Spec: MVP — Équipe Unique (Multi-Club Masqué)

## Contexte

Analystaff est une application multi-club. Pour le MVP, on simplifie l'expérience utilisateur en masquant la complexité multi-equipe. L'utilisateur n'interagit qu'avec UN seul club. Le code multi-club reste intact pour une reactivation future.

## User Stories

### US-1 : Inscription avec club automatique
**En tant que** nouvel utilisateur  
**Je veux** pouvoir choisir un nom de club lors de l'inscription  
**Afin de** personnaliser mon espace des le depart

**Acceptance :**
- Given un formulaire d'inscription avec champ `club_nom` (optionnel)
- When je soumets le formulaire sans remplir `club_nom`
- Then un club "Mon Club" est cree automatiquement
- And je suis automatiquement assigne a ce club avec le role HEAD_COACH

### US-2 : Club auto-resout
**En tant que** utilisateur connecte  
**Je veux** ne pas avoir a selectionner mon club a chaque action  
**Afin de** utiliser l'application simplement

**Acceptance :**
- Given un utilisateur avec 1 club
- When je me connecte ou j'appelle une API
- Then le club est automatiquement determine
- And les routes n'ont pas besoin de `/{club_id}/` dans l'URL

### US-3 : Endpoint /me enrichi
**En tant que** frontend  
**Je veux** connaitre le club de l'utilisateur connecte en une requete  
**Afin de** afficher le nom du club dans l'interface

**Acceptance :**
- When j'appelle `GET /api/v1/auth/me`
- Then la reponse contient `club_id`, `club_nom`, `is_multi_club`

## Requirements

### Functional

- **FR-001** : L'inscription accepte un champ optionnel `club_nom` (max 150 chars)
- **FR-002** : Si `club_nom` est vide/null, utiliser "Mon Club"
- **FR-003** : Lors de l'inscription, creer automatiquement le club + StaffMember (HEAD_COACH)
- **FR-004** : Le endpoint `/me` retourne `club_id`, `club_nom`, `is_multi_club`
- **FR-005** : Les routes AI n'ont plus besoin de `/{club_id}/` dans l'URL
- **FR-006** : Les routes AI avec `/{club_id}/` restent compatibles (API publique future)
- **FR-007** : Une dependency `get_current_club_id` auto-resout le club

### Non-Functional

- **NFR-001** : Zero suppression du code multi-club existant
- **NFR-002** : Les tests existants doivent passer sans modification
- **NFR-003** : Performance : le club est determine en 1 requete (JOIN)

## Entities

```
User (existant)
  - id, email, password_hash, nom, prenom, is_active

Club (existant)
  - id, nom, niveau, timezone, is_archived

StaffMember (existant)
  - user_id, club_id, role_id, statut

MeResponse (nouveau schema)
  - id, email, nom, prenom (herite de UserResponse)
  - club_id, club_nom, is_multi_club
```

## API Changes

| Endpoint | Avant | Apres |
|----------|-------|-------|
| `POST /auth/login` | - | Ajout optionnel `club_nom` |
| `GET /auth/me` | `{id, email, nom, prenom}` | `+{club_id, club_nom, is_multi_club}` |
| `POST /clubs/{club_id}/ai/actions/{key}` | Requis | Optionnel (auto-resout) |
| `GET /clubs/{club_id}/ai/actions` | Requis | Optionnel (auto-resout) |

## Migration

1. Ajouter `MeResponse` dans `auth/schemas.py`
2. Ajouter `get_current_club_id` dans `auth/dependencies.py`
3. Modifier `auth/router.py` pour enrichir `/me`
4. Ajouter `register_user_with_club` dans `auth/service.py`
5. Modifier `ai/router.py` pour supprimer `{club_id}` des URLs
6. Modifier `clubs/router.py` pour supprimer `{club_id}` des URLs
7. Garder la compatibilite via `main.py` (les deux prefixes)

## Success Criteria

- [ ] Inscription avec `club_nom` personnalise
- [ ] Inscription sans `club_nom` → "Mon Club"
- [ ] `/me` retourne les infos du club
- [ ] Les routes AI fonctionnent sans `/{club_id}/`
- [ ] Les routes AI avec `/{club_id}/` fonctionnent toujours
- [ ] Tous les tests pytest passent (48 passed, 3 skipped)
