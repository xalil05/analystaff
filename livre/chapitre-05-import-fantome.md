# Chapitre 5 — « L'import fantôme : le backend qui refuse de démarrer »

*Phase 4 — Consolidation : auth, seed & migrations · 12 août 2026*

---

## 1. Le contexte

La phase 4 avait commencé par un champ de bataille : le chapitre 4 s'était
terminé sur un squash salvateur — sept migrations embouteillées remplacées
par une seule, `0d26806ad448_initial_full_schema.py` (32 tables,
`down_revision = None`), et 24 tests verts.

Mais le squash avait laissé des traces. Un dossier entier traînait dans
`alembic/` : `versions_backup_avant_squash/`, avec les sept anciennes
migrations. Et en les relisant, un détail m'a sauté aux yeux : deux d'entre
elles portaient le même nom — `3c30bcb7cfaa_add_auth_refresh_tokens.py` et
`990b4b747714_add_auth_refresh_tokens.py`. Le doublon datait d'avant le
squash ; je ne l'avais jamais remarqué.

Ma feuille de route des dernières 24 heures, c'était la consolidation :

- **L'auth** : retravailler tout le module `app/auth/` — `service.py`,
  `schemas.py`, `models.py`, `router.py`, `dependencies.py`, `jwt.py`
  (refresh tokens, dépendances, JWT).
- **Le seed** : enrichir `app/core/seed.py` — édité cinq fois dans la
  soirée.
- **Les services métier** : `app/clubs/service.py`, `app/clubs/schemas.py`,
  `app/roles/services.py`.
- **Les modèles IA** : `ai/models.py`.
- **Le nettoyage Alembic** : `alembic/env.py`, à 23 h 18 puis 00 h 40.

Quarante fichiers touchés en une journée. Un refactor en règle. Ça sentait
bon — jusqu'au moment où le backend a refusé de s'allumer.

## 2. Le symptôme / le défi

Au démarrage, dans le conteneur, la même erreur, encore et encore — trois
fois dans les logs :

```
Traceback (most recent call last):
...
ImportError: cannot import name 'service' from 'app.matches' (/code/app/matches/__init__.py)
```

`cannot import name 'service' from 'app.matches'`. Le backend ne démarrait
pas. Et le plus déroutant : **aucun échec de test en cache**. Les tests
étaient verts, la migration unique `0d26806ad448` était en place… et
l'application, elle, bégayait au boot.

Le pire, c'est que je n'avais **pas touché aux matchs** de la soirée. Le
module `matches`, c'était le chapitre 4, la construction en cours. Pourquoi
venait-il me hanter maintenant ?

## 3. Où je cherchais

Première piste : **le squash des migrations.** J'avais édité
`alembic/env.py` tard dans la nuit. Le dossier
`versions_backup_avant_squash/` qui traîne, les deux migrations
« add_auth_refresh_tokens » en double… J'ai suspecté Alembic d'avoir laissé
un état incohérent. J'ai passé du temps à vérifier `env.py`, la migration
initiale, le lien avec `Base.metadata`. Rien à voir avec l'erreur
d'import.

Deuxième piste : **l'auth.** Je venais de tout retravailler dans
`app/auth/` — un import cassé dans mes refresh tokens, dans
`dependencies.py` ? J'ai relu les six fichiers. Ils étaient sains.

Troisième piste : **le conftest.** Six éditions dans la soirée — la leçon
du chapitre 4 (« les tests détruisent la base dev ») me poursuivait.
J'ai vérifié la base de test, la base dev. Intactes.

Quatrième piste : **le montage des routers** dans `main.py` (édité à
19 h 58 puis 00 h 42) — « import ≠ include_router », encore le chapitre 4.
J'ai relu les montages. Tout était branché.

Pendant ce temps, l'erreur pointait ailleurs avec une précision
chirurgicale : `app/matches/__init__.py`, nom `service`. Mais je n'avais
pas touché aux matchs… ou alors, sans le savoir, à travers un autre
fichier.

## 4. Où était le problème réellement

Soyons honnêtes : le capteur garde la trace des logs et des éditions, pas
de la commande qui a tout débloqué. Mais l'erreur, elle, est un aveu
complet. `cannot import name 'service' from 'app.matches'` signifie
exactement ce qu'elle dit : **quelque part, du code fait
`from app.matches import service` — et le module `app/matches/__init__.py`
n'expose aucun nom `service`.** Le nom cherché n'existe pas là où on le
cherche.

