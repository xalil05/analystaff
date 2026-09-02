
# Analystaff — Standards de développement

Ce document définit les standards techniques à respecter lors du développement d'Analystaff.

**Référence absolue :** `DECISIONS_FIGEES.md`
En cas de contradiction entre ce document et `DECISIONS_FIGEES.md`, c'est `DECISIONS_FIGEES.md` qui fait foi.

**Documents compagnons :**
- `DECISIONS_FIGEES.md` — source de vérité des choix validés ;
- `SCHEMA_SQL.md` — schéma de base de données définitif ;
- `SPECIFICATIONS_IA_ET_PROMPTS.md` — spécifications du module IA ;
- `MATRICE_PERMISSIONS_ET_REGLES_METIER.md` — permissions et règles métier ;
- `architecture-mvp-reelle.md` — mise en œuvre technique ;
- `analystaff-presentation.md` — vision produit.

---

## 1. Principes généraux

### 1.1 Philosophie
- **Lisibilité avant astuce** : un code lisible vaut mieux qu'un code « malin ».
- **Explicite plutôt qu'implicite** : les règles métier doivent être claires, pas masquées dans des abstractions.
- **Défense en profondeur** : chaque couche applique ses propres validations.
- **Zéro magie** : pas de dépendance opaque, pas de comportement caché.
- **Fail-safe** : en cas d'erreur, le système doit échouer proprement sans perte de données.

### 1.2 Langages et versions
- **Backend** : Python 3.11+, FastAPI.
- **Frontend** : TypeScript strict, Next.js 14.
- **Base de données** : PostgreSQL 15+.
- **Shell / scripts** : Bash (Linux) pour l'ops.

### 1.3 Style de code
- **Python** : Ruff (linter + formatter), conventions PEP 8, type hints obligatoires sur les fonctions publiques.
- **TypeScript** : ESLint + Prettier, strict mode activé, pas de `any` sauf cas exceptionnel documenté.
- **SQL** : snake_case, mots-clés en majuscules, indentations cohérentes.

---

## 2. Architecture du backend

### 2.1 Monolithe modulaire
Le backend est un **monolithe modulaire** FastAPI, organisé par domaine métier :

```text
app/
├── core/            # Configuration, dépendances transverses
├── auth/            # Authentification, JWT, refresh tokens
├── clubs/           # Gestion des clubs
├── teams/           # Équipes
├── users/           # Utilisateurs et staff members
├── roles/           # Rôles et permissions
├── players/         # Joueurs et profils
├── matches/         # Matchs et compositions
├── training/        # Séances d'entraînement
├── planning/        # Plans de travail
├── evaluations/     # Évaluations (match et entraînement)
├── ai/              # Module IA (DeepSeek, APScheduler)
├── files/           # Uploads et analyse de fichiers
├── audit/           # Logs d'audit
└── main.py          # Point d'entrée FastAPI
```

### 2.2 Règles par module
Chaque module contient : 
- `router.py` : définition des endpoints ;
- `schemas.py` : schémas Pydantic de requête/réponse ;
- `models.py` : modèles SQLAlchemy (si pertinent) ;
- `service.py` : logique métier ;
- `repository.py` : accès aux données (si pertinent) ;
- `dependencies.py` : dépendances FastAPI spécifiques au module.

**Interdiction :** un module ne doit pas importer directement un autre module. Il passe par un service exposé via `core` ou par une interface définie.

### 2.3 Injections de dépendances
- Utiliser le système d'injection de dépendances de FastAPI (`Depends`).
- Les services sont injectés, jamais instanciés directement dans les routers.
- Les repositories sont injectés dans les services, jamais utilisés directement.

---

## 3. Standards de code Python

### 3.1 Nommage
- **Fichiers / modules** : snake_case (`match_service.py`).
- **Classes** : PascalCase (`MatchService`).
- **Fonctions / méthodes** : snake_case (`get_match_by_id`).
- **Variables** : snake_case (`club_id`, `player_list`).
- **Constantes** : UPPER_SNAKE_CASE (`MAX_FILE_SIZE`).
- **Enums** : PascalCase, valeurs en UPPER_SNAKE_CASE.

### 3.2 Type hints
- Obligatoires sur toutes les fonctions publiques.
- Utiliser `Optional[T]` au lieu de `T | None` pour Python 3.11 (compatibilité).
- Utiliser `typing.List`, `typing.Dict` pour les collections.
- Documenter les types complexes avec des `TypeAlias`.

