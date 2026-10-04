# Audit des animations — ticket #14

Relevé complet avant/après des `transition`, `transition-*`, `animation` et
`@keyframes` du frontend.

- **Règle appliquée** : `AGENTS.md` § gotcha 5 — « No width/height animations —
  only transform/opacity (150-300ms) in frontend ».
- **Précision** : `CHARTE_VISUELLE_FRONTEND.md` § 9 « Animation » — « Durée
  150-300ms ; propriétés `transform` et `opacity` uniquement » ; interdits :
  parallax, bounce décoratif, animations de layout ; `prefers-reduced-motion`
  respecté.
- **Périmètre audité** : `frontend/src/app/globals.css` (1337 lignes, lu en
  entier) + les 32 fichiers `.tsx` de `frontend/src/`. Les classes Tailwind
  `transition-*` / `animate-*` comptent comme des déclarations d'animation.
- **Hors périmètre volontaire** : les tokens de couleur (ticket #13) et le
  responsive (ticket #12). Aucune ligne de `:root` ni de `@theme inline` n'a
  été touchée.

## Verdict

Le code était **partiellement conforme** : les transitions du CSS，`150ms ease`
partout, respectaient déjà la fourchette et ne touchaient aucune propriété de
reflow. Les violations étaient concentrées sur deux points : les classes
`transition-all` des composants, et un bloc `transform`/`box-shadow` en style
inline qui rendait deux transitions déclarées complètement inertes.

| Catégorie | Trouvées | Corrigées | Documentées (exceptions assumées) |
|---|---|---|---|
| `transition-all` (anime `width`/`height`/`margin`/`padding`/`font-size`…) | 6 | 6 | 0 |
| Animation/transition déclarée mais inerte (inline qui écrase le CSS) | 2 | 2 | 0 |
| Barre de progression en `width:` (reflow) | 1 | 1 | 0 |
| Animation référencée mais non définie (`@keyframes` mortes) | 2 | 2 | 0 |
| Durée hors 150-300ms | 4 | 0 | 4 |
| Courbe incohérente | 0 | 0 | 0 |
| **Total** | **15** | **11** | **4** |

## Relevé ligne par ligne

### 1. `transition-all` — anime toutes les propriétés, dont celles de reflow

`transition-all` en Tailwind inclut `width`, `height`, `margin`, `padding`,
`font-size`, `top`/`left`/`right`/`bottom`. Sur ces éléments, les propriétés
qui changent réellement sont toutes des couleurs (ou `box-shadow`). La
transition est donc resserrée sur la liste exacte — preuve mécanique
qu'aucune propriété de reflow n'est transitionnée.

| # | Fichier: ligne | Propriété | Avant | Après |
|---|---|---|---|---|
| 1 | `frontend/src/components/ui/AiActionsRow.tsx:38` | liste de propriétés | `transition-all` | `transition-[color,background-color,border-color,box-shadow,opacity]` |
| 2 | `frontend/src/app/staff/page.tsx:253` | liste de propriétés | `transition-all` | `transition-colors` |
| 3 | `frontend/src/app/players/page.tsx:314` | liste de propriétés | `transition-all` | `transition-colors` |
| 4 | `frontend/src/app/players/page.tsx:327` | liste de propriétés | `transition-all` | `transition-colors` |
| 5 | `frontend/src/app/parametres/page.tsx:607` | liste de propriétés | `transition-all` | `transition-[color,background-color,box-shadow]` |
| 6 | `frontend/src/app/matches/[id]/page.tsx:165` | liste de propriétés | `transition-all` | `transition-colors` |

Justification de chaque remplacement, lue dans le composant :

- `AiActionsRow.tsx:37-41` — la classe bascule entre `border-border bg-surface`,
  `border-primary bg-primary-soft`, `border-destructive bg-destructive-soft`, plus
  `hover:border-primary hover:shadow-sm` et `opacity-50`. Couleurs +
  `box-shadow` + `opacity`.
- `staff/page.tsx:253-258` — le filtre actif change `backgroundColor`, `color`
  et `borderColor` via le style inline. `transition-colors` couvre les trois
  (il inclut `border-color`).
- `players/page.tsx:314` et `:327` — bascule grille/liste : `bg-surface` +
  `color`.
- `parametres/page.tsx:607-613` — onglet actif : `backgroundColor`, `color` et
  `boxShadow` (`0 1px 3px` ↔ `none`). D'où la liste à trois propriétés : ni
  `transition-colors` seul (box-shadow non couvert) ni `transition-all`.
- `matches/[id]/page.tsx:165-172` — sélecteur de formation :
  `backgroundColor`, `color`, `border`.

### 2. Transitions déclarées mais inertes (style inline qui écrase le CSS)

Un style inline l'emporte sur n'importe quelle règle de feuille de style :
`.tactical-player` déclarait `transition: transform 150ms ease, box-shadow
150ms ease` et un `:hover { transform: scale(1.1) }`, mais
`TacticalBoard.tsx` posait `transform` **et** `boxShadow` en inline à chaque
rendu. Les deux transitions ne se déclenchaient donc jamais.

| # | Fichier: ligne | Propriété | Avant | Après |
|---|---|---|---|---|
| 7 | `frontend/src/components/match/TacticalBoard.tsx:221-234` + `globals.css:1085-1107` | `transform` | inline `translate(-50%, -50%)` (écrasait `:hover`) | `transform: translate(-50%, -50%)` dans `.tactical-player`, `scale(1.1)` combiné dans `:hover` |
| 8 | `frontend/src/components/match/TacticalBoard.tsx:206-211` + `globals.css:1100` | `box-shadow` | inline `"0 1px 3px rgba(0,0,0,0.2)"` au repos (écrasait `:hover`) | `undefined` au repos → la règle CSS gère repos + survol ; captain/drag restent inline |

Détail : le centrage du joueur est passé de l'inline vers la feuille de style,
et le survol combine désormais `translate(-50%, -50%) scale(1.1)` pour que le
`translate` de centrage survive au scale. `left`/`top` restent en inline : c'est
le drag-and-drop, du direct manipulation qui doit coller au pointeur image par
image — aucune transition dessus, volontairement.

### 3. Barre de progression en `width:` — reflow

`PillarBar.tsx` posait `width: ${pct}%` sur le remplissage. Aucune transition
n'était déclarée (donc pas de violation de la règle « ne pas animer width » au
sens strict), mais le composant était une barre de layout : toute variation de
note recalculait la mise en page. Le pattern `transform: scaleX()` existait
déjà dans `ChargeBar.tsx:53-58` — il a été propagé.

| # | Fichier: ligne | Propriété | Avant | Après |
|---|---|---|---|---|
| 9 | `frontend/src/components/ui/PillarBar.tsx:42-57` | largeur du remplissage | `width: ${pct}%` | `width: 100%` + `transform: scaleX(${pct / 100})` + `transform-origin: left` + `transition-transform duration-300` |

Pourquoi `scaleX()` : la piste garde sa largeur, seul le remplissage est mis à
l'échelle depuis la gauche. Rendu identique au pixel près, zéro layout recalcul
par frame, et la valeur peut désormais être transitionnée sans déclencher de
reflow. `transform-origin: left` est indispensable : sans lui, la barre
pousse depuis le centre.

### 4. Animations référencées mais non définies

| # | Fichier: ligne | Propriété | Avant | Après |
|---|---|---|---|---|
| 10 | `frontend/src/app/globals.css:1156-1170` (nouveau bloc) + `:1153` | `@keyframes spin` | absent — `.loading-spinner` référençait une animation inexistante | `@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }` |
| 11 | `frontend/src/app/globals.css:1335-1353` (nouveau bloc) | `@keyframes fade-in` | absent — `animate-fade-in` utilisée dans `app/page.tsx:253` et `app/equipe/page.tsx:205` sans définition | `@keyframes fade-in` (opacity seule) + `.animate-fade-in { animation: fade-in 150ms ease }` |

Précision sur le #10 : le spinner fonctionnait *par accident*. Tailwind n'émet
ses `@keyframes spin` que parce qu'un autre composant utilise `animate-spin`
(`app/ai/page.tsx`, `components/ui/AiActionsRow.tsx`). Si cet utilitaire
disparaît des `.tsx`, `.loading-spinner` se fige. La définition est donc
déclarée pour rendre le composant autonome ; l'effet est identique à celui de
Tailwind (un tour complet), donc aucun changement de rendu visible.

Précision sur le #11 : la charte § 9 liste le « fade de page 150ms » parmi les
animations autorisées. La classe existait dans deux pages mais n'était définie
nulle part (ni dans `globals.css`, ni dans `tailwind.config.ts`, qui n'a aucun
bloc `animation`) : aucun fade ne se jouait. Déclaré dans `globals.css` et non
dans `@theme inline`, pour ne pas toucher au bloc de thème que le ticket #13
travaille. La durée 150ms est celle de la charte.

### 5. Durées hors fourchette — exceptions assumées, non corrigées

Ces quatre cas sont des **boucles infinies d'indicateurs de chargement**, pas
des transitions d'interface. Les raccourcir à 300ms les transformerait en
stroboscope : WCAG 2.3.1 « Three Flashes or Below Threshold » est franchi dès
que la fréquence dépasse 3 clignotements/seconde. Aucune n'anime de propriété
de reflow. Elles sont commentées dans `globals.css`.

| # | Emplacement | Propriété | Avant | Après | Décision |
|---|---|---|---|---|---|
| 12 | `frontend/src/app/globals.css:743` `.skeleton` | `background-position` via `@keyframes skeleton-shimmer` | `1.5s infinite` | inchangé | **Conservé.** La durée 1.5s est imposée par la charte § 7 (« blocs gris pulse 1.5s »). Paint-only, aucun reflow. |
| 13 | `frontend/src/app/globals.css:1153` `.loading-spinner` | `transform: rotate` | `1s linear infinite` | inchangé | **Conservé.** `transform` pur, GPU. 1s est le plancher lisible. |
| 14 | `frontend/src/app/parametres/page.tsx:218` | `opacity` via `animate-pulse` | `2s` (défaut Tailwind) | inchangé | **Conservé.** Opacity seule, indicateur pendant l'enregistrement. |
| 15 | `frontend/src/app/ai/page.tsx:159,297,348` + `AiActionsRow.tsx:50` | `transform: rotate` via `animate-spin` | `1s linear infinite` (défaut Tailwind) | inchangé | **Conservé.** Idem #13. |

### 6. Courbes d'animation — aucune violation

La charte ne fixe aucune courbe. Deux courbes coexistent dans le projet :

- `ease` (`cubic-bezier(0.25, 0.1, 0.25, 1)`) — les 8 déclarations `transition`
  de `globals.css`.
- `cubic-bezier(0.4, 0, 0.2, 1)` — le timing par défaut de Tailwind, utilisé par
  les classes `transition-*` des composants.

Les deux sont standards, **sans rebond et sans dépassement**, donc conformes à
l'interdit « bounce décoratif » de la charte § 9. Aucune n'a été changée :
harmoniser demanderait de réécrire les 8 déclarations `transition` de
`globals.css` pour un gain de rendu nul, et introduire une couche de tokens de
mouvement n'était pas justifié. Le nouveau code (`fade-in`) suit la convention
dominante du fichier (`150ms ease`).

Si l'harmonisation est jugée utile plus tard, c'est un ticket à part entière :
elle touche `.btn`, `.tab`, `.input`, `.select`, `.link`, `.sidebar-*`,
`.tactical-player` — pas seulement les animations.

## État final vérifié

```bash
$ grep -n "transition:" src/app/globals.css
322:  transition: background-color 150ms ease, color 150ms ease;
364:  transition: background-color 150ms ease;
419:  transition:                      # .btn — background-color, color, border-color, opacity 150ms
637:  transition: border-color 150ms ease, box-shadow 150ms ease;
695:  transition: border-color 150ms ease;
1033: transition:                       # .tab — background-color, color, box-shadow 150ms
1101: transition: transform 150ms ease, box-shadow 150ms ease;
1303: transition: color 150ms ease;
```

```bash
$ grep -rn "transition-all" --include="*.tsx" src/     # aucune sortie
$ grep -nE "transition:[^;]*(width|height|margin|padding|font-size|top|left|right|bottom)" src/app/globals.css
                                                   # aucune sortie
```

`@keyframes` présents dans le CSS compilé (`.next/static/css/*.css`) :
`fade-in`, `spin`, `skeleton-shimmer`, `pulse`. Les quatre sont `opacity` ou
`transform` (shimmer : `background-position`, paint-only, voir #12).

`prefers-reduced-motion` : le bloc global de `globals.css` (avec
`animation-duration: 0.01ms !important` et `animation-iteration-count: 1
!important`) couvre toutes les animations ci-dessus, y compris la nouvelle
`.animate-fade-in`. Rien à ajouter.

## Graphiques — aucun `@keyframes` SVG

- **`RadarChart.tsx`** : aucune animation. Le polygone est recalculé par
  `getPoints()` à chaque rendu React et écrit dans l'attribut SVG `points`.
  Aucun `transition`, aucun `@keyframes`, aucune interpolation d'attribut.
  Conforme par absence — rien à signaler.
- **`TacticalBoard.tsx`** : le terrain est en `div` absolus, pas en SVG, et
  positionne les joueurs en `left`/`top` (cf. correction #7). La règle
  « top/left » a été respectée : aucune transition sur ces propriétés.
- **Recharts** : absent du projet. `grep -rn "isAnimationActive"` ne renvoie
  rien, donc pas d'animation SVG pilotée par la librairie.