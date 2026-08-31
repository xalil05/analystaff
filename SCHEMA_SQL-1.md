
# Analystaff — Schéma SQL définitif

Ce document décrit le schéma de base de données PostgreSQL du V0 d'Analystaff.

**Référence absolue :** `DECISIONS_FIGEES.md`
En cas de contradiction entre ce schéma et `DECISIONS_FIGEES.md`, c'est `DECISIONS_FIGEES.md` qui fait foi.

**Règle fondamentale :**
- Une seule source de vérité SQL.
- Les migrations sont gérées exclusivement avec Alembic.
- Aucune modification manuelle du schéma en production.
- Toute évolution du schéma doit être documentée et versionnée.

---

## 1. Conventions générales

### 1.1 Nommage
- **Tables** : snake_case, pluriel. Exemple : `clubs`, `players`, `matches`.
- **Colonnes** : snake_case. Exemple : `created_at`, `club_id`, `is_active`.
- **Clés primaires** : toujours nommées `id`.
- **Clés étrangères** : nommées `<table_singulier>_id`. Exemple : `club_id`, `player_id`, `match_id`.
- **Timestamps** : `created_at`, `updated_at`, `deleted_at`.
- **Enums** : snake_case. Exemple : `club_level`, `match_statut`.

### 1.2 Types d'identifiants
- Toutes les clés primaires sont de type `BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`.
- Les clés étrangères référencent ces identifiants.

### 1.3 Timestamps et fuseau horaire
- Toutes les colonnes de type timestamp utilisent `TIMESTAMPTZ`.
- Le stockage est effectué en **UTC**.
- L'affichage en fuseau local (par défaut `Africa/Dakar`) est géré côté application.

### 1.4 Isolation multi-tenant
- La colonne `club_id` est présente sur toutes les tables qui nécessitent une isolation par club.
- Toute requête métier doit filtrer par `club_id`.
- Des index sont systématiquement créés sur `club_id`.

### 1.5 Soft delete et archivage
- Les tables contenant des données sensibles ou historiques utilisent un champ `deleted_at` (`TIMESTAMPTZ`, nullable) ou `is_archived` (`BOOLEAN`).
- Aucune suppression définitive n'est effectuée sur les données sensibles sans procédure explicite.

### 1.6 Audit et traçabilité
- Les tables critiques incluent des colonnes `created_by` et `updated_by` (`BIGINT`, FK vers `users.id`, nullable).
- Ces colonnes permettent de tracer l'utilisateur à l'origine de chaque modification.

---

## 2. Types énumérés (PostgreSQL ENUM)

Les types énumérés suivants doivent être créés avec `CREATE TYPE`.

```sql
CREATE TYPE club_level AS ENUM ('amateur', 'semi_pro', 'pro');
CREATE TYPE player_statut AS ENUM ('actif', 'blesse', 'suspendu', 'parti', 'archive');
CREATE TYPE match_statut AS ENUM ('brouillon', 'programme', 'termine', 'archive');
CREATE TYPE lineup_statut AS ENUM ('brouillon', 'valide');
CREATE TYPE substitution_motif AS ENUM ('tactique', 'blessure', 'fatigue', 'sanction', 'autre');
CREATE TYPE training_statut AS ENUM ('planifiee', 'realisee', 'annulee');
CREATE TYPE assiduite AS ENUM ('present', 'absent', 'retard');
CREATE TYPE pilier AS ENUM ('physique', 'technique', 'tactique', 'mental');
CREATE TYPE poste_groupe AS ENUM ('gardien', 'defenseur', 'milieu', 'attaquant');
CREATE TYPE ai_suggestion_statut AS ENUM ('DRAFT', 'READY', 'VIEWED', 'ACCEPTED', 'MODIFIED', 'REJECTED', 'OUTDATED');
CREATE TYPE invitation_statut AS ENUM ('pending', 'accepted', 'expired', 'revoked');
CREATE TYPE contexte_saisie AS ENUM ('direct_stade', 'apres_match', 'avant_entrainement', 'apres_entrainement', 'planification', 'autre');
CREATE TYPE file_type AS ENUM ('pdf', 'txt', 'docx', 'jpeg', 'png');
CREATE TYPE work_plan_type AS ENUM ('hebdomadaire', 'mensuel');
CREATE TYPE staff_member_statut AS ENUM ('actif', 'suspendu', 'parti');
```

---

## 3. Domaine : Authentification et utilisateurs

### 3.1 Table `users`
Comptes utilisateurs de la plateforme.

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `id` | BIGINT GENERATED ALWAYS AS IDENTITY | PK | Identifiant unique |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE | Email de connexion |
| `password_hash` | VARCHAR(255) | NOT NULL | Hash bcrypt/argon2 du mot de passe |
| `nom` | VARCHAR(100) | NOT NULL | Nom de l'utilisateur |
| `prenom` | VARCHAR(100) | NULL | Prénom de l'utilisateur |
| `is_active` | BOOLEAN | NOT NULL DEFAULT TRUE | Compte actif ou désactivé |
| `last_login_at` | TIMESTAMPTZ | NULL | Date de dernière connexion |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de création |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de mise à jour |

**Index :**
- `idx_users_email` UNIQUE sur `email`.

---

### 3.2 Table `refresh_tokens` ⭐ AJOUT ZG-5
Refresh tokens stockés en base de données pour permettre la révocation (déconnexion, sécurité).

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `id` | BIGINT GENERATED ALWAYS AS IDENTITY | PK | Identifiant unique |
| `user_id` | BIGINT | NOT NULL, FK → users.id | Utilisateur propriétaire |
| `token_hash` | VARCHAR(255) | NOT NULL, UNIQUE | Hash du refresh token (jamais stocké en clair) |
| `expires_at` | TIMESTAMPTZ | NOT NULL | Date d'expiration |
| `revoked_at` | TIMESTAMPTZ | NULL | Date de révocation (si révoqué) |
| `user_agent` | TEXT | NULL | User-Agent du client ayant créé le token |
| `ip_address` | INET | NULL | Adresse IP du client ayant créé le token |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de création |