### 3.3 Docstrings
- Obligatoires sur les modules, classes et fonctions publiques.
- Format Google.
- Inclure : description courte, paramètres, retour, exceptions levées.

### 3.4 Gestion des erreurs
- Utiliser les exceptions HTTP de FastAPI (`HTTPException`) pour les erreurs API.
- Définir des exceptions métier personnalisées héritant de `AppException`.
- Ne jamais laisser une exception non gérée remonter jusqu'au client.
- Logger toutes les erreurs inattendues avec le contexte complet.

### 3.5 Asynchrone
- Privilégier `async def` pour les endpoints I/O-bound.
- Utiliser `asyncpg` via SQLAlchemy pour les requêtes DB asynchrones.
- Ne pas bloquer l'event loop avec des opérations CPU-bound (les déléguer à un thread pool si nécessaire).

---

## 4. Standards de code TypeScript / Next.js

### 4.1 Nommage
- **Fichiers / modules** : kebab-case ou camelCase selon usage (`use-auth.ts`, `matchService.ts`).
- **Composants React** : PascalCase (`MatchCard`).
- **Hooks** : camelCase préfixé `use` (`useMatches`).
- **Types / Interfaces** : PascalCase (`Match`, `LineupPlayer`).
- **Variables / fonctions** : camelCase (`getMatchById`).

### 4.2 Strict mode
- `strict: true` dans `tsconfig.json`.
- Pas de `any` sauf cas exceptionnel documenté avec justification.
- Utiliser `unknown` au lieu de `any` pour les types inconnus.

### 4.3 Composants React
- Composants fonctionnels uniquement (pas de classes).
- Props typées explicitement.
- Hooks personnalisés pour la logique réutilisable.
- Éviter les effets de bord dans le rendu.

### 4.4 État frontend
- **Zustand** pour l'état global.
- Un store par domaine métier (`useMatchesStore`, `usePlayersStore`).
- Les stores exposent des actions typées et des sélecteurs.

---

## 5. Base de données

### 5.1 Règles générales
- Toute modification du schéma passe par une migration Alembic.
- Pas de modification manuelle du schéma en production.
- Respecter scrupuleusement `SCHEMA_SQL.md`.

### 5.2 Requêtes
- Utiliser SQLAlchemy ORM pour la majorité des requêtes.
- Utiliser `text()` pour les requêtes SQL brutes uniquement si justifié (performance).
- Toujours filtrer par `club_id` dans les requêtes multi-tenant.
- Utiliser des index sur les colonnes fréquemment filtrées.

### 5.3 Transactions
- Utiliser des transactions explicites pour les opérations multi-tables.
- Éviter les transactions longues.
- Gérer les rollbacks proprement en cas d'erreur.

---

## 6. Cache (ZG-1)

### 6.1 Choix retenu
**Cache mémoire Python in-process** pour le V0.

| Aspect | Détail |
|---|---|
| Outil | `cachetools` (TTLCache) ou décorateur `@lru_cache` |
| Pas de Redis | Non requis pour le V0 |
| Portée | Processus unique (non partagé entre workers) |
| Usage | Données de référence peu volatiles |

### 6.2 Cas d'usage recommandés
- Liste des rôles et permissions (chargée au démarrage).
- Templates de prompts IA actifs (rechargés sur invalidation explicite).
- Métadonnées de club (niveau, fuseau horaire).
- Configurations globales non sensibles.

### 6.3 Règles d'utilisation
- **TTL obligatoire** : toute donnée mise en cache a un TTL explicite (minimum 5 minutes, maximum 24h selon criticité).
- **Invalidation explicite** : quand une donnée est modifiée, le cache correspondant doit être invalidé.
- **Pas de données utilisateur** : ne jamais mettre en cache des données spécifiques à un utilisateur ou un club dans un cache global.
- **Pas de données sensibles** : aucune donnée médicale, physique ou personnelle en cache.

### 6.4 Évolution future
Redis pourra être introduit en V1 si un besoin prouvé apparaît (cache partagé multi-process, rate limiting distribué).

---

## 7. Pool de connexions PostgreSQL (ZG-3)

### 7.1 Choix retenu
**Pool SQLAlchemy configuré directement**, sans PgBouncer pour le V0.

### 7.2 Configuration recommandée

