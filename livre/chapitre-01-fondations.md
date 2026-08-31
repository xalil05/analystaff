# Chapitre 1 — « Le squelette : choisir la structure avant le code »

*Phase 1 — Fondations · 9 → 10 août 2026*

---

## 1. Le contexte

La phase 0 avait livré ses documents : la vision, les décisions figées,
le schéma SQL, la matrice des permissions. J'avais une carte. Il fallait
maintenant poser les **fondations** du backend.

Mon ambition, ce soir-là : un **monolithe modulaire** FastAPI — pas de
microservices (inutiles pour un MVP testé par des clubs pilotes), mais
pas non plus un gros fichier `main.py` de mille lignes où tout se
mélange. Chaque domaine métier dans son module : `auth`, `clubs`,
`users`, `roles`, `players`, `matches`, `training`, `planning`,
`evaluations`, `ai`, `files`, `audit`. Le tout posé sur un socle commun
`core/` : configuration, base de données, erreurs, logging, sécurité,
rate limiting, healthcheck.

## 2. Le défi

Le premier mur de la phase 1 n'était pas technique : c'était une
**question d'ordre**. Par où commencer ?

- Le `core/` d'abord ? (la fondation)
- Les modèles ? (le schéma)
- Les routers ? (l'API visible)
- Docker ? (l'environnement)

Si je commençais par les routers, j'allais écrire du code qui dépend de
modèles pas encore créés. Si je commençais par les modèles, j'allais
construire sur une base sans config. L'ordre n'était pas un détail :
c'était **la moitié de la réussite**.

## 3. Où je cherchais

J'ai eu la tentation classique du développeur pressé : **écrire le
premier endpoint tout de suite**, histoire de voir quelque chose
répondre. « Le `/health` d'abord, le reste après. »

Le piège : chaque module que je créais tirait derrière lui ses
dépendances. `auth` avait besoin de `core.security`, qui avait besoin
de `core.config`, qui avait besoin du `.env`… Si je ne posais pas le
socle d'abord, chaque fichier allait être un chantier en soi.

## 4. Où était le problème réellement

Le problème, c'était mon **ordre mental** : je pensais « fonctionnalité
par fonctionnalité » alors que la bonne unité, c'était « **couche par
couche** ». Un backend ne se construit pas par fonctionnalités
horizontales (auth, puis matchs, puis joueurs…) mais par couches
verticales (config → DB → sécurité → domaines → API → infra).

Et il y avait un deuxième piège, invisible celui-là : la **tentation de
la perfection**. Je pouvais passer des heures à peaufiner le core avant
de voir quoi que ce soit tourner. L'équilibre à trouver : assez de
fondations pour avancer, pas assez pour s'y noyer.

## 5. Comment on l'a résolu

J'ai suivi un ordre strict, couche par couche, avec une **boucle de
validation à chaque étage** — on pose une couche, on vérifie qu'elle
tourne, on passe à la suivante :

1. **Configuration** — `core/config.py` : toutes les variables
   d'environnement centralisées (pydantic-settings), jamais en dur,
   avec des valeurs par défaut saines pour le dev.
2. **Base de données** — `core/database.py` : le moteur async
   (asyncpg), le pool de connexions, la session.
3. **Erreurs & logging** — `core/errors.py`, `core/logging.py` : un
   format d'erreur standard, des logs structurés.
4. **Sécurité** — `core/security.py` : hachage des mots de passe
   (argon2), tokens.
5. **Rate limiting** — `core/rate_limit.py` : protection des endpoints
   (slowapi).
6. **Healthcheck** — `core/health.py` : le premier endpoint de
   l'application, qui répond « je suis vivant » et vérifie la connexion
   à la base.
7. **Les domaines** — les modules métier (`auth`, `users`, `clubs`,
   `players`, `matches`…), qui ne dépendent que du core.
8. **Infra** — `Dockerfile`, `docker-compose.yml`, `nginx.conf`, et le
   premier test (`test_health.py`) pour verrouiller le socle.

Le point de bascule : le **`/health`** qui répondait en vérifiant la
connexion à PostgreSQL. À ce moment-là, le socle était vivant : config →
DB → log → erreurs → sécurité → rate limit → endpoint → conteneur →
nginx. Tout le reste pouvait se construire dessus.

## 6. L'enseignement

> **Un backend ne se construit pas par fonctionnalités, mais par
> couches. Chaque couche valide la précédente avant que la suivante
> n'existe.**

Trois réflexes à garder :

1. **Choisis l'ordre avant d'écrire la première ligne.** Config → DB →
   sécurité → domaines → API → infra. Chaque module ne dépend que de ce
   qui est déjà validé.
   
2. **Une couche = une validation.** On ne pose pas dix fichiers d'un
   coup. On pose une couche, on vérifie qu'elle tourne (import, test,
   endpoint), on avance. Le premier « je suis vivant » vaut de l'or.
   
3. **Résiste à la tentation du premier endpoint.** Écrire `/health` en
   premier, c'est bien. Écrire `/matches` en premier, avant le core,
   c'est construire sur du sable. L'envie de montrer quelque chose ne
   doit pas dicter l'ordre de construction.

Bonus : ce socle, posé une fois, a servi à **tout le reste du projet**.
Les phases 2 et 3 (modèles, tests) n'ont eu qu'à s'appuyer dessus. Le
temps passé à bien poser les fondations n'a jamais été du temps perdu —
c'était du temps gagné d'avance.

---

*Une fondation ne se voit pas. Mais quand elle est mauvaise, tout ce
qu'on construit dessus le montre.*
