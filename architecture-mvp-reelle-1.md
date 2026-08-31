Voici le fichier **`architecture-mvp-reelle.md`** complet, aligné sur `DECISIONS_FIGEES.md`.

```md
# Architecture MVP — Analystaff

Ce document est aligné sur `DECISIONS_FIGEES.md`.
En cas de contradiction, `DECISIONS_FIGEES.md` fait foi.
Ce document décrit la mise en œuvre technique du MVP. Il ne contient que des éléments cohérents avec les décisions validées.

---

## 1. Nom du projet

**Analystaff**

Une seule orthographe partout :
- code ;
- base de données ;
- domaine ;
- marque ;
- documentation ;
- repository ;
- variables d'environnement ;
- fichiers Docker.

---

## 2. Principe directeur

Monolithe modulaire.
Pas de microservices pour le MVP.

Un seul projet FastAPI, structuré en modules par domaine métier. Chaque module peut être extrait en service séparé plus tard si le trafic ou l'équipe le justifie, mais rien ne l'exige pour un MVP testé par des clubs pilotes.

Structure cible :

app/
├── api/
│   └── v1/
├── auth/          # JWT, RBAC, gestion des rôles, permissions
├── users/         # Comptes utilisateurs, invitations, cycle de vie
├── clubs/         # Clubs, équipes, niveaux, forfaits, saisons
├── players/       # Joueurs, profil structuré, import CSV
├── matches/       # Matchs, compositions, remplacements, plateau tactique
├── training/      # Séances d'entraînement, évaluations post-entraînement
├── planning/      # Plans de travail, calendrier, synthèse avant-match
├── evaluations/   # Notes par pilier, calcul note globale pondérée
├── ai/            # Assistant IA actif V0 : boutons métier, templates, DeepSeek
├── files/         # Upload de fichiers, stockage, permissions
├── audit/         # Logs d'actions critiques, traçabilité
├── notifications/ # Placeholder V1
├── billing/       # Placeholder V1
└── core/          # Config, DB, sécurité partagée, erreurs, timezone
```

---

## 3. Stack confirmée

| Couche | Choix | Statut |
|---|---|---|
| Backend | FastAPI (Python 3.11+) | Confirmé |
| Base de données | PostgreSQL | Confirmé |
| Frontend | Next.js 14 (TypeScript) | Confirmé |
| État frontend | Zustand | Confirmé |
| Auth | JWT + RBAC dynamique | Confirmé |
| IA texte | DeepSeek API | Actif V0 comme assistant |
| Paiement | Wave / Orange Money | V1 |
| Notifications | In-app | V1 |
| Redis | Optionnel | Non requis par défaut |
| Hébergement | Serveur Dell perso (Ubuntu) | Confirmé |
| Conteneurisation | Docker + Docker Compose | Confirmé |
| Reverse proxy | Nginx + Certbot (HTTPS) | Confirmé |

Ce qui n'est pas dans ce tableau n'est pas requis pour le MVP.
Ne pas introduire : Vault, Consul, Kafka, Prometheus/Grafana, HAProxy, réplication PostgreSQL complexe, service mesh, infrastructure GPU dédiée.

---

## 4. API versionnée

Toutes les routes publiques sont exposées sous :

/api/v1/

Exemples :
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
GET    /api/v1/clubs
GET    /api/v1/clubs/{club_id}/teams
GET    /api/v1/clubs/{club_id}/players
POST   /api/v1/clubs/{club_id}/players/import-csv
POST   /api/v1/clubs/{club_id}/matches
GET    /api/v1/clubs/{club_id}/matches/{match_id}
POST   /api/v1/clubs/{club_id}/matches/{match_id}/lineup
PUT    /api/v1/clubs/{club_id}/matches/{match_id}/lineup/validate
POST   /api/v1/clubs/{club_id}/matches/{match_id}/evaluations
POST   /api/v1/clubs/{club_id}/training/sessions
POST   /api/v1/clubs/{club_id}/training/sessions/{id}/evaluations
POST   /api/v1/clubs/{club_id}/planning/work-plans
POST   /api/v1/clubs/{club_id}/ai/actions/{action_key}
POST   /api/v1/clubs/{club_id}/files/upload
GET    /api/v1/clubs/{club_id}/staff
POST   /api/v1/clubs/{club_id}/staff/invite
PUT    /api/v1/clubs/{club_id}/staff/{user_id}/permissions

