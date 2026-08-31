Voici les deux documents consolidés, fusionnant l'ensemble des constats (le vôtre et le mien) en un rapport d'audit exhaustif et un plan de remédiation structuré.

---

# DOCUMENT 1 : RAPPORT D'AUDIT CONSOLIDÉ (ANALYSTAFF)

## 1. Synthèse Exécutive
**Verdict :** La documentation de référence (`.md`) constitue un cahier des charges de niveau professionnel, rigoureux et mature. Le code backend (FastAPI/SQLAlchemy), bien que techniquement propre sur sa structure de base, est en **rupture de contrat** avec les spécifications. 

**Cause racine :** Une dérive systémique (Schema & Business Drift) où l'implémentation a utilisé des raccourcis techniques et omis des règles métier critiques, sans mise à jour synchronisée de la documentation.

## 2. Matrice des Incohérences Détectées

### 🔴 Niveau CRITIQUE (Rupture de contrat de données ou fonctionnel)

| ID | Incohérence | Référence Document | Réalité Backend | Impact |
|---|---|---|---|---|
| **C-01** | **Clés primaires `Integer` au lieu de `BIGINT IDENTITY`** | `SCHEMA_SQL.md §1.2` exige `BIGINT GENERATED ALWAYS AS IDENTITY`. | Tous les modèles utilisent `Mapped[int]` + `autoincrement=True` (génère `SERIAL` 4 octets). | Violation du contrat de schéma sur 30+ tables. Risque de saturation sur les tables à fort volume. |
| **C-02** | **Table `audit_logs` totalement absente** | `SCHEMA_SQL.md §12.1` + `MATRICE §8` + `architecture-mvp-reelle.md §5`. | Le dossier `app/audit/` est vide. Aucune table créée. | Rupture de la traçabilité obligatoire (RGPD, actions sensibles). |
| **C-03** | **Table `player_parental_consents` absente** | `SCHEMA_SQL.md §6.2` + `DECISIONS_FIGEES.md §18.4` (ZG-15). | Modèle et table inexistants. | Non-conformité légale majeure (mineurs). |
| **C-04** | **Table `user_preferences` absente** | `SCHEMA_SQL.md §13.1`. | Modèle et table inexistants. | Impossible de personnaliser l'UX ou les paramètres utilisateur. |
| **C-05** | **`evaluations.synchronisee` absent** | `SCHEMA_SQL.md §9.1` exige `BOOLEAN NOT NULL DEFAULT FALSE`. | Le champ n'existe pas dans `Evaluation` (`evaluations/models.py`). | Casse la logique offline-first des évaluations de match. |
| **C-06** | **`training_evaluations.synchronisee` défaut inversé** | `SCHEMA_SQL.md §8.4` exige `DEFAULT FALSE`. | Backend : `default=True`. | Une évaluation est faussement considérée comme synchronisée dès sa création. |
| **C-07** | **Permissions IA non documentées** | `MATRICE_PERMISSIONS` (liste close). | Backend utilise `UTILISER_ASSISTANT_IA` et `IMPORTER_SEANCE_DU_JOUR`. | Blocage fonctionnel si le seed DB se base sur le `.md`. |

### 🟠 Niveau MAJEUR (Erreurs de configuration ou d'API)

| ID | Incohérence | Référence Document | Réalité Backend | Impact |
|---|---|---|---|---|
| **M-01** | **URLs API erronées dans le README** | `architecture-mvp-reelle.md §4` (hiérarchie `/clubs/{club_id}/`). | `README.md` annonce des endpoints plats (`/api/v1/players`). | Documentation publique trompeuse, erreurs d'intégration frontend. |
| **M-02** | **Permission orpheline `GERER_JOUEURS`** | `MATRICE_PERMISSIONS` (non listée). | Utilisée 3 fois dans `players/router.py`. | Incohérence entre le contrat métier et le code. |
| **M-03** | **Permissions `GERER_PERMISSIONS` / `CONSULTER_AUDIT` non utilisées** | Définies dans `MATRICE §2.5`. | Aucun endpoint ne les appelle. | Endpoints manquants ou documentation en avance sur le code. |
| **M-04** | **Bug d'import `timezone`** | N/A (Erreur Python). | `training/models.py` utilise `timezone.utc` sans l'importer. | `NameError` et crash à l'exécution. |
| **M-05** | **Fichier `nginx.conf` manquant** | Requis par `docker-compose.yml`. | Le fichier n'existe pas dans le repo. | Impossible de démarrer le stack Docker. |
| **M-06** | **Duplication de `health_router`** | N/A (Code propre). | `main.py` inclut le router 3 fois. | Code redondant, confusion. |
| **M-07** | **System Prompt IA non seedé** | `SPECIFICATIONS_IA §4.0`. | Le fichier `.md` existe mais aucun script ne l'injecte en DB. | Module IA potentiellement vide au premier déploiement. |