Et le contexte rend cette explication très crédible : l'incohérence de
nommage des services dans le projet. Regardez :

```
app/clubs/service.py      # singulier
app/roles/services.py     # pluriel
app/matches/…             # ?
```

Pendant le refactor, j'avais bougé dans `clubs/service.py`,
`clubs/schemas.py`, `roles/services.py`, `seed.py`, `main.py` — beaucoup
de va-et-vient autour des services, à des heures où la fatigue se fait
sentir. Un import écrit au singulier vers un module au pluriel, ou un
`__init__.py` qui n'exporte pas (ou plus) le nom `service` — et l'import
fantôme est né. Côté `matches`, le service n'existait probablement pas
encore à cet endroit, ou pas sous ce nom : les matchs étaient en pleine
construction depuis le chapitre 4.

Pourquoi trois fois la même erreur ? Parce qu'elle se déclenchait à chaque
démarrage du conteneur, dès le chargement du graphe d'imports :
`main.py` → routers → services. Et pourquoi les tests restaient-ils
verts ? Parce qu'aucun test n'importait le chemin fautif. Encore une fois :
des tests verts ne prouvent pas qu'une application démarre.

## 5. Comment on l'a résolu

La démarche, étape par étape — celle que l'erreur impose, et dont les
traces confirment l'issue (0 échec de test, migration unique en place,
backend relancé) :

1. **Lire le Traceback en entier**, pas juste la dernière ligne. L'erreur
   donne tout : le module (`app.matches`) et le nom manquant (`service`).
2. **Ouvrir `app/matches/__init__.py`** et vérifier ce qu'il expose
   réellement. Le nom `service` n'y était pas.
3. **Chercher l'import fautif** dans le graphe : un
   `from app.matches import service` quelque part — dans `main.py`, un
   router, ou un autre service. C'est là que le refactor avait laissé sa
   trace.
4. **Corriger le chemin** : importer depuis le vrai module
   (`app.matches.service`) ou exposer le bon nom dans l'`__init__.py`,
   selon ce que le code attendait.
5. **Vérifier dans le conteneur** — c'est là que ça cassait (le chemin
   `/code/` dans les logs trahit l'environnement réel). Un
   `python -c "import app.main"` dans le conteneur, ou un redémarrage
   propre, et l'import fantôme sort au premier coup.
6. **Relancer les tests** : zéro échec. La migration `0d26806ad448` reste
   la base unique — le squash tient bon, et le backend redémarre.

## 6. L'enseignement

> **Une erreur d'import n'est pas un mur : c'est une carte. Elle
> t'indique le nom que tu cherches et le module où tu le cherches — le
> seul mensonge, c'est le tien.**

Trois réflexes à garder :

1. **Lire `cannot import name X from Y` comme un aveu.** X n'existe pas
   dans Y. Point. Avant de chercher ailleurs, ouvre Y (le fichier, son
   `__init__.py`), puis cherche qui écrit cet import. Deux minutes, zéro
   devinette — l'erreur te dit déjà tout.

2. **Une convention de nommage, une seule.** `clubs/service.py` au
   singulier, `roles/services.py` au pluriel : ce mélange est une usine à
   imports cassés. Choisis une règle (par exemple `service.py` partout,
   ou `services/` partout) et applique-la. Le nom que tu écris dans
   l'import doit être le nom que le fichier porte, sans exception.

3. **Après un refactor, importe tout le graphe au plus tôt.**
   `python -c "import app.main"` (ou un run de pytest) révèle les imports
   cassés en cinq secondes — pas au premier démarrage du conteneur. Et
   vérifie **dans le conteneur** : le chemin `/code/` des logs rappelle
   que l'environnement réel n'est pas ta machine.

Bonus — la leçon la plus profonde : **les tests étaient verts pendant que
l'application ne démarrait pas.** Le syndrome du chapitre 4, en version
import : un graphe d'imports n'est testé que si quelque chose l'importe.
Des tests verts ne prouvent pas qu'une application démarre — ils prouvent
seulement que le code testé fonctionne.

---

*Un import qui échoue n'est pas un bug obscur : c'est Python qui te dit,
poliment, que ton code ment quelque part.*
