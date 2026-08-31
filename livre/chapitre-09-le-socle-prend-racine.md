# Chapitre 9 — « Le socle prend racine : 108 lignes de specs qui descendent enfin en base »

*Phase 5 — Module IA, fichiers & tableau de bord · 14 août 2026*

---

## 1. Le contexte

Le chapitre 8 s'était terminé sur un constat inconfortable : **le socle
fantôme**. Les specs décrivaient un system prompt central de **108
lignes** — identité, mission, règles dures, garde-fous de périmètre —
mais le code, lui, contenait deux phrases :

```python
SYSTEM_PROMPT = (
    "Tu es un assistant pour staff technique de football. "
    "Réponds toujours avec un JSON valide, sans texte autour."
)
```

Deux phrases en dur dans `backend/app/ai/deepseek_client.py`, face à un
contrat de 108 lignes dans `SPECIFICATIONS_IA_ET_PROMPTS.md`. La phase 5
continuait : le module IA prenait forme, les **9 templates d'action**
étaient déjà versionnés en base (table `ai_templates`, règle ZG-7), et
le backend venait de passer à **47 tests verts**. Mais le socle commun,
lui, vivait encore dans le code — en dehors de la base, en dehors du
versioning, en dehors des specs.

La section 4.0 des specs était pourtant sans ambiguïté : *« Un system
prompt fort et encadré gouverne tous les appels IA, en amont du
template d'action »* — stocké dans `ai_templates` sous
`action_key = '__SYSTEM_PROMPT__'`, versionné comme les autres. Et la
règle 4.1 ajoutait, noir sur blanc : **« Le template n'est jamais
stocké dans le code source. »**

Le contrat était écrit. Le code ne le respectait pas. Il fallait
combler l'écart.

## 2. Le symptôme / le défi

Pas d'erreur dans les logs. Pas de test rouge. Pas de crash au
démarrage. Le symptôme était **structurel**, et c'est pour ça qu'il
était dangereux : rien ne beepait.

Le défi technique, lui, était précis :

- **108 lignes** de contrat à faire vivre quelque part, versionnées,
  avec rollback possible et historique consultable (ZG-7) ;
- une règle d'appel à respecter à la lettre : **socle → template
  d'action → contexte autorisé** (SPECIFICATIONS_IA §4.0) ;
