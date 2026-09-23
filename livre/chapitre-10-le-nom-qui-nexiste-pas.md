# Chapitre 10 — « Le nom qui n'existe pas : comment un seul tiret peut faire planter tout le backend »

*Phase 5 — Refactor MVP : club automatique, routes unifiées · 2 septembre 2026*

---

## 1. Le contexte

Phase 5 tirait à sa fin. Le module IA tournait, les fichiers uploadaient, les matchs s'affichaient. Il restait un dernier chantier : simplifier l'expérience pour les clubs **mono-équipe** — le cas le plus courant.

Jusqu'ici, chaque route demandait un `club_id` dans l'URL :

```
GET /api/v1/clubs/{club_id}/players
POST /api/v1/clubs/{club_id}/matches
```

Ça marchait, mais c'était lourd. L'utilisateur devait connaître son club_id. Le frontend devait le stocker, le passer partout. Pour 80 % des clubs qui n'en ont qu'un, cette gymnastique était inutile.

La solution : un **mode MVP** qui auto-résout le club_id à partir de l'utilisateur connecté. Une dépendance FastAPI qui regarde les `memberships` de l'utilisateur et injecte le club_id tout seul. Des routes parallèles sans `{club_id}` :

```
GET /api/v1/clubs/me/players
POST /api/v1/clubs/me/matches
```

Une fonction centrale, un refactor des imports, et tout le monde respire. C'était le plan.

## 2. Le symptôme / le défi

J'ai écrit la dépendance. Je l'ai nommée. Puis j'ai branché les routes. Et là — le backend s'est écroulé. Pas une fois. Pas deux. **Cinq fois de suite**.

```python
File "/code/app/auth/router.py", line 7, in <module>
    from app.auth.dependencies import get_current_club_id, get_current_user
ImportError: cannot import name 'get_current_club_id' from 'app.auth.dependencies' (/code/app/auth/dependencies.py)
```

Et pour les routes clubs, un deuxième type d'effondrement :

```python
club_id: int = Depends(get_current_club_id),
NameError: name 'get_current_club_id' is not defined
```

Le traceback était limpide : Python cherchait un nom appelé `get_current_club_id` dans le fichier `app/auth/dependencies.py`. Et il ne le trouvait pas. Pas parce que la fonction était mal écrite ou cassée — simplement parce qu'elle **n'existait pas**.

Le nom que j'avais utilisé dans les imports et dans les routes n'était PAS celui que j'avais défini dans `dependencies.py`.

## 3. Où je cherchais

Première intuition : **le fichier dependencies.py a un bug**. J'ai rouvert le fichier, relu les fonctions, compté les `def`. Il y avait bien `get_current_club` — qui retourne un `int` (le club_id) et le stocke dans `request.state`. La fonction était correcte, les types alignés, docstring en règle. Pas d'erreur de syntaxe.

Deuxième intuition : **le module n'est pas rechargé dans le conteneur**. La stack utilise un bind mount (`./backend:/code`), mais peut-être que WatchFiles ou Uvicorn n'a pas capté le changement ? Redémarrage du conteneur. Toujours la même erreur.

Troisième intuition : **un autre fichier écrase l'import**. J'ai vérifié les imports circulaires, les `__init__.py` qui réexportent, les modules concurrents qui pourraient charger une version antérieure du fichier. Rien.

J'ai passé du temps à lire et relire le même fichier, à chercher une faute là où le code était correct. Le problème n'était pas **dans** `dependencies.py` — il était dans le nom que j'utilisais pour **parler de** `dependencies.py`.

## 4. Où était le problème réellement

Regardez les deux noms :

| Dans `dependencies.py` (la définition) | Dans les imports (l'appel) |
|---|---|
| `get_current_club` | `get_current_club_id` |

Un seul mot de différence. `_id` en plus.

Pendant le refactor, j'avais hésité entre deux conventions de nommage :

1. `get_current_club` — le nom de la dépendance, qui évoque la **structure** (le club)
2. `get_current_club_id` — le nom de ce qu'elle **retourne** (un entier, l'identifiant)

J'ai défini la fonction sous le premier nom… mais écrit les imports sous le second. Dans certains fichiers, j'avais même utilisé `get_current_club_id` directement dans un appel `Depends(...)`, sans import préalable — d'où le `NameError` au lieu de l'`ImportError`.

Ce n'était pas une faute technique. C'était une **incohérence de nommage**, amplifiée par la structure du refactor :

- **auth/router.py** importait `get_current_club_id` depuis `dependencies` → `ImportError`
- **clubs/router.py** utilisait `get_current_club_id` dans `Depends()` sans l'importer → `NameError`
- Le commentaire restant dans clubs/router.py mentionnait encore `get_current_club_id` comme une note — un vestige mental de l'hésitation

Le bind mount du conteneur rendait l'erreur immédiate à chaque changement de code : pas besoin de rebuild, le fichier était relu en direct. Ce qui était un avantage (itération rapide) devenait une punition : chaque fois que j'éditais un fichier avec le mauvais nom, le backend crashait dans la seconde.

### Pourquoi l'erreur s'est répétée cinq fois

Parce que le refactor touchait **plusieurs fichiers** :