**Index :**
- `idx_refresh_tokens_user_id` sur `user_id`.
- `idx_refresh_tokens_token_hash` UNIQUE sur `token_hash`.
- `idx_refresh_tokens_expires_at` sur `expires_at` (pour purge automatique).

**Règles d'utilisation :**
- Le refresh token est transmis au client dans un cookie httpOnly, Secure, SameSite=Strict.
- Seule l'empreinte (hash) est stockée en base.
- Un token révoqué (`revoked_at IS NOT NULL`) est considéré comme invalide.
- Les tokens expirés doivent être purgés régulièrement (tâche planifiée ou lors de la validation).

---

### 3.3 Table `invitations`
Invitations envoyées par le coach ou un administrateur autorisé.

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `id` | BIGINT GENERATED ALWAYS AS IDENTITY | PK | Identifiant unique |
| `club_id` | BIGINT | NOT NULL, FK → clubs.id | Club destinataire |
| `email` | VARCHAR(255) | NOT NULL | Email invité |
| `role_id` | BIGINT | NOT NULL, FK → roles.id | Rôle proposé |
| `invited_by` | BIGINT | NOT NULL, FK → users.id | Utilisateur à l'origine de l'invitation |
| `statut` | invitation_statut | NOT NULL DEFAULT 'pending' | Statut de l'invitation |
| `expires_at` | TIMESTAMPTZ | NULL | Date d'expiration |
| `accepted_at` | TIMESTAMPTZ | NULL | Date d'acceptation |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de création |

**Index :**
- `idx_invitations_club_id` sur `club_id`.
- `idx_invitations_email` sur `email`.

---

## 4. Domaine : Structure club et équipes

### 4.1 Table `clubs`
Clubs de football.

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `id` | BIGINT GENERATED ALWAYS AS IDENTITY | PK | Identifiant unique |
| `nom` | VARCHAR(150) | NOT NULL | Nom du club |
| `niveau` | club_level | NOT NULL | Niveau du club (amateur, semi-pro, pro) |
| `timezone` | VARCHAR(50) | NOT NULL DEFAULT 'Africa/Dakar' | Fuseau horaire du club |
| `is_archived` | BOOLEAN | NOT NULL DEFAULT FALSE | Club archivé |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de création |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de mise à jour |

**Index :**
- `idx_clubs_niveau` sur `niveau`.

---

### 4.2 Table `seasons`
Saisons sportives d'un club.

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `id` | BIGINT GENERATED ALWAYS AS IDENTITY | PK | Identifiant unique |
| `club_id` | BIGINT | NOT NULL, FK → clubs.id | Club propriétaire |
| `label` | VARCHAR(50) | NOT NULL | Libellé (ex. Saison 2026-2027) |
| `date_debut` | DATE | NOT NULL | Date de début |
| `date_fin` | DATE | NULL | Date de fin |
| `is_active` | BOOLEAN | NOT NULL DEFAULT FALSE | Saison active |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de création |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de mise à jour |

**Contraintes :**
- UNIQUE(`club_id`, `label`).

**Index :**
- `idx_seasons_club_id` sur `club_id`.

---

### 4.3 Table `teams`
Équipes d'un club.

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `id` | BIGINT GENERATED ALWAYS AS IDENTITY | PK | Identifiant unique |
| `club_id` | BIGINT | NOT NULL, FK → clubs.id | Club propriétaire |
| `nom` | VARCHAR(100) | NOT NULL | Nom de l'équipe |
| `categorie` | VARCHAR(50) | NULL | Catégorie (seniors, u19, u17, etc.) |
| `is_archived` | BOOLEAN | NOT NULL DEFAULT FALSE | Équipe archivée |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de création |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de mise à jour |

**Index :**
- `idx_teams_club_id` sur `club_id`.

---

## 5. Domaine : Rôles et permissions

### 5.1 Table `roles`
Rôles disponibles dans la plateforme.

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `id` | BIGINT GENERATED ALWAYS AS IDENTITY | PK | Identifiant unique |
| `code` | VARCHAR(50) | NOT NULL, UNIQUE | Code unique (ex. HEAD_COACH, FITNESS_COACH) |
| `label` | VARCHAR(100) | NOT NULL | Libellé affiché |
| `description` | TEXT | NULL | Description du rôle |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de création |

---

### 5.2 Table `roles_available_by_level`
Association niveau de club → rôles disponibles.

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `id` | BIGINT GENERATED ALWAYS AS IDENTITY | PK | Identifiant unique |
| `club_level` | club_level | NOT NULL | Niveau de club |
| `role_id` | BIGINT | NOT NULL, FK → roles.id | Rôle disponible |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de création |

**Contraintes :**
- UNIQUE(`club_level`, `role_id`).

**Index :**
- `idx_roles_available_by_level_club_level` sur `club_level`.

---

### 5.3 Table `permissions`
Permissions disponibles dans la plateforme.

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `id` | BIGINT GENERATED ALWAYS AS IDENTITY | PK | Identifiant unique |
| `code` | VARCHAR(100) | NOT NULL, UNIQUE | Code unique (ex. VOIR_DONNEES_PHYSIQUES) |
| `label` | VARCHAR(150) | NOT NULL | Libellé affiché |
| `description` | TEXT | NULL | Description de la permission |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de création |

