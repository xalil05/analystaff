# Analystaff — Design Tokens v2.0

## Palette (Light Mode)

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg` | #F8FAFC | Fond principal |
| `--surface` | #FFFFFF | Cartes, modales |
| `--surface-2` | #F1F5F9 | Zones secondaires, table header |
| `--text-strong` | #1E293B | Titres, valeurs importantes |
| `--text` | #334155 | Texte courant |
| `--muted` | #64748B | Labels, sous-titres, meta |
| `--faint` | #94A3B8 | Texte très secondaire |
| `--line` | #E2E8F0 | Bordures légères |
| `--line-strong` | #CBD5E1 | Bordures visibles |
| `--primary` | #10B981 | Vert émeraude — actions, positif |
| `--primary-hover` | #059669 | Hover primaire |
| `--primary-soft` | #D1FAE5 | Background badges positifs |
| `--on-primary` | #064E3B | Texte sur bouton primaire |
| `--secondary` | #1E3A5F | Bleu nuit — sidebar, boutons AI |
| `--on-dark` | #F8FAFC | Texte sur fond sombre |
| `--on-dark-dim` | #94A3B8 | Texte atténué sur sombre |
| `--accent` | #F59E0B | Ambre — warning, charge haute |
| `--accent-d` | #B45309 | Ambre foncé — texte warning |
| `--destructive` | #DC2626 | Rouge — blessé, négatif |
| `--info` | #2563EB | Bleu — suspendu, info |

## 4 Piliers Joueurs

| Pilleur | Hex | Usage |
|---------|-----|-------|
| Physique | #E53935 | Radar + barres |
| Technique | #1E88E5 | Radar + barres |
| Tactique | #8E24AA | Radar + barres |
| Mental | #F59E0B | Radar + barres |

## Badges Statut

| Statut | BG | Text |
|--------|-----|------|
| Disponible | #D1FAE5 | #059669 |
| Blessé | #FEE2E2 | #DC2626 |
| Récupération | #FEF3C7 | #B45309 |
| Suspendu | #DBEAFE | #1D4ED8 |

## Typo

- **UI** : Inter (400, 500, 600, 700)
- **Données** : Space Grotesk (500, 600, 700)
- **Hiérarchie** : 10.5px (labels) → 12.5px (body) → 14px (card title) → 20px (page title) → 28px (KPI value)

## Spacing

- `--space-1` : 4px
- `--space-2` : 8px
--space-3` : 12px
- `--space-4` : 16px
- `--space-6` : 24px
- `--space-8` : 32px

## Radius

- `--r-sm` : 8px (boutons, badges)
- `--r-md` : 12px (cartes)
- `--r-lg` : 20px (grandes cartes)

## Shadows

- `--shadow-1` : 0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.07)
- `--shadow-2` : 0 2px 6px -1px rgba(15,23,42,0.07), 0 6px 16px -4px rgba(15,23,42,0.1)
- `--shadow-3` : 0 12px 32px -8px rgba(15,23,42,0.18)

## Responsive

- **Desktop** : > 1200px (sidebar 232px + content 1440px max)
- **Tablette** : 768-1200px (sidebar hidden, grid 2 colonnes)
- **Mobile** : ≤ 768px (single column, KPI stacked)

## Composants

1. **Sidebar** — 232px sticky, fond secondaire, nav items avec indicateur actif
2. **Topbar** — sticky, titre + chips + boutons action
3. **KPI Card** — valeur numérique + label + delta + icône colorée
4. **Table** — header surface-2, rows hover primary-strong, avatar initiales
5. **Badge** — pill 999px, uppercase, 10.5px, 600
6. **Charge Bar** — hauteur variable, couleur selon seuil (vert <70, ambre 70-85, rouge >85)
7. **Match Row** — badge résultat (V/N/D) + score + adversaire + meta
8. **Note Card** — avatar + texte italic + bordure gauche primaire
9. **Alert Card** — icône colorée + titre + risque + description
10. **AI Card** — dégradé fond secondaire → plus sombre, texte blanc
