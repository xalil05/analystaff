# Chapitre 1 — « Pourquoi mes tests ne passent pas ? »

*Phase 3 — Tests automatisés · 11 août 2026*

---

## 1. Le contexte

J'étais en phase 3 d'Analystaff : les **tests automatisés**. J'avais déjà
le backend FastAPI en place (phases 1 et 2) : l'authentification JWT, les
rôles et permissions, les modèles SQLAlchemy, la base PostgreSQL montée
avec Docker, les migrations Alembic. Tout tournait — l'API répondait,
l'app démarrait.

Maintenant, il fallait la sécurité : des tests qui vérifient que
l'authentification fonctionne, que les permissions sont respectées, que
les tokens JWT sont valides. Le genre de filet de sécurité sans lequel on
ne dort pas tranquille quand on touche au code plus tard.

J'avais écrit mes fichiers de test avec soin : `test_auth.py`,
`test_jwt.py`, `test_permissions.py`, `test_models.py`, et un
`conftest.py` qui prépare la base de données de test. Tout semblait en
ordre. J'ai lancé pytest, sûr de moi.

## 2. Le symptôme

Premier lancement depuis VS Code, en local :

```
socket.gaierror: [Errno -3] Temporary failure in name resolution
host = 'db', port = 5432
```

« Échec temporaire de résolution de nom ». L'ordinateur ne trouve pas
l'adresse de la machine appelée `db`.

Puis, après correction, un deuxième mur :

```
ModuleNotFoundError: No module named 'jwt'
File "/code/app/auth/jwt.py", line 4, in <module>
    import jwt
```

Et un troisième, plus vicieux :

```
RuntimeError: Task <Task pending ...> got Future <Future pending ...>
attached to a different loop
```

Trois erreurs. Trois murs. Aucune n'était dans le code que j'avais écrit
la veille.

## 3. Où je cherchais

Comme tout développeur qui débute, j'ai fait l'inverse de ce qu'il faut :
j'ai cherché **dans mon code**.

- « Le host `db` n'existe pas ? Mais si, il est dans le docker-compose ! »
- « Le module `jwt` n'est pas trouvé ? Pourtant je l'ai dans mes
  dépendances ! »
- « Different loop ? Mais mon conftest est propre, j'ai fait un event
  loop dédié… »

Je regardais mes fichiers, mes imports, ma configuration. Tout était
correct. **Le code n'était pas le problème.** Et c'est exactement là que
je perdais mon temps : à relire un code qui n'avait rien.

## 4. Où était le problème réellement

La vérité est sortie quand j'ai arrêté de regarder le code pour regarder
**l'environnement**. Trois couches empilées, chacune cachant la suivante :

### Problème n°1 — Je lançais les tests au mauvais endroit

Mon `conftest.py` contenait cette ligne :

```
DATABASE_URL = "postgresql+asyncpg://analystaff:analystaff@db:5432/analystaff_test"
```

Le hostname **`db`** est le nom du service Docker. Il n'existe **que
dans le réseau Docker** — c'est Docker qui résout ce nom vers le
conteneur PostgreSQL. Quand je lançais pytest depuis VS Code, sur ma
machine, le nom `db` ne voulait rien dire : mon système cherchait une
machine appelée `db` sur le réseau… et ne trouvait rien.

**Les tests étaient conçus pour tourner dans le conteneur**, pas sur
l'hôte. J'étais au mauvais endroit depuis le début.

### Problème n°2 — L'image Docker était obsolète

Une fois lancé dans le conteneur, deuxième mur : `No module named 'jwt'`.

J'avais ajouté `PyJWT` à mon `pyproject.toml` le matin même… mais
l'image Docker du backend datait de la veille. **Une image Docker est un
instantané figé** : elle contient les dépendances de l'époque où elle a
été construite. Tant qu'on ne la reconstruit pas, elle ne sait pas que le
projet a évolué. Code et conteneur étaient désynchronisés.

### Problème n°3 — Les versions de dépendances avaient changé les règles

Après rebuild, troisième mur : `Future attached to a different loop`.

Mon `conftest.py` définissait un event loop custom (`event_loop` fixture)
— une pratique valide avec pytest-asyncio en version 0.2x. Mais la
dernière version installée (1.4.0) **a supprimé cette fonctionnalité**.
Mon code n'était pas faux : il était écrit pour une version antérieure
de la bibliothèque. Il fallait désormais déclarer explicitement que les
tests partagent le loop de session.

## 5. Comment on l'a résolu

Trois problèmes → trois correctifs, chacun vérifié avant d'être appliqué :

1. **Lancer les tests dans le conteneur** — l'endroit où `db` existe :
   ```
   docker compose exec backend pytest
   ```
2. **Reconstruire l'image** pour installer les nouvelles dépendances :
   ```
   docker compose up -d --build backend
   ```
3. **Déclarer le scope du loop de test** dans `pyproject.toml` :
   ```
   [tool.pytest.ini_options]
   asyncio_default_test_loop_scope = "session"
   ```

Et surtout, une méthode qui m'a évité de raturer mes fichiers :
**j'ai testé le correctif n°3 en ligne de commande d'abord** (option
`-o`), sans toucher au fichier, pour prouver qu'il marchait — puis je
l'ai écrit dans la configuration. Tester d'abord, modifier ensuite.

Résultat : `15 passed in 5.10s`. Tous les tests verts.

## 6. L'enseignement

> **Le code ne ment pas. C'est l'environnement, les versions et les
> fichiers non sauvegardés qui mentent.**

Trois réflexes à garder pour toujours :

1. **Avant de chercher un bug dans le code, demande-toi OÙ tu exécutes.**
   Une erreur de connexion (`host='db'` introuvable) parle d'environnement,
   pas de code. Un même code peut marcher dans un conteneur et échouer sur
   l'hôte — sans avoir changé d'une ligne.

2. **Dès que tu touches aux dépendances, rebuild l'image.** `docker
   compose up` réutilise l'image existante. « Ça marche en local mais pas
   dans Docker » = presque toujours une image obsolète.

3. **Prouve avant de modifier.** Essaie le correctif en temporaire
   (option CLI, variable d'environnement), vérifie que ça passe, *puis*
   grave-le dans le fichier. Et quand tu modifies un fichier : sauvegarde
   (`Ctrl+S`), vérifie qu'il a changé sur le disque, relance.

Bonus — le piège le plus humain de la journée : j'ai cru deux fois avoir
ajouté la ligne de configuration alors que l'onglet VS Code ne l'avait
jamais sauvegardée. **La réalité du disque prime sur l'intention.** On ne
dit pas « c'est corrigé » : on vérifie, et on montre.

---

*Une erreur corrigée vaut mieux qu'un code qui n'a jamais échoué.*
