# Chapitre 0 — « De l'idée au document : dompter une vision »

*Phase 0 — Conception · 29 juillet → 8 août 2026*

---

## 1. Le contexte

Avant la première ligne de code, il y a eu une idée : **Analystaff**.

Une plateforme de gestion continue de la performance des footballeurs,
pensée pour tout le staff technique — pas seulement pour l'entraîneur.
Un constat simple : dans le football africain, amateur comme semi-pro,
l'évaluation d'un joueur repose encore sur le ressenti d'un coach,
rarement structuré, rarement conservé, souvent perdu quand cette
personne quitte le club.

Le pari : *un club amateur sénégalais mérite le même niveau d'outillage
rigoureux qu'un club professionnel européen, adapté à ses moyens réels,
pas une version dégradée qu'on lui impose.*

Sauf qu'une vision, c'est dangereux. Elle est vaste, enthousiasmante,
et elle déborde dans tous les sens. Sans discipline, elle se dilue en
bavardage. Avec discipline, elle devient un projet.

## 2. Le défi

Le problème n'était pas d'avoir des idées. C'était leur **multiplicité** :

- rôles et permissions dynamiques, pilotés par le coach principal ;
- pondération des notes par poste (un défenseur central et un ailier ne
  sont pas notés pareil) ;
- saisie hors ligne, au bord du terrain, avec synchronisation ;
- plateau tactique virtuel, formations prédéfinies ;
- IA qui suggère, jamais qui impose ;
- upload de fichiers, export PDF, paiement Wave / Orange Money,
  notifications, phase pilote gratuite…

Tout semblait important. Tout semblait urgent. Et sans arbitrage, rien
n'avance : on code un peu de tout, on finit rien, et les décisions se
prennent au fil de l'eau, en oubliant pourquoi on les a prises.

## 3. Où je cherchais

Ma première impulsion, comme beaucoup : **coder tout de suite**.
L'archétype du développeur qui veut « faire » plutôt que « penser ».

Heureusement, j'ai eu le réflexe inverse : **documenter d'abord**. J'ai
commencé à écrire ce que je voulais bâtir. Et très vite, un deuxième
problème est apparu : les documents proliféraient, se contredisaient
parfois, et rien ne disait lequel faisait foi.

Je tournais en rond entre la vision produit, le schéma de base de
données, la matrice des permissions… sans hiérarchie entre eux.

## 4. Où était le problème réellement

Le problème n'était pas le manque de documents — c'était le **manque
de hiérarchie et de séparation des rôles** :

- certaines choses étaient des **décisions validées** (le coach
  principal voit tout, l'IA suggère seulement) ;
- d'autres étaient des **idées non tranchées** (le prix exact d'un
  forfait, le modèle de notifications) ;
- d'autres encore étaient des **directions futures** (le paiement Wave,
  prévu en V1, pas en V0).

Mélanger tout ça dans un seul document, c'était condamner le projet à
l'ambiguïté. « Est-ce que c'est validé ou juste envisagé ? » — cette
question revenait sans cesse.

## 5. Comment on l'a résolu

J'ai créé un **système documentaire à rôles séparés**, avec une
hiérarchie claire :

| Document | Rôle | Statut |
|---|---|---|
| `DECISIONS_FIGEES.md` | **La source de vérité** : les choix validés, datés | Fait foi sur tout |
| `ROADMAP_IDEES.md` | Les idées futures, les questions ouvertes | N'engage à rien |
| `analystaff-presentation.md` | La vision produit, le pourquoi | Orienté lecteur |
| `architecture-mvp-reelle.md` | La mise en œuvre technique | Aligné sur les décisions |
| `SCHEMA_SQL.md` | Le schéma de base de données définitif | Une seule source SQL |
| `MATRICE_PERMISSIONS_ET_REGLES_METIER.md` | Qui peut faire quoi | Détail des décisions |
| `SPECIFICATIONS_IA_ET_PROMPTS.md` | Le module IA opérationnel | Détail des décisions |
| `STANDARDS_DEVELOPPEMENT.md` | Les conventions de code | Règles pour l'équipe |
| `staff_technique_football.md` | Référence métier sur les staffs | Documentation |

La règle d'or, écrite noir sur blanc dans chaque document :

> **Ce fichier fait foi. En cas de contradiction avec un autre document
> du projet, c'est celui-ci qui a raison.**

Et une règle de vie : une idée ne migre vers `DECISIONS_FIGEES.md` que
lorsqu'elle est **explicitement validée, avec sa date**. Rien n'est
engagé tant que la décision n'est pas prise.

Ensuite, pour traquer les angles morts : j'ai construit un **quiz des
25 angles morts** — 25 questions sur tout ce qu'on oublie souvent
(conformité CDP, timezone Africa/Dakar, invitations d'utilisateurs,
versioning API, définition de fini, uploads…). Réponse 100 % par
boutons, export Markdown. Chaque question devait être classée :
à traiter maintenant, à planifier en V1, plus tard, ou à clarifier.

## 6. L'enseignement

> **Une vision sans documents se dilue. Des documents sans hiérarchie
> se contredisent. La discipline, c'est de décider quoi décide.**

Trois réflexes à garder :

1. **Sépare les rôles.** Un document pour les décisions validées, un
   pour les idées, un pour la technique, un pour le métier. Ne jamais
   tout mélanger dans un seul fichier « tout ».
   
2. **Désigne une source de vérité.** « En cas de contradiction, ce
   fichier fait foi » — écrit noir sur blanc, répété partout. Sans ça,
   chaque document devient un plaidoyer pour lui-même.

3. **Date tes décisions.** Une décision validée le 04/08 avec sa date,
   c'est un engagement traçable. Une décision sans date, c'est une
   rumeur.

Bonus : le quiz des angles morts a fait remonter des sujets que je
n'aurais jamais pensé traiter avant le code — la conformité aux données
personnelles, la gestion des joueurs mineurs, le transfert du rôle de
coach principal. **Les questions qu'on ne se pose pas sont celles qui
nous coûtent le plus cher.**

---

*Un projet sans documents, c'est un avion qui décolle sans plan de vol :
il avance, mais personne ne sait où il va.*
