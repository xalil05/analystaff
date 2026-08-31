# Chapitre 2 — « Les modèles : une seule source de vérité »

*Phase 2 — Modèles & schéma · 10 → 11 août 2026*

---

## 1. Le contexte

Les fondations étaient posées : config, base de données, sécurité, rate
limiting, healthcheck. L'API répondait. Il était temps de donner un
**squelette de données** à Analystaff : les modèles SQLAlchemy.

Le schéma avait déjà été pensé en phase 0 (`SCHEMA_SQL.md`) : clubs,
équipes, utilisateurs, rôles, permissions, joueurs, matchs, évaluations.
Mais entre le document et le code, il y avait un océan de décisions
techniques : comment modéliser les relations ? Comment garantir que le
code et la base restent synchronisés ? Comment gérer l'évolution du
schéma plus tard, sans tout casser ?

## 2. Le défi

Deux murs se dressaient :

**Mur n°1 — La cohérence.** Le schéma documenté disait : la somme des
poids de pondération doit faire exactement 1.00. Les notes doivent être
entre 0 et 10. Les emails doivent être uniques. Autant de règles qui
devaient vivre **à deux endroits** : dans la base de données (contraintes
SQL) et dans les modèles Python (SQLAlchemy). Si les deux se
désynchronisaient, qui croire ?

**Mur n°2 — L'évolution.** Analystaff allait changer. Des modules
seraient ajoutés au fil des phases (entraînements, planification,
évaluations, IA). Si je créais le schéma « à la main », chaque
modification allait devenir un cauchemar : ajouter une colonne à la
main dans PostgreSQL, espérer que personne ne l'a oubliée ailleurs…

## 3. Où je cherchais

J'ai d'abord cherché la solution dans la **puissance pure** : tout
mettre dans les modèles SQLAlchemy, avec des types précis, des
contraintes, des relations. « Si le code est parfait, la base suivra. »

Le piège : SQLAlchemy ne crée pas la base tout seul en production. Et si
je créais la base avec un script maison, je perdais la traçabilité —
personne ne saurait comment on est arrivé à ce schéma, ni comment en
sortir.

## 4. Où était le problème réellement

Le problème n'était pas le code des modèles : c'était **l'absence d'un
chemin officiel entre le document et la base**. Trois mondes séparés :

1. le **document** (`SCHEMA_SQL.md`) — la référence métier ;
2. le **code** (`app/*/models.py`) — la référence applicative ;
3. la **base réelle** (PostgreSQL) — la vérité physique.

Sans pont entre eux, n'importe quel écart devenait invisible jusqu'au
moment où ça plantait en production. Il fallait un outil qui transforme
les modèles en migrations versionnées, exécutables, réversibles —
**Alembic**.

Et il y avait un second piège, subtil : les modèles devaient être
**importables tous ensemble** pour que SQLAlchemy voie le schéma complet
avant de créer les tables. Un modèle importé en retard = une table
manquante = une clé étrangère qui casse. L'ordre des imports comptait
autant que le code lui-même.

## 5. Comment on l'a résolu

1. **Des modèles SQLAlchemy 2.0 propres** — un fichier `models.py` par
   domaine (`users`, `clubs`, `roles`, `players`, `matches`), avec la
   syntaxe moderne `Mapped` / `mapped_column`, des types stricts, des
   contraintes (unicité, non-null), et un `TimestampMixin` partagé pour
   les dates de création/modification — pas de duplication.

2. **Une seule vérité dans le code** — les contraintes métier vivent
   dans les modèles (email unique, notes bornées, poids qui totalisent
   1.00), et la base est générée à partir d'eux. Le document reste la
   référence de conception ; le code devient la référence d'exécution.

3. **Alembic pour l'évolution** — la première migration (`initial
   schema`) a été générée depuis les modèles : un fichier versionné,
   horodaté, qui décrit exactement comment créer le schéma. Chaque
   évolution future = une nouvelle migration, jamais une modification
   manuelle de la base en production.

4. **Le seed** — `core/seed.py` : les données de référence (rôles,
   permissions, rôle→permissions par défaut, formations) insérées de
   façon idempotente — on peut l'exécuter plusieurs fois sans créer de
   doublons.

Le point de bascule : `test_models.py` a vérifié que **toutes les
tables étaient bien enregistrées** dans le metadata de SQLAlchemy — la
preuve que le modèle mental (le code) et le modèle physique (la base)
étaient alignés.

## 6. L'enseignement

> **Un schéma sans migration, c'est un contrat que personne ne peut
> faire évoluer. La discipline, c'est de versionner la vérité.**

Trois réflexes à garder :

1. **Le code est la source d'exécution, le document est la source de
   conception.** Le document dit *quoi* ; le code dit *comment* ; la
   migration dit *comment y arriver sans rien casser*.
   
2. **Alembic n'est pas une option — c'est la ceinture de sécurité.**
   Générer une migration depuis les modèles, c'est rendre chaque
   évolution du schéma : traçable (un fichier versionné), réversible
   (downgrade), et reproductible (n'importe quel environnement peut
   l'appliquer).
   
3. **L'ordre des imports n'est pas un détail.** Tous les modèles
   doivent être importés avant que SQLAlchemy construise le metadata,
   sinon des tables manquent silencieusement. Un test qui vérifie
   « toutes les tables sont enregistrées » coûte trois lignes et évite
   une semaine de debug.

Bonus : la leçon la plus précieuse de cette phase — **les contraintes
métier dans le code, c'est bien ; mais le test qui les vérifie, c'est
mieux.** Le `test_models.py` a attrapé des incohérences que je n'aurais
jamais vues à l'œil nu. La phase 3 (les tests) allait confirmer : la
vraie valeur n'est pas d'écrire du code, c'est de pouvoir prouver qu'il
fait ce qu'il dit.

---

*Le schéma est le contrat que tout le code signe. Un contrat flou, c'est
du code qui ment — et personne ne sait lequel.*