Objectif :
- permettre des évolutions sans casser le frontend ;
- faciliter les futurs changements ;
- préparer les clients mobiles ou intégrations futures.

---

## 5. Rôles des modules

### `auth`
- JWT (courte durée) ;
- refresh token sécurisé ;
- login ;
- rate limiting sur login ;
- hachage des mots de passe (bcrypt ou argon2) ;
- gestion des rôles ;
- vérification des permissions côté backend ;
- supervision hiérarchique.

### `users`
- comptes utilisateurs ;
- préférences utilisateur ;
- invitations (création, acceptation, expiration, révocation) ;
- cycle de vie : actif, suspendu, parti ;
- départ d'un membre ;
- transfert du rôle coach principal ;
- archivage des données du club.

### `clubs`
- clubs ;
- niveaux (amateur, semi-pro, pro) ;
- forfaits (structure de rôles, pas paiement dans V0) ;
- équipes ;
- saisons ;
- paramètres club ;
- table niveau → rôles disponibles.

### `players`
- joueurs ;
- identité de base ;
- profil structuré par sections ;
- données physiques (table dédiée) ;
- données médicales (table dédiée) ;
- import CSV ;
- cycle de vie joueur : actif, blessé, suspendu, parti, archivé.

### `matches`
- matchs : création, statut, compétition, adversaire, domicile/extérieur ;
- compositions : brouillon, validation ;
- plateau tactique / terrain virtuel ;
- formations prédéfinies ;
- placement libre des joueurs ;
- remplacements avec motif ;
- validation finale par le coach.

### `training`
- séances d'entraînement : création, planification, statut ;
- évaluation post-séance ;
- assiduité (présent / absent / retard) ;
- charge perçue (RPE 1-10) ;
- notes par pilier optionnelles ;
- alimentation de la charge de travail du profil joueur.

### `planning`
- plans de travail hebdomadaires / mensuels ;
- association de séances à un plan ;
- objectifs par séance ;
- suivi prévu vs réalisé ;
- synthèse avant-match basée sur les données de la semaine.

### `evaluations`
- évaluations par pilier (match et entraînement) ;
- notes 0 à 10 ;
- pondération par poste / groupe de poste ;
- snapshot de pondération dans chaque évaluation globale ;
- calcul note globale ;
- historisation ;
- pas de recalcul rétroactif silencieux.

### `ai`
- boutons métier (pas de prompt libre) ;
- templates de prompts versionnés ;
- construction de contexte selon permissions ;
- appels DeepSeek côté backend ;
- réponses structurées et validées ;
- suggestions exploitables (cartes, listes) ;
- feedback coach (accepter / modifier / rejeter) ;
- pré-génération simple basée sur le calendrier ;
- fallback si DeepSeek indisponible ;
- upload de séance du jour (optionnel) ;
- aide à la suggestion de composition.

### `files`
- upload de fichiers ;
- formats acceptés : PDF, TXT, DOCX, JPEG, PNG ;
- taille maximale configurable (défaut 10 Mo) ;
- stockage sécurisé ;
- association aux séances / matchs / contexte ;
- permissions de lecture strictes ;
- analyse IA uniquement si autorisé.

### `audit`
- logs d'actions critiques ;
- connexion, création, modification, suppression ;
- consultation de données sensibles ;
- changement de permission ;
- invitation, révocation ;
- validation de composition ;
- acceptation / modification / rejet suggestion IA ;
- upload de fichier ;
- transfert de rôle coach.

### `notifications`
Placeholder V1.
Prévu :
- centre de notifications in-app ;
- badges ;
- rappels ;
- suggestions prêtes.

Dans le V0 : les informations importantes sont affichées à l'ouverture des écrans concernés.

### `billing`
Placeholder V1.
Prévu :
- abonnements ;
- paiement Wave / Orange Money ;
- statut payé / impayé ;
- limites par forfait ;
- suspension éventuelle ;
- récupération ou export des données.

