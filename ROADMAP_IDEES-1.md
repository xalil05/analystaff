# Analystaff — Roadmap & idées

Ce fichier contient les directions produit envisagées, les fonctionnalités futures et les questions encore ouvertes.

Il ne contient **pas** les décisions validées.

Une idée migre vers `DECISIONS_FIGEES.md` une fois explicitement confirmée, avec sa date de validation.

Rien dans ce fichier n'est engageant pour le code actuel tant que la décision n'a pas été validée.

⚠️ Mise à jour du 05/08/2026 : de nombreux éléments autrefois en roadmap ont été validés pour le V0 ou la V1. Ce fichier ne contient plus que les évolutions post-V1 et les questions encore ouvertes.

---

## 1. Ce qui était en roadmap et qui est maintenant acté

Les éléments suivants ont été validés et figurent désormais dans `DECISIONS_FIGEES.md` :

| Élément | Destination | Date |
|---|---|---|
| Module entraînement hebdomadaire | V0 | 04/08/2026 |
| Évaluation post-entraînement | V0 | 04/08/2026 |
| Planification des séances | V0 | 04/08/2026 |
| Plans de travail hebdomadaires/mensuels | V0 | 04/08/2026 |
| Synthèse avant-match | V0 | 04/08/2026 |
| Plateau tactique / terrain virtuel | V0 | 04/08/2026 |
| IA active via boutons métier | V0 | 04/08/2026 |
| Pré-génération IA simple | V0 | 05/08/2026 |
| Upload de fichiers | V0 | 05/08/2026 |
| Historisation des pondérations (snapshot) | V0 | 05/08/2026 |
| Phase pilote gratuite | V0 | 05/08/2026 |
| 25 angles morts qualité | V0 | 05/08/2026 |
| Paiement Wave / Orange Money | V1 | 05/08/2026 |
| Notifications in-app | V1 | 05/08/2026 |

Ces éléments ne doivent plus être traités comme des idées futures.

---

## 2. V1 — Après la phase pilote gratuite

### 2.1 Paiement Wave / Orange Money

Le paiement n'est pas requis pour le V0.
La phase pilote est gratuite.

Prévu en V1 :
- intégration Wave (prioritaire) ;
- intégration Orange Money (ensuite) ;
- statut d'abonnement ;
- gestion des impayés ;
- limites par forfait ;
- suspension éventuelle ;
- export / récupération des données en cas d'arrêt ;
- facturation simple adaptée au contexte local.

Points à préciser avant développement :
- modèle tarifaire exact ;
- prix par forfait (amateur, semi-pro, pro) ;
- paiement mensuel, trimestriel, annuel ou par saison ;
- gestion des clubs pilotes après la phase pilote ;
- devise ;
- sécurité et journalisation des paiements ;
- workflow de relance en cas d'impayé.

Règle :
- le V0 doit rester totalement utilisable sans paiement.

### 2.2 Notifications in-app

Les notifications ne sont pas incluses dans le V0.
Dans le V0, les informations importantes sont affichées lorsque l'utilisateur ouvre l'application.

Prévu en V1 :
- centre de notifications in-app ;
- badges ;
- suggestions IA prêtes ;
- rappels de match ;
- rappels de séance ;
- alertes importantes ;
- actions à valider.

Points à préciser :
- canal prioritaire ;
- fréquence ;
- préférences utilisateur ;
- respect du consentement ;
- design du centre de notifications.

### 2.3 Améliorations post-pilote

