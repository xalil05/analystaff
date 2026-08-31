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
│   ├── api/          # Routes REST (v1)
│   ├── core/         # Config, DB, Sécurité
│   ├── models/       # Modèles SQLAlchemy
│   ├── schemas/      # Schémas Pydantic
│   ├── services/     # Logique métier
│   ├── ai/           # Module IA (DeepSeek, fallback)
│   └── main:         # Point d'entrée FastAPI
├── alembic/          # Migrations
├── tests/            # Tests unitaires
├── Dockerfile        # Multi-stage (dev + prod)
└── pyproject.toml    # Dépendances
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

Tous les endpoints sont préfixés par `/api/v1/clubs/{club_id}/` (sauf auth et health).

| Endpoint | Description |
|----------|-------------|
| `/api/v1/auth/*` | Authentification JWT |
| `/api/v1/clubs/{club_id}/players` | Gestion des joueurs |
| `/api/v1/clubs/{club_id}/matches` | Matchs et évaluations |
| `/api/v1/clubs/{club_id}/training` | Planification et charges |
| `/api/v1/clubs/{club_id}/planning` | Plans de travail |
| `/api/v1/clubs/{club_id}/evaluations` | Évaluations de match |
| `/api/v1/clubs/{club_id}/ai/suggestions` | Suggestions IA (4 piliers) |
| `/api/v1/clubs/{club_id}/dashboard` | Radar et KPI |
| `/api/v1/clubs/{club_id}/files` | Fichiers (MinIO) |
| `/api/v1/clubs/{club_id}/staff` | Gestion du staff |

## Tests

```bash
pytest tests/ -v --tb=short
```

## Licence

MIT — AMICO TECH © 2026