Dans le V0 : phase pilote gratuite, aucun paiement requis.

### `core`
- configuration ;
- connexion base de données ;
- erreurs standardisées ;
- sécurité partagée ;
- logging structuré ;
- timezone (Africa/Dakar) ;
- healthcheck API ;
- gestion des secrets ;
- isolation par club_id.

---

## 6. Scope du MVP V0

### Fonctionnalités métier incluses

**Bloc Match :**
- gestion club, équipes, effectif, staff ;
- rôles filtrés par niveau (amateur / semi-pro / pro) ;
- permissions dynamiques ;
- supervision hiérarchique du coach principal ;
- import CSV joueurs ;
- création de match ;
- composition ;
- remplacements avec motif ;
- plateau tactique / terrain virtuel ;
- formations prédéfinies ;
- placement libre des joueurs ;
- notation 4 piliers post-match ;
- calcul pondéré automatique ;
- tableau de bord ;
- radar joueur ;
- export PDF basique ;
- offline simple ;
- contexte de saisie.

**Bloc Entraînement :**
- création de séances d'entraînement ;
- planification hebdomadaire des séances ;
- évaluation post-entraînement par le staff ;
- critères : 4 piliers + assiduité (présent / absent / retard) + charge perçue (RPE 1-10) ;
- alimentation du champ « charge de travail » du profil joueur ;
- vue calendrier des activités.

**Bloc Planification / Schémas de travail :**
- création de plans de travail hebdomadaires / mensuels ;
- association de séances à un plan de travail ;
- objectifs par séance (physique, technique, tactique, mental) ;
- suivi prévu vs réalisé ;
- synthèse avant-match basée sur les données de la semaine.

**Bloc Profil joueur :**
- structure par sections (identité, sportif, physique, médical) ;
- alimentation réelle des données physiques via les entraînements ;
- historique des charges de travail.

**Bloc IA :**
- assistant IA via boutons métier ;
- suggestions IA non imposées ;
- feedback coach sur les suggestions ;
- pré-génération simple basée sur le calendrier ;
- upload optionnel de la séance du jour ;
- aide à la suggestion de composition de match.

**Bloc Qualité :**
- maintenabilité du code ;
- code commenté ;
- tests automatisés ;
- CI/CD ;
- modèle de données complet ;
- règles métier détaillées ;
- matrice de permissions ;
- audit et traçabilité ;
- sécurité applicative ;
- conformité CDP ;
- gestion des erreurs ;
- IA opérationnelle sécurisée ;
- upload de fichiers sécurisé ;
- UX/UI par rôle ;
- import/export robuste ;
- opérations et infrastructure ;
- gestion du temps et timezone ;
- API versionnée ;
- gestion des utilisateurs et invitations ;
- onboarding ;
- documentation utilisateur ;
- documentation technique ;
- definition of done ;
- phase pilote gratuite.

### Non inclus dans le V0

- paiement ;
- facturation ;
- centre de notifications in-app ;
- notifications email / SMS / WhatsApp ;
- ML avancé ;
- prédiction lourde ;
- fine-tuning ;
- tactique IA temps réel ;
- application mobile native ;
- API publique ;
- multi-équipes avancé.

---

## 7. Plateau tactique

Le module match inclut un plateau tactique 2D.

Données stockées :
- formation choisie ;
- disposition personnalisée (oui/non) ;
- coordonnées des joueurs (normalisées 0 à 100) ;
- rôle tactique ;
- statut titulaire / remplaçant ;
- capitaine ;
- gardien ;
- statut brouillon / validé ;
- horodatage.

Formations prédéfinies minimales :
- 4-4-2 ;
- 4-3-3 ;
- 4-2-3-1 ;
- 4-1-4-1 ;
- 3-5-2 ;
- 3-4-3 ;
- 5-3-2 ;
- 5-4-1.

Règles :
- formations prédéfinies comme point de départ ;
- placement libre des joueurs ;
- drag & drop ;
- validation coach ;
- suggestion IA possible mais non imposée ;
- terrain en vue 2D, pas de 3D dans le V0.