---

### 5.4 Table `role_permissions`
Permissions par défaut d'un rôle.

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `id` | BIGINT GENERATED ALWAYS AS IDENTITY | PK | Identifiant unique |
| `role_id` | BIGINT | NOT NULL, FK → roles.id | Rôle |
| `permission_id` | BIGINT | NOT NULL, FK → permissions.id | Permission |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de création |

**Contraintes :**
- UNIQUE(`role_id`, `permission_id`).

**Index :**
- `idx_role_permissions_role_id` sur `role_id`.

---

### 5.5 Table `staff_members`
Association utilisateur ↔ club avec rôle. Représente l'appartenance d'un membre du staff à un club.

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `id` | BIGINT GENERATED ALWAYS AS IDENTITY | PK | Identifiant unique |
| `user_id` | BIGINT | NOT NULL, FK → users.id | Utilisateur |
| `club_id` | BIGINT | NOT NULL, FK → clubs.id | Club |
| `role_id` | BIGINT | NOT NULL, FK → roles.id | Rôle dans le club |
| `statut` | staff_member_statut | NOT NULL DEFAULT 'actif' | Statut du membre |
| `joined_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date d'arrivée |
| `left_at` | TIMESTAMPTZ | NULL | Date de départ |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de création |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de mise à jour |

**Contraintes :**
- UNIQUE(`user_id`, `club_id`) : un utilisateur n'a qu'une seule adhésion active par club.

**Index :**
- `idx_staff_members_club_id` sur `club_id`.
- `idx_staff_members_user_id` sur `user_id`.

---

### 5.6 Table `user_permissions`
Exceptions individuelles de permissions accordées par le coach principal.

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `id` | BIGINT GENERATED ALWAYS AS IDENTITY | PK | Identifiant unique |
| `staff_member_id` | BIGINT | NOT NULL, FK → staff_members.id | Membre du staff concerné |
| `permission_id` | BIGINT | NOT NULL, FK → permissions.id | Permission accordée |
| `granted_by` | BIGINT | NOT NULL, FK → users.id | Utilisateur ayant accordé la permission |
| `granted_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date d'attribution |
| `revoked_at` | TIMESTAMPTZ | NULL | Date de révocation |
| `note` | TEXT | NULL | Note explicative |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de création |

**Contraintes :**
- UNIQUE(`staff_member_id`, `permission_id`).

**Index :**
- `idx_user_permissions_staff_member_id` sur `staff_member_id`.

---

## 6. Domaine : Joueurs et profils

### 6.1 Table `players`
Identité de base des joueurs.

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `id` | BIGINT GENERATED ALWAYS AS IDENTITY | PK | Identifiant unique |
| `club_id` | BIGINT | NOT NULL, FK → clubs.id | Club propriétaire |
| `team_id` | BIGINT | NULL, FK → teams.id | Équipe principale |
| `nom` | VARCHAR(100) | NOT NULL | Nom du joueur |
| `prenom` | VARCHAR(100) | NULL | Prénom du joueur |
| `photo_url` | TEXT | NULL | URL de la photo |
| `poste` | VARCHAR(50) | NULL | Poste (ex. Défenseur, Attaquant) |
| `numero` | INTEGER | NULL | Numéro de maillot |
| `date_naissance` | DATE | NULL | Date de naissance |
| `statut` | player_statut | NOT NULL DEFAULT 'actif' | Statut du joueur |
| `is_archived` | BOOLEAN | NOT NULL DEFAULT FALSE | Joueur archivé |
| `deleted_at` | TIMESTAMPTZ | NULL | Soft delete |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de création |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de mise à jour |
| `created_by` | BIGINT | NULL, FK → users.id | Créé par |
| `updated_by` | BIGINT | NULL, FK → users.id | Modifié par |

**Index :**
- `idx_players_club_id` sur `club_id`.
- `idx_players_team_id` sur `team_id`.
- `idx_players_statut` sur `statut`.

---

### 6.2 Table `player_parental_consents` ⭐ AJOUT ZG-15
Consentements parentaux pour les joueurs mineurs.

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `id` | BIGINT GENERATED ALWAYS AS IDENTITY | PK | Identifiant unique |
| `player_id` | BIGINT | NOT NULL, FK → players.id | Joueur mineur concerné |
| `parent_name` | VARCHAR(200) | NOT NULL | Nom du représentant légal |
| `parent_relation` | VARCHAR(50) | NOT NULL | Lien de parenté (père, mère, tuteur...) |
| `consent_file_path` | TEXT | NOT NULL | Chemin vers le scan du consentement signé |
| `consented_at` | TIMESTAMPTZ | NOT NULL | Date du consentement |
| `collected_by` | BIGINT | NOT NULL, FK → users.id | Staff ayant collecté le consentement |
| `is_valid` | BOOLEAN | NOT NULL DEFAULT TRUE | Consentement valide |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de création |

**Index :**
- `idx_player_parental_consents_player_id` sur `player_id`.

---

### 6.3 Table `physical_profiles`
Données physiques et morphologiques des joueurs. Table dédiée, séparée de `players`.

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `id` | BIGINT GENERATED ALWAYS AS IDENTITY | PK | Identifiant unique |
| `player_id` | BIGINT | NOT NULL, UNIQUE, FK → players.id | Joueur associé |
| `taille_cm` | NUMERIC(5,1) | NULL | Taille en centimètres |
| `poids_kg` | NUMERIC(5,1) | NULL | Poids en kilogrammes |
| `imc` | NUMERIC(4,1) | NULL | IMC calculé ou saisi |
| `charge_travail` | NUMERIC(10,2) | NULL DEFAULT 0 | Charge de travail cumulée, alimentée par les entraînements |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de création |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de mise à jour |
| `updated_by` | BIGINT | NULL, FK → users.id | Modifié par |

