# Backend Analystaff

> *La donnée froide, la voix chaude.*

Ce dossier contient le code source du backend API Analystaff.

Voir le [README principal](../../README.md) pour la vision du projet, la stack complète, l'architecture système et les endpoints API.

---

## Contenu de ce dossier

```
backend/
├── app/          # Code source : routers, services, modèles, schémas, core
├── alembic/      # Migrations Alembic (PostgreSQL)
├── tests/        # Tests unitaires (pytest + pytest-asyncio)
├── Dockerfile    # Multi-stage (dev + prod)
├── pyproject.toml  # Dépendances Python (uv)
├── alembic.ini   # Config Alembic
└── .env.example  # Variables d'environnement (copier → .env)
```

---

## Démarrage rapide (backend seul)

### Avec Docker (recommandé)

```bash
# Depuis la racine du repo (pas depuis backend/)
cd /data/projects/06-data-ai/analystaff
docker compose up -d
```

Le backend démarre sur le port `8000` à l'intérieur du container (non exposé sur l'hôte — l'accès se fait via nginx).

### En local (dev pur)

```bash
cd backend

# 1. Installer les dépendances
uv sync

# 2. Variables d'environnement
cp .env.example .env
# Éditer .env — au minimum : SECRET_KEY, DATABASE_URL

# 3. Base de données
# Assurez-vous que PostgreSQL est accessible (Docker ou local)
# Puis appliquer les migrations :
alembic upgrade head

# 4. Lancer le serveur de dev
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

L'API est disponible sur `http://localhost:8000` (ou `http://0.0.0.0:8000`).

- Docs OpenAPI (dev only) : `http://localhost:8000/docs`
- Health check : `http://localhost:8000/api/v1/health`

---

## Migrations Alembic

```bash
cd backend

# Voir le statut des migrations
alembic current

# Lister toutes les révisions
alembic history

# Appliquer toutes les migrations en attente
alembic upgrade head

# Créer une nouvelle migration (après avoir modifié les modèles SQLAlchemy)
alembic revision --autogenerate -m "ma_nouvelle_migration"
```

Pour lancer les migrations depuis le container Docker :

```bash
docker exec analystaff_backend alembic upgrade head
```

---

## Tests

```bash
# Dans le container Docker (recommandé — utilise l'environnement déjà configuré)
docker exec analystaff_backend python -m pytest tests/ -v

# En local (si l'environnement Python est activé)
cd backend
uv run pytest tests/ -v
```

Résultat attendu : **48 passed, 3 skipped**.

---

## Architecture du code (`app/`)

```
app/
├── auth/          # Authentification (JWT), gestion des rôles, permissions
├── users/         # Comptes utilisateurs, cycle de vie
├── clubs/         # Clubs, équipes, saisons
├── players/       # Joueurs, profils physiques, dossiers médicaux
├── matches/       # Matchs, compositions, remplacements, plateau tactique
├── training/      # Séances d'entraînement, évaluations post-entraînement
├── planning/      # Plans de travail, calendrier
├── evaluations/   # Évaluations de match, notes par pilier
├── ai/            # Assistant IA (DeepSeek), pré-génération, feedback
├── files/         # Upload de fichiers, stockage MinIO
├── dashboard/     # Tableau de bord, radars, KPI
├── audit/         # Logs d'audit (traçabilité des actions)
├── roles/         # Rôles, permissions, memberships staff
└── core/          # Config, DB, errors, logger, health, limiter, enums
```

---

## Variables d'environnement

Voir [`.env.example`](./.env.example) pour la liste exhaustive.

Variables minimales requises :
- `DATABASE_URL` — connexion PostgreSQL (asyncpg)
- `SECRET_KEY` — clé JWT (générer avec `openssl rand -hex 32`)
- `CORS_ORIGINS` — origines autorisées pour le frontend

---

## Liens

- [README principal](../../README.md) — vision, stack complète, endpoints API
- [Architecture MVP](../../architecture-mvp-reelle.md) — organisation du code
- [Schéma SQL](../../SCHEMA_SQL.md) — modèle de données
- [Décisions figées](../../DECISIONS_FIGEES.md) — règles métier et contraintes
- [Charte visuelle frontend](../../CHARTE_VISUELLE_FRONTEND.md) — design system

---

*MIT — AMICO TECH © 2026*