Évolutions possibles après les retours terrain :
- interfaces dédiées préparateur physique (alignées sur les plans d'entraînement) ;
- interfaces dédiées entraîneur technique ;
- historique comparatif sur la saison ;
- amélioration de la pré-génération IA ;
- personnalisation plus avancée des suggestions ;
- rapports plus riches ;
- gestion multi-équipes par club (si validée).

---

## 3. V2 — IA avancée

Fonctionnalités envisagées après le V0 et la V1 :

- analyse approfondie des commentaires du coach (NLP avancé) ;
- détection de signaux faibles ;
- alertes avancées basées sur les données accumulées ;
- personnalisation des suggestions selon le style du coach ;
- apprentissage des habitudes du coach ;
- meilleur moment de préparation des suggestions ;
- priorisation des suggestions ;
- feedback implicite plus riche ;
- suggestions de composition plus fines ;
- synthèse automatique de tendances.

Règles :
- pas de GPU dédié sans preuve de besoin ;
- DeepSeek API pour le NLP léger ;
- l'IA reste consultative ;
- le coach décide toujours.

---

## 4. V3 — ML et prédictions

Fonctionnalités envisagées à plus long terme :

- vrai ML ;
- prédiction de forme ;
- prédiction de fatigue ;
- prédiction de risque de blessure ;
- recommandation tactique avancée ;
- fine-tuning sur données propres ;
- comparaison entre suggestions IA et décisions réelles du coach ;
- datasets externes (Kaggle / StatsBomb) si pertinent ;
- modèle multi-tenant (un modèle sert tous les clubs, isolation par `club_id`).

Conditions :
- volume de données propre suffisant ;
- feedback coach accumulé ;
- preuve de besoin réelle ;
- location de GPU à la tâche si fine-tuning nécessaire ;
- jamais de VPS GPU fixe avant volume suffisant.

---

## 5. Tactique IA temps réel — Projet séparé

Ce projet est **séparé** d'Analystaff.

Il pourrait impliquer :
- tracking spatial ;
- données de positionnement en temps réel ;
- infrastructure potentiellement GPU ;
- modèles spécialisés type TacticAI / DeepMind.

Statut :
- hors scope V0 ;
- hors scope V1 ;
- hors scope V2 ;
- à étudier uniquement si les données et l'usage le justifient.

Ne pas mélanger les deux roadmaps.

---

## 6. Notifications externes (V2+)

Après les notifications in-app (V1) :

- email ;
- SMS ;
- WhatsApp ;
- rappels automatisés avancés ;
- alerte de charge élevée ;
- alerte de suggestion prête.

Points à valider :
- coût ;
- consentement ;
- fournisseur ;
- délivrabilité ;
- préférences par utilisateur ;
- respect de la réglementation.

---

## 7. Multi-équipes avancé

Le schéma peut supporter plusieurs équipes par club via `equipe_id`.

Question ouverte :
- un abonnement couvre-t-il une seule équipe (ex. Seniors) ou toutes les catégories du club (Seniors, U19, U17...) ?

Pistes :
- pilote avec une seule équipe par club ;
- nombre d'équipes comme levier de forfait ;
- gestion des catégories U17, U19, seniors ;
- joueurs évoluant entre équipes.

Non tranché — à valider une fois le retour des coachs pilotes obtenu.

---

## 8. Rapports et analytics

Évolutions possibles :

- rapports de saison ;
- comparaison de périodes ;
- évolution individuelle ;
- performance par formation ;
- performance par adversaire ;
- tendances fatigue ;
- historique des compositions ;
- export avancé ;
- tableaux de bord préparateur physique ;
- tableaux de bord staff médical ;
- graphiques d'évolution ;
- comparaisons inter-saisons.

Statut : non prioritaire pour le V0.

---

## 9. Templates tactiques personnalisés

Le V0 inclut formations prédéfinies et placement libre.

Évolutions possibles :
- sauvegarde de formations personnalisées ;
- templates de composition réutilisables ;
- duplication de composition précédente ;
- variantes domicile / extérieur ;
- variantes par adversaire ;
- consignes individuelles par joueur ;
- ajustement tactique en cours de match ;
- comparaison de dispositions avant / après remplacement ;
- heatmaps ou zones d'influence ;
- analyse comparative des performances par formation.

---

## 10. API publique

Pas dans le V0.

Évolutions possibles :
- API pour intégrations externes ;
- export vers outils fédéraux ;
- intégration avec outils de scouting ;
- intégration avec outils médicaux ;
- webhooks.

Conditions :
- sécurité ;
- versioning ;
- permissions ;
- documentation ;
- quotas.

---

## 11. Application mobile native

Le produit doit d'abord être excellent en web mobile / PWA légère.

Une application native pourrait être envisagée plus tard si :
- l'usage mobile devient dominant ;
- les limitations PWA deviennent bloquantes ;
- les clubs demandent une expérience native ;
- le besoin offline devient plus complexe.

---

## 12. Internationalisation et langues

Le produit est pensé pour le contexte africain et sénégalais.

Évolutions possibles :
- adaptation vocabulaire football local ;
- autres langues éventuelles ;
- devise locale ;
- formats de date locaux ;
- fuseau horaire local (déjà Africa/Dakar par défaut).

---

## 13. Onboarding avancé

Le V0 inclut un onboarding de base (guide de démarrage, tutoriels, FAQ).

Idées futures :
- visite guidée interactive ;
- exemples de clubs fictifs ;
- données de démonstration ;
- tutoriels vidéo courts ;
- assistant de configuration initiale ;
- recommandations selon niveau du club.

---

## 14. Amélioration de la pré-génération IA

La pré-génération simple est prévue dans le V0.

Évolutions possibles :
- prédiction du meilleur moment pour préparer une suggestion ;
- apprentissage des horaires habituels du coach ;
- préparation automatique plus fine ;
- invalidation intelligente ;
- régénération automatique après changement critique ;
- personnalisation du niveau de détail ;
- anticipation personnalisée (niveau 4).

---

## 15. Alertes basées sur des règles métier

Idée validée dans son principe.

Principe :
Générer des alertes automatiques à partir de règles simples, sans ML, sur l'historique récent d'un joueur.

Exemples :
- 3+ remplacements pour motif « fatigue » sur les 5 derniers matchs → alerte forte, suggérer repos ;
- fatigue récurrente + note physique moyenne basse → alerte modérée ;
- note physique basse isolée → alerte faible ;
- charge de travail hebdomadaire anormalement élevée → alerte préparateur physique.

Double intérêt :
- utile immédiatement, avant même que l'IA soit prête ;
- génère des données étiquetées utiles pour comparer plus tard les décisions d'un modèle IA à ces règles simples.

Version cible :
- à confirmer ;
- probablement V1 ou début V2 selon priorité.

---

## 16. Questions ouvertes

Les sujets suivants restent à préciser ou à valider selon les retours pilotes :

- périmètre exact équipe vs club ;
- tarification finale ;
- fournisseur SMS / WhatsApp ;
- durée exacte de conservation des données sensibles ;
- niveau de personnalisation des pondérations ;
- règles spécifiques catégories jeunes ;
- gestion des joueurs prêtés ou transférés ;
- gestion des staffs multiples par club ;
- niveau de complexité des rapports PDF ;
- langues locales éventuelles ;
- rôle éventuel du Responsable Technique du Club (RTJ) dans le produit ;
- choix détaillés PWA ;
- choix détaillé du client HTTP (fetch natif ou Axios).

---

## 17. Bonnes pratiques conservées

Ces bonnes pratiques restent valables et doivent être appliquées progressivement.

### Sécurité
- JWT courte durée ;
- refresh token sécurisé ;
- hachage robuste ;
- rate limiting ;
- vérification backend des permissions ;
- secrets hors git ;
- sauvegardes externalisées.

### Performance
- index SQL ;
- pagination ;
- compression ;
- éviter N+1 ;
- cache si nécessaire ;
- requêtes optimisées.

### Scalabilité
- `club_id` partout ;
- partitionnement futur possible ;
- modules cloisonnés ;
- migrations Alembic ;
- pas de modification manuelle du schéma en production.

### IA
- pas de GPU dédié sans besoin prouvé ;
- DeepSeek pour NLP léger ;
- location GPU ponctuelle si fine-tuning ;
- modèle multi-tenant ;
- isolation des données par club.

## 18. Registre des points honnêtes — dette technique et décisions à valider (13/08/2026)

Ce registre regroupe les choix pragmatiques faits pendant le développement du V0,
les lacunes identifiées et les améliorations reportées. Chaque point est conscient,
documenté ici, et doit être traité au bon moment. Aucun n'est bloquant pour le pilote,
mais chacun doit rester visible.

**Règle** : un point quitte ce registre uniquement quand il est soit résolu (migration
vers `DECISIONS_FIGEES.md` avec date), soit explicitement abandonné avec justification.

### 18.1 Sécurité (Phase 3)

| Point | Détail | Nature | Priorité |
|---|---|---|---|
| Rotation des refresh tokens | Non implémentée. Un token volé reste valide jusqu'à expiration ou logout explicite. La rotation (réémission à chaque refresh) est une amélioration de sécurité. | Amélioration sécurité | V1 |
| Retrait d'une permission par défaut | Le schéma `user_permissions` permet d'ajouter des exceptions individuelles, mais pas de retirer une permission qu'un rôle possède par défaut. Mécanisme absent du schéma. | Lacune schéma | À valider |
| Type INET et tests | La colonne `ip_address` utilise le type PostgreSQL `INET`. Les tests nécessitent donc PostgreSQL (pas SQLite possible). | Contrainte acceptée | Accepté |

### 18.2 Clubs / Staff / Joueurs (Phase 4A)

| Point | Détail | Nature | Priorité |
|---|---|---|---|
| Permission `GERER_JOUEURS` | Ajoutée au seed car nécessaire à la gestion de l'effectif, mais absente de la matrice d'origine. À valider et à ajouter dans `MATRICE_PERMISSIONS_ET_REGLES_METIER.md`. | Décision à valider | Pré-pilote |
| Invitation par email à token | Non implémentée. L'ajout d'un membre suppose un compte existant. Le flow complet d'invitation (email + token d'acceptation) est un raffinement. | Fonctionnalité manquante | Post-pilote |
| Pattern service sans repository | Pas de couche repository séparée. Les services contiennent la logique métier et les requêtes. Extractible selon les standards si les modules grossissent. | Architecture | Accepté |