**Index :**
- `idx_physical_profiles_player_id` UNIQUE sur `player_id`.

---

### 6.4 Table `medical_records`
Dossier médical des joueurs. Table dédiée, séparée de `players`.

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `id` | BIGINT GENERATED ALWAYS AS IDENTITY | PK | Identifiant unique |
| `player_id` | BIGINT | NOT NULL, FK → players.id | Joueur associé |
| `type` | VARCHAR(50) | NOT NULL | Type (blessure, contre_indication, antecedent, suivi) |
| `description` | TEXT | NULL | Description de l'événement médical |
| `date_debut` | DATE | NULL | Date de début |
| `date_fin` | DATE | NULL | Date de fin |
| `statut` | VARCHAR(30) | NULL DEFAULT 'en_cours' | Statut (en_cours, gueri, etc.) |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de création |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de mise à jour |
| `created_by` | BIGINT | NULL, FK → users.id | Créé par |
| `updated_by` | BIGINT | NULL, FK → users.id | Modifié par |

**Index :**
- `idx_medical_records_player_id` sur `player_id`.

---

## 7. Domaine : Matchs et tactique

### 7.1 Table `matches`
Matchs de l'équipe.

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `id` | BIGINT GENERATED ALWAYS AS IDENTITY | PK | Identifiant unique |
| `club_id` | BIGINT | NOT NULL, FK → clubs.id | Club propriétaire |
| `team_id` | BIGINT | NOT NULL, FK → teams.id | Équipe concernée |
| `season_id` | BIGINT | NOT NULL, FK → seasons.id | Saison |
| `adversaire` | VARCHAR(150) | NOT NULL | Nom de l'adversaire |
| `competition` | VARCHAR(100) | NULL | Compétition |
| `is_domicile` | BOOLEAN | NOT NULL DEFAULT TRUE | Domicile ou extérieur |
| `date_match` | TIMESTAMPTZ | NOT NULL | Date et heure du match |
| `lieu` | VARCHAR(200) | NULL | Lieu du match |
| `score_equipe` | INTEGER | NULL | Buts marqués par l'équipe |
| `score_adversaire` | INTEGER | NULL | Buts encaissés |
| `statut` | match_statut | NOT NULL DEFAULT 'brouillon' | Statut du match |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de création |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de mise à jour |
| `created_by` | BIGINT | NULL, FK → users.id | Créé par |
| `updated_by` | BIGINT | NULL, FK → users.id | Modifié par |

**Index :**
- `idx_matches_club_id` sur `club_id`.
- `idx_matches_team_id` sur `team_id`.
- `idx_matches_season_id` sur `season_id`.
- `idx_matches_date_match` sur `date_match`.

---

### 7.2 Table `formations`
Formations tactiques prédéfinies ou personnalisées.

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `id` | BIGINT GENERATED ALWAYS AS IDENTITY | PK | Identifiant unique |
| `code` | VARCHAR(20) | NOT NULL, UNIQUE | Code (ex. 4-4-2, 4-3-3) |
| `label` | VARCHAR(100) | NOT NULL | Libellé affiché |
| `description` | TEXT | NULL | Description |
| `is_preset` | BOOLEAN | NOT NULL DEFAULT TRUE | Formation prédéfinie par le système |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de création |

---

### 7.3 Table `match_tactical_setups`
Compositions tactiques d'un match (plateau tactique).

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `id` | BIGINT GENERATED ALWAYS AS IDENTITY | PK | Identifiant unique |
| `match_id` | BIGINT | NOT NULL, FK → matches.id | Match associé |
| `formation_id` | BIGINT | NULL, FK → formations.id | Formation prédéfinie |
| `formation_label` | VARCHAR(50) | NULL | Libellé si formation personnalisée |
| `is_custom` | BOOLEAN | NOT NULL DEFAULT FALSE | Disposition personnalisée |
| `statut` | lineup_statut | NOT NULL DEFAULT 'brouillon' | Statut de la composition |
| `validated_by` | BIGINT | NULL, FK → users.id | Validé par |
| `validated_at` | TIMESTAMPTZ | NULL | Date de validation |
| `notes` | TEXT | NULL | Notes tactiques |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de création |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de mise à jour |
| `created_by` | BIGINT | NULL, FK → users.id | Créé par |

**Index :**
- `idx_match_tactical_setups_match_id` sur `match_id`.

---

### 7.4 Table `lineup_players`
Joueurs d'une composition tactique.

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `id` | BIGINT GENERATED ALWAYS AS IDENTITY | PK | Identifiant unique |
| `match_tactical_setup_id` | BIGINT | NOT NULL, FK → match_tactical_setups.id | Composition associée |
| `player_id` | BIGINT | NOT NULL, FK → players.id | Joueur |
| `is_starting` | BOOLEAN | NOT NULL DEFAULT FALSE | Titulaire |
| `is_captain` | BOOLEAN | NOT NULL DEFAULT FALSE | Capitaine |
| `is_goalkeeper` | BOOLEAN | NOT NULL DEFAULT FALSE | Gardien |
| `tactical_role` | VARCHAR(50) | NULL | Rôle tactique |
| `position_x` | NUMERIC(5,2) | NULL DEFAULT 50 | Coordonnée X normalisée (0-100) |
| `position_y` | NUMERIC(5,2) | NULL DEFAULT 50 | Coordonnée Y normalisée (0-100) |
| `substitute_order` | INTEGER | NULL | Ordre des remplaçants |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de création |