---

## 8. IA opérationnelle

Le module IA est actif dès le V0.
Il fonctionne par actions métier.
Pas de champ de prompt libre dans le parcours principal.

Flow type :

1. L'utilisateur clique sur un bouton métier.
2. Le frontend appelle une action IA via l'API.
3. Le backend vérifie les permissions de l'utilisateur.
4. Le backend collecte uniquement les données autorisées.
5. Le backend construit un prompt depuis un template versionné.
6. DeepSeek est appelé (asynchrone / tâche de fond).
7. La réponse est validée structurellement.
8. L'interface affiche une suggestion exploitable.
9. Le coach accepte, modifie ou rejette.
10. Le feedback est stocké.
```

Actions IA minimales V0 :

SUGGEST_TRAINING_SESSION
SUGGEST_LINEUP
ANALYZE_FATIGUE
SUMMARIZE_WEEK
PARSE_UPLOADED_SESSION
ADAPT_WORKLOAD
PREPARE_PRE_MATCH
ORGANIZE_WEEK
BALANCE_WORKLOAD
```

Règles :
- appels backend uniquement ;
- données filtrées par permission ;
- l'IA ne reçoit jamais des données que l'utilisateur n'a pas le droit de voir ;
- fallback si API indisponible ;
- réponses structurées ;
- suggestion jamais imposée ;
- pré-génération simple possible selon calendrier ;
- les fichiers uploadés sont traités comme contenu non fiable ;
- timeout et retry limité.

Pré-génération :
- basée sur le calendrier des matchs et séances ;
- si les données changent après pré-génération, la suggestion est marquée obsolète ou régénérée ;
- les notifications étant en V1, les suggestions prêtes sont affichées à l'ouverture de l'application ;
- les permissions sont respectées lors de la pré-génération.

---

## 9. Offline

Version retenue pour le MVP :
- le frontend conserve localement les actions non synchronisées ;
- queue locale simple ;
- synchronisation au retour du réseau ;
- bouton « réessayer » ou tentative automatique ;
- pas de système distribué complexe ;
- pas de RabbitMQ ;
- pas de Kafka ;
- pas de système d'événements complexe.

Contexte de saisie tracé :
- saisie en direct au stade ;
- saisie à froid après coup ;
- saisie hors ligne puis synchronisée ;
- horodatage réel de saisie ;
- horodatage d'enregistrement en base ;
- type d'événement : match, entraînement, planification.

---

## 10. Base de données

Tables principales V0 :

clubs
seasons
teams
users
invitations
staff_members
roles
roles_available_by_level
permissions
user_permissions
players
physical_profiles
medical_records
matches
formations
match_tactical_setups
lineup_players
substitutions
training_sessions
training_evaluations
work_plans
work_plan_items
evaluations
evaluation_pillars
weighting_matrices
weighting_snapshots
ai_templates
ai_suggestions
ai_feedback
uploaded_files
audit_logs
user_preferences

Prévu V1 :

notifications
billing_subscriptions
payments

Règles :
- Alembic pour toutes les migrations dès le premier commit ;
- pas de modification manuelle du schéma en production ;
- index sur clés étrangères utilisées en filtre/jointure ;
- isolation par `club_id` partout ;
- soft delete ou archivage pour suppressions sensibles ;
- historisation des pondérations (snapshot dans chaque évaluation globale) ;
- les données sensibles sont séparées dans des tables dédiées ;
- contexte de saisie tracé (hors ligne, horodatage réel, type événement).

---

## 11. Sécurité

Backend :
- isolation stricte par club ;
- vérification systématique des permissions côté backend ;
- jamais confiance au frontend seul ;
- protection contre les accès IDOR ;
- validation des entrées ;
- secrets stockés hors git ;
- rate limiting sur login ;
- JWT courte durée ;
- refresh token sécurisé ;
- hachage robuste des mots de passe ;
- uploads contrôlés ;
- protection contre les injections.

IA :
- pas de données non autorisées dans les prompts ;
- traitement des fichiers uploadés comme non fiables ;
- réponses validées structurellement ;
- fallback sans IA ;
- un utilisateur ne peut pas interroger l'IA sur des données qu'il n'a pas le droit de voir.

Audit :
- chaque action critique journalisée ;
- utilisateur, club, action, type ressource, identifiant, date, résultat ;
- accès sensibles tracés sans stocker le contenu sensible dans les logs ;
- conservation limitée et sécurisée.

---

## 12. Conformité CDP

Cadre :
- loi sénégalaise n°2008-12 ;
- autorité de contrôle : CDP.

Obligations produit :
- consentement explicite pour collecte de données de santé ;
- consentement du représentant légal pour mineurs si nécessaire ;
- minimisation des données ;
- finalité claire ;
- durée de conservation définie ;
- droit d'accès ;
- droit de rectification ;
- droit à l'effacement ;
- export contrôlé ;
- preuve de consentement.

Statut :
- non bloquant pour le développement ;
- bloquant avant mise en production réelle avec données sensibles.

---

## 13. Gestion du temps et timezone

Règles :
- stockage des dates en UTC ;
- affichage en fuseau horaire local du club ;
- fuseau par défaut : Africa/Dakar ;
- horodatage réel de saisie conservé ;
- distinction entre date locale et UTC ;
- prise en compte des matchs, séances et suggestions anticipées.

---

## 14. Gestion des utilisateurs et invitations

Cycle de vie complet :
- création de compte ;
- invitation par coach ou administrateur autorisé ;
- acceptation ;
- expiration ;
- révocation ;
- départ d'un membre ;
- transfert du rôle coach principal ;
- archivage des données du club.

Règles :
- les données appartiennent au club, pas au coach ;
- si un coach quitte le club, le club conserve l'historique ;
- le transfert de rôle coach doit être possible ;
- un membre parti ne doit plus accéder aux données ;
- ses actions passées peuvent rester tracées.

---

## 15. Import / export

### Import CSV
- format documenté ;
- colonnes obligatoires définies ;
- validation ligne par ligne ;
- gestion des erreurs ;
- détection de doublons ;
- rapport d'import ;
- création ou mise à jour contrôlée.

### Export PDF
Contenus possibles :
- profil joueur ;
- synthèse match ;
- composition ;
- radar joueur ;
- rapport d'entraînement ;
- synthèse hebdomadaire.

Règles :
- l'export respecte les permissions ;
- un utilisateur ne peut pas exporter des données qu'il ne peut pas voir ;
- les données médicales ne sont exportables que si autorisées.

---

## 16. Upload de fichiers

- formats acceptés : PDF, TXT, DOCX, JPEG, PNG ;
- taille maximale configurable (défaut recommandé : 10 Mo) ;
- stockage sécurisé ;
- fichier associé au club, à la séance ou au contexte ;
- permissions strictes de lecture ;
- analyse IA uniquement si l'utilisateur a le droit d'accéder au contenu ;
- fichier traité comme contenu non fiable par défaut ;
- si non exploitable, le système le signale proprement.

---

## 17. UX/UI

Principes :
- mobile-first ;
- réseau faible ;
- utilisateurs non techniques ;
- boutons métier clairs ;
- pas de jargon technique ;
- pas de prompt libre ;
- navigation simple ;
- états vides gérés ;
- erreurs compréhensibles ;
- chargements visibles ;
- confirmations explicites.

Parcours par rôle :
- coach principal ;
- adjoint ;
- préparateur physique ;
- staff médical ;
- dirigeant / intendant autorisé.

Chaque interface est une projection des permissions de l'utilisateur.

---

## 18. Tests et CI/CD

Tests obligatoires :
- tests unitaires ;
- tests d'intégration ;
- tests de permissions ;
- tests d'isolation par club ;
- tests de calcul pondéré ;
- tests de snapshot de pondération ;
- tests de composition ;
- tests d'entraînement ;
- tests de planification ;
- tests d'import ;
- tests d'erreurs ;
- tests de fallback IA ;
- tests critiques offline ;
- tests de sécurité.

CI/CD :
- lint automatique ;
- tests automatiques ;
- build automatique ;
- vérification avant merge ;
- déploiement maîtrisé.

---

## 19. Qualité du code

Conventions :
- identifiants de code en anglais ;
- commentaires métier et documentation en français ;
- code lisible et sobre ;
- fonctions courtes ;
- modules cloisonnés ;
- pas de logique métier dans les contrôleurs seuls ;
- endpoints minces ;
- logique métier dans services ;
- validation avec schémas Pydantic ;
- pas de code mort ;
- commentaires expliquant le pourquoi des règles sensibles.

Outils :
- Python : Ruff, Black, isort, type hints ;
- TypeScript : ESLint, Prettier, strict mode ;
- formatage automatique ;
- lint obligatoire.

Documentation code :
- docstrings sur fonctions publiques ;
- commentaires sur règles métier critiques ;
- commentaires sur permissions, sécurité, IA, pondération, CDP ;
- documentation des endpoints API.

---

## 20. Opérations et infrastructure

Infrastructure V0 :
- serveur personnel Dell ;
- Ubuntu ;
- Docker ;
- Docker Compose ;
- Nginx ;
- HTTPS via Certbot ;
- PostgreSQL ;
- FastAPI ;
- Next.js.

Exigences :
- environnements séparés : développement, test, production ;
- variables d'environnement ;
- secrets non commités ;
- logs structurés ;
- monitoring minimal ;
- healthcheck API ;
- sauvegardes externalisées ;
- test de restauration ;
- déploiement reproductible ;
- rollback possible.

---

## 21. Onboarding et documentation

Onboarding :
- guide de démarrage ;
- tutoriels courts ;
- exemples de séances ;
- exemples de compositions ;
- aide contextuelle ;
- FAQ ;
- messages explicatifs pour les coachs non techniques.

Documentation utilisateur :
- guide coach principal ;
- guide adjoint ;
- guide préparateur physique ;
- guide staff médical ;
- guide dirigeant / intendant ;
- FAQ ;
- cas d'usage ;
- explication des permissions ;
- explication des suggestions IA.

Documentation technique :
- README ;
- installation ;
- configuration ;
- variables d'environnement ;
- migrations ;
- tests ;
- déploiement ;
- architecture ;
- API ;
- conventions de code ;
- règles de contribution.

---

## 22. Definition of Done

Une fonctionnalité est considérée terminée si :
- le code est écrit ;
- le code est lisible ;
- le code est commenté si nécessaire ;
- les règles métier sont respectées ;
- les permissions sont vérifiées côté backend ;
- les tests critiques sont écrits ;
- les erreurs sont gérées ;
- l'interface est utilisable ;
- la documentation est mise à jour ;
- la décision est tracée si elle change le produit ;
- la fonctionnalité est compréhensible par un autre développeur.

---

## 23. V1 — après phase pilote

Fonctionnalités prévues :
- paiement Wave / Orange Money ;
- abonnements ;
- statut payé / impayé ;
- limites par forfait ;
- suspension éventuelle ;
- notifications in-app ;
- centre de notifications ;
- badges ;
- rappels simples ;
- suggestions IA prêtes notifiées ;
- amélioration de la pré-génération IA ;
- personnalisation plus avancée ;
- rapports plus riches.

---

## 24. V2+ — évolutions futures

- notifications email / SMS / WhatsApp ;
- ML avancé ;
- prédiction de forme ;
- prédiction de blessure ;
- recommandation tactique avancée ;
- fine-tuning ;
- API publique ;
- intégrations externes ;
- application native éventuelle ;
- multi-équipes avancé.

---

## 25. Phase pilote gratuite

Le V0 est fourni gratuitement aux coachs et clubs pilotes.

Règles :
- aucun paiement requis ;
- aucun paywall ;
- les forfaits servent à structurer les rôles et le périmètre fonctionnel ;
- la gratuité est assumée comme phase de validation produit ;
- le passage à la version payante sera progressif et communiqué.

---

## 26. Règle de discipline

Ce document ne doit pas contredire `DECISIONS_FIGEES.md`.

Si une nouvelle décision est validée :
1. elle est ajoutée dans `DECISIONS_FIGEES.md` avec date ;
2. ce document est mis à jour ensuite ;
3. aucune décision n'est modifiée silencieusement.
