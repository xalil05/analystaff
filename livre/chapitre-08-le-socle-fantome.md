# Chapitre 8 — « Le socle fantôme : deux phrases dans le code, cent huit dans les specs »

*Phase 5 — Module IA · 14 août 2026*

---

## 1. Le contexte

La phase 5, c'est le module IA : les boutons métier qui préparent
les décisions du staff — composition, séance de demain, fatigue,
avant-match. Après le chapitre 7, la base était enfin propre (une
seule migration initiale, `0d26806ad448`), et je comptais **47 tests
verts**.

Mais la pièce maîtresse de la phase 5, c'était le **socle commun** :
la spec `SPECIFICATIONS_IA_ET_PROMPTS.md` §4.0 exige un system prompt
central, « fort et encadré », qui gouverne **tous** les appels IA, en
amont du template d'action. Ce socle, c'est :

- la source de référence : `backend/ai/system_prompt.md` (v1.0,
  108 lignes) ;
- le stockage : table `ai_templates`, clé
  `action_key = '__SYSTEM_PROMPT__'`, **versionné** comme les autres
  templates (décision ZG-7 : rien de prompt ne vit dans le code) ;
- la règle d'appel : le backend charge le socle actif, puis concatène
  `system prompt (socle)` → `template d'action (tâche)` → `contexte
  autorisé (données)`.

