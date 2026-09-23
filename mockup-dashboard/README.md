# Analystaff — Mockup Dashboard

Mockup statique du dashboard Analystaff, construit en s'appuyant sur la bibliothèque
**[signerlabs/ShipSwift](https://github.com/signerlabs/ShipSwift)** (composants SwiftUI, iOS 18+).

ShipSwift est une bibliothèque **SwiftUI** : ses composants ne sont pas portables tels quels vers
le web. Le travail a donc consisté à **reprendre la signature visuelle et comportementale** de chaque
composant ShipSwift et à les **réimplémenter en HTML/CSS/Canvas/SVG**, alignés sur la charte
Analystaff v2.0.

## Mapping ShipSwift → implémentation web

| Composant ShipSwift | Rôle dans ShipSwift | Implémentation web | Fichier |
|---|---|---|---|
| `SWRadarChart` | Radar multi-séries, animation d'entrée | Canvas 2D, 4 piliers, 2 séries (joueur + moyenne groupe en pointillé), animation easing 1,2 s | `app.js` → `drawRadar()` |
| `SWRingChart` | Anneaux concentriques | SVG, 4 anneaux (charge par séance), `stroke-dashoffset` animé en cascade | `app.js` → `renderRings()` |
| `SWActivityHeatmap` | Grille d'activité type contributions | SVG généré, 12 semaines × 7 jours, 5 niveaux, `title` au survol | `app.js` → `renderHeat()` |
| `SWDonutChart` | Donut avec focus au tap | SVG, arcs calculés, **clic sur la légende → arc agrandi + filtre du tableau** | `app.js` → `renderDonut()` |
| `SWAnimatedMeshGradient` | Fond dégradé maillé animé | Canvas, 9 gradients radiaux interpolés en boucle 7 s | `app.js` → `meshGradient()` |
| `SWChromaticGlass` / `SWShimmer` | Surfaces translucides + reflet | Équivalent CSS : `backdrop`/`shadow-1/2`, badges soft, transitions 120 ms | `index.html` (CSS) |
| `SWNetworkGraph` | Graphe de relations | Non repris dans ce mockup (pas de besoin identifié sur le dashboard) | — |

## Charte Analystaff v2.0 respectée

- **Couleurs** : primaire `#1E3A5F` (navy), accent succès `#10B981`, alerte `#F59E0B`, danger `#DC2626`, info `#2563EB`
- **Piliers** : Physique `#E53935` · Technique `#1E88E5` · Tactique `#8E24AA` · Mental `#F59E0B`
- **Typo** : Space Grotesk pour les **chiffres** (`--font-data`), Inter pour le texte
- **Icônes** : SVG inline, tracé 2 px, `stroke-linecap: round` — zéro emoji
- **Tokens CSS** : tout passe par variables (`--surface`, `--line`, `--r-md`, `--shadow-1`…) dans `:root`

## Structure de l'écran

1. **Barre de KPI** — note moyenne, assiduité, charge hebdo, ratio charge aiguë/chronique (sparklines)
2. **Profil 4 piliers** — radar commutable *Joueur (vs moyenne)* / *Groupe*, + sélection rapide
3. **Charge d'entraînement** — anneaux par séance + ratio aiguë/chronique
4. **Assiduité** — heatmap 12 semaines + série en cours
5. **État de l'effectif** — donut cliquable (filtre le tableau)
6. **Notes du banc** — la parole du staff (préparateur, kiné, adjoint, entraîneur)
7. **Effectif disponible** — tableau 24 joueurs, filtres Tous/Dispo/Alertes
8. **Analyse IA** — lecture tactique du prochain match + 3 recommandations concrètes
9. **Alertes** — charge, dossier médical, administratif
10. **Derniers matchs** + **Évolution de la charge** (10 semaines)

## Lancer

```bash
systemctl --user status analystaff-mockup.service   # port 8140
# ou manuellement :
python3 /data/projects/06-data-ai/analystaff/mockup-dashboard/server.py
```

→ http://100.70.168.107:8140/

## Fichiers

- `index.html` — structure + design system (tokens CSS)
- `app.js` — composants (radar, anneaux, heatmap, donut, sparklines, mesh gradient)
- `server.py` — serveur statique minimal
- `captures/` — captures de validation (desktop, mobile, zooms)

## Notes de validation

Captures vérifiées par analyse visuelle (Gemini) : labels du radar non tronqués, texte central des
anneaux dégagé, valeur ACWR lisible, barres de charge complètes, notes du staff non coupées,
responsive mobile 390 px sans débordement.
