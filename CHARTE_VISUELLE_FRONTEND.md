# Analystaff — Charte visuelle « Le banc technique »

> **Version :** 2.0 — refonte complète, 13/08/2026
> **Statut :** source de vérité visuelle du frontend
> **Produit :** Analystaff — l'outil du staff technique, pas du supporter.

---

## 1. Philosophie : la donnée froide, la voix chaude

Analystaff vit sur un banc de touche. Le staff y lit une note en une seconde, décide, et retourne au terrain. Deux forces font le produit, et la charte les sert toutes les deux :

1. **La donnée froide.** Les chiffres sont justes, denses, alignés. Le radar est la vitrine, pas un gadget. On ne décore pas un chiffre, on le lit.
2. **La voix chaude.** Le banc parle : des notes signées, des heures humaines (« Hier 18:40 », pas « 2026-08-12T18:40:00Z »), des phrases de terrain (« retour sous réserve du kiné », « on maintient le volume »). C'est ce qui distingue un outil utilisé par des gens d'un tableau rempli par un robot.

**Style retenu :** Data-Dense Dashboard (performance ⚡ excellent, accessibilité WCAG AA — profil validé par la base design ui-ux-pro-max).

**Interdits absolus :** glassmorphism, HUD/Sci-Fi, néon, 3D décorative, ombres lourdes, emojis comme icônes, hex en dur, phrases creuses.

**Les 5 piliers visuels :**
1. Décider en 1 seconde — lisibilité d'abord
2. Densité maîtrisée — beaucoup de données, zéro bruit
3. Contraste pro — WCAG AA minimum, AAA sur le texte
4. Identité sobre — les couleurs du terrain, pas un drapeau
5. Le radar comme héros — le composant signature

---

## 2. Couleurs (espace OKLCH)

Tout le système de couleurs est écrit en **OKLCH** : perception uniforme, teinte stable sur toute la plage de luminosité, chroma indépendant. Un seul format partout, jamais de hex en dur dans les composants.

Format : `oklch(L C H)` et `oklch(L C H / alpha)` — L et C sur 3 décimales, H sur 0-3 décimales, alpha en slash.

### 2.1 Rôles sémantiques (light — V0)

| Rôle | Token | Valeur OKLCH | Usage |
|---|---|---|---|
| Fond page | `--bg` | `oklch(0.975 0.004 255)` | Arrière-plan général (blanc cassé) |
| Surface | `--surface` | `oklch(1 0 0)` | Cartes, modales, panneaux |
| Surface 2 | `--surface-2` | `oklch(0.965 0.005 255)` | Fonds de footer, zones secondaires |
| Texte fort | `--text-strong` | `oklch(0.22 0.03 255)` | Titres, chiffres héros, noms |
| Texte | `--text` | `oklch(0.32 0.025 255)` | Corps |
| Texte secondaire | `--muted` | `oklch(0.55 0.02 255)` | Labels, légendes, aides |
| Texte faible | `--faint` | `oklch(0.50 0.02 255)` | Heures, timestamps, micro-informations (AA ≥ 4.5:1) |
| Bordure | `--line` | `oklch(0.90 0.008 255)` | Séparateurs, contours |
| Bordure forte | `--line-strong` | `oklch(0.83 0.01 255)` | En-têtes de tableau, inputs |
| **Primaire** | `--primary` | `oklch(0.69 0.15 165)` | Action : boutons, liens actifs, KPI positifs |
| Primaire foncé | `--primary-hover` | `oklch(0.45 0.13 165)` | Texte émeraude sur fond clair (AA ≥ 4.5:1) |
| Primaire pâle | `--primary-soft` | `oklch(0.69 0.15 165 / 0.1)` | Badges succès, fonds sélection |
| **Secondaire** | `--secondary` | `oklch(0.29 0.055 255)` | Structure : sidebar, nav, boutons IA |
| **Accent** | `--accent` | `oklch(0.78 0.15 75)` | Attention : « à surveiller », alertes |
| Accent foncé | `--accent-d` | `oklch(0.50 0.12 55)` | Texte ambre sur fond clair (AA ≥ 4.5:1) |
| Destructif | `--destructive` | `oklch(0.55 0.22 25)` | Blessures, suppressions, erreurs |
| Info | `--info` | `oklch(0.45 0.18 255)` | Informations, liens |