```python
from sqlalchemy.ext.asyncio import create_async_engine

engine = create_async_engine(
    settings.database_url,
    pool_size=15,           # Taille nominale du pool
    max_overflow=5,         # Connexions supplémentaires en pic
    pool_timeout=30,        # Timeout en secondes
    pool_recycle=3600,      # Recyclage des connexions (1h)
    pool_pre_ping=True,     # Vérification de la connexion avant usage
    echo=False,             # Logs SQL désactivés en production
)
```

| Paramètre | Valeur | Justification |
|---|---|---|
| `pool_size` | 15 | Taille nominale adaptée au V0 |
| `max_overflow` | 5 | Marge pour les pics de charge |
| `pool_timeout` | 30s | Évite les blocages infinis |
| `pool_recycle` | 3600s | Évite les connexions zombies |
| `pool_pre_ping` | `True` | Détecte les connexions mortes |

### 7.3 Règles
- Ne pas ouvrir de connexions manuelles en dehors du pool.
- Toujours libérer les connexions via le contexte `async with`.
- Surveiller les métriques du pool (nombre de connexions actives, files d'attente).
- En cas de saturation récurrente, augmenter `pool_size` ou introduire PgBouncer en V1.

### 7.4 Monitoring du pool
Logger périodiquement l'état du pool :
- Nombre de connexions utilisées.
- Nombre de connexions en attente.
- Nombre de timeouts.

---

## 8. Rate limiting (ZG-4)

### 8.1 Stratégie en deux lignes de défense

| Ligne | Outil | Rôle |
|---|---|---|
| **1ʳᵉ ligne** | Nginx (`limit_req`) | Protection brute contre les abus massifs |
| **2ᵉ ligne** | slowapi (FastAPI) | Rate limiting fin par endpoint et par utilisateur |

### 8.2 Configuration Nginx (1ʳᵉ ligne)

```nginx
# Zone de rate limiting globale
limit_req_zone $binary_remote_addr zone=global:10m rate=30r/s;

# Zone pour les endpoints sensibles
limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=ai:10m rate=10r/m;

server {
    # Endpoints publics
    location /api/ {
        limit_req zone=global burst=50 nodelay;
        proxy_pass http://backend;
    }

    # Authentification
    location /api/v1/auth/ {
        limit_req zone=auth burst=3 nodelay;
        proxy_pass http://backend;
    }

    # Endpoints IA
    location /api/v1/*/ai/ {
        limit_req zone=ai burst=5 nodelay;
        proxy_pass http://backend;
    }
}
```

### 8.3 Configuration slowapi (2ᵉ ligne)

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

# Exemple : endpoint de login
@router.post("/login")
@limiter.limit("5/minute")
async def login(request: Request, ...):
    ...

# Exemple : endpoint IA
@router.post("/clubs/{club_id}/ai/actions/{action_key}")
@limiter.limit("10/minute")
async def trigger_ai_action(request: Request, ...):
    ...
```

### 8.4 Règles
- Les deux lignes de défense sont **complémentaires**, pas redondantes.
- Les limites Nginx sont **plus larges** (protection DDoS).
- Les limites slowapi sont **plus fines** (abus métier).
- Les endpoints d'authentification et d'IA sont **prioritairement protégés**.
- Les réponses 429 doivent inclure un message clair et un `Retry-After`.

### 8.5 Endpoints prioritaires
| Endpoint | Limite Nginx | Limite slowapi |
|---|---|---|
| `/auth/login` | 5 req/min | 5 req/min |
| `/auth/refresh` | 10 req/min | 10 req/min |
| `/ai/actions/*` | 10 req/min | 10 req/min |
| `/files/upload` | 5 req/min | 5 req/min |
| Endpoints généraux | 30 req/s | Non limités |

---

## 9. Sécurité

### 9.1 Authentification
- JWT pour les access tokens (courte durée : 15 minutes).
- Refresh tokens stockés en base de données (révocables).
- Refresh tokens transmis en cookie httpOnly, Secure, SameSite=Strict.
- Hash des mots de passe avec bcrypt (cost factor ≥ 12) ou argon2id.

### 9.2 Permissions
- Vérification systématique côté backend via `Depends`.
- Jamais de confiance dans les permissions envoyées par le frontend.
- Isolation multi-tenant stricte par `club_id`.

### 9.3 Données sensibles
- Données médicales et physiques dans des tables séparées.
- Accès restreint par permissions explicites.
- Jamais incluses dans les logs, même partiellement.
- Jamais envoyées à DeepSeek sans autorisation explicite de l'utilisateur.

### 9.4 Fichiers uploadés
- Validation stricte du type MIME et de l'extension.
- Taille maximale : 10 Mo.
- Stockage dans un dossier isolé, non exécutable.
- Noms de fichiers sanitizés (UUID).
- Traités comme contenu non fiable.

### 9.5 Headers de sécurité
- `Content-Security-Policy`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security` (HSTS)
- `Referrer-Policy: strict-origin-when-cross-origin`

---

## 10. Logs et monitoring

### 10.1 Logs structurés
- Format JSON obligatoire en production.
- Champs standards : `timestamp`, `level`, `message`, `module`, `user_id`, `club_id`, `request_id`.
- Pas de données sensibles dans les logs.
- Niveau INFO en production, DEBUG en développement.

### 10.2 Corrélation
- Chaque requête reçoit un `request_id` unique (UUID).
- Le `request_id` est propagé dans tous les logs de la requête.
- Permet de tracer un parcours utilisateur complet.

### 10.3 Monitoring externe (ZG-16)
- **Healthcheck interne** : endpoint `/health` exposant l'état des dépendances (DB, fichier system).
- **Uptime Robot** : monitoring externe gratuit pour alerter en cas d'indisponibilité.
- **Pas de Prometheus / Grafana** pour le V0.

### 10.4 Alertes
- Email en cas d'indisponibilité détectée par Uptime Robot.
- Alertes sur les erreurs 5xx répétées.
- Alertes sur les tentatives d'intrusion (brute force login).

---

## 11. Sauvegardes (ZG-17)

### 11.1 Stratégie

| Type | Fréquence | Rétention |
|---|---|---|
| Quotidienne | Chaque nuit à 2h | 7 jours |
| Hebdomadaire | Chaque dimanche à 3h | 4 semaines |
| Mensuelle | 1er du mois à 4h | 12 mois |

### 11.2 Règles fondamentales

| Règle | Détail |
|---|---|
| **Externalisées** | Stockées hors du serveur Dell (service cloud ou serveur distant) |
| **Chiffrées** | Chiffrement AES-256 avant transfert |
| **Testées** | Test de restauration **mensuel** obligatoire |
| **Documentées** | Procédure de restauration documentée et accessible |
| **Journalisées** | Chaque sauvegarde loguée (succès / échec / taille) |

### 11.3 Outils recommandés
- **pg_dump** pour la base de données.
- **rsync** + **rclone** pour l'externalisation.
- **gpg** ou **age** pour le chiffrement.
- **cron** pour la planification.

### 11.4 Périmètre des sauvegardes
- Base de données PostgreSQL complète.
- Fichiers uploadés (dossier de stockage).
- Fichiers de configuration critiques (nginx, .env).
- Scripts de déploiement et migrations Alembic.

### 11.5 Procédure de restauration
Une procédure de restauration documentée doit exister, testée mensuellement :
1. Identifier la sauvegarde cible.
2. Récupérer la sauvegarde externalisée.
3. Déchiffrer la sauvegarde.
4. Restaurer la base de données.
5. Restaurer les fichiers uploadés.
6. Vérifier l'intégrité des données.
7. Valider le fonctionnement de l'application.

### 11.6 Non-inclus (V0)
- Pas de réplication en temps réel.
- Pas de backup PITR (Point-In-Time Recovery).
- Ces fonctionnalités pourront être envisagées en V1 selon la criticité.

---

## 12. Tests

### 12.1 Pyramide de tests
- **Tests unitaires** : majorité des tests, logique métier pure.
- **Tests d'intégration** : interactions entre modules, endpoints API.
- **Tests E2E** : parcours utilisateurs critiques (à définir).

### 12.2 Outils
- **pytest** pour le backend.
- **Vitest** ou **Jest** pour le frontend.
- **Playwright** pour les tests E2E.
- **Coverage minimum** : 80% sur le code métier, 70% global.

### 12.3 Règles
- Un test par fonction métier critique.
- Tests de non-régression obligatoires pour les bugs corrigés.
- Tests isolés (pas de dépendance à l'état externe).
- Données de test factory-based (Faker pour Python).

---

## 13. Déploiement

### 13.1 Environnements
- **dev** : développement local, Docker Compose.
- **staging** : pré-production, serveur dédié (ou VM).
- **prod** : serveur Dell, Ubuntu 22.04, UPS.

### 13.2 Conteneurisation
- Docker pour tous les environnements.
- Docker Compose pour le développement local.
- Images légères (alpine ou slim).
- Pas de secrets dans les images.

### 13.3 CI/CD
- GitHub Actions ou GitLab CI.
- Étapes : lint, tests, build image, push registry, déploiement.
- Déploiements blue-green ou rolling pour éviter les downtime.

### 13.4 Secrets
- Stockés dans `.env` en local (non commité).
- Variables d'environnement en production.
- Jamais dans le code source, jamais dans les logs.

---

## 14. Gestion des dépendances

### 14.1 Backend
- `poetry` ou `uv` pour la gestion des dépendances.
- Fichier `pyproject.toml` comme source unique.
- `poetry.lock` ou `uv.lock` commité.
- Audit régulier des vulnérabilités (`pip-audit` ou équivalent).

### 14.2 Frontend
- `pnpm` recommandé (ou npm/yarn au choix).
- `package-lock.json` ou `pnpm-lock.yaml` commité.
- Audit régulier (`pnpm audit`).

### 14.3 Mises à jour
- Mises à jour de sécurité appliquées rapidement.
- Mises à jour majeures planifiées et testées.
- Pas de dépendances abandonnées.

---

## 15. Git et workflow

### 15.1 Conventions de commits
- Format Conventional Commits : `type(scope): description`.
- Types : `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`.
- Scopes : `auth`, `matches`, `training`, `ai`, etc.

### 15.2 Branches
- `main` : production stable.
- `develop` : intégration continue.
- `feature/*` : nouvelles fonctionnalités.
- `fix/*` : corrections de bugs.
- `release/*` : préparation de release.

### 15.3 Revue de code
- Pull request obligatoire pour toute modification de `main`.
- Au moins une approbation.
- CI verte obligatoire.
- Pas de merge direct sur `main`.

---

## 16. Performance

### 16.1 Backend
- Requêtes DB optimisées (index, eager loading).
- Pagination sur les listes (max 100 éléments par page).
- Pas de N+1 queries.
- Profiling périodique avec `py-spy` ou `cProfile`.

### 16.2 Frontend
- Code splitting par route.
- Images optimisées (WebP, lazy loading).
- Bundle size monitoré.
- Lighthouse score > 90 sur les pages clés.

### 16.3 Réseau
- Compression gzip/brotli via Nginx.
- Cache HTTP sur les assets statiques.
- CDN envisagé en V1 si besoin.

---

## 17. Documentation

### 17.1 Code
- Docstrings obligatoires sur les fonctions publiques.
- README par module si complexe.
- Commentaires pour les décisions non évidentes.

### 17.2 API
- Documentation OpenAPI générée automatiquement par FastAPI.
- Accessible sur `/docs` (Swagger UI) et `/redoc`.
- Tags par module pour navigation claire.

### 17.3 Procédures
- Procédures de déploiement documentées.
- Procédures de restauration documentées.
- Procédures d'incident documentées.

---

## 18. Éthique et conformité

### 18.1 Données personnelles
- Respect de la loi sénégalaise n°2008-12 (CDP).
- Principe de minimisation appliqué.
- Consentement explicite pour les données sensibles.
- Droit d'accès et de rectification respecté.

### 18.2 IA
- Transparence : l'utilisateur sait quand l'IA est utilisée.
- Contrôle : le coach reste toujours le décideur final.
- Pas de biais : surveillance régulière des suggestions.
- Pas de profilage caché.

---

## 19. Évolution des standards

Ce document est vivant. Toute modification doit être :
- Discutée avec l'équipe.
- Validée dans `DECISIONS_FIGEES.md` si elle impacte l'architecture.
- Documentée avec sa date et son auteur.
- Répercutée dans les documents compagnons si nécessaire.

---

## 20. Récapitulatif des standards critiques

| Domaine | Standard | Référence |
|---|---|---|
| Architecture | Monolithe modulaire FastAPI | DECISIONS_FIGEES.md §22 |
| Cache | Mémoire Python in-process (cachetools) | ZG-1 |
| Pool DB | SQLAlchemy 15 connexions + 5 overflow | ZG-3 |
| Rate limiting | Nginx + slowapi | ZG-4 |
| Refresh tokens | Stockés en base, révocables | ZG-5 |
| Scheduler IA | APScheduler intégré | ZG-6 |
| Templates IA | En base de données, versionnés | ZG-7 |
| Fallback IA | Règles métier dynamiques | ZG-8 |
| Monitoring | Healthcheck + Uptime Robot | ZG-16 |
| Sauvegardes | Quot./hebdo./mens. externalisées chiffrées | ZG-17 |
| Permissions | Dynamiques, hiérarchie à sens unique | DECISIONS_FIGEES.md §6-7 |

