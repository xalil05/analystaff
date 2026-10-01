# Chapitre 12 — « Le NULL qui ne passait pas : quand le pilote s'écrase sur une colonne verrouillée »

*Phase 5 → 6 — Mode Pilote · 23-24 septembre 2026*

---

## 1. Le contexte

Après le chapitre 11, le mode pilote était enfin opérationnel. Les features multi-équipes et multi-saisons étaient désactivées proprement via `ENABLE_MULTI_TEAM=false` et `ENABLE_SEASONS=false`. Le principe était simple : **1 club = 1 équipe implicite**. Plus besoin de sélectionner une catégorie U17 ou une saison à chaque création de joueur, match, ou entraînement.

J'avais tout documenté dans `PILOT_MODE.md`. Le plan :

- `team_id` en base → `NULL` (l'équipe est implicite = le club entier)
- `season_id` en base → la saison active du club, créée automatiquement
- L'UI masque les sélecteurs de catégorie et de saison
- Les colonnes sont **nullable** pour accepter le `NULL`

Les modèles SQLAlchemy étaient déjà à jour : `nullable=True` sur `team_id` pour les matchs, les entraînements, les plans de travail et les joueurs. La migration dédiée `pilot_nullable_teams_seasons` était créée, appliquée, et signalée comme **courante** par Alembic.

Je lançais les tests. Je créais des joueurs : ça marchait. Je créais un match… et là, le backend s'écrasait.

## 2. Le symptôme / le défi

```
asyncpg.exceptions.NotNullViolationError: null value in column "team_id"
of relation "matches" violates not-null constraint
DETAIL:  Failing row contains (1, 1, null, 1, Génération Foot, Ligue 1, ...)
```

PostgreSQL refusait catégoriquement d'insérer la ligne. `team_id` était `NULL` dans la requête — comme prévu par le mode pilote — mais la base de données disait « non, cette colonne ne peut pas être nulle ».

L'erreur était claire, précise, et implacable. Pas un bug subtil qui ne se manifeste qu'une fois sur deux. Un vrai mur en plein vol.

Le comble : la documentation disait « `nullable=True` », le modèle Python disait `nullable=True`, la migration disait `nullable=True`, Alembic disait « migration appliquée ». Tout le monde était d'accord. Sauf PostgreSQL.

## 3. Où je cherchais

Première hypothèse : **le seed de test** — peut-être que les données de test avaient été créées avant la migration, et que la contrainte NOT NULL datait de l'époque pré-pilote. J'ai vérifié le script de seed, l'ordre de création des enregistrements. Tout semblait correct : les seeds passaient après les migrations.

Deuxième hypothèse : **l'ordre des migrations** — peut-être que la squashed migration initiale (`0d26806ad448`) avait été ré-appliquée APRÈS la migration pilote, écrasant la contrainte nullable. J'ai vérifié l'historique Alembic : `pilot_nullable_teams_seasons` était bien HEAD. Rien n'avait été ré-appliqué après.

Troisième hypothèse : **le conteneur PostgreSQL** — est-ce que la base de données était un ancien snapshot ? J'ai vérifié les volumes Docker, la persistence. C'était la même base qui tournait depuis des jours.

Je tournais en rond. La colonne `team_id` était marquée `nullable=False` dans PostgreSQL, et personne ne savait pourquoi. « C'est la migration qui devait la rendre nullable », « Oui mais elle est marquée comme appliquée », « Et pourtant `\d matches` montre `not null` » — ce dialogue absurde, je l'avais avec moi-même.

## 4. Où était le problème réellement

J'ai fini par exécuter la commande que j'aurais dû lancer en premier :

```bash
docker exec analystaff_db psql -U analystaff -d analystaff -c "\d matches"
```

Et là, sous mes yeux :

```
team_id | integer | not null
```

Pas de doute possible. **La colonne était NOT NULL en base, alors que le modèle et la migration disaient le contraire.**

J'ai ouvert la migration squashe `0d26806ad448_initial_full_schema.py` — celle qui avait créé les tables à partir de zéro. Ligne 235 :

```python
sa.Column('team_id', sa.Integer(), nullable=False),
```

La migration initiale avait créé `matches.team_id` avec **`NOT NULL`**. Puis la migration pilote était censée la passer en `nullable=True` via `op.alter_column`. Mais quelque chose s'était passé entre les deux.

J'ai vérifié le timestamp de création du match qui crashait — il datait du **23 septembre**. J'ai vérifié la migration pilote — elle datait aussi du 23 septembre. Les deux avaient été créées le même jour.

Et là, la pièce manquante est apparue : **la migration initiale squashe et la migration pilote avaient été créées dans le désordre**. La squashed migration (`0d26806ad448`) avait été générée en *dernier*, après la migration pilote, et son `down_revision` pointait vers `None` — elle remplaçait tout l'historique. Résultat :

1. La base existait déjà, avec les migrations appliquées dans l'ordre normal
2. La squashed migration a été créée avec `nullable=False` partout (fidèle à ce qui était en base *au moment du squash*)
3. La migration pilote était appliquée et HEAD
4. Mais si jamais la base était recréée (nouveau container, `alembic upgrade head` depuis zéro), la squashed migration créait les tables avec `NOT NULL`, et la migration pilote n'était JAMAIS exécutée après coup parce qu'Alembic la considérait déjà comme appliquée dans son historique.

Ou plus probablement : **la squashed migration et la migration pilote étaient en conflit sur la même colonne.** La squashed créait la table avec `NOT NULL`. La pilote tentait l'ALTER COLUMN. Mais dans l'ordre des révisions, si le timestamp ou le hash de `down_revision` faisait que l'une ignorait l'autre, la contrainte NOT NULL survivait silencieusement.

Peu importe la chronologie exacte — le résultat était le même : **une divergence entre ce que le code disait, ce que les migrations disaient, et ce que la base contenait réellement.** Le genre de bug qu'aucun test ne rattrape parce que tout le monde regarde le code, et personne ne regarde les contraintes réelles de PostgreSQL.

## 5. Comment on l'a résolu

La solution a été aussi simple que frustrante :

1. **Vérifier l'état réel.** `\d matches` dans PostgreSQL — pas `alembic current`, pas le modèle Python, pas le fichier de migration. Le vrai schéma, celui qui s'applique aux INSERT.

2. **Corriger la contrainte en base.** La commande qui aurait dû être dans la migration pilote depuis le début, exécutée directement :
   ```sql
   ALTER TABLE matches ALTER COLUMN team_id DROP NOT NULL;
   ```

3. **Vérifier les autres tables.** Les mêmes `not null` pouvaient exister sur `training_sessions` et `work_plans` :
   ```sql
   ALTER TABLE training_sessions ALTER COLUMN team_id DROP NOT NULL;
   ALTER TABLE work_plans ALTER COLUMN team_id DROP NOT NULL;
   ALTER TABLE matches ALTER COLUMN season_id DROP NOT NULL;
   ALTER TABLE training_sessions ALTER COLUMN season_id DROP NOT NULL;
   ALTER TABLE work_plans ALTER COLUMN season_id DROP NOT NULL;
   ```

4. **Créer une migration corrective.** Pour que le prochain `alembic upgrade head` ne reproduise pas le problème, une nouvelle migration qui applique correctement les ALTER COLUMN manquants.

5. **Tester.** Créer un match sans `team_id` — ça passe. Créer un joueur sans `team_id` — ça passe. Le mode pilote tient enfin la route.

## 6. L'enseignement

> **`alembic current` ne te dit pas l'état de ta base. Il te dit seulement où Alembic pense en être. La vérité est dans le `\d` de PostgreSQL.**

Trois réflexes à garder :

1. **Après chaque migration, vérifie la colonne toi-même.** `\d <table>` n'est pas optionnel. Une migration appliquée ne garantit pas que la contrainte a changé — surtout avec les `op.alter_column` qui peuvent échouer silencieusement si le type existant ne correspond pas ou si l'ordre des révisions est ambigu.

2. **Le squash n'est pas ton ami quand tu changes des contraintes.** Une squashed migration fige un état à un instant T. Si elle crée des colonnes avec `NOT NULL` et qu'une migration ultérieure les rend `NULLABLE`, tu crées une dépendance d'ordre qui peut sauter si la base est recréée. **Après un squash, vérifie TOUTES les contraintes nullable des colonnes qui devraient être NULL.**

3. **Quand tu documentes « cette migration rend X nullable », ne te contente pas de la lancer. Vérifie que le DROP NOT NULL a bien pris.** La base de données ne te doit rien — elle applique ce que tu lui dis, pas ce que tu crois lui avoir dit. Et ce principe vaut pour tout : contraintes, index, types enum, tout.

Bonus — la leçon la plus profonde : **je n'ai jamais eu de bug dont la racine était dans la base quand j'aurais dû regarder le code. Mais j'ai eu des bugs dont la racine était dans le code quand j'aurais dû regarder la base.** Le coupable n'est pas toujours là où tu cherches. Parfois, le mensonge est dans le contrat entre les deux — cette couche invisible qu'on appelle « l'état réel du système ».

---

*Le code ne ment pas. La base non plus. Mais l'écart entre les deux, lui, ment tout le temps.*