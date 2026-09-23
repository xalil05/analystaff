# 🚀 Mode Pilote V0 (Analystaff)

Ce document décrit les fonctionnalités volontairement désactivées pour la phase de pilote (1 club test, 1 équipe implicite). Elles sont conservées dans le code pour une réactivation immédiate en V1.

## 📌 Règle d'or du Pilote

**1 Club = 1 Équipe implicite.**
Toutes les entités (joueurs, matchs, entraînements, plans de travail) sont liées directement au `club_id`. Les notions de `team_id` (catégorie U17, Seniors, etc.) et `season_id` sont masquées en enregistrement, mais conservées dans le schéma pour la V1.

> Le terme "équipe" dans l'UI sera renommé "catégorie" en V0. En V1, si les coachs demandent du multi-catégories, on réactive.

---

## 🔧 Features désactivées & Comment les réactiver

### 1. Multi-catégories (`teams`)
- **Statut** : ❌ Désactivé
- **Variable d'environnement** : `ENABLE_MULTI_TEAM=false`
- **Impact Backend** :
  - Les endpoints `/api/v1/.../teams` retournent `501 Not Implemented`
  - Les modèles SQLAlchemy existent mais ne sont pas utilisés dans les requêtes V0
  - Les schémas Pydantic `TeamCreate`, `TeamResponse` sont conservés mais non exposés
- **Impact Frontend** : Les menus, sélecteurs et filtres liés aux catégories sont masqués
- **Réactivation V1** : Passer `ENABLE_MULTI_TEAM=true` dans le `.env`

### 2. Gestion des Saisons (`seasons`)
- **Statut** : ❌ Désactivé
- **Variable d'environnement** : `ENABLE_SEASONS=false`
- **Impact Backend** :
  - Les endpoints `/api/v1/.../seasons` retournent `501`
  - La saison est toujours requise dans les schémas (champ présent), mais en mode pilote elle sera **auto-injectée** par le backend à la création (saison courante du club)
- **Impact Frontend** : Sélecteur de saison masqué
- **Réactivation V1** : Passer `ENABLE_SEASONS=true` dans le `.env`

---

## 🗄️ Impact Base de Données (V0)

- Les tables `teams` et `seasons` **existent** dans le schéma (prêtes pour la V1)
- Les colonnes `team_id` et `season_id` dans les tables `players`, `matches`, `training_sessions`, `work_plans` sont définies comme **`nullable=True`** en V0
- Le code V0 insère ces valeurs comme `NULL`, ce qui est parfaitement valide et ne nécessite aucune migration destructive pour la V1
- La migration Alembic `pilot_mode_nullable_teams_seasons` assure cette transition sans perte de données

---

## 🔄 Comportement V0 spécifique

### Création d'un joueur
- Le champ `team_id` est présent dans le schéma mais **ignoré** en mode pilote (`NULL` en base)
- L'UI masque le sélecteur de catégorie

### Création d'un match
- Les champs `team_id` et `season_id` sont **auto-injectés** par le backend :
  - `team_id` → `NULL` (la catégorie est implicite = le club entier)
  - `season_id` → la saison active du club, créée automatiquement si nécessaire
- L'UI masque les sélecteurs

### Création d'une séance d'entraînement
- Identique au match : `team_id` et `season_id` auto-injectés

### Création d'un plan de travail
- Identique : `team_id` et `season_id` auto-injectés

---

## 📋 Routes supprimées du V0 (API publique future)

Les routes suivantes ont été supprimées du router `clubs/router.py` pour le V0 :

- `POST /{club_id}/teams` → remplacée par `POST /me/teams` (MVP, auto-résolue)
- `GET /{club_id}/teams` → remplacée par `GET /me/teams` (MVP, auto-résolue)
- `POST /{club_id}/seasons` → remplacée par `POST /me/seasons` (MVP, auto-résolue)
- `GET /{club_id}/seasons` → remplacée par `GET /me/seasons` (MVP, auto-résolue)

Ces routes pourront être réactivées en V1 lorsque l'API publique avec `club_id` explicite sera nécessaire.

---

## ✅ Checklist avant passage en V1

-/Changer `ENABLE_MULTI_TEAM=true` dans `.env`
-/Changer `ENABLE_SEASONS=true` dans `.env`
-/Vérifier que les données de test ont bien un `team_id` et `season_id` assignés
-/Décommenter/afficher les composants UI masqués côté frontend
-/Migrer les `NULL` existants vers les valeurs réelles (script de migration métier)
-/Déployer la V1

## Checklist pour appliquer

/1. Lancer la migration (si la DB est accessible)
cd backend
alembic upgrade head

/2. Tester les routes désactivées (doivent retourner 501)
curl -s http://localhost:8000/api/v1/me/teams | python -m json.tool
/→ {"detail":"La gestion des catégories est désactivée en mode pilote."}

/3. Créer un joueur sans team_id — doit fonctionner
curl -X POST http://localhost:8000/api/v1/me/players \
  -H "Content-Type: application/json" \
  -d '{"nom":"Test","prenom":"Joueur"}'

/4. Créer un match sans team_id ni season_id — doit auto-injecter
curl -X POST http://localhost:8000/api/v1/me/matches \
  -H "Content-Type: application/json" \
  -d '{"adversaire":"Test","date_match":"2026-10-01T15:00:00"}'

/5. Activer les features pour tester la V1
# Dans .env : ENABLE_MULTI_TEAM=true ENABLE_SEASONS=true
# Redémarrer l'API, les routes /teams et /seasons redeviennent disponibles

# 🛠️ Comment les utiliser ?
Rends le script exécutable :
  chmod +x activate_v1.sh ou chmod +x desactivate_v1.sh 

Quand on sera prêt à passer en V1 (après validation des coachs pilotes) ou  retourner en v0 en cas de bug, on lance simplement :
  ./activate_v1.sh ou ./activate_v1.sh