**Règle des 3 dominantes :** émeraude (action) + bleu nuit (structure) + neutres (contenu). L'ambre est un accent mesuré, jamais dominant.

### 2.2 Les 4 piliers — couleurs FIXES, partout, toujours

Un joueur « physique fort » est rouge dans tout le produit. Ces couleurs ne changent jamais d'un écran à l'autre.

| Pilier | Remplissage | Texte sur fond clair (WCAG ≥ 4.5:1) |
|---|---|---|
| Physique | `oklch(0.55 0.22 25)` | `oklch(0.42 0.2 25)` |
| Technique | `oklch(0.45 0.18 255)` | `oklch(0.38 0.16 255)` |
| Tactique | `oklch(0.45 0.19 310)` | `oklch(0.38 0.17 310)` |
| Mental | `oklch(0.65 0.16 65)` | `oklch(0.53 0.13 55)` |

Règle de contraste : les couleurs vives servent au remplissage (radar, barres, cercles). Tout texte ou badge sur fond clair utilise la variante foncée.

### 2.3 Dark mode (V1 — structure prête dès le V0)

Traduit selon les règles dark-mode-design : on n'inverse pas, on repense.

- Surfaces hiérarchisées par la luminosité : `#0B1220` fond → `#111C2E` surface → `#1A2940` surface 2
- Couleurs d'action désaturées de 10-20 % (l'émeraude monte en luminosité : `oklch(0.76 0.16 165)`)
- Texte off-white (`oklch(0.89 0.01 255)`), jamais de blanc pur
- Bordures en blanc à faible opacité, pas de noir
- Chaque paire fond/texte est re-vérifiée en sombre, jamais dérivée mécaniquement

### 2.4 Règles d'usage (better-colors)

- Une couleur = un sens. Jamais de lien décoratif avec une couleur sémantique.
- Un seul fond coloré par vue : l'action primaire. Les secondaires restent neutres.
- Aucun hex en dur : toujours un token sémantique.
- Vérifier le gamut sRGB de chaque valeur haute-chroma ; clipper si besoin.
- Le focus ring est le seul élément autorisé à utiliser le primaire à 35 % d'alpha.

---

## 3. Typographie

**Inter** = l'interface, le corps, les labels. **Space Grotesk** = la donnée : notes, RPE, pourcentages, coordonnées. Space Grotesk est la personnalité « data » du produit ; Inter est la voix calme. Jamais de chiffre de donnée en Inter quand il est une valeur.

Échelle modulaire (ratio 1.25 — major third, typography-scale) adaptée à la densité :

| Rôle | Taille | Poids | Notes |
|---|---|---|---|
| Hero (note globale) | 34-48px | Space Grotesk Bold | Le chiffre héros, tabular-nums |
| Titre de page (h1) | 26px | Space Grotesk Bold | Tracking -0.02em |
| Titre de section | 18px | Space Grotesk SemiBold | |
| Titre de carte | 15px | Space Grotesk SemiBold | |
| Corps | 13.5px | Inter Regular | Line-height 1.55 |
| Labels / tableaux | 12px | Inter Medium | |
| Micro / timestamps | 10.5px | Inter Medium | Labels uppercase : tracking 0.08em |
| Chiffres en tableau | 13px | Space Grotesk Medium | tabular-nums OBLIGATOIRE |

Règles :
- `font-variant-numeric: tabular-nums` sur tout chiffre en colonne ou KPI — l'alignement des colonnes est sacré
- Line-height : titres 1.2, corps 1.55
- Une seule graisse d'emphase par bloc (600 max), jamais de gras + couleur + taille en même temps
- Jamais de placeholder seul comme label de champ

---

## 4. Espacement, grille, formes

- **Système 8pt** : `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64`
- **Grille** : 12 colonnes desktop / 8 tablette / 4 mobile ; gouttière 24px desktop, 16px mobile
- **Rayons concentriques** (extérieur = intérieur + padding) : 8px inputs et badges, 12px cartes, 20px panneaux et sidebar, 999px pills
- **Élévation** : 3 niveaux d'ombres en couches transparentes (`--shadow-1/2/3`), jamais d'ombre lourde
- **Densité** : padding de carte 16-24px, lignes de tableau 10px, gap de grille 16px — le produit doit tenir un maximum de décisions visibles sans scrolling inutile

---