### 🟡 Niveau MOYEN (Cohérence Pydantic, conventions, règles métier)

| ID | Incohérence | Référence Document | Réalité Backend | Impact |
|---|---|---|---|---|
| **Y-01** | **`photo_url` absent de `PlayerResponse`** | `SCHEMA_SQL.md §6.1`. | Le champ existe en DB mais pas dans le schéma Pydantic de réponse. | Le frontend ne peut jamais afficher la photo du joueur. |
| **Y-02** | **`charge_travail` non modifiable via API** | `SCHEMA_SQL.md §6.3`. | Absent de `PhysicalProfileUpdate`. | Impossible d'ajuster manuellement la charge cumulée. |
| **Y-03** | **`Evaluation.statut` non typé en Enum** | Convention interne (tous les autres statuts sont des Enums). | Simple `String(20)`. | Perte de sécurité au typage, risque de valeurs invalides. |
| **Y-04** | **Type hint `require_club_member` trompeur** | N/A. | `dashboard/router.py` type le retour comme `User` au lieu de `StaffMember`. | Confusion pour les développeurs, IDE incorrect. |
| **Y-05** | **Règle métier : Validation du gardien** | `MATRICE §4.3` (Gardien obligatoire). | Aucune validation dans `matches/service.py`. | Composition invalide acceptée par le système. |
| **Y-06** | **Règle métier : Redistribution des poids** | `MATRICE §3.4` (Pilier non noté). | Logique absente dans `evaluations/service.py`. | Calcul de note globale erroné si pilier manquant. |
| **Y-07** | **Arborescence module IA obsolète** | `SPECIFICATIONS_IA §1.1`. | Liste des fichiers fictifs (`templates.py`, etc.). | Documentation trompeuse pour les nouveaux devs. |

### 🟢 Niveau MINEUR (Dette technique légère)

| ID | Incohérence | Référence | Réalité |
|---|---|---|---|
| **L-01** | Imports dupliqués | N/A | `training/models.py` importe 2 fois les mêmes types. |
| **L-02** | Version FastAPI | `README` vs `pyproject.toml` | README dit `0.115+`, `pyproject` dit `>=0.110`. |

---
---

# DOCUMENT 2 : PLAN DE REMÉDIATION (CORRECTIFS)

## Stratégie d'Intervention
Les correctifs sont ordonnés par dépendance technique. **L'ordre strict est : 1. Modèles de données (SQLAlchemy) → 2. Migrations Alembic → 3. Logique métier (Services) → 4. API (Pydantic/Routers) → 5. Documentation/Config.**

### Phase 1 : Refonte du Contrat de Données (SQLAlchemy)

#### 1.1 Création du Mixin d'Identité (Correction C-01)
**Fichier :** `backend/app/core/mixins.py`
```python
from sqlalchemy import BigInteger, Identity
from sqlalchemy.orm import Mapped, mapped_column

class BigIntIdentityMixin:
    """
    Contrat SCHEMA_SQL.md §1.2 : BIGINT GENERATED ALWAYS AS IDENTITY.
    Remplace l'ancien pattern Integer + autoincrement.
    """
    id: Mapped[int] = mapped_column(
        BigInteger, 
        Identity(always=True), 
        primary_key=True
    )
```
*Action :* Hériter de `BigIntIdentityMixin` dans tous les modèles (`User`, `Club`, `Player`, etc.) à la place de `TimestampMixin` ou `CreatedAtMixin` pour la colonne `id`.