- et une contrainte supplémentaire, que j'ai découverte en chemin : le
  client `call_deepseek` n'acceptait que `(user_prompt,
  timeout_seconds)`. **Il n'y avait aucun endroit, dans toute la chaîne,
  pour faire passer un socle chargé depuis la base.**

Autrement dit : même avec le fichier parfait, même avec un seed
impeccable, rien n'aurait jamais utilisé le socle. L'architecture
n'avait pas de prise. C'était ça, le vrai mur.

## 3. Où je cherchais

Première tentation, la plus paresseuse : **grossir la constante**. Après
tout, le client avait déjà `SYSTEM_PROMPT` — il suffisait de coller les
108 lignes à la place des deux phrases, et le tour était joué. Refusé
immédiatement : on retombait exactement dans la violation de la règle
4.1, sans versioning, sans rollback, et chaque modification de prompt
aurait exigé un redéploiement. C'était le piège du chapitre 8, en pire.

Deuxième piste : **lire le fichier `.md` à chaque appel**. Simple,
direct, pas de base de données. Mais ça contournait `ai_templates` :
le socle aurait eu une source de vérité différente des 9 templates
d'action, pas de versions en base, pas d'historique consultable.
Deux systèmes de gestion pour une même famille d'objets — incohérent.

Troisième piste, écartée vite : **créer une table dédiée** au socle.
Sur-ingénierie : la table `ai_templates` existait déjà et supportait
parfaitement un `action_key` réservé.

La bonne direction est apparue en relisant la section 4.0 comme une
recette, pas comme une contrainte : *« le backend charge le system
prompt actif + le template d'action actif »*. Le socle n'était pas un
cas à part — c'était **un template comme les autres**, avec une clé
réservée. Restait à créer la couture : un seed, un point d'ancrage, un
paramètre.

## 4. Où était le problème réellement

La cause racine n'était pas un bug : c'était un **défaut de couture**
dans l'architecture.

D'un côté, le contrat (les specs) disait : *le socle vit en base*.
De l'autre, le code disait : *le socle est une constante du client*.
Et entre les deux, aucune jonction :

- `service.py` appelait `call_deepseek(user_prompt, timeout_seconds)`
  sans aucun moyen de passer un socle dynamique ;
- `deepseek_client.py` construisait son payload avec la constante
  locale, point final ;
- le seed ne connaissait pas le fichier de référence, et la base ne
  connaissait pas le socle.

Le problème, c'est que **le socle appartenait au mauvais propriétaire**.
Tant qu'il restait une constante dans le client, tout le travail de
contenu (les 108 lignes) et tout le travail de stockage (la base
versionnée) étaient inutiles : aucune route ne les reliait à l'appel
réel. Il fallait déplacer la propriété — du code vers la base — et
créer, dans le service, le **point d'ancrage** qui charge le socle
actif à chaque déclenchement d'action.

## 5. Comment on l'a résolu

La démarche, vérifiée étape par étape :

**1. Écrire la source de référence.** `backend/ai/system_prompt.md` —
108 lignes, v1.0, datée du 13/08/2026 : l'identité (assistant du staff,
« tu es un outil du banc, pas un supporter »), la mission, les **7
règles dures** (zéro invention, contexte = seule source de vérité,
`NEEDS_MORE_DATA` plutôt que fabriquer, sortie JSON stricte,
cohérence d'unités AU/RPE…), les **6 garde-fous de périmètre** (dont le
refus uniforme `HORS_DOMAINE`), la voix de la charte, le cadre produit
(4 piliers, ACWR 0,8-1,3), la sécurité et le format de sortie.

**2. Seeder, de façon idempotente.** `seed_system_prompt()` dans
`app/core/seed.py` :

```python
SYSTEM_PROMPT_FILE = Path(__file__).resolve().parents[2] / "ai" / "system_prompt.md"
```

Le chemin est résolu depuis le fichier lui-même — pas un chemin relatif
fragile. La fonction vérifie qu'aucune version 1 n'existe déjà
(`action_key == "__SYSTEM_PROMPT__"`), puis insère un
`AiTemplate(version=1, is_active=True)` avec le contenu du fichier.
Relançable à volonté, sans doublon. Ajouté à `run_seed()` et au setup
de `tests/conftest.py`.

**3. Créer le point d'ancrage.** Dans `app/ai/service.py` :

```python
SYSTEM_PROMPT_ACTION_KEY = "__SYSTEM_PROMPT__"
```

et, dans `trigger_action`, juste avant l'appel :

```python
system_template = await get_active_template(db, SYSTEM_PROMPT_ACTION_KEY)
system_prompt = (
    system_template.template_content if system_template is not None else None
)
```

**4. Paramétrer le client, avec filet de sécurité.**
`call_deepseek` accepte désormais `system_prompt: str | None = None` :

```python
effective_system_prompt = system_prompt or SYSTEM_PROMPT
```

Si le seed n'a pas tourné, la constante minimale prend le relais — le
système se dégrade proprement au lieu de casser.

**5. Verrouiller par un test de chaîne.** Dans `tests/test_ai.py`,
`test_trigger_action_charges_system_prompt_from_db` : on remplace
`call_deepseek` par un faux (monkeypatch) qui **capture** ce qui part
réellement, puis on déclenche `SUMMARIZE_WEEK`. Le test vérifie que le
socle transmis contient bien les marqueurs du contrat — `HORS_DOMAINE`,
`Garde-fous` — et que le `user_prompt` est le template d'action formaté
(« Résume la semaine écoulée » + « non spécifié » pour les variables
manquantes). La chaîne complète **socle → template → contexte** est
prouvée, sans appeler le moindre service externe.

Résultat : **48 tests verts** (47 → 48), aucun échec, aucune erreur de
log, et — détail qui a son importance — **aucune migration nécessaire** :
le socle a réutilisé `ai_templates`, la péripétie s'est jouée dans la
couche applicative, pas dans le schéma. Le commit est parti propre :
« feat(ai): socle __SYSTEM_PROMPT__ seedé en base + point d'ancrage
dans le service (48 tests verts) ».

## 6. L'enseignement

> **Un contrat qui n'existe que dans les specs n'existe pas. Il devient
> réel le jour où un seed l'écrit, un service le charge, et un test
> prouve qu'il arrive au bout du fil.**

Le socle était « écrit » depuis des jours — dans un fichier de specs que
personne ne lisait à l'exécution. Le code, lui, continuait avec ses deux
phrases. C'est la définition d'un fantôme : quelque chose de décrit,
mais de jamais chargé.

Trois réflexes à garder :

1. **Quand une valeur vit en dur dans le code alors qu'un contrat la
   veut dynamique, crée la couture en trois temps.** Un seed pour
   écrire (idempotent : vérifie l'existence avant d'insérer), un point
   d'ancrage pour charger (le service qui lit la version active), un
   paramètre avec fallback pour transmettre sans rien casser. Trois
   maillons, aucun optionnel — un seed sans ancrage ne sert à rien.

2. **La source de vérité n'est pas là où on la déclare, mais là où le
   code la charge.** Un `.md` bien écrit ne pèse rien si le runtime ne
   le lit pas. La vraie question d'architecture n'est pas « où est le
   document ? » mais « quel chemin de code charge quoi, et que se
   passe-t-il si la source manque ? » (ici : fallback minimal au lieu
   d'un crash).

3. **Teste la chaîne, pas la bibliothèque.** On ne teste pas le service
   d'IA externe : on le remplace par un faux qui capture les arguments,
   et on asserte sur des **marqueurs du contrat** (`HORS_DOMAINE`,
   `Garde-fous`) pour prouver que le bon contenu part au bon endroit.
   Un test qui vérifie ce qui traverse la frontière vaut mieux que dix
   tests qui vérifient ce qui se passe dedans.

Bonus — la leçon la plus profonde : **le socle du chapitre 8 n'était
pas un problème de contenu, c'était un problème de propriété.** Les 108
lignes existaient ; elles appartenaient juste au mauvais endroit. À
chaque fois qu'un contrat de specs et un bout de code se contredisent,
demande-toi d'abord qui possède la vérité à l'exécution — pas qui la
décrit le mieux.

---

*Un contrat n'existe que le jour où un seed l'écrit, un service le
charge, et un test le prouve. Avant ça, c'est de la littérature.*