### 18.3 Matchs / Plateau tactique (Phase 4B)

| Point | Détail | Nature | Priorité |
|---|---|---|---|
| Une seule composition active par match | Le service récupère la composition la plus récente. L'historisation de plusieurs compositions (avant/après) est possible via le schéma mais non exploitée. | Décision à valider | À valider |
| Verrouillage après validation | Une composition validée ne peut plus être modifiée (choix métier strict). Si le coach doit ajuster après validation, une logique de "repasser en brouillon" serait nécessaire. | Décision à valider | À valider |
| Joueurs vérifiés par club uniquement | Les joueurs de la composition sont vérifiés comme appartenant au club, mais pas encore filtrés par équipe. Raffinement possible. | Amélioration | Post-pilote |

### 18.4 Entraînements / Planification (Phase 4C)

| Point | Détail | Nature | Priorité |
|---|---|---|---|
| Formule de `charge_travail` | Accumulation simple des RPE. La formule exacte n'est pas figée dans les documents. | Décision à valider | À valider |
| Auto-transition planifiee → realisee | Déclenchée à la première évaluation. Choix métier. | Décision à valider | À valider |
| Transitions terminales | `realisee` et `annulee` sont des états finaux, sans retour possible. | Décision à valider | À valider |
| Doublon évaluation entraînement | Rejeté (409), sans possibilité de correction. Le schéma n'a pas de contrainte UNIQUE correspondante. | Lacune schéma | À traiter |
| Motif d'annulation | La matrice dit "la raison peut être documentée", mais le schéma n'a pas de colonne dédiée. Incohérence entre documents. | Incohérence docs | À résoudre |
| MàJ auto de `charge_travail` | Effectuée via `EVALUER_ENTRAINEMENT` sans `ECRIRE_DONNEES_PHYSIQUES`. Interprétation de "alimentée en continu". | Décision à valider | À valider |

