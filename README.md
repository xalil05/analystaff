# Analystaff — Backend API

> *La donnée froide, la voix chaude.*

API REST du staff technique de football. FastAPI + SQLAlchemy async + PostgreSQL 15 + MinIO (S3-compatible) + Alembic + Pydantic v2.

## Stack

| Couche | Technologie |
|--------|-------------|
| API | FastAPI 0.115+ / Uvicorn |
| ORM | SQLAlchemy 2.x async |
| Base | PostgreSQL 15 |
| Migrations | Alembic |
| Stockage | MinIO (S3-compatible) |
| Auth | JWT (access + refresh tokens en base) |
| Validation | Pydantic v2 |
| Tests | pytest + pytest-asyncio |

## Architecture

```
backend/
├── app/
│   ├── auth/          # JWT, RBAC, gestion des rôles, permissions
│   ├── users/         # Comptes utilisateurs, invitations, cycle de vie
│   ├── clubs/         # Clubs, équipes, niveaux, forfaits, saisons
│   ├── players/       # Joueurs, profil structuré, import CSV
│   ├── matches/       # Matchs, compositions, remplacements, plateau tactique
│   ├── training/      # Séances d'entraînement, évaluations post-entraînement
│   ├── planning/      # Plans de travail, calendrier, synthèse avant-match
│   ├── evaluations/   # Notes par pilier, calcul note globale pondérée
│   ├── ai/            # Assistant IA (DeepSeek, fallback)
│   ├── files/         # Upload de fichiers, stockage, permissions
│   ├── dashboard/     # Tableau de bord, radars, KPI
│   └── core/          # Config, DB, sécurité partagée, erreurs, timezone
├── alembic/           # Migrations
├── tests/             # Tests unitaires
├── Dockerfile         # Multi-stage (dev + prod)
└── pyproject.toml     # Dépendances
```

## Démarrage rapide

```bash
# 1. Cloner
git clone https://github.com/xalil05/analystaff.git && cd analystaff/backend

# 2. Environnement
cp .env.example .env
# Éditer .env avec vos valeurs

# 3. Lancer avec Docker
docker compose up -d

# 4. Ou en local
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API

### Mode MVP (recommandé)

En mode MVP, le club est automatiquement résolu pour l'utilisateur connecté. Pas besoin de spécifier `club_id` dans les URLs.

| Endpoint | Description |
|----------|-------------|
| `POST /api/v1/auth/register` | Inscription avec création automatique de club |
| `POST /api/v1/auth/login` | Connexion |
| `GET /api/v1/auth/me` | Profil utilisateur + club |
| `POST /api/v1/auth/refresh` | Rafraîchir le token |
| `POST /api/v1/auth/logout` | Déconnexion |
| `GET /api/v1/ai/actions` | Lister les actions IA disponibles |
| `POST /api/v1/ai/actions/{key}` | Déclencher une action IA |
| `GET /api/v1/ai/suggestions` | Lister les suggestions |
| `POST /api/v1/ai/suggestions/{id}/feedback` | Feedback sur une suggestion |
| `GET /api/v1/clubs/me` | Mon club |
| `PATCH /api/v1/clubs/me` | Modifier mon club |
| `GET /api/v1/clubs` | Lister mes clubs |
| `POST /api/v1/clubs` | Créer un nouveau club |

### API publique (compatibilité future)

Pour les intégrations tierces ou le multi-équipe futur :

| Endpoint | Description |
|----------|-------------|
| `/api/v1/clubs/{club_id}/players` | Gestion des joueurs |
| `/api/v1/clubs/{club_id}/matches` | Matchs et évaluations |
| `/api/v1/clubs/{club_id}/training` | Planification et charges |
| `/api/v1/clubs/{club_id}/planning` | Plans de travail |
| `/api/v1/clubs/{club_id}/evaluations` | Évaluations de match |
| `/api/v1/clubs/{club_id}/ai/actions/{key}` | Action IA |
| `/api/v1/clubs/{club_id}/dashboard` | Radar et KPI |
| `/api/v1/clubs/{club_id}/files` | Fichiers (MinIO) |
| `/api/v1/clubs/{club_id}/staff` | Gestion du staff |

## Rate Limiting

Deux niveaux de protection :

| Niveau | Rôle | Valeur |
|--------|------|--------|
| nginx | Protection globale (DDoS, bots) | 60 req/min |
| slowapi (app) | Limite métier par club | 100 actions IA/jour/club |

## Sécurité

- **Auth** : JWT access token (courte durée) + refresh token en base (révocable)
- **Mots de passe** : Argon2id
- **Permissions** : RBAC dynamique, piloté par le coach principal
- **Isolation** : multi-tenant par `club_id`
- **Données sensibles** : tables séparées (`physical_profiles`, `medical_records`)

## Tests

```bash
# Dans le container Docker
docker exec -w /code analystaff_backend python -m pytest tests/ -v

# Résultat attendu
# 48 passed, 3 skipped
```

## Licence

MIT — AMICO TECH © 2026
