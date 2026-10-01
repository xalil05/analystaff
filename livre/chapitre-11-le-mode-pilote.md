# Chapitre 11 — « Le mode pilote : quand sécuriser les clés fait planter le moteur »

*Phase 5 → 6 · 22-23 septembre 2026*

---

## 1. Le contexte

La phase 5 touchait à sa fin. Les évaluations tournaient, les matchs se composaient, l'audit traçait chaque action. Le socle était solide — enfin.

Mais il restait une décision que je repoussais depuis des semaines : **le périmètre du MVP**. Est-ce qu'on lance avec le multi-clubs, multi-catégories, multi-saisons ? Ou est-ce qu'on verrouille tout sur **1 club, 1 équipe, la saison en cours** et on expédie ?

La réponse, je la connaissais depuis le début : le pilote, c'est un seul club test. Les catégories U17, U20, Seniors, les saisons 2025, 2026, 2027 — tout ça, ce sont des fonctionnalités V1. Pour le MVP, il fallait les **désactiver** sans les **supprimer**. Le code devait les connaître, la base devait les supporter, mais l'utilisateur ne devait jamais les voir.

C'est là que le virage « Mode Pilote V0 » a commencé. Un commit qui allait toucher les modèles, les schémas, les routers, la config, la doc… et accessoirement, casser le démarrage du backend.

Autour de la même période, je nettoyais aussi le `docker-compose.yml` : un volume `upload_data` traînait, monté dans le backend, mais plus utilisé depuis qu'on était passé au stockage MinIO. Je l'ai enlevé. Propre. Logique.

Et puis, pour finir la journée, j'ai créé un fichier de test tout neuf : `tests/test_minio_integration.py`. Vide. Juste un squelette, une promesse.

Ce qui devait être une session de nettoyage et de verrouillage s'est transformé en chasse au fantôme.

## 2. Le symptôme / le défi

Premier signe : le backend ne démarrait pas.

```
AttributeError: 'Settings' object has no attribute 'minio_access_key'
```

Mon `StorageBackend`, qui initialise un client MinIO au chargement du module, trouvait une config vide. Pas de clé d'accès. Pas de clé secrète.

Pourtant, j'avais défini les champs dans `Settings` :

```python
minio_access_key: str = Field(default="")
minio_secret_key: str = Field(default="")
```

Le champ existe, la classe le déclare. Pourquoi `has no attribute` ?

Deuxième constat, plus étrange : le fichier `.env` existait mais était **vide**. 0 octet. Pas une seule variable.

Le backend lisait `.env` (configuré dans `SettingsConfigDict(env_file=".env")`), trouvait un fichier présent mais vide, et… quoi ? Il ignorait les champs ? Il les remplaçait par rien ?

Et troisièmement : le volume `upload_data` que j'avais supprimé de `docker-compose.yml` — est-ce que ça aussi, ça jouait un rôle ? Le backend montait `upload_data:/code/uploads` avant. Plus maintenant. Fallait-il garder ce volume pour autre chose ?

## 3. Où je cherchais

Ma première hypothèse : **le Dockerfile a changé**. Peut-être qu'un build sale traînait. J'ai checké les images, relancé `docker compose build --no-cache`. Rien.

Deuxième hypothèse : **l'import est cassé**. Peut-être que `storage.py` importait `get_settings()` avant que les nouveaux champs `minio_*` soient disponibles. J'ai vérifié l'ordre des imports : `from app.core.config import get_settings` → `settings = get_settings()` — tout semblait correct. Les champs sont dans la classe. Pydantic les charge au moment de l'instanciation.

Troisième hypothèse : **un Settings hérité écrase les champs**. J'ai fouillé pour voir si une sous-classe ou un override existait quelque part. Rien.

Quatrième hypothèse : **le fichier `.env` vide empoisonne Pydantic**. C'était la plus crédible. Un fichier `.env` présent mais vide — Pydantic le charge-t-il silencieusement en écrasant les valeurs par défaut avec des chaînes vides ? Ou est-ce que le parser le traite comme un fichier valide mais sans contenu, laissant les champs dans un état indéfini ?

Mais honnêtement, ça n'expliquait pas le `has no attribute`. Un champ avec `default=""` devrait exister, que `.env` soit vide ou pas. Le comportement était incohérent.

## 4. Où était le problème réellement

**Le problème, ce n'était pas le code. C'était la version du code qui tournait.**

J'avais deux couches de changements qui se télescopaient :

### Couche 1 — Le commit « mode pilote V0 » (6932386)

Ce commit avait modifié `config.py` pour **vider les valeurs par défaut** des clés MinIO :

