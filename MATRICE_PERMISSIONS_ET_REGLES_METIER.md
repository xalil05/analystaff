```md
# Analystaff — Matrice de permissions et règles métier

Ce document détaille la matrice de permissions et les règles métier du V0 d'Analystaff.

**Référence absolue :** `DECISIONS_FIGEES.md`
En cas de contradiction entre ce document et `DECISIONS_FIGEES.md`, c'est `DECISIONS_FIGEES.md` qui fait foi.

**Règles fondamentales :**
- Les permissions sont **dynamiques**, pilotées par le coach principal.
- Elles ne sont **jamais** codées en dur.
- Chaque rôle possède un jeu de permissions par défaut.
- Le coach principal peut accorder ou retirer des permissions individuelles.
- Une autorisation ouvre des droits précis. Elle ne clone jamais l'interface du coach.

---

## 1. Matrice de permissions par défaut

La matrice suivante définit les accès par défaut. Des exceptions peuvent être accordées par le coach principal.

| Module | Coach principal | Adjoint | Préparateur physique | Staff médical | Dirigeant/intendant |
|---|:---:|:---:|:---:|:---:|:---:|
| Identité joueurs | ✅ | ✅ | ✅ | ✅ | Variable |
| Section sportive | ✅ | ✅ | Variable | Variable | Non par défaut |
| Section physique | ✅ | Variable | ✅ | Variable | Non |
| Section médicale | ✅ | Non | Variable | ✅ | Non |
| Matchs | ✅ | ✅ | Variable | Variable | Non |
| Composition | ✅ | Variable | Non par défaut | Non | Non |
| Plateau tactique | ✅ | Variable | Non par défaut | Non | Non |
| Entraînements | ✅ | Variable | ✅ | Variable | Variable |
| Planification | ✅ | Variable | ✅ | Non | Non |
| Suggestions IA | ✅ | Variable | Variable | Variable | Variable |
| Gestion staff | ✅ | Non | Non | Non | Non |
| Permissions | ✅ | Non | Non | Non | Non |
| Paramètres club | ✅ | Non | Non | Non | Variable |
| Audit / supervision | ✅ | Non | Non | Non | Non |

### 1.1 Légende

| Symbole | Signification |
|---|---|
| ✅ | Oui par défaut |
| Variable | Seulement si le coach l'autorise explicitement |
| Non par défaut | Non par défaut, mais peut être accordé par exception |
| Non | Non par défaut, accès réservé à des rôles spécifiques |

### 1.2 Règles de la matrice

- « Variable » signifie : seulement si le coach l'autorise explicitement.
- Les données médicales ne sont jamais ouvertes par défaut hors staff médical et coach principal.
- Les données physiques ne sont jamais ouvertes par défaut hors préparateur physique et coach principal.
- La gestion des permissions reste réservée au coach principal.
- La supervision reste réservée au coach principal.
- L'interface de chaque utilisateur est une projection de ses permissions.

---

## 2. Liste exhaustive des permissions

### 2.1 Permissions liées aux données sensibles

| Code | Libellé | Description |
|---|---|---|
| `VOIR_DONNEES_PHYSIQUES` | Voir les données physiques | Accès en lecture à la section physique/morphologie |
| `ECRIRE_DONNEES_PHYSIQUES` | Modifier les données physiques | Accès en écriture à la section physique/morphologie |
| `VOIR_DONNEES_MEDICALES` | Voir les données médicales | Accès en lecture à la section médicale |
| `ECRIRE_DONNEES_MEDICALES` | Modifier les données médicales | Accès en écriture à la section médicale |

### 2.2 Permissions liées au module entraînement

| Code | Libellé | Description |
|---|---|---|
| `CREER_SEANCE_ENTRAINEMENT` | Créer une séance d'entraînement | Création de nouvelles séances |
| `MODIFIER_SEANCE_ENTRAINEMENT` | Modifier une séance d'entraînement | Modification des séances existantes |
| `EVALUER_ENTRAINEMENT` | Évaluer un entraînement | Saisie des évaluations post-entraînement |
| `CREER_PLAN_TRAVAIL` | Créer un plan de travail | Création de plans hebdomadaires/mensuels |
| `MODIFIER_PLAN_TRAVAIL` | Modifier un plan de travail | Modification des plans existants |

### 2.3 Permissions liées au module match

| Code | Libellé | Description |
|---|---|---|
| `CREER_MATCH` | Créer un match | Création de nouveaux matchs |
| `MODIFIER_MATCH` | Modifier un match | Modification des matchs existants |
| `VALIDER_COMPOSITION` | Valider une composition | Validation finale de la composition |
| `PREPARER_COMPOSITION` | Préparer une composition | Création/modification de brouillons de composition |
| `VALIDER_EVALUATION_MATCH` | Valider une évaluation de match | Validation finale des évaluations post-match |

### 2.4 Permissions liées à l'IA

| Code | Libellé | Description |
|---|---|---|
| `UTILISER_ASSISTANT_IA` | Utiliser l'assistant IA | Accès aux boutons métier IA |
| `IMPORTER_SEANCE_DU_JOUR` | Importer la séance du jour | Upload de fichiers de séance |

### 2.5 Permissions liées à la gestion du club

| Code | Libellé | Description |
|---|---|---|
| `GERER_STAFF` | Gérer le staff | Gestion des membres du staff |
| `GERER_PERMISSIONS` | Gérer les permissions | Attribution/retrait de permissions |
| `GERER_PARAMETRES_CLUB` | Gérer les paramètres du club | Paramètres généraux du club |
| `CONSULTER_AUDIT` | Consulter l'audit | Accès aux journaux d'audit |

---

## 3. Règles métier — Notation

### 3.1 Notes par pilier

| Règle | Détail |
|---|---|
| Échelle | 0 à 10 |
| Type | Entiers acceptés dans le V0 |
| Piliers | Physique, Technique, Tactique, Mental |
| Optionnalité | Un joueur peut ne pas être noté |
| Validation | Une évaluation peut être incomplète tant qu'elle n'est pas validée |
| Qui peut noter | Selon les permissions (voir matrice) |

### 3.2 Note globale

| Règle | Détail |
|---|---|
| Calcul | Automatique |
| Affichage | Avec une décimale |
| Formule | Moyenne pondérée des notes par pilier |
| Dépendance | Matrice de pondération par groupe de poste |

### 3.3 Pondération

| Règle | Détail |
|---|---|
| Granularité | Par poste ou groupe de poste |
| Groupes minimaux | Gardien, Défenseur, Milieu, Attaquant |
| Modifiable | Par le club selon règles définies |
| Historisation | Obligatoire |
| Snapshot | Des poids utilisés dans chaque évaluation globale |
| Rétroactivité | Pas de recalcul rétroactif silencieux |

### 3.4 Exemple de calcul

```
Note globale = (note_physique × poids_physique)
             + (note_technique × poids_technique)
             + (note_tactique × poids_tactique)
             + (note_mental × poids_mental)