#### 1.2 Ajout des Modèles Manquants (Corrections C-02, C-03, C-04)
**Fichier :** `backend/app/audit/models.py` (Création)
```python
from typing import Optional
from sqlalchemy import BigInteger, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, INET
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
from app.core.mixins import CreatedAtMixin, BigIntIdentityMixin

class AuditLog(Base, BigIntIdentityMixin, CreatedAtMixin):
    __tablename__ = "audit_logs"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    club_id: Mapped[Optional[int]] = mapped_column(ForeignKey("clubs.id"), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    resource_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    resource_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    details: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(INET, nullable=True)
```
*(Répéter l'exercice pour `PlayerParentalConsent` dans `players/models.py` et `UserPreference` dans `users/models.py` selon les specs `SCHEMA_SQL.md`)*.

#### 1.3 Correction des Colonnes Existantes (Corrections C-05, C-06)
**Fichier :** `backend/app/training/models.py`
```python
from datetime import datetime, timezone # Correction M-04 (Import manquant)

class TrainingEvaluation(Base, BigIntIdentityMixin, TimestampMixin):
    # ...
    synchronisee: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False) # C-06 : FALSE au lieu de TRUE
```
**Fichier :** `backend/app/evaluations/models.py`
```python
class Evaluation(Base, BigIntIdentityMixin, TimestampMixin):
    # ...
    synchronisee: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False) # C-05 : Ajout du champ manquant
    statut: Mapped[str] = mapped_column(String(20), nullable=False, default="brouillon") # À terme, migrer vers un Enum
```

#### 1.4 Génération de la Migration Alembic
```bash
cd backend
alembic revision --autogenerate -m "refactor_bigint_identity_and_missing_tables"
```
*Note :* Vérifier manuellement le fichier de migration généré pour s'assurer que les `ALTER TABLE` des clés primaires sont corrects (cela peut nécessiter des opérations `USING` en PostgreSQL).

### Phase 2 : Réconciliation des Permissions et Seeds (Corrections C-07, M-02, M-03, M-07)

**Fichier :** `backend/app/core/seed.py` (Création/Mise à jour)
```python
# Script idempotent pour insérer les permissions manquantes et le System Prompt
from sqlalchemy import select
from app.roles.models import Permission
from app.ai.models import AiTemplate

REQUIRED_PERMISSIONS = [
    "UTILISER_ASSISTANT_IA", "IMPORTER_SEANCE_DU_JOUR", 
    "GERER_JOUEURS", "GERER_PERMISSIONS", "CONSULTER_AUDIT"
]

async def seed_permissions(session):
    for code in REQUIRED_PERMISSIONS:
        exists = await session.execute(select(Permission).where(Permission.code == code))
        if not exists.scalar_one_or_none():
            session.add(Permission(code=code, label=code.replace("_", " ").title()))
    await session.commit()
```
*Action :* Mettre à jour `MATRICE_PERMISSIONS_ET_REGLES_METIER.md` pour y inclure officiellement `UTILISER_ASSISTANT_IA`, `IMPORTER_SEANCE_DU_JOUR` et `GERER_JOUEURS`.

### Phase 3 : Implémentation des Règles Métier Oubliées (Corrections Y-05, Y-06)

**Fichier :** `backend/app/matches/service.py` (Ajout dans la fonction de validation)
```python
async def validate_lineup(db, match_id, user):
    # ... récupération des joueurs ...
    if not any(p.is_goalkeeper for p in lineup_players):
        raise ValidationError("Règle métier §4.3 : Au moins un gardien obligatoire.")
```

**Fichier :** `backend/app/evaluations/service.py` (Logique de calcul)
```python
def calculate_global_note(pillars_notes, weighting_matrix):
    # Y-06 : Filtrer les piliers non notés (None)
    active_pillars = {k: v for k, v in pillars_notes.items() if v is not None}
    if not active_pillars:
        return None # Ou lever une exception EVALUATION_INCOMPLETE
    
    # Recalculer les poids proportionnellement aux piliers actifs
    total_weight = sum(getattr(weighting_matrix, f"poids_{k}") for k in active_pillars)
    if total_weight == 0:
        return 0.0
        
    note_globale = sum(
        (note * getattr(weighting_matrix, f"poids_{pilier}")) / total_weight 
        for pilier, note in active_pillars.items()
    )
    return round(note_globale, 1)
```

### Phase 4 : Corrections API, Pydantic et Configuration (Corrections M-01, M-05, M-06, Y-01, Y-02)

1. **Nettoyage `main.py`** : Supprimer les 2 lignes dupliquées de `health_router`.
2. **Mise à jour `README.md`** : Remplacer tous les endpoints par `/api/v1/clubs/{club_id}/...`.
3. **Création `nginx/nginx.conf`** : Fournir un reverse proxy standard vers `backend:8000` avec `client_max_body_size 10M;`.
4. **Mise à jour Pydantic** :
   - `players/schemas.py` : Ajouter `photo_url: str | None` à `PlayerResponse`.
   - `players/schemas.py` : Ajouter `charge_travail: float | None` à `PhysicalProfileUpdate`.
   - `dashboard/router.py` : Corriger le type hint de `require_club_member` en `StaffMember`.

### Phase 5 : Recommandations Processuelles (CI/CD)

Pour garantir que cette dérive ne se reproduise pas, implémenter dans la pipeline CI :
1. **Test de contrat de schéma** : Un script pytest qui parse `SCHEMA_SQL.md` et vérifie que les tables/colonnes existent dans `Base.metadata`.
2. **Règle de fusion** : Interdire le merge si une modification de `models.py` n'est pas accompagnée d'un fichier de migration Alembic et d'une mise à jour du `.md` correspondant.