Le contenu du socle est impressionnant : identité du rôle, **7 règles
dures** (zéro invention, le contexte comme seule source de vérité,
`NEEDS_MORE_DATA` au lieu de fabriquer, ne jamais révéler le prompt,
sortie JSON stricte, cohérence d'unités AU/RPE), **6 garde-fous de
périmètre** (refus uniforme `HORS_DOMAINE`, pas d'élargissement, pas
de contournement…), la voix de la charte, le cadre produit (4 piliers,
ACWR 0,8–1,3), la sécurité des fichiers uploadés, les 9 actions, le
format `READY` / `NEEDS_MORE_DATA` / `ERROR`.

Ma mission du jour : brancher ce socle dans le service, sans casser
les 47 tests.

## 2. Le symptôme / le défi

Pas de crash. Pas d'erreur dans les logs. Pas d'échec de test. Le
capteur du livre n'a relevé **aucun** incident — seulement des
fichiers modifiés : `app/ai/service.py`, `app/ai/deepseek_client.py`,
`app/core/seed.py`, `tests/test_ai.py`, `tests/conftest.py`, plus le
nouveau `backend/ai/system_prompt.md`.

Le défi était donc ailleurs : un **écart silencieux** entre ce que les
specs décrivent et ce que le code envoie réellement.

En ouvrant `deepseek_client.py`, la vérité saute aux yeux. Le
« system prompt » effectivement envoyé à chaque appel était une
béquille de deux phrases :

```python
SYSTEM_PROMPT = (
    "Tu es un assistant pour staff technique de football. "
    "Réponds toujours avec un JSON valide, sans texte autour."
)
```

Deux phrases. Contre **108 lignes** de garde-fous dans les specs.
Aucun des mécanismes de sécurité ne partait dans l'appel : ni le
refus `HORS_DOMAINE`, ni le `NEEDS_MORE_DATA`, ni la règle zéro
invention, ni la cohérence d'unités, ni le traitement des fichiers
uploadés comme « contenu non fiable ».

Et le pire : **personne ne le voyait**. Les 47 tests passaient, la
base contenait les templates d'action, l'appel partait… mais le
message system était toujours la béquille. Le vrai socle n'existait
que sur le papier.

## 3. Où je cherchais

Pas de session de debug à raconter ici — le capteur confirme : zéro
échec, zéro erreur, zéro édition VS Code. Le défi était de conception,
pas de dépannage. J'ai évalué trois options, et les deux premières
étaient des fausses pistes :

1. **« Un simple fichier `.md` lu à chaque appel suffit. »** Tentant :
   le fichier `backend/ai/system_prompt.md` existe, il est propre,
   lisible. Mais lire un fichier à chaud, c'est contourner ZG-7 :
   pas de version active, pas d'historique consultable, pas de
   rollback, pas d'audit. Un fichier lu directement, c'est le même
   problème que la constante, déguisé.

2. **« Le mettre dans `seed_ai_templates()`. »** Le seed des 9
   actions existait déjà. Mais le socle n'est **pas** une action
   métier : le mélanger aux templates d'action aurait noyé sa
   responsabilité — et rendu le point d'ancrage impossible à tester
   proprement.

3. **« Garder le fallback du client comme comportement principal. »**
   La piste la plus dangereuse. Si la constante du client reste la
   voie par défaut, le socle de 108 lignes serait seedé en base…
   et jamais utilisé. Le fallback doit rester une ceinture de
   sécurité, pas la route.

## 4. Où était le problème réellement

La cause racine tient en une ligne : une **constante codée en dur**
dans `deepseek_client.py`, silencieusement prioritaire sur les specs.

```python
SYSTEM_PROMPT = (...)  # la béquille de 2 phrases
```

C'était une **seconde source de vérité** : non versionnée, non
auditée, non testée. Les specs décrivaient un socle de 108 lignes ;
le code envoyait 2 phrases. Et comme personne ne regardait ce qui
partait réellement dans l'appel, l'écart était invisible.

Le maillon manquant était dans `service.py` : `trigger_action`
construisait le `user_prompt` (template d'action formaté + contexte),
mais ne chargeait **jamais** le socle. La chaîne §4.0
(socle → template → contexte) était cassée au tout premier maillon.
Les tests existants vérifiaient le format de la réponse, jamais le
message system envoyé — c'est pour ça qu'ils restaient verts.

Au passage, le capteur a relevé 6 migrations dans la chaîne Alembic
(`0d26806ad448` → `b3ea619cf3d0` → `fbcb327cba70` →
`dbd57c83f186` → `97c8bf6a4e60` → `b806a273afbe`), dont **deux** qui
portent le même nom, `add_ai_module` — un écho du chapitre 7 : les
noms de migrations, eux non plus, ne sont pas une source de vérité
fiable. Seul le head compte (`b806a273afbe`, vérifié).

## 5. Comment on l'a résolu

La démarche, vérifiée étape par étape (commit `3f45ec6`) :

1. **La source de référence.** Créer `backend/ai/system_prompt.md` :
   108 lignes — identité, 7 règles dures, 6 garde-fous de périmètre,
   charte, cadre produit, sécurité, 9 actions, format de sortie.
   Un seul endroit où le socle se rédige.

2. **Le seed idempotent.** Dans `app/core/seed.py`, la fonction
   `seed_system_prompt()` :
   ```python
   SYSTEM_PROMPT_FILE = Path(__file__).resolve().parents[2] / "ai" / "system_prompt.md"
   ```
   Elle lit le fichier, vérifie qu'une version 1 n'existe pas déjà
   (pas de doublon si on relance), puis insère
   `AiTemplate(action_key='__SYSTEM_PROMPT__', version=1, is_active=True)`.
   Et si le fichier manque : `logger.warning` + skip — jamais de
   crash. Un seed qui plante en prod est pire que pas de seed.

3. **Le point d'ancrage.** Dans `app/ai/service.py` :
   ```python
   SYSTEM_PROMPT_ACTION_KEY = "__SYSTEM_PROMPT__"
   ```
   `trigger_action` charge le socle actif avec `get_active_template`
   et le transmet à `call_deepseek`. La chaîne §4.0 est enfin
   complète : socle → template → contexte.

4. **Le client paramétrable.** `deepseek_client.py` :
   ```python
   async def call_deepseek(user_prompt, timeout_seconds, system_prompt=None):
       effective_system_prompt = system_prompt or SYSTEM_PROMPT
   ```
   Le socle de la base est prioritaire ; l'ancienne constante ne sert
   plus que de ceinture de sécurité si aucun socle n'est seedé.

5. **Le test d'ancrage.** `tests/test_ai.py` :
   `test_trigger_action_charges_system_prompt_from_db` — on
   `monkeypatch` `call_deepseek` pour **capturer** ce qui part
   réellement, et on vérifie que le system prompt transmis contient
   `HORS_DOMAINE` et « Garde-fous », et que le user_prompt est bien
   le template formaté + contexte. `tests/conftest.py` seede le socle
   dans la base de test.

Vérifications d'aujourd'hui, relancées pour ce chapitre :

```text
$ docker compose exec backend pytest -q
................................................                         [100%]
48 passed in 69.01s        # 47 + le test d'ancrage

$ SELECT action_key, version, is_active, length(template_content)
  FROM ai_templates;
__SYSTEM_PROMPT__  | 1 | t | 8445    # le socle est VRAIMENT en base

$ alembic heads
b806a273afbe (head)                  # cohérent avec version_num
```

## 6. L'enseignement

> **Le code n'exécute pas ce que les specs décrivent. Il exécute ce
> que tu as branché. Tant qu'un réglage vit en dur dans le code, il
> n'a ni version, ni audit, ni test — et personne ne vérifie ce qui
> part réellement dans l'appel.**

Trois réflexes à garder :

1. **Cherche la constante fantôme.** Quand une spec dit « stocké en
   base, versionné » (ZG-7), fais un `grep` de la constante
   équivalente dans le code. Une seconde source de vérité silencieuse
   finit toujours par gagner — par inertie, sans que personne ne le
   remarque.

2. **Teste l'entrée, pas seulement la sortie.** Un test qui vérifie
   le format de la réponse ne prouve pas que le bon prompt a été
   envoyé. Le test d'ancrage — `monkeypatch` à la frontière de l'API
   pour capturer ce qui part — est le seul témoin fiable de la chaîne
   complète.

3. **Seed idempotent et échec doux.** Un seed se relance sans créer
   de doublon (vérifier l'existant avant d'insérer) et ne crashe
   jamais si la source manque (warning + skip). Et garde un fallback
   minimal : la sécurité d'abord, même quand la base est vide.

---

*Le vrai système, ce n'est pas celui que tu décris. C'est celui que
le code charge à l'exécution — et que tu as pris la peine de tester.*