```diff
- minio_access_key: str = Field(default="analystaff")
- minio_secret_key: str = Field(default="analystaff_minio_secret")
+ minio_access_key: str = Field(default="")
+ minio_secret_key: str = Field(default="")
```

C'était une bonne décision de sécurité : les clés par défaut ne doivent pas être commitées. Mais ça signifiait que **sans fichier `.env` valide**, le backend démarrait avec des clés vides.

Le commentaire disait : « À régler via .env en production ». C'était vrai — mais en local, `.env` était resté vide (0 octet). Personne ne l'avait rempli.

### Couche 2 — Le conteneur Docker pas rebuildé

Le commit était sur `main`, mais le conteneur Docker tournait encore avec l'ancienne image, celle où les clés MinIO étaient codées en dur (`"analystaff"` / `"analystaff_minio_secret"`). Du coup, l'erreur `Has no attribute` venait :

- Soit d'un **conteneur pas rebuildé** qui utilisait la nouvelle config (champs vidés) sans `.env` valide,
- Soit d'une **exécution locale** (hors Docker) où le seul fichier `.env` existant était vide.

Le vrai problème était donc un **décalage entre le code (sécurisé) et l'environnement (pas configuré)**. Le commit avait fait la moitié du travail : vider les defaults, sans s'assurer que le `.env` de dev était à jour.

### Bonus — Le test vide et le volume orphelin

Le fichier `tests/test_minio_integration.py` : 0 octet. Créé, jamais rempli. Une intention, pas une exécution. Classique du développeur qui veut écrire un test, pose le fichier, et passe à autre chose.

Le volume `upload_data` supprimé de `docker-compose.yml` : propre, aucun impact. Le stockage MinIO remplaçait le volume local depuis longtemps. Juste un ménage de printemps.

## 5. Comment on l'a résolu

La résolution s'est faite en deux temps.

### Étape 1 — Créer le fichier `.env`

J'ai copié `.env.example` vers `.env` et vérifié que toutes les variables MinIO étaient renseignées :

```env
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=analystaff
MINIO_SECRET_KEY=analystaff_minio_secret
MINIO_BUCKET=analystaff-files
MINIO_SECURE=false
```

Sans ça, le `Settings` lisait `.env` (vide), n'avait ni `MINIO_ACCESS_KEY` ni `MINIO_SECRET_KEY`, et même si les defaults étaient techniquement présents (`""`), le comportement de Pydantic avec un fichier `.env` vide peut être ambigu selon la version.

### Étape 2 — Rebuild Docker

```bash
docker compose build --no-cache backend
docker compose up -d
```

Le nouveau conteneur utilisait la bonne config + le `.env` fraîchement créé. Le client MinIO s'initialisait avec les bonnes clés.

### Étape 3 — Commit et alignement

Le commit itself était bon — le problème n'était pas dans le code mais dans l'environnement. J'ai ajouté une note dans le commit et dans `PILOT_MODE.md` pour rappeler la dépendance au fichier `.env`.

Le fichier `docker-compose.yml` a aussi été nettoyé : passage de MinIO en conteneur interne avec son propre volume (`minio_data`), suppression du volume `upload_data` devenu orphelin. Propre.

## 6. L'enseignement

> **Sécuriser une config sans mettre à jour l'environnement, c'est comme changer la serrure sans donner la clé : la porte est plus sûre, mais personne n'entre.**

Trois réflexes à garder :

1. **Quand tu vides un default, remplis le `.env`.** Si tu passes une variable de `"analystaff"` à `""` pour des raisons de sécurité, tu crées une dette d'environnement. Le `.env.example` doit être mis à jour AU MOMENT du commit, pas après. Et le `.env` réel doit suivre immédiatement.

2. **Ne fais pas confiance à un `.env` vide.** Un fichier de 0 octet, ce n'est pas « pas de fichier » — c'est un fichier valide qui ne contient rien. Pydantic le lira et son comportement peut surprendre selon la version. Si tu veux pas de `.env` en prod, supprime-le carrément ou utilise `env_file=None` dans la config.

3. **Rebuild avant de tester.** Une modification de `config.py` ou `docker-compose.yml` ne prend effet qu'après `docker compose build`. Si le conteneur tourne encore avec l'image d'avant, tu testes la mauvaise version. « Ça marche pas » ≠ « le code est faux » — parfois c'est juste « le conteneur est pas à jour ».

Bonus — la leçon la plus profonde : **le commit de sécurité n'est complet que quand l'environnement de dev est à jour.** Vider des clés par défaut, c'est bien. Mais si le développeur (toi) doit perdre 30 minutes à comprendre pourquoi le backend ne démarre plus, c'est que le commit manquait une étape. La prochaine fois : commit + update `.env.example` + rebuild = un seul geste.

---

*Sécuriser sans configurer, c'est s'enfermer soi-même.*