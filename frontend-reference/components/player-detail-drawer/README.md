# PlayerDetailDrawer — Composant fiche joueur Analystaff

## Vue d'ensemble

Composant React/TypeScript pour la fiche joueur d'Analystaff, conçu selon les contraintes de `DECISIONS_FIGEES.md` :

| Contrainte | Implémentation |
|---|---|
| §8 RBAC par section | Onglets Médical/Physique masqués selon permissions |
| §4 Contexte de saisie | Badge `saisie au stade · 09/08 21:14` sur chaque note |
| §14 Snapshot pondération | Tooltip au survol de la note globale |
| §11 Boutons IA métier | 4 boutons contextuels, zéro prompt libre |
| §3 Export PDF V0 | Bouton PDF dans le header |
| §26 Mobile-first | Drawer responsive, radar tactile |

## Fichiers

```
player-detail-drawer/
├── types.ts                    # Types TypeScript (alignés SCHEMA_SQL.md)
├── PlayerDetailDrawer.tsx      # Composant principal
├── index.ts                    # Exports
└── README.md                   # Ce fichier
```

## Intégration

### 1. Installation dans le frontend Next.js

```bash
# Copier les fichiers dans le projet frontend
cp -r player-detail-drawer /data/projects/06-data-ai/analystaff/frontend/components/
```

### 2. Utilisation basique

```tsx
import { PlayerDetailDrawer } from '@/components/player-detail-drawer';

// Dans votre page Effectif :
<PlayerDetailDrawer
  player={{
    id: 1,
    nom: 'Diop',
    prenom: 'Moussa',
    photoUrl: null,
    poste: 'Attaquant',
    numero: 9,
    dateNaissance: '2004-03-15',
    statut: 'actif',
  }}
  physical={{
    tailleCm: 180,
    poidsKg: 75,
    imc: 23.1,
    chargeTravail: 72,
  }}
  evaluations={/* depuis GET /api/v1/players/{id}/evaluations */}
  medicalRecords={/* depuis GET /api/v1/players/{id}/medical */}
  charge7Jours={/* depuis GET /api/v1/players/{id}/charge */}
  clubMoyenne={/* depuis GET /api/v1/clubs/me/moyenne-piliers */}
  userPermissions={/* depuis le contexte auth */}
  onClose={() => setDrawerOpen(false)}
  onExportPdf={() => handleExportPdf(player.id)}
  onEvaluer={() => router.push(`/evaluer/${player.id}`)}
  onIaAction={(actionKey) => handleIaAction(actionKey, player.id)}
/>
```

### 3. Récupération des permissions

Les permissions proviennent du backend via `GET /api/v1/auth/me` :

```tsx
// Dans votre store Zustand ou contexte auth
const { userPermissions } = useAuthStore();

// Le backend retourne :
// {
//   "permissions": [
//     "VOIR_DONNEES_PHYSIQUES",
//     "VOIR_DONNEES_MEDICALES",
//     "EVALUER_ENTRAINEMENT"
//   ]
// }
```

## Permissions RBAC

| Permission | Accès |
|---|---|
| Aucune permission spéciale | Vue d'ensemble uniquement (identité + stats sportives) |
| `VOIR_DONNEES_PHYSIQUES` | + Onglet Physique (morphologie + charge 7j) |
| `VOIR_DONNEES_MEDICALES` | + Onglet Médical (blessures, dossier) |

**Hiérarchie stricte (§7 DECISIONS_FIGEES.md) :** un adjoint ne voit jamais les données d'un autre membre du staff.

## API endpoints requis

| Endpoint | Usage |
|---|---|
| `GET /api/v1/players/{id}` | Identité joueur |
| `GET /api/v1/players/{id}/physical` | Données physiques |
| `GET /api/v1/players/{id}/evaluations` | 5 derniers matchs + snapshot |
| `GET /api/v1/players/{id}/medical` | Dossier médical (filtré par RBAC côté serveur) |
| `GET /api/v1/players/{id}/charge` | Charge 7 jours |
| `GET /api/v1/clubs/me/moyenne-piliers` | Moyenne club pour le radar |
| `POST /api/v1/ai/actions/{key}` | Déclencher une action IA métier |
| `GET /api/v1/players/{id}/export-pdf` | Export PDF |

## Design tokens

Le composant utilise les CSS variables définies dans `design-tokens.md` :

```css
@import '@/styles/tokens.css';
```

## Accessibilité

- Navigation clavier (Tab entre les onglets, Escape pour fermer)
- Attributs ARIA à ajouter lors de l'intégration finale
- Contraste WCAG AA vérifié (texte #1E293B sur fond #FFFFFF)

## Ce qui n'est PAS dans le V0 (exclus intentionnellement)

- ❌ Historique des clubs (table inexistante en V0)
- ❌ Séance du jour (module Entraînement, pas fiche joueur)
- ❌ Notes médicales granulaires (simplifiées au schema `medical_records`)
- ❌ Prompt libre (zéro champ texte pour l'IA)
- ❌ Mode édition inline (le V0 est en lecture seule sur la fiche)

## Voir aussi

- `DECISIONS_FIGEES.md` — contraintes produit
- `SCHEMA_SQL.md` — schéma base de données
- `design-tokens.md` — palette et typographie
- `frontend-reference/fiche-joueur-xps.html` — maquette XPS d'origine