### 18.5 Évaluations / Calcul pondéré (Phase 4D)

| Point | Détail | Nature | Priorité |
|---|---|---|---|
| `poste_groupe` absent de `players` | Fourni dans la requête d'évaluation pour le V0. Amélioration : ajouter `poste_groupe` à la table `players`. | Lacune schéma | À valider |
| Poids par défaut (fallback) | 25 % chacun, non figés dans les documents. | Décision à valider | À valider |
| Poids relatifs | La somme des poids n'est pas contrainte à 100 (renormalisation au calcul). | Décision à valider | À valider |
| Permission de saisie évaluation | Utilise `MODIFIER_MATCH` (pas de permission dédiée `EVALUER_MATCH`). | Décision à valider | À valider |
| Gestion des matrices | Utilise `GERER_PARAMETRES_CLUB`. Une permission dédiée pourrait être ajoutée. | Amélioration | Post-pilote |
| Modification d'évaluation | Recalcule avec les poids FIGÉS du snapshot (jamais avec une matrice modifiée entre-temps). Conforme à "pas de recalcul rétroactif silencieux". | Comportement validé | Accepté |

### 18.6 Module IA (Phase 5)

| Point | Détail | Nature | Priorité |
|---|---|---|---|
| Appel DeepSeek synchrone | Pas en tâche de fond. Choix pragmatique pour le pilote. Mode async + polling en amélioration. | Amélioration | Post-pilote |
| Invalidation OUTDATED | Simplifiée (à chaque nouvelle pré-génération). L'invalidation fine "si les données changent" est un raffinement. | Amélioration | Post-pilote |
| Permissions "accès au match" | Simplifiées en membership club pour `SUGGEST_LINEUP` / `PREPARE_PRE_MATCH`. | Simplification acceptée | Accepté |
| Filtrage fin par permission | Le contexte est isolé par club mais non filtré par permission individuelle. Sûr par construction (pas de données médicales dans le contexte V0). | À documenter | À documenter |
| Quotas d'appels IA | 100/club/jour recommandés mais non implémentés. | Amélioration | Pré-pilote |