**Contraintes :**
- CHECK (`position_x` >= 0 AND `position_x` <= 100).
- CHECK (`position_y` >= 0 AND `position_y` <= 100).

**Index :**
- `idx_lineup_players_setup_id` sur `match_tactical_setup_id`.
- `idx_lineup_players_player_id` sur `player_id`.

---

### 7.5 Table `substitutions`
Remplacements effectués pendant un match.

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `id` | BIGINT GENERATED ALWAYS AS IDENTITY | PK | Identifiant unique |
| `match_id` | BIGINT | NOT NULL, FK → matches.id | Match associé |
| `player_out_id` | BIGINT | NOT NULL, FK → players.id | Joueur sortant |
| `player_in_id` | BIGINT | NOT NULL, FK → players.id | Joueur entrant |
| `minute` | INTEGER | NULL | Minute du remplacement |
| `motif` | substitution_motif | NOT NULL | Motif du remplacement |
| `notes` | TEXT | NULL | Notes complémentaires |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de création |
| `created_by` | BIGINT | NULL, FK → users.id | Créé par |

**Index :**
- `idx_substitutions_match_id` sur `match_id`.
- `idx_substitutions_player_out_id` sur `player_out_id`.
- `idx_substitutions_player_in_id` sur `player_in_id`.

---

## 8. Domaine : Entraînements et planification

### 8.1 Table `work_plans`
Plans de travail hebdomadaires ou mensuels.

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `id` | BIGINT GENERATED ALWAYS AS IDENTITY | PK | Identifiant unique |
| `club_id` | BIGINT | NOT NULL, FK → clubs.id | Club propriétaire |
| `team_id` | BIGINT | NOT NULL, FK → teams.id | Équipe concernée |
| `season_id` | BIGINT | NOT NULL, FK → seasons.id | Saison |
| `nom` | VARCHAR(150) | NOT NULL | Nom du plan |
| `type` | work_plan_type | NOT NULL | Type de plan |
| `date_debut` | DATE | NOT NULL | Date de début |
| `date_fin` | DATE | NOT NULL | Date de fin |
| `statut` | VARCHAR(30) | NOT NULL DEFAULT 'actif' | Statut du plan |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de création |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de mise à jour |
| `created_by` | BIGINT | NULL, FK → users.id | Créé par |

**Index :**
- `idx_work_plans_club_id` sur `club_id`.
- `idx_work_plans_team_id` sur `team_id`.

---

### 8.2 Table `training_sessions`
Séances d'entraînement.

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `id` | BIGINT GENERATED ALWAYS AS IDENTITY | PK | Identifiant unique |
| `club_id` | BIGINT | NOT NULL, FK → clubs.id | Club propriétaire |
| `team_id` | BIGINT | NOT NULL, FK → teams.id | Équipe concernée |
| `season_id` | BIGINT | NOT NULL, FK → seasons.id | Saison |
| `date_seance` | TIMESTAMPTZ | NOT NULL | Date et heure de la séance |
| `lieu` | VARCHAR(200) | NULL | Lieu de la séance |
| `objectifs` | TEXT | NULL | Objectifs de la séance |
| `exercices` | TEXT | NULL | Description des exercices |
| `charge_prevue` | NUMERIC(10,2) | NULL | Charge de travail prévue |
| `statut` | training_statut | NOT NULL DEFAULT 'planifiee' | Statut de la séance |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de création |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de mise à jour |
| `created_by` | BIGINT | NULL, FK → users.id | Créé par |
| `updated_by` | BIGINT | NULL, FK → users.id | Modifié par |

**Index :**
- `idx_training_sessions_club_id` sur `club_id`.
- `idx_training_sessions_team_id` sur `team_id`.
- `idx_training_sessions_date_seance` sur `date_seance`.

---

### 8.3 Table `work_plan_items`
Éléments d'un plan de travail, association entre un plan et des séances.

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `id` | BIGINT GENERATED ALWAYS AS IDENTITY | PK | Identifiant unique |
| `work_plan_id` | BIGINT | NOT NULL, FK → work_plans.id | Plan de travail associé |
| `training_session_id` | BIGINT | NULL, FK → training_sessions.id | Séance associée |
| `ordre` | INTEGER | NOT NULL DEFAULT 0 | Ordre dans le plan |
| `objectifs` | TEXT | NULL | Objectifs spécifiques |
| `statut_prevu` | VARCHAR(30) | NULL DEFAULT 'planifie' | Statut prévu |
| `statut_reel` | VARCHAR(30) | NULL | Statut réel après exécution |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de création |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de mise à jour |

**Index :**
- `idx_work_plan_items_work_plan_id` sur `work_plan_id`.
- `idx_work_plan_items_training_session_id` sur `training_session_id`.

---

### 8.4 Table `training_evaluations`
Évaluations post-entraînement d'un joueur.

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `id` | BIGINT GENERATED ALWAYS AS IDENTITY | PK | Identifiant unique |
| `training_session_id` | BIGINT | NOT NULL, FK → training_sessions.id | Séance associée |
| `player_id` | BIGINT | NOT NULL, FK → players.id | Joueur évalué |
| `assiduite` | assiduite | NOT NULL | Assiduité du joueur |
| `charge_percue_rpe` | INTEGER | NULL | Charge perçue RPE (1 à 10) |
| `saisie_hors_ligne` | BOOLEAN | NOT NULL DEFAULT FALSE | Saisie effectuée hors ligne |
| `synchronisee` | BOOLEAN | NOT NULL DEFAULT FALSE | Synchronisée avec le serveur |
| `contexte_saisie` | contexte_saisie | NOT NULL DEFAULT 'autre' | Contexte de saisie |
| `date_saisie_reelle` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Horodatage réel de la saisie |
| `date_creation_en_base` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Horodatage d'enregistrement en base |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de création |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de mise à jour |
| `created_by` | BIGINT | NULL, FK → users.id | Créé par |

**Contraintes :**
- CHECK (`charge_percue_rpe` IS NULL OR (`charge_percue_rpe` >= 1 AND `charge_percue_rpe` <= 10)).

**Index :**
- `idx_training_evaluations_training_session_id` sur `training_session_id`.
- `idx_training_evaluations_player_id` sur `player_id`.

---

### 8.5 Table `training_evaluation_pillars`
Notes par pilier optionnelles pour les évaluations d'entraînement.

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `id` | BIGINT GENERATED ALWAYS AS IDENTITY | PK | Identifiant unique |
| `training_evaluation_id` | BIGINT | NOT NULL, FK → training_evaluations.id | Évaluation d'entraînement associée |
| `pilier` | pilier | NOT NULL | Pilier évalué |
| `note` | INTEGER | NOT NULL | Note sur 0 à 10 |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de création |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de mise à jour |

**Contraintes :**
- CHECK (`note` >= 0 AND `note` <= 10).
- UNIQUE(`training_evaluation_id`, `pilier`).

**Index :**
- `idx_training_evaluation_pillars_training_evaluation_id` sur `training_evaluation_id`.

---

## 9. Domaine : Évaluations de match

### 9.1 Table `evaluations`
Évaluations globales d'un joueur pour un match. Contient le snapshot de pondération utilisé.

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `id` | BIGINT GENERATED ALWAYS AS IDENTITY | PK | Identifiant unique |
| `match_id` | BIGINT | NOT NULL, FK → matches.id | Match associé |
| `player_id` | BIGINT | NOT NULL, FK → players.id | Joueur évalué |
| `note_globale` | NUMERIC(3,1) | NULL | Note globale calculée, affichée avec une décimale |
| `poids_physique_utilise` | NUMERIC(5,2) | NULL | Poids physique utilisé pour le calcul |
| `poids_technique_utilise` | NUMERIC(5,2) | NULL | Poids technique utilisé pour le calcul |
| `poids_tactique_utilise` | NUMERIC(5,2) | NULL | Poids tactique utilisé pour le calcul |
| `poids_mental_utilise` | NUMERIC(5,2) | NULL | Poids mental utilisé pour le calcul |
| `statut` | VARCHAR(20) | NOT NULL DEFAULT 'brouillon' | Statut de l'évaluation |
| `saisie_hors_ligne` | BOOLEAN | NOT NULL DEFAULT FALSE | Saisie effectuée hors ligne |
| `synchronisee` | BOOLEAN | NOT NULL DEFAULT FALSE | Synchronisée avec le serveur |
| `contexte_saisie` | contexte_saisie | NOT NULL DEFAULT 'autre' | Contexte de saisie |
| `date_saisie_reelle` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Horodatage réel de la saisie |
| `date_creation_en_base` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Horodatage d'enregistrement en base |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de création |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de mise à jour |
| `created_by` | BIGINT | NULL, FK → users.id | Créé par |
| `updated_by` | BIGINT | NULL, FK → users.id | Modifié par |

**Contraintes :**
- UNIQUE(`match_id`, `player_id`) : une seule évaluation globale par joueur et par match.

**Index :**
- `idx_evaluations_match_id` sur `match_id`.
- `idx_evaluations_player_id` sur `player_id`.

---

### 9.2 Table `match_evaluation_pillars`
Notes par pilier pour les évaluations de match.

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `id` | BIGINT GENERATED ALWAYS AS IDENTITY | PK | Identifiant unique |
| `evaluation_id` | BIGINT | NOT NULL, FK → evaluations.id | Évaluation globale associée |
| `pilier` | pilier | NOT NULL | Pilier évalué |
| `note` | INTEGER | NOT NULL | Note sur 0 à 10 |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de création |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de mise à jour |

**Contraintes :**
- CHECK (`note` >= 0 AND `note` <= 10).
- UNIQUE(`evaluation_id`, `pilier`).

**Index :**
- `idx_match_evaluation_pillars_evaluation_id` sur `evaluation_id`.

---

### 9.3 Table `weighting_matrices`
Matrices de pondération configurées par club et groupe de poste.

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `id` | BIGINT GENERATED ALWAYS AS IDENTITY | PK | Identifiant unique |
| `club_id` | BIGINT | NOT NULL, FK → clubs.id | Club propriétaire |
| `poste_groupe` | poste_groupe | NOT NULL | Groupe de poste |
| `poids_physique` | NUMERIC(5,2) | NOT NULL | Poids du pilier physique |
| `poids_technique` | NUMERIC(5,2) | NOT NULL | Poids du pilier technique |
| `poids_tactique` | NUMERIC(5,2) | NOT NULL | Poids du pilier tactique |
| `poids_mental` | NUMERIC(5,2) | NOT NULL | Poids du pilier mental |
| `is_active` | BOOLEAN | NOT NULL DEFAULT TRUE | Matrice active |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de création |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de mise à jour |
| `updated_by` | BIGINT | NULL, FK → users.id | Modifié par |

**Contraintes :**
- UNIQUE(`club_id`, `poste_groupe`) : une matrice active par club et par groupe de poste.

**Index :**
- `idx_weighting_matrices_club_id` sur `club_id`.

---

### 9.4 Table `weighting_snapshots`
Snapshots de pondération utilisés lors du calcul d'une évaluation globale. Chaque évaluation référence un snapshot.

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `id` | BIGINT GENERATED ALWAYS AS IDENTITY | PK | Identifiant unique |
| `evaluation_id` | BIGINT | NOT NULL, FK → evaluations.id | Évaluation associée |
| `poste_groupe` | poste_groupe | NOT NULL | Groupe de poste du joueur au moment du calcul |
| `poids_physique` | NUMERIC(5,2) | NOT NULL | Poids physique utilisé |
| `poids_technique` | NUMERIC(5,2) | NOT NULL | Poids technique utilisé |
| `poids_tactique` | NUMERIC(5,2) | NOT NULL | Poids tactique utilisé |
| `poids_mental` | NUMERIC(5,2) | NOT NULL | Poids mental utilisé |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de création du snapshot |

**Contraintes :**
- UNIQUE(`evaluation_id`) : un seul snapshot par évaluation.

**Index :**
- `idx_weighting_snapshots_evaluation_id` UNIQUE sur `evaluation_id`.

**Note :** La table `evaluations` contient également les colonnes `poids_*_utilise` pour un accès rapide. La table `weighting_snapshots` sert de référence historique et d'audit.

---

## 10. Domaine : IA

### 10.1 Table `ai_templates`
Templates de prompts versionnés (stockés en base de données conformément à ZG-7).

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `id` | BIGINT GENERATED ALWAYS AS IDENTITY | PK | Identifiant unique |
| `action_key` | VARCHAR(50) | NOT NULL | Clé de l'action (ex. SUGGEST_TRAINING_SESSION) |
| `version` | INTEGER | NOT NULL | Version du template |
| `template_content` | TEXT | NOT NULL | Contenu du template de prompt |
| `is_active` | BOOLEAN | NOT NULL DEFAULT TRUE | Template actif |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de création |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de mise à jour |

**Contraintes :**
- UNIQUE(`action_key`, `version`).

**Index :**
- `idx_ai_templates_action_key` sur `action_key`.

---

### 10.2 Table `ai_suggestions`
Suggestions IA générées pour un utilisateur.

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `id` | BIGINT GENERATED ALWAYS AS IDENTITY | PK | Identifiant unique |
| `club_id` | BIGINT | NOT NULL, FK → clubs.id | Club propriétaire |
| `user_id` | BIGINT | NOT NULL, FK → users.id | Utilisateur destinataire |
| `action_key` | VARCHAR(50) | NOT NULL | Clé de l'action IA |
| `template_version` | INTEGER | NOT NULL | Version du template utilisé |
| `contexte_utilise` | JSONB | NULL | Contexte injecté dans le prompt |
| `suggestion_content` | JSONB | NOT NULL | Contenu structuré de la suggestion |
| `statut` | ai_suggestion_statut | NOT NULL DEFAULT 'DRAFT' | Statut de la suggestion |
| `pre_generated` | BOOLEAN | NOT NULL DEFAULT FALSE | Suggestion pré-générée |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de création |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de mise à jour |

**Index :**
- `idx_ai_suggestions_club_id` sur `club_id`.
- `idx_ai_suggestions_user_id` sur `user_id`.
- `idx_ai_suggestions_statut` sur `statut`.

---

### 10.3 Table `ai_feedback`
Feedback du coach sur les suggestions IA.

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `id` | BIGINT GENERATED ALWAYS AS IDENTITY | PK | Identifiant unique |
| `ai_suggestion_id` | BIGINT | NOT NULL, FK → ai_suggestions.id | Suggestion associée |
| `user_id` | BIGINT | NOT NULL, FK → users.id | Utilisateur ayant donné le feedback |
| `action` | VARCHAR(20) | NOT NULL | Action : accepted, modified, rejected |
| `modification_details` | JSONB | NULL | Détails de la modification si applicable |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date du feedback |

**Index :**
- `idx_ai_feedback_ai_suggestion_id` sur `ai_suggestion_id`.

---

## 11. Domaine : Fichiers uploadés

### 11.1 Table `uploaded_files`
Fichiers uploadés par le coach ou un membre autorisé. Stockés localement sur le serveur Dell (ZG-2).

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `id` | BIGINT GENERATED ALWAYS AS IDENTITY | PK | Identifiant unique |
| `club_id` | BIGINT | NOT NULL, FK → clubs.id | Club propriétaire |
| `uploaded_by` | BIGINT | NOT NULL, FK → users.id | Utilisateur ayant uploadé |
| `file_name` | VARCHAR(255) | NOT NULL | Nom original du fichier |
| `file_path` | TEXT | NOT NULL | Chemin de stockage sécurisé |
| `file_type` | file_type | NOT NULL | Type de fichier |
| `file_size` | INTEGER | NOT NULL | Taille en octets |
| `context_type` | VARCHAR(30) | NULL | Type de contexte (seance, match, autre) |
| `context_id` | BIGINT | NULL | Identifiant du contexte associé |
| `is_analyzed` | BOOLEAN | NOT NULL DEFAULT FALSE | Fichier analysé par l'IA |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de création |

**Index :**
- `idx_uploaded_files_club_id` sur `club_id`.
- `idx_uploaded_files_uploaded_by` sur `uploaded_by`.

---

## 12. Domaine : Audit

### 12.1 Table `audit_logs`
Logs d'actions critiques.

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `id` | BIGINT GENERATED ALWAYS AS IDENTITY | PK | Identifiant unique |
| `club_id` | BIGINT | NOT NULL, FK → clubs.id | Club concerné |
| `user_id` | BIGINT | NULL, FK → users.id | Utilisateur à l'origine de l'action |
| `action` | VARCHAR(100) | NOT NULL | Action effectuée |
| `resource_type` | VARCHAR(100) | NOT NULL | Type de ressource |
| `resource_id` | BIGINT | NULL | Identifiant de la ressource |
| `resultat` | VARCHAR(30) | NULL | Résultat de l'action |
| `contexte` | JSONB | NULL | Contexte additionnel |
| `ip_address` | INET | NULL | Adresse IP |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de l'action |