```

Si un pilier n'est pas noté :
- le poids de ce pilier est redistribué proportionnellement aux autres piliers notés ;
- ou la note globale est marquée comme incomplète ;
- la règle exacte doit être implémentée et testée.

---

## 4. Règles métier — Matchs

### 4.1 Cycle de vie d'un match

| Statut | Description | Actions autorisées |
|---|---|---|
| Brouillon | Match créé mais non confirmé | Modification complète |
| Programmé | Match confirmé, à venir | Modification limitée |
| Terminé | Match joué, évaluations en cours | Saisie des évaluations |
| Archivé | Match archivé | Consultation uniquement |

### 4.2 Règles de création

- Un match est associé à un club, une équipe et une saison.
- L'adversaire est obligatoire.
- La date du match est obligatoire.
- Le statut par défaut est brouillon.

### 4.3 Règles de composition

| Règle | Détail |
|---|---|
| Titulaires | 11 par défaut |
| Gardien | Au moins un gardien obligatoire |
| Remplaçants | Définis par le coach |
| Capitaine | Optionnel |
| Formation | Prédéfinie ou personnalisée |
| Placement | Libre sur terrain virtuel |
| Validation | Finale par le coach uniquement |

### 4.4 Règles du plateau tactique

| Règle | Détail |
|---|---|
| Vue | 2D uniquement |
| Coordonnées | Normalisées de 0 à 100 |
| Formations | 4-4-2, 4-3-3, 4-2-3-1, 4-1-4-1, 3-5-2, 3-4-3, 5-3-2, 5-4-1 |
| Placement libre | Oui |
| Drag & drop | Oui |
| Sauvegarde | Brouillon |
| Validation | Explicite par le coach |

### 4.5 Règles de remplacements

| Règle | Détail |
|---|---|
| Motifs standards | Tactique, Blessure, Fatigue, Sanction, Autre |
| Choix du motif | Par le coach uniquement |
| Imposition | Le système ne doit pas imposer un motif |
| Impact | Alimente les alertes et statistiques |

---

## 5. Règles métier — Entraînements

### 5.1 Cycle de vie d'une séance

| Statut | Description | Actions autorisées |
|---|---|---|
| Planifiée | Séance prévue | Modification complète |
| Réalisée | Séance effectuée | Évaluation post-séance |
| Annulée | Séance annulée | Trace conservée |

### 5.2 Règles de création

- Une séance est associée à un club, une équipe et une saison.
- La date de la séance est obligatoire.
- Les objectifs sont recommandés (physique, technique, tactique, mental).
- La charge prévue est recommandée.

### 5.3 Règles d'évaluation post-entraînement

| Critère | Détail |
|---|---|
| Assiduité | Présent / Absent / Retard |
| Charge perçue | RPE de 1 à 10 |
| Notes par pilier | Optionnelles |
| Observations | Texte libre |

### 5.4 Règles d'annulation

- Une annulation doit laisser une trace.
- Pas de suppression silencieuse.
- Le statut passe à « Annulée ».
- La raison peut être documentée.

---

## 6. Règles métier — Plans de travail

### 6.1 Types de plans

| Type | Description |
|---|---|
| Hebdomadaire | Plan sur une semaine |
| Mensuel | Plan sur un mois |

### 6.2 Règles de création

- Un plan est associé à un club, une équipe et une saison.
- Les dates de début et fin sont obligatoires.
- Les séances peuvent être associées au plan.

### 6.3 Règles de suivi

| Élément | Détail |
|---|---|
| Prévu | Objectifs et séances planifiées |
| Réalisé | Objectifs et séances effectivement réalisés |
| Comparaison | Prévu vs Réalisé |

---

## 7. Règles métier — IA

### 7.1 Boutons métier

L'IA est déclenchée uniquement par des boutons métier. Pas de champ de prompt libre.

| Action IA | Bouton associé | Description |
|---|---|---|
| `SUGGEST_TRAINING_SESSION` | « Préparer la séance de demain » | Suggestion de type d'entraînement |
| `SUGGEST_LINEUP` | « Suggérer une composition » | Suggestion de composition de match |
| `ANALYZE_FATIGUE` | « Analyser la fatigue » | Détection de signaux de fatigue |
| `SUMMARIZE_WEEK` | « Résumer la semaine » | Synthèse de la semaine |
| `PARSE_UPLOADED_SESSION` | « Analyser la séance uploadée » | Analyse d'un fichier de séance |
| `ADAPT_WORKLOAD` | « Adapter la charge de travail » | Suggestion d'ajustement de charge |
| `PREPARE_PRE_MATCH` | « Préparer l'avant-match » | Préparation avant match |
| `ORGANIZE_WEEK` | « Organiser la semaine » | Organisation hebdomadaire |
| `BALANCE_WORKLOAD` | « Équilibrer la charge » | Équilibrage des charges |

### 7.2 Règles de sécurité IA

| Règle | Détail |
|---|---|
| Données autorisées | L'IA ne reçoit que les données que l'utilisateur a le droit de voir |
| Appels | Backend uniquement, jamais depuis le navigateur |
| Fichiers | Traités comme contenu non fiable |
| Fallback | Si DeepSeek indisponible, règles métier simples |
| Réponses | Validées structurellement |
| Imposition | Aucune suggestion n'est appliquée automatiquement |

### 7.3 Règles de feedback

| Action | Détail |
|---|---|
| Accepter | Le coach valide la suggestion |
| Modifier | Le coach ajuste la suggestion |
| Rejeter | Le coach refuse la suggestion |
| Stockage | Le feedback est systématiquement stocké |
| Modifications | Les modifications du coach sont enregistrées |

---

## 8. Règles métier — Audit

### 8.1 Actions journalisées

| Action | Détail |
|---|---|
| Connexion | Journalisation des connexions |
| Création | Toute création de ressource |
| Modification | Toute modification de ressource |
| Suppression | Toute suppression de ressource |
| Consultation sensible | Accès aux données médicales/physiques |
| Validation composition | Validation d'une composition |
| Validation évaluation | Validation d'une évaluation |
| Changement permission | Attribution/retrait de permission |
| Invitation | Création d'une invitation |
| Révocation | Révocation d'une invitation |
| Transfert coach | Transfert du rôle coach principal |
| Suggestion IA | Acceptation/modification/rejet |
| Upload fichier | Upload de fichiers |

### 8.2 Champs obligatoires

| Champ | Détail |
|---|---|
| Utilisateur | Identifiant de l'utilisateur |
| Club | Identifiant du club |
| Action | Type d'action |
| Type ressource | Type de ressource affectée |
| Identifiant ressource | Identifiant de la ressource |
| Date | Horodatage de l'action |
| Résultat | Résultat de l'action |
| Contexte | Contexte additionnel si pertinent |

### 8.3 Règles de conservation

- Les logs ne doivent pas devenir une copie non contrôlée des données médicales.
- Tracer les accès sensibles sans stocker le contenu sensible.
- Conservation limitée et sécurisée.

---

## 9. Règles de validation transversales

### 9.1 Isolation par club

- Toute requête doit être filtrée par `club_id`.
- Un utilisateur ne peut jamais accéder aux données d'un autre club.
- Les permissions sont vérifiées côté backend.

### 9.2 Hiérarchie stricte

- Le coach principal a une vue de supervision totale.
- Les membres du staff ont un périmètre strictement limité.
- La relation n'est jamais réciproque.
- Un membre du staff ne peut jamais voir les informations d'un autre membre.

### 9.3 Validation des entrées

- Toutes les entrées doivent être validées avec Pydantic.
- Les notes doivent être des entiers entre 0 et 10.
- Les coordonnées du plateau tactique doivent être entre 0 et 100.
- Les dates doivent être valides.

---

## 10. Règles d'exception

### 10.1 Exceptions accordées par le coach

Le coach principal peut :
- Accorder des permissions supplémentaires à une personne précise.
- Retirer des permissions.
- Limiter l'accès à certaines sections.
- Autoriser un membre à effectuer une action précise.

### 10.2 Ce qu'un membre du staff ne doit jamais voir

Même avec autorisation, un membre du staff ne doit jamais voir :
- La gestion des permissions des autres.
- La supervision hiérarchique du staff.
- Les comptes des autres membres du staff.
- Ce que les autres membres voient.
- Les paramètres sensibles du club.
- La facturation / abonnement (sauf rôle spécifique).
- Les journaux d'audit ou de supervision réservés au coach.

---

## 11. Notes finales

- Ce document détaille la matrice de permissions et les règles métier du V0.
- Toute évolution doit être validée dans `DECISIONS_FIGEES.md` avant mise à jour ici.
- Les règles métier doivent être implémentées et testées.
- Les permissions doivent être vérifiées côté backend, jamais côté frontend seul.
- Les règles de calcul doivent être documentées et testées.

---

*Fin du document — Analystaff — Matrice de permissions et règles métier*