### 18.7 Module fichiers (Phase 6)

| Point | Détail | Nature | Priorité |
|---|---|---|---|
| Divergence ZG-2 (stockage) | MinIO auto-hébergé (S3-compatible) utilisé au lieu du stockage local simple prévu par ZG-2. À valider et à documenter dans `DECISIONS_FIGEES.md` comme amendement. | Décision à valider | Pré-pilote |
| Validation par magic number | Non implémentée (extension + MIME uniquement). Plus robuste en V1. | Amélioration sécurité | V1 |
| OCR images | JPEG/PNG stockés mais non analysés en texte (pas d'OCR dans le V0). | Fonctionnalité manquante | V1 |
| Isolation MinIO | Le préfixe `{club_id}/` est une organisation, pas une sécurité. L'isolation réelle est garantie par le backend. Des politiques IAM MinIO pourraient renforcer cela. | Amélioration sécurité | V1 |
| Tests MinIO réels | Les tests mockent le stockage. Une intégration réelle avec MinIO doit être validée manuellement avant le pilote. | À tester | Pré-pilote |
| Analyse synchrone | L'appel IA à l'upload peut prendre jusqu'à 60 s. Acceptable pour le pilote ; un mode asynchrone est une amélioration. | Amélioration | Post-pilote |

### 18.8 Tableau de bord / Export PDF (Phase 7)

| Point | Détail | Nature | Priorité |
|---|---|---|---|
| PDF basique | Texte + valeurs numériques via reportlab. Pas de graphique radar dessiné en PDF (le frontend affichera le graphique). | Choix accepté | Accepté |
| Radar sur évaluations validées uniquement | Un brouillon n'apparaît pas dans les agrégations. Choix métier. | Décision à valider | À valider |
| Données médicales dans le PDF | Non incluses dans le V0 pour rester simple. À ajouter si besoin. | Amélioration | Post-pilote |
| Synthèse avant-match | Agrégation simple, pas d'IA. L'IA propose via `PREPARE_PRE_MATCH` (module IA). | Choix accepté | Accepté |
| Dépendance `reportlab` | Ajoutée. Vérifier la taille de l'image Docker. | Amélioration | Post-pilote |

### 18.9 Dette technique transversale

| Point | Détail | Nature | Priorité |
|---|---|---|---|
| Typage `Mapped[]` obligatoire | En SQLAlchemy 2.x, toutes les colonnes doivent utiliser `Mapped[T]`. Les annotations simples (`dict`, `Optional[dict]`) provoquent une `MappedAnnotationError`. Erreur rencontrée et corrigée. | Leçon apprise | Documenté |
| Pattern `await db.execute(...)` | Les méthodes de résultat (`.all()`, `.scalars()`, `.first()`) doivent être appelées APRÈS le `await`, pas chaînées avant. Plusieurs erreurs rencontrées et corrigées. | Leçon apprise | Documenté |
| Event loop pytest-asyncio | Les tests nécessitent `asyncio_default_test_loop_scope=session` car l'engine SQLAlchemy est créé au niveau module. | Contrainte acceptée | Accepté |

### 18.10 Synthèse — actions par priorité

| Priorité | Points à traiter |
|---|---|
| **Pré-pilote** | `GERER_JOUEURS` dans la matrice · Quotas IA · Divergence ZG-2 · Tests MinIO réels |
| **À valider** (décisions métier) | Retrait permission par défaut · Composition active · Verrouillage · Formule charge · Auto-transition · Transitions terminales · MàJ charge · `poste_groupe` · Poids 25% · Poids relatifs · Permission évaluation · Radar sur validées uniquement |
| **À traiter / résoudre** | Doublon évaluation entrainement (UNIQUE) · Motif d'annulation (colonne) |
| **V1** | Rotation refresh tokens · Invitation email · Filtrage par équipe · Permission matrices · Magic number · OCR · IAM MinIO |
| **Post-pilote** | Pattern repository · DeepSeek async · Invalidation fine · Analyse asynchrone · Données médicales PDF |
| **Accepté / Documenté** | Type INET · Poids figés · Permissions match simplifiées · PDF basique · Synthèse sans IA · Leçons SQLAlchemy · Event loop tests |
|---|---|---|
| `poste_groupe` absent de `players` | Fourni dans la requête d'évaluation pour le V0. Amélioration : l'ajouter à `players`. | À valider |
| Poids par défaut (fallback) | 25 % chacun, non figés dans les docs. | À valider |
| Poids relatifs | La somme n'est pas contrainte à 100 (renormalisation au calcul). | À valider |
| Permission de saisie évaluation | Utilise `MODIFIER_MATCH` (pas de permission dédiée `EVALUER_MATCH`). | À valider |
| Gestion des matrices | Utilise `GERER_PARAMETRES_CLUB`. Une permission dédiée pourrait être ajoutée. | Post-pilote |
| Modification d'évaluation | Recalcule avec les poids FIGÉS du snapshot (jamais avec une matrice modifiée entre-temps). Conforme à « pas de recalcul rétroactif silencieux ». | Accepté |

### 18.6 Module IA (Phase 5)

| Point | Détail | Priorité |
|---|---|---|
| Appel DeepSeek synchrone | Pas en tâche de fond. Choix pragmatique pour le pilote. Mode async + polling en amélioration. | Post-pilote |
| `PARSE_UPLOADED_SESSION` | Enregistré mais inactif tant que le module fichiers n'est pas livré. | Bloqué par module fichiers |
| Invalidation `OUTDATED` | Simplifiée (à chaque nouvelle pré-génération). L'invalidation fine « si les données changent » est un raffinement. | Post-pilote |
| Permissions « accès au match » | Simplifiées en membership club pour `SUGGEST_LINEUP` / `PREPARE_PRE_MATCH`. | Accepté |
| Filtrage fin par permission | Le contexte est isolé par club mais pas filtré par permission individuelle. Sûr par construction (pas de données médicales dans le contexte V0). À documenter. | À documenter |
| Quotas d'appels IA | 100/club/jour non implémentés. À ajouter avant le pilote si besoin. | Pré-pilote |

### 18.7 Module fichiers (Phase 6)

| Point | Détail | Nature | Priorité |
|---|---|---|---|
| Divergence ZG-2 (stockage) | MinIO auto-hébergé (S3-compatible) utilisé au lieu du stockage local simple prévu par ZG-2. À valider et à documenter dans `DECISIONS_FIGEES.md` comme amendement. | Décision à valider | Pré-pilote |
| Validation par magic number | Non implémentée (extension + MIME uniquement). Plus robuste en V1. | Amélioration sécurité | V1 |
| OCR images | JPEG/PNG stockés mais non analysés en texte (pas d'OCR dans le V0). | Fonctionnalité manquante | V1 |
| Isolation MinIO | Le préfixe `{club_id}/` est une organisation, pas une sécurité. L'isolation réelle est garantie par le backend. Des politiques IAM MinIO pourraient renforcer cela. | Amélioration sécurité | V1 |
| Tests MinIO réels | Les tests mockent le stockage. Une intégration réelle avec MinIO doit être validée manuellement avant le pilote. | À tester | Pré-pilote |
| Analyse synchrone | L'appel IA à l'upload peut prendre jusqu'à 60 s. Acceptable pour le pilote ; un mode asynchrone est une amélioration. | Amélioration | Post-pilote |

### 18.8 Synthèse — actions par priorité

| Priorité | Points à traiter |
|---|---|
| **Pré-pilote** | `GERER_JOUEURS` dans la matrice · Quotas IA · Divergence ZG-2 · Tests MinIO réels |
| **À valider** (décisions métier) | Retrait permission par défaut · Composition active · Verrouillage · Formule charge · Auto-transition · Transitions terminales · MàJ charge · `poste_groupe` · Poids 25% · Poids relatifs · Permission évaluation |
| **À traiter / résoudre** | Doublon évaluation entrainement (UNIQUE) · Motif d'annulation (colonne) |
| **V1** | Rotation refresh tokens · Invitation email · Filtrage par équipe · Permission matrices · Magic number · OCR · IAM MinIO |
| **Post-pilote** | Pattern repository · DeepSeek async · Invalidation fine · Analyse asynchrone |
| **Accepté** | Type INET · Poids figés · Permissions match simplifiées |
---

*Fin du document — Analystaff — Roadmap & idées*