**Index :**
- `idx_audit_logs_club_id` sur `club_id`.
- `idx_audit_logs_user_id` sur `user_id`.
- `idx_audit_logs_action` sur `action`.
- `idx_audit_logs_created_at` sur `created_at`.

---

## 13. Domaine : Préférences utilisateurs

### 13.1 Table `user_preferences`
Préférences utilisateur par club.

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `id` | BIGINT GENERATED ALWAYS AS IDENTITY | PK | Identifiant unique |
| `user_id` | BIGINT | NOT NULL, FK → users.id | Utilisateur |
| `club_id` | BIGINT | NOT NULL, FK → clubs.id | Club |
| `preferences` | JSONB | NOT NULL DEFAULT '{}' | Préférences au format JSON |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de création |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Date de mise à jour |

**Contraintes :**
- UNIQUE(`user_id`, `club_id`).

**Index :**
- `idx_user_preferences_user_id` sur `user_id`.

---

## 14. Tables prévues en V1 (placeholders)

Ces tables ne sont pas implémentées dans le V0. Elles sont listées pour anticiper la structure.

### 14.1 Table `notifications`
- Notifications in-app.
- Prévue en V1.

### 14.2 Table `billing_subscriptions`
- Abonnements par club.
- Prévue en V1.

### 14.3 Table `payments`
- Paiements Wave / Orange Money.
- Prévue en V1.

---

## 15. Index globaux obligatoires

En plus des index listés par table, les index suivants sont obligatoires pour les performances et l'isolation :
- Index sur toutes les colonnes `club_id` des tables multi-tenant.
- Index sur toutes les clés étrangères utilisées dans des filtres ou jointures fréquentes.
- Index sur les colonnes de statut fréquemment filtrées : `statut` dans `matches`, `training_sessions`, `evaluations`, `ai_suggestions`.
- Index sur les colonnes de date fréquemment triées : `date_match`, `date_seance`, `created_at`.

---

## 16. Données de référence (seed)

Les données suivantes doivent être insérées lors de la migration initiale.

### 16.1 Rôles par défaut
| Code | Libellé | Niveaux disponibles |
|---|---|---|
| HEAD_COACH | Coach principal | amateur, semi_pro, pro |
| ASSISTANT_COACH | Adjoint | amateur, semi_pro, pro |
| GOALKEEPER_COACH | Coach des gardiens | semi_pro, pro |
| FITNESS_COACH | Préparateur physique | semi_pro, pro |
| VIDEO_ANALYST | Analyste vidéo | semi_pro, pro |
| MEDICAL_STAFF | Staff médical | semi_pro, pro |
| DATA_SCIENTIST | Data scientist / Analyste performance | pro |
| SCOUT | Scout | pro |
| INTENDANT | Dirigeant / Intendant | amateur, semi_pro, pro |
| KIT_MANAGER | Kit manager | pro |

### 16.2 Permissions par défaut
| Code | Libellé |
|---|---|
| VOIR_DONNEES_PHYSIQUES | Voir les données physiques |
| ECRIRE_DONNEES_PHYSIQUES | Modifier les données physiques |
| VOIR_DONNEES_MEDICALES | Voir les données médicales |
| ECRIRE_DONNEES_MEDICALES | Modifier les données médicales |
| CREER_SEANCE_ENTRAINEMENT | Créer une séance d'entraînement |
| MODIFIER_SEANCE_ENTRAINEMENT | Modifier une séance d'entraînement |
| EVALUER_ENTRAINEMENT | Évaluer un entraînement |
| CREER_PLAN_TRAVAIL | Créer un plan de travail |
| MODIFIER_PLAN_TRAVAIL | Modifier un plan de travail |
| IMPORTER_SEANCE_DU_JOUR | Importer la séance du jour |

### 16.3 Formations prédéfinies
| Code | Libellé |
|---|---|
| 4-4-2 | 4-4-2 |
| 4-3-3 | 4-3-3 |
| 4-2-3-1 | 4-2-3-1 |
| 4-1-4-1 | 4-1-4-1 |
| 3-5-2 | 3-5-2 |
| 3-4-3 | 3-4-3 |
| 5-3-2 | 5-3-2 |
| 5-4-1 | 5-4-1 |

---

## 17. Règles de migration Alembic

- Toute modification du schéma passe par une migration Alembic.
- Les migrations sont versionnées et ordonnées.
- Aucune modification manuelle du schéma en production.
- Les migrations doivent être réversibles dans la mesure du possible.
- Les migrations de seed (données de référence) sont exécutées après la création des tables.
- Les migrations sont testées sur un environnement de développement avant déploiement.

---

## 18. Notes finales

- Ce schéma couvre le périmètre complet du V0 tel que défini dans `DECISIONS_FIGEES.md`.
- Les tables `notifications`, `billing_subscriptions` et `payments` sont réservées à la V1.
- Les colonnes de contexte de saisie (`saisie_hors_ligne`, `synchronisee`, `contexte_saisie`, `date_saisie_reelle`, `date_creation_en_base`) sont présentes sur les tables d'évaluations de match et d'entraînement.
- Les snapshots de pondération sont stockés à la fois dans la table `evaluations` (accès rapide) et dans la table `weighting_snapshots` (audit et historisation).
- La table `refresh_tokens` permet la révocation des sessions (déconnexion, sécurité).
- La table `player_parental_consents` gère les consentements parentaux pour les joueurs mineurs (ZG-15).
- Toute évolution future du schéma doit être validée et documentée dans `DECISIONS_FIGEES.md` avant implémentation.