## 5. Composants signature

### 5.1 Le radar 4 piliers (LE héros)

- 4 axes 0-10 (Physique, Technique, Tactique, Mental), graduations discrètes
- Remplissage du polygone joueur : émeraude `oklch(0.69 0.15 165 / 0.14)`, trait 2px
- Moyenne club superposable en pointillés (lecture immédiate de l'écart)
- Note globale en Space Grotesk Bold 34px au centre
- Légende à droite : 4 piliers, valeurs en Space Grotesk, barres de proportion
- Toujours un commentaire terrain sous la légende (« Mental à −1,2 pts de la moyenne ») — la donnée ne se commente jamais toute seule

### 5.2 Les notes du staff (la voix du banc)

Composant signature de la v2. C'est lui qui rend le produit humain.

- Avatar initiales (28px) + nom + rôle + **heure humaine** (« Aujourd'hui 08:12 », « Hier 18:40 »)
- Texte court, concret, de terrain, qui croise les données du produit
- Mot-clé mis en évidence (joueur, jour, alerte)
- Chaque note a un auteur identifiable — jamais de note anonyme
- Entrées : « + Ajouter une note »

### 5.3 KPI cards

Chiffre Space Grotesk 30px + label Inter 10.5px uppercase + delta coloré. Fond blanc, bordure fine. Une seule carte peut être en accent bleu nuit (la priorité du moment).

### 5.4 Boutons

| Type | Style |
|---|---|
| Primaire | Fond émeraude, texte très foncé, radius 8px, hover clair |
| Secondaire / ghost | Fond blanc, bordure, texte normal |
| **IA** | Fond bleu nuit, texte clair — reconnaissable instantanément, toujours une icône ✨ SVG |
| Destructif | Fond rouge, texte blanc |
| Désactivé | Opacité 50 % + tooltip qui explique POURQUOI |

### 5.5 Badges de statut

| Statut | Style |
|---|---|
| Fit / actif / validé | Fond `#e7f7f1` (opaque), texte émeraude foncé `oklch(0.45 0.13 165)` — AA garanti |
| Blessé | Fond `#fde9ea` (opaque), texte rouge foncé `oklch(0.42 0.2 25)` — AA garanti |
| Réserve / suspendu | Fond `#fdf1dc` (opaque), texte ambre foncé `oklch(0.50 0.12 55)` — AA garanti |
| Sync chaud / froid / ok | ambre pâle / gris / émeraude pâle — le coach sait TOUJOURS où en est sa donnée |

### 5.6 Plateau tactique

Terrain 2D ratio 68:105, lignes blanches sur vert clair, joueurs en cercles numérotés (titulaires émeraude, remplaçants bleu nuit, gardien distinct), badge « C » capitaine, formation affichée en haut. Drag & drop fluide, « Enregistrer brouillon » / « Valider la composition ».

---

## 6. La voix — écrire comme le banc parle

Le texte d'Analystaff est du français de terrain, pas du marketing.

**Règles :**
- Court et concret : une note se lit en 5 secondes
- Le staff parle au « on » et au « je » : « on maintient le même volume », « retour sur le terrain jeudi, sous réserve du kiné »
- Les données parlent d'elles-mêmes : « Mental à −1,2 pts de la moyenne », pas « le mental est en retrait par rapport aux attentes »
- Heures humaines : « Aujourd'hui 08:12 », « Hier 18:40 », « Dans 3 jours » — jamais de timestamp brut
- Termes de terrain : infirmerie, causerie, séance, charge, récup

**Interdits (stop-slop / kill-slop) :**
- Jargon mou : « candidat à », « proactif », « optimiser l'expérience »
- Ém-dash dans la prose ; adverbes inutiles ; voix passive
- Phrases creuses (« une approche holistique ») et citations-punchline
- Commentaires de code qui restatent le code

**Checklist avant livraison de tout texte :** y a-t-il un adverbe ? une voix passive ? une phrase qui sonne « pull-quote » ? un ém-dash ? → corriger.

---

## 7. États UX

| État | Comportement |
|---|---|
| Chargement | Skeleton (blocs gris pulse 1.5s) pour listes et dashboards ; spinner inline pour les actions. Jamais d'écran blanc |
| Erreur | Message clair + bouton « Réessayer ». Jamais de « 500 Internal Server Error » brut |
| Vide | Icône + titre + explication + action (« Aucun joueur. Importez votre effectif (CSV) ») — zéro tableau vide sans message |
| Offline | Bandeau ambre discret + badges « saisi à chaud / à froid / synchronisé » |
| Formulaire | Erreur inline sous le champ, rouge, compréhensible |

---

## 8. L'IA dans l'interface

- Boutons IA **bleu nuit** avec icône ✨ SVG, visibles selon la permission de l'utilisateur
- Désactivés avec tooltip explicatif : « Ajoutez des évaluations pour suggérer une composition »
- Chargement : spinner + « Analyse en cours… »
- Résultat : carte de suggestion avec **Accepter / Modifier / Rejeter** — jamais de texte brut
- Zéro champ de prompt libre dans le parcours principal

---

## 9. Animation

- Durée 150-300ms ; propriétés `transform` et `opacity` uniquement
- Types : hover léger, focus ring, skeleton pulse, fade de page 150ms
- Interdits : parallax, bounce décoratif, animations de layout (width/height)
- `prefers-reduced-motion` respecté

---

## 10. Accessibilité (priorité #1)

- Contraste WCAG AA minimum (4.5:1 texte, 3:1 UI), AAA sur le texte
- Focus visible partout (ring émeraude 2px + offset)
- Navigation clavier complète
- Labels visibles sur tous les champs
- `aria-label` sur les icônes seules
- Cibles tactiles ≥ 32px desktop, ≥ 44px mobile

---

## 11. Responsive

Desktop-first (l'usage principal est un laptop au bord du terrain) :

- **≥ 1200px** : grille pleine, radar + légende côte à côte
- **900px** : sidebar masquée (remplacée par un drawer), grilles en 1 colonne
- **600px** : KPI en 1 colonne, radar centré en colonne, tableaux scrollables horizontalement, boutons pleine largeur
- Le bandeau offline s'affiche en priorité sur mobile (usage au stade)

---

## 12. Structure frontend (Next.js 16)

```
frontend/
├── src/
│   ├── app/
│   │   ├── (auth)/login/
│   │   ├── (dashboard)/
│   │   │   ├── page.tsx          # Tableau de bord (radar + KPIs + notes)
│   │   │   ├── matches/          # Matchs, composition, plateau
│   │   │   ├── training/         # Séances, évaluations post-séance
│   │   │   ├── planning/         # Plans hebdo/mensuels
│   │   │   ├── players/          # Effectif + profils
│   │   │   ├── staff/            # Staff + permissions
│   │   │   └── ai/               # Suggestions IA
│   ├── components/
│   │   ├── ui/                   # shadcn/ui
│   │   ├── layout/               # Sidebar, header, shell
│   │   ├── player/               # PlayerCard, PlayerTable, profil
│   │   ├── match/                # MatchCard, LineupBoard, TacticalBoard
│   │   ├── training/             # SessionCard, RPEInput
│   │   ├── radar/                # PlayerRadar, RadarCompare
│   │   ├── notes/                # StaffNote, NoteList (composant voix)
│   │   └── ai/                   # AiActionButton, SuggestionCard
│   ├── stores/                   # Zustand
│   ├── hooks/
│   ├── lib/                      # API client, utils
│   ├── types/                    # Alignés SCHEMA_SQL
│   └── styles/                   # globals.css (tokens), tailwind config
```

---

## 13. Checklist de livraison

- [ ] Vert émeraude = action, bleu nuit = structure, neutres = contenu
- [ ] 4 piliers : couleurs FIXES, variantes foncées pour le texte
- [ ] Space Grotesk pour les chiffres, tabular-nums partout en colonne
- [ ] Aucun hex en dur, aucun emoji comme icône (SVG Lucide)
- [ ] Skeleton avant toute donnée ; erreurs avec retry ; vides avec action
- [ ] Boutons IA bleu nuit, permission-gated, désactivés avec explication
- [ ] Une note du staff est signée (auteur + heure humaine)
- [ ] Contraste AA vérifié sur chaque composant, dans les 2 modes
- [ ] Animation 150-300ms, transform/opacity, reduced-motion respecté
- [ ] Anti-slop : textes passés au crible (pas de jargon, pas d'ém-dash, pas de commentaires qui restatent le code)
- [ ] Responsive vérifié : 1440 / 1024 / 768 / 375
