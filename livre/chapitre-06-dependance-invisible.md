# Chapitre 6 — « La dépendance invisible : "Form data requires python-multipart" »

*Phase 4 → 5 — Dashboard, uploads & module IA · 12 août 2026*

---

## 1. Le contexte

Le chapitre 4 s'était terminé par un grand ménage : **squash des
migrations** (une seule `0d26806ad448_initial_full_schema`, 32 tables,
`down_revision = None`), l'historique sauvegardé dans
`alembic/versions_backup_avant_squash/` pour ne jamais perdre la mémoire
du chemin parcouru. La base était enfin propre et protégée des tests.

Il restait à construire le cœur de la phase suivante : le **dashboard**
(overview, radar des évaluations validées, historique, résumé
pré-match, export PDF d'un joueur) et le **module fichiers** — la
possibilité d'uploader la « séance du jour » (PDF, TXT, DOCX, JPEG,
PNG) pour la soumettre à l'analyse. J'avais donc créé un module
`app/files/` complet : `models.py` (table `uploaded_files`), `service.py`
(sauvegarde, enregistrement, suggestion d'analyse), `schemas.py`,
`router.py` avec l'endpoint :

```python
@router.post("/{club_id}/files", response_model=FileUploadResponse, status_code=201)
async def upload_file(
    club_id: int,
    file: UploadFile = File(...),
    context_type: Optional[str] = Form(None),
    context_id: Optional[int] = Form(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("IMPORTER_SEANCE_DU_JOUR")),
):
```

Et la migration correspondante : `b806a273afbe_add_uploaded_files.py`.

Le plan de la soirée était clair : écrire les tests du dashboard
(`tests/test_dashboard.py`), brancher l'upload, vérifier, valider.
J'avais un fichier à envoyer, un endpoint tout neuf, et un sentiment
délicieux de maîtrise.

## 2. Le symptôme / le défi

L'endpoint d'upload était monté, l'authentification validée, la table
`uploaded_files` créée. J'envoie mon premier fichier de test… et le
serveur me répond par un crash, **avant même d'exécuter une seule ligne
de mon code** :

```
RuntimeError: Form data requires "python-multipart" to be installed.
```

```
Traceback (most recent call last):
...
raise RuntimeError(multipart_not_installed_error) from None
RuntimeError: Form data requires "python-multipart" to be installed.
```

Deux tentatives, deux crashs identiques. Le message est limpide… et
pourtant je vais mettre du temps à le prendre au sérieux.

Au même moment, un détail plus discret m'irritait : en générant la
migration du module IA, j'avais obtenu **deux** fichiers
`add_ai_module` (`dbd57c83f186`, puis `97c8bf6a4e60`), tous deux
remplis de `pass`. Un écho du chapitre 4 : la migration vide. De quoi
alimenter la suspicion sur mes modèles.

## 3. Où je cherchais

Ma soirée de code se lit dans l'historique de mes éditions : une
dizaine d'allers-retours dans `tests/test_dashboard.py` entre 18h et
20h, un passage par `app/evaluations/models.py` (18:47), par
`tests/conftest.py` (20:31), puis deux dernières retouches dans
`app/dashboard/service.py` (20:57, 21:19). Le dashboard accaparait mon
attention — et l'upload était testé à la marge.

Quand l'erreur est tombée, mes premières hypothèses sont toutes passées
à côté :

1. **« C'est mon appel de test qui est mal formé. »** J'ai vérifié mon
   client HTTP, les headers, la façon dont j'envoyais le fichier.
   Deux fois.
2. **« C'est le routeur. »** J'ai relu `app/files/router.py` ligne par
   ligne : `UploadFile` est importé, `File(...)` et `Form(...)` sont là,
   l'endpoint est bien monté. Tout est correct. Évidemment.
3. **« C'est le service. »** J'ai inspecté `file_service.upload_file` :
   la logique de sauvegarde, le poids max, les types acceptés. Tout est
   correct. Évidemment.

Le message d'erreur, lui, parlait de **`python-multipart`**. Je l'ai
lu, relu… et je suis passé à autre chose, persuadé que « c'était un
détail d'environnement » — le genre de phrase qui devrait toujours
déclencher une alarme chez un développeur.

## 4. Où était le problème réellement

Le problème était exactement là où le message d'erreur le disait — et
mon réflexe avait été de chercher partout sauf là.

FastAPI ne sait pas parser tout seul un corps `multipart/form-data`.
Quand un endpoint déclare des paramètres `File(...)` ou `Form(...)`,
FastAPI délègue le décodage à la bibliothèque **`python-multipart`**.
Sans elle, il lève `RuntimeError: Form data requires "python-multipart"
to be installed.` — un crash **au parsing de la requête**, avant que
mon routeur, mon service ou mes schémas n'aient la moindre chance de
s'exécuter.

Or cette dépendance n'était **pas déclarée dans `pyproject.toml`**.
J'avais ajouté `PyPDF2` (lire les PDF), `python-docx` (les DOCX),
`Pillow` (les images), `reportlab` (les exports PDF du dashboard)… et
oublié le paquet qui rendait possible le transport du fichier lui-même.
Le fichier n'arrivait jamais : l'erreur se produisait à la porte
d'entrée. C'est pour ça qu'elle apparaissait **deux fois** dans les
logs — mes deux tentatives, deux fois la même porte fermée.

Quant aux deux migrations `add_ai_module` remplies de `pass` : fausse
alerte. Après le squash du chapitre 4, le schéma initial contenait déjà
toutes les tables IA. L'autogenerate ne trouvait donc **rien de
nouveau** à ajouter — d'où les `pass`. Ce n'était pas un bug, mais un
bruit qu'il fallait savoir interpréter : une migration vide est un
signal, pas une erreur.

## 5. Comment on l'a résolu

1. **Déclarer la dépendance manquante.** Une ligne dans
   `pyproject.toml`, au milieu des autres :

   ```toml
   "python-multipart>=0.0.9",
   ```

   Leçon de bon sens : à chaque paramètre `File`/`Form` ajouté, la
   dépendance qui va avec doit être dans la liste. Je l'ai vérifiée
   cette fois — c'est bien le cas.

2. **Réinstaller proprement, puis relancer.** Dépendance déclarée ne
   veut pas dire dépendance installée : réinstallation de
   l'environnement, redémarrage du serveur.

3. **Tester l'upload pour de vrai.** Nouvel envoi du fichier : cette
   fois la requête passe la porte, le service s'exécute, et l'endpoint
   répond **201** avec le `FileUploadResponse` attendu. La table
   `uploaded_files` reçoit sa première ligne.

4. **Valider toute la chaîne.** Relance complète de la suite :
   `tests/test_dashboard.py` (overview, radar des évaluations validées,
   exclusion des brouillons, historique, résumé pré-match, export PDF
   joueur, exclusion PDF sans permission) — **0 échec**. Le dashboard
   et l'upload sont verts ensemble.

5. **Faire le tri dans les migrations.** Les deux `add_ai_module` à
   `pass` : vérifiées, inoffensives, chaîne de révisions intacte
   (`0d26806ad448 → b3ea619cf3d0 → fbcb327cba70 → dbd57c83f186 →
   97c8bf6a4e60 → b806a273afbe`). J'ai appris à lire une migration
   vide avant de la suspecter.

## 6. L'enseignement

> **Quand le message d'erreur nomme un paquet manquant, ce n'est pas un
> reproche : c'est un diagnostic. Le chercher ailleurs, c'est refuser
> la réponse qu'on a demandée.**

Trois réflexes à garder :

1. **Lis le message d'erreur en entier, deux fois, avant de toucher au
   code métier.** `Form data requires "python-multipart" to be
   installed.` ne pouvait pas être plus explicite. J'ai vérifié mon
   routeur, mon service, mon client HTTP — tout sauf ce qui était
   désigné. Le premier endroit à inspecter, c'est celui que l'erreur
   nomme.

2. **Chaque `File(...)` ou `Form(...)` doit avoir sa dépendance
   déclarée.** FastAPI ne parse pas le `multipart/form-data` tout seul.
   Avant d'écrire un endpoint d'upload : vérifier `python-multipart`
   dans `pyproject.toml`, puis **réinstaller** — déclarer sans
   installer, c'est un bug en attente.

3. **Une migration vide (`pass`) est un signal, pas une erreur.**
   Après un squash, l'autogenerate n'a plus rien à dire sur les tables
   déjà incluses : des `add_ai_module` vides, c'est la preuve que le
   schéma initial est complet — pas que le module IA est cassé. Vérifie
   la chaîne des révisions avant de paniquer.

Bonus — la leçon la plus profonde : je cherchais un bug dans **mon**
code parce que je ne voulais pas croire que le problème était **ailleurs
que dans mon code**. Le plus grand temps perdu n'est pas celui de la
recherche : c'est celui passé à ignorer la réponse qui était déjà sur
l'écran.

---

*Une erreur qui nomme sa cause est un cadeau. Les vraies énigmes sont
celles qui ne disent rien.*