1. `app/auth/dependencies.py` — définition de `get_current_club` ✅
2. `app/auth/router.py` — import du nom erroné `get_current_club_id` ❌
3. `app/auth/schemas.py` — ajout de `MeResponse` ✅
4. `app/auth/service.py` — création de `register_user_with_club` ✅
5. `app/clubs/router.py` — import de `get_current_club` ✅ mais usage de `get_current_club_id` dans un commentaire trompeur + `NameError` dans un test incomplet
6. `app/ai/router.py` — import de `get_current_club` ✅

Chaque démarrage du conteneur (ou reload de WatchFiles) rechargeait `main.py` → `auth/router.py` → **boom**. Je corrigeais un fichier, je sauvais, le reload déclenchait l'erreur ailleurs. Cinq cycles avant que tous les noms ne soient alignés.

## 5. Comment on l'a résolu

La correction s'est faite en un commit — mais en réalité, c'était cinq micro-corrections dans cinq fichiers, validées une par une par le reload du conteneur.

**Étape 1 — Aligner le nom partout :** Remplacer `get_current_club_id` par `get_current_club` dans tous les imports et tous les appels `Depends()`.

```python
# AVANT (dans auth/router.py)
from app.auth.dependencies import get_current_club_id, get_current_user

# APRÈS
from app.auth.dependencies import get_current_club, get_current_user
```

Dans clubs/router.py, les routes MVP passent de :
```python
club_id: int = Depends(get_current_club_id),  # NameError à tous les coups
```
à :
```python
club_id: int = Depends(get_current_club),  # impec
```

**Étape 2 — Harmoniser l'import de `limiter` :** Le commit a aussi corrigé un import cassé dans `auth/router.py` : `from app.core.rate_limit import limiter` → `from app.core.limiter import limiter`. Un deuxième fantôme dans le même fichier. Deux corrections dans le même commit, ce qui explique pourquoi le fix a mis du temps à être identifié — les deux symptômes se mélangeaient.

**Étape 3 — Ajouter le `register` endpoint :** Profitant du refactor, j'ai implémenté l'inscription avec club auto-créé (endpoint `POST /register` avec `RegisterRequest` contenant un `club_nom` optionnel), et enrichi le endpoint `/me` pour retourner le contexte club (`MeResponse` avec `club_id`, `club_nom`, `is_multi_club`). La fonction `get_user_memberships` de `app.roles.service` permet de résoudre le club principal.

**Étape 4 — Nettoyer les commentaires :** Le commentaire en ligne 50 de `clubs/router.py` disait encore « ROUTES MVP (sans club_id — auto-resolues via get_current_club_id) ». Un commentaire qui cite un nom qui n'existe pas, c'est un mensonge pour le futur moi qui re-lira ce code dans six mois. Remplacé par la mention du vrai nom.

**Étape 5 — Vérification dans le conteneur :** Redémarrage du backend. Plus d'ImportError. Plus de NameError. 48 tests verts. Les routes MVP répondent, le club s'auto-résout, l'API historique reste compatible.

## 6. L'enseignement

> **Le problème n'est jamais là où Python te dit de regarder. Quand il dit « ce nom n'existe pas », il ment peut-être sur le fichier — mais il dit la vérité sur le nom. Crois le nom, pas le fichier.**

Trois réflexes à garder :

1. **Un nom, un seul, partout.** Le coût d'une hésitation de nommage se paie en erreurs d'import. Avant d'écrire la première ligne d'une fonction, décide du nom et ne change pas d'avis. Si tu hésites entre `get_current_club` et `get_current_club_id`, tranche dans les premières secondes, écris-le sur un post-it, et ne le remets pas en question pendant le refactor. Le temps de décision est négligeable ; le coût d'une correction différée sur cinq fichiers est réel.

2. **Un refactor qui touche cinq fichiers = un test qui les importe tous.** Ne lance pas le conteneur après chaque fichier. À la place, exécute un seul `python -c "import app.main"` (ou un `pytest --collect-only`) après avoir modifié **tous** les fichiers du refactor. Le graphe d'imports se vérifie en une commande. Si l'import échoue, tu sais que le refactor est incomplet — pas besoin de cinq redémarrages pour le découvrir.

3. **Méfie-toi de ce que tu notes dans les commentaires.** Un commentaire qui mentionne un nom de fonction ou de variable est une promesse. Si la promesse est fausse (le commentaire parle de `get_current_club_id` mais le code utilise `get_current_club`), ce commentaire deviendra un piège pour le prochain développeur — toi compris, dans six mois. Nettoie les commentaires en même temps que le code, ou ne les écris pas du tout.

Bonus — la leçon la plus profonde : **le bind mount est une arme à double tranchant.** Il permet d'itérer sans rebuild — mais chaque erreur est immédiatement fatale. C'est excellent pour le feedback court, mais ça transforme un refactor multi-fichiers en jeu d'esquive. La parade : une vérification statique (`python -c "import app.main"` ou `mypy`) avant de laisser le reload s'enclencher. Le conteneur n'est pas un interpréteur — c'est un environnement ; prépare tout avant de le laisser voir ton code.

---

*Un nom que tu changes d'avis en cours de route, c'est cinq fichiers à corriger — ou un backend qui ne démarre pas. Le nommage n'est pas de l'élégance : c'est de la maintenance.*