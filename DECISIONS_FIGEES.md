# Analystaff — Décisions figées

Ce fichier fait foi. En cas de contradiction avec un autre document du projet, c'est celui-ci qui a raison — il reflète les choix explicitement validés, pas ce qu'un outil a généré automatiquement.

**Nature évolutive du document :** « figées » veut dire validées, pas définitives pour toujours. Chaque ajout ou changement de décision doit être documenté ici avec sa date, jamais silencieusement écrasé.

📎 **Documents compagnons :**

- `ROADMAP\_IDEES.md` — idées futures et questions non tranchées ;

- `analystaff-presentation.md` — vision produit ;

- `architecture-mvp-reelle.md` — mise en œuvre technique ;

- `SCHEMA\_SQL.md` — schéma de base de données définitif ;

- `MATRICE\_PERMISSIONS\_ET\_REGLES\_METIER.md` — permissions et règles métier ;

- `SPECIFICATIONS\_IA\_ET\_PROMPTS.md` — spécifications IA ;

- `STANDARDS\_DEVELOPPEMENT.md` — standards de développement ;

- `staff\_technique\_football.md` — référence métier sur les staffs.


## 1. Nom

**Analystaff** — une seule orthographe, partout : code, base de données, domaine, marque. Contraction d'*analyst* et de *staff* : l'analytique au service du staff, pas d'un coach isolé.


## 2. Paradigme — plateforme continue (04/08/2026)

Analystaff n'est pas un simple outil de notation post-match. C'est une **plateforme de gestion continue de la performance**, utilisée par le staff tout au long de la semaine :

- **Avant un entraînement** : planifier les séances, définir les objectifs ;

- **Après un entraînement** : évaluer les joueurs, suivre la charge ;

- **Avant un match** : synthétiser la semaine, préparer la composition ;

- **Après un match** : noter, analyser, documenter les décisions.

Le coach reste toujours le décideur final. L'IA suggère, jamais n'impose.


## 3. Scope V0 élargi (04–05/08/2026)

| Module | Contenu | Date de validation |
| - | - | - |
| Club & effectif | Gestion club, équipes, staff, joueurs, import CSV | Initial |
| Match | Création match, composition, remplacements avec motif | Initial |
| Évaluations match | 4 piliers + note globale pondérée | Initial |
| Entraînement | Planification des séances, évaluation post-séance | 04/08/2026 |
| Planification | Plans de travail hebdomadaires / mensuels | 04/08/2026 |
| Synthèse avant-match | Préparation du match à partir des données de la semaine | 04/08/2026 |
| Plateau tactique | Terrain virtuel 2D, formations prédéfinies, placement libre | 04/08/2026 |
| Assistant IA | Boutons métier (DeepSeek), zéro prompt libre | 04/08/2026 |
| Pré-génération IA | Suggestions préparées à l'avance (simple) | 05/08/2026 |
| Upload de fichiers | Séance du jour (PDF, TXT, DOCX, JPEG, PNG) | 05/08/2026 |
| Historisation pondérations | Snapshot des poids utilisés dans chaque évaluation | 05/08/2026 |
| Tableau de bord | Synthèses et radars par joueur | Initial |
| Export PDF | Export basique | Initial |
| Phase pilote | Déploiement gratuit auprès de clubs testeurs | 05/08/2026 |

**Reporté en V1 :** paiement Wave / Orange Money, notifications (voir section 16).


## 4. Offline / contexte de saisie

- On capture la donnée même hors connexion (queue locale simple, sync au retour du réseau — pas de système distribué complexe pour le V0).

- On conserve le **contexte réel de la saisie** (en direct au stade vs. à froid après coup), car cette information a de la valeur pour le futur entraînement du modèle IA.

Le schéma SQL doit tracer :

- si la saisie a été faite hors ligne puis synchronisée ;

- l'horodatage réel de la saisie (pas seulement l'horodatage d'enregistrement en base).


## 5. Forfaits & structure du staff par niveau

Trois forfaits (**amateur, semi-pro, pro**) — pas seulement une différence de prix ou de fonctionnalités, mais une **différence de structure de staff**.

| Niveau | Rôles typiques disponibles |
| - | - |
| Amateur | Coach principal (multi-casquettes), adjoint, dirigeant/intendant (souvent bénévole), soigneur improvisé |
| Semi-pro | Coach principal, adjoint, coach des gardiens (temps partiel), préparateur physique, analyste vidéo (souvent cumulé), kiné (présence ciblée), médecin référent (externe), manager général, intendant en chef |
| Pro | Manager, adjoints multiples, coach des gardiens, coachs spécifiques par poste, préparateur physique, data scientist / analyste performance, analyste vidéo, scouts, staff médical complet, nutritionniste, psychologue du sport, kit manager |

**Conséquence technique :** la liste des rôles proposée à un club est filtrée selon son niveau (table d'association niveau → rôles disponibles), pas une liste plate universelle.


## 6. Permissions

- **Dynamiques** et pilotées par le coach principal, jamais codées en dur.

- Chaque rôle a un jeu de permissions **par défaut**.

- Le coach principal peut accorder ou retirer des permissions à une personne précise, au-delà de son rôle par défaut.

- Une autorisation ouvre des droits précis. Elle ne clone jamais l'interface du coach.


## 7. Hiérarchie stricte et à sens unique (03/08/2026)

- Le coach principal a une **vue de supervision totale** : il voit et contrôle ce que font les membres de son staff.

- Chaque membre du staff a un périmètre strictement limité à ce que le coach lui a explicitement ouvert.

- Cette relation n'est **jamais réciproque** : un membre du staff ne peut jamais voir les informations d'un autre membre, ni celles du coach.

**Implication technique :** notion explicite de supervision hiérarchique côté backend.


## 8. Profil joueur — structuré par sections (03/08/2026, V0)

| Section | Contenu | Accès par défaut |
| - | - | - |
| Identité | Photo, nom, poste, numéro, date de naissance | Tout le staff du club |
| Sportif | Historique matchs, radar, notes, statut titulaire/remplaçant | Staff avec droit de consultation |
| Physique / Morphologie | Taille, poids, IMC, charge de travail | Préparateur physique + coach principal (+ exceptions) |
| Médical | Blessures, dossier, contre-indications | Staff médical + coach principal (+ exceptions) |

**Conséquence technique :** données sensibles dans des tables séparées (`physical\_profiles`, `medical\_records`), chacune portant sa propre permission d'accès. La charge de travail est alimentée en continu par les évaluations d'entraînement.


## 9. Module entraînement et planification (04/08/2026)

Inclus dans le V0 :

- planification des séances (objectifs, exercices, charge prévue) ;

- évaluation post-séance : assiduité (présent / absent / retard), charge perçue (RPE 1–10), notes par pilier optionnelles, observations ;

- plans de travail hebdomadaires et mensuels (prévu vs réalisé) ;

- synthèse avant-match construite à partir des données de la semaine.


## 10. Plateau tactique (04/08/2026)

Inclus dans le V0 :

- terrain virtuel **2D uniquement**, coordonnées normalisées 0–100 ;

- formations prédéfinies : 4-4-2, 4-3-3, 4-2-3-1, 4-1-4-1, 3-5-2, 3-4-3, 5-3-2, 5-4-1 ;

- placement libre des joueurs (drag & drop) ;

- distinction titulaires / remplaçants ;

- sauvegarde en brouillon, **validation explicite** par le coach ;

- la formation est une aide, pas une contrainte — la disposition réelle fait foi.


## 11. Assistant IA — boutons métier (04/08/2026)

- L'IA est active **dès le V0** via DeepSeek API.

- Déclenchée uniquement par des **boutons métier** (« Préparer la séance de demain », « Suggérer une composition », « Analyser la fatigue », etc.).

- **Zéro champ de prompt libre** dans le parcours principal.

- Le backend construit le prompt à partir d'un template versionné et n'injecte que les données que l'utilisateur a le droit de voir.

- L'IA suggère. Le coach accepte, modifie ou rejette. Le feedback est systématiquement stocké.

- Aucune suggestion n'est jamais appliquée automatiquement.


## 12. Pré-génération IA simple (05/08/2026)

- Le système peut préparer certaines suggestions avant que l'utilisateur clique (ex. composition suggérée la veille d'un match).

- Invalidation (statut `OUTDATED`) si les données changent après pré-génération.

- Notifications absentes du V0 : les suggestions prêtes sont affichées à l'ouverture de l'application.


## 13. Upload de fichiers (05/08/2026)

- Le coach ou un membre autorisé peut uploader la séance du jour.

- Formats acceptés : PDF, TXT, DOCX, JPEG, PNG. Taille maximale : 10 Mo.

- Les fichiers sont traités comme **contenu non fiable**.

- Analyse via DeepSeek, soumise à validation par le coach avant réutilisation.


## 14. Historisation des pondérations (05/08/2026)

- Un **snapshot des poids utilisés** est stocké au moment de chaque calcul de note globale.

- Pas de recalcul rétroactif silencieux si la matrice de pondération change.

- Stockage double : colonnes `poids\_\*\_utilise` dans `evaluations` (accès rapide) + table `weighting\_snapshots` (audit).


## 15. Phase pilote gratuite (05/08/2026)

- Le V0 est déployé comme **pilote gratuit** auprès de coachs et clubs testeurs.

- Objectifs : valider l'usage réel, la pertinence des évaluations, la qualité des suggestions IA, l'adaptation aux contextes amateur / semi-pro / pro, et la simplicité sur mobile et réseau faible.

- Le V0 doit rester totalement utilisable sans paiement.


## 16. Reports en V1 — paiement et notifications (05/08/2026)

- **Paiement** : Wave (prioritaire) puis Orange Money. Absent du V0.

- **Notifications** : centre de notifications in-app en V1. Dans le V0, les informations importantes sont affichées à l'ouverture de l'application.


## 17. Zones grises résolues — infrastructure (05/08/2026)

### 17.1 Cache (ZG-1)

**Cache mémoire Python (in-process)** pour le V0. Redis n'est pas requis pour le V0 ; il pourra être introduit en V1 si un besoin prouvé apparaît (cache partagé multi-process, rate limiting distribué).

### 17.2 Stockage des fichiers uploadés (ZG-2)

**Stockage local sur le serveur Dell** dans un dossier dédié et sécurisé. La structure doit permettre une migration future vers un stockage objet (MinIO / S3) sans réécriture du module.

**Amendement (date du jour)** : l'implémentation retenue est **MinIO auto-hébergé sur le serveur Dell** (S3-compatible). Cela anticipe la migration vers S3 prévue par cette décision, sans réécriture future. Le backend utilise une abstraction `StorageBackend` permettant de swapper vers S3 ou un volume local sans modification du module fichiers.

### 17.3 Pool de connexions PostgreSQL (ZG-3)

**Pool SQLAlchemy configuré : 10 à 20 connexions, avec timeout.** Pas de PgBouncer pour le V0.

### 17.4 Rate limiting (ZG-4)

Deux lignes de défense :

- **Nginx** (`limit\_req`) en première ligne ;

- **slowapi** côté applicatif sur les endpoints sensibles (login, appels IA).

### 17.5 Refresh tokens (ZG-5)

**Refresh tokens stockés en base de données** (révocables). Access token JWT courte durée ; refresh token en cookie httpOnly, Secure, SameSite=Strict.

### 17.6 Scheduler de pré-génération IA (ZG-6)

**APScheduler**, intégré au processus FastAPI. Pas de Celery pour le V0.

### 17.7 Stockage des templates de prompts IA (ZG-7)

**Templates stockés en base de données** (table `ai\_templates`), versionnés.

### 17.8 Fallback DeepSeek (ZG-8)

**Fallback dynamique : règles métier simples (calculs)**, pas de réponses statiques pré-écrites. Le produit reste entièrement utilisable sans IA.


## 18. Zones grises résolues — métier (05/08/2026)

### 18.1 Périmètre équipe vs club — pilote (ZG-12)

Pour la phase pilote : **1 abonnement = 1 équipe**. Le nombre d'équipes par club reste un levier de forfait potentiel pour la suite (voir `ROADMAP\_IDEES.md`).

### 18.2 Responsable Technique du Club (ZG-13)

**Pas inclus dans le V0.** À revisiter selon les retours des clubs pilotes.

### 18.3 Conservation des données sensibles (ZG-14)

**Conservation 3 ans après le départ du joueur, puis anonymisation.**

### 18.4 Joueurs mineurs (ZG-15)

**Consentement parental écrit obligatoire** : formulaire signé, scanné, stocké. Simplification éventuelle après la phase pilote.


## 19. Zones grises résolues — ops (05/08/2026)

### 19.1 Monitoring (ZG-16)

- **Healthcheck interne** (endpoint dédié) ;

- **Monitoring externe : Uptime Robot** (gratuit) ;

- Logs structurés JSON. Pas de Prometheus / Grafana pour le V0.

### 19.2 Sauvegardes (ZG-17)

- Sauvegarde **quotidienne + hebdomadaire + mensuelle** ;

- **Externalisées** (hors serveur Dell) ;

- **Chiffrées** ;

- **Test de restauration régulier**.


## 20. Philosophie du MVP (03/08/2026)

Accepter un MVP plus riche que prévu initialement, et prendre le temps nécessaire pour bien le construire, plutôt que de sacrifier la qualité pour aller plus vite.

**Règle de discipline :** toute nouvelle idée reste bienvenue, mais une fois validée pour le V0, elle doit s'accompagner d'une estimation honnête de son impact sur le délai avant le lancement pilote — la décision de l'ajouter doit rester consciente, pas passive.


## 21. Stack

| Couche | Choix |
| - | - |
| Backend | FastAPI (Python 3.11+), monolithe modulaire |
| Base de données | PostgreSQL |
| Frontend | Next.js 14 (TypeScript) |
| État frontend | Zustand |
| Auth | JWT + RBAC dynamique |
| IA texte | DeepSeek API (active dès le V0) |
| Paiement | Wave (prioritaire) + Orange Money — **V1** |
| Hébergement | Serveur Dell perso (Ubuntu 22.04) + UPS |
| Conteneurisation | Docker + Docker Compose |
| Reverse proxy | Nginx + Certbot (HTTPS) |
| Rate limiting | Nginx + slowapi |
| Scheduler IA | APScheduler |


## 22. Architecture

**Monolithe modulaire** — un seul projet FastAPI, découpé en modules par domaine métier (`auth`, `clubs`, `players`, `matches`, `training`, `planning`, `evaluations`, `ai`, `files`, `audit`, `core`). Pas de microservices pour le MVP. Chaque module peut être extrait plus tard si le besoin le justifie.


## 23. Conformité CDP — points de vigilance

Les données médicales et physiques sont des catégories de données sensibles au regard de la loi sénégalaise n°2008-12 (CDP) :

- consentement explicite requis pour la collecte de données de santé ;

- joueurs mineurs : consentement du représentant légal (écrit, scanné — section 18.4) ;

- principe de minimisation : ne collecter que ce qui a un usage clair et déclaré ;

- conservation limitée : 3 ans après départ puis anonymisation (section 18.3).


## 24. Sujets reportés (non tranchés)

Les sujets frontend suivants font l'objet d'une discussion approfondie dédiée :

- **ZG-9** : client HTTP (fetch natif vs Axios vs TanStack Query) ;

- **ZG-10** : PWA et stratégie offline frontend ;

- **ZG-11** : bibliothèque de composants UI.

Sujet mis de côté (à reprendre quand souhaité) :

- intégration de l'agent IA de génération de prompts développé séparément.


## 25. Statut

| Décision | Statut |
| - | - |
| Nom (Analystaff) | ✅ |
| Paradigme plateforme continue | ✅ 04/08/2026 |
| Scope V0 élargi (entraînement, planification, plateau tactique) | ✅ 04/08/2026 |
| IA par boutons métier dès le V0 | ✅ 04/08/2026 |
| Pré-génération IA simple | ✅ 05/08/2026 |
| Upload fichiers | ✅ 05/08/2026 |
| Historisation pondérations | ✅ 05/08/2026 |
| Phase pilote gratuite | ✅ 05/08/2026 |
| Paiement / notifications reportés en V1 | ✅ 05/08/2026 |
| Offline / contexte de saisie | ✅ |
| Permissions dynamiques + hiérarchie à sens unique | ✅ |
| Forfaits liés à la structure de staff | ✅ |
| Profil joueur structuré par sections | ✅ |
| Cache mémoire in-process | ✅ 05/08/2026 |
| Stockage fichiers local | ✅ 05/08/2026 |
| Pool DB 10–20 connexions | ✅ 05/08/2026 |
| Rate limiting Nginx + slowapi | ✅ 05/08/2026 |
| Refresh tokens en base | ✅ 05/08/2026 |
| Scheduler APScheduler | ✅ 05/08/2026 |
| Templates IA en base | ✅ 05/08/2026 |
| Fallback DeepSeek dynamique | ✅ 05/08/2026 |
| Pilote : 1 abonnement = 1 équipe | ✅ 05/08/2026 |
| RTJ hors V0 | ✅ 05/08/2026 |
| Conservation 3 ans puis anonymisation | ✅ 05/08/2026 |
| Consentement parental écrit (mineurs) | ✅ 05/08/2026 |
| Monitoring healthcheck + Uptime Robot | ✅ 05/08/2026 |
| Sauvegardes quot./hebdo./mens. externalisées | ✅ 05/08/2026 |
| Frontend (client HTTP, PWA, UI) | ⏳ Reporté |


## 26. Amendement proposé — Interface multi-support (à dater au moment de ta validation)

L'interface Analystaff est responsive et couvre trois supports, chacun avec un layout complet et testé :

Téléphone : saisie rapide au stade, boutons métier, offline, évaluations ;

Tablette : plateau tactique, lecture du match, banc de touche ;

Ordinateur : préparation, rapports, imports CSV, exports PDF, supervision du staff.

La contrainte réseau faible s'applique aux trois supports.

Le mobile-first reste une méthode de conception (partir du plus contraint), mais aucun support n'est secondaire.


## 27. Mode MVP — Club unique par utilisateur (02/09/2026)

**Décision :** Pour le MVP, chaque utilisateur n'a qu'**un seul club**. Le multi-équipe est masqué mais le code reste compatible pour une activation future.

**Implémentation :**

- `POST /api/v1/auth/register` : crée automatiquement un club (nom personnalisé ou "Mon Club" par défaut)
- `GET /api/v1/auth/me` : retourne `club_id`, `club_nom`, `is_multi_club`
- Routes MVP : `/api/v1/ai/*`, `/api/v1/clubs/me/*` (pas de `club_id` dans l'URL)
- Routes API publique conservées : `/api/v1/clubs/{club_id}/...` (compatibilité future)

**Réactivation multi-équipe :** Ajouter un sélecteur de club côté frontend + utiliser les routes API publique existantes.
