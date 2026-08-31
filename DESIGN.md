---
version: alpha
name: Analystaff
description: Outil du staff technique de football. Données de performance (radar 4 piliers), charge d'entraînement, effectif, matchs, évaluations. La donnée froide, la voix chaude.
colors:
  background: oklch(0.975 0.004 255)
  surface: oklch(1 0 0)
  surface-2: oklch(0.965 0.005 255)
  foreground: oklch(0.32 0.025 255)
  foreground-strong: oklch(0.22 0.03 255)
  foreground-muted: oklch(0.55 0.02 255)
  foreground-faint: oklch(0.50 0.02 255)
  border: oklch(0.90 0.008 255)
  border-strong: oklch(0.83 0.01 255)
  primary: oklch(0.69 0.15 165)
  primary-hover: oklch(0.45 0.13 165)
  primary-soft: oklch(0.69 0.15 165 / 0.1)
  on-primary: oklch(0.16 0.04 170)
  secondary: oklch(0.29 0.055 255)
  on-dark: oklch(0.96 0.01 255)
  on-dark-dim: oklch(0.75 0.03 255)
  accent: oklch(0.78 0.15 75)
  accent-strong: oklch(0.50 0.12 55)
  destructive: oklch(0.55 0.22 25)
  info: oklch(0.45 0.18 255)
  pillar-physique: oklch(0.55 0.22 25)
  pillar-technique: oklch(0.45 0.18 255)
  pillar-tactique: oklch(0.45 0.19 310)
  pillar-mental: oklch(0.65 0.16 65)
  pillar-physique-text: oklch(0.42 0.2 25)
  pillar-technique-text: oklch(0.38 0.16 255)
  pillar-tactique-text: oklch(0.38 0.17 310)
  pillar-mental-text: oklch(0.53 0.13 55)
typography:
  hero:
    fontFamily: Space Grotesk
    fontSize: 44px
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -0.02em
  h1:
    fontFamily: Space Grotesk
    fontSize: 26px
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -0.02em
  h2:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.2
  h3:
    fontFamily: Space Grotesk
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: Inter
    fontSize: 13.5px
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0.08em
  small:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.5
  tiny:
    fontFamily: Inter
    fontSize: 10.5px
    fontWeight: 500
    lineHeight: 1.4
  num:
    fontFamily: Space Grotesk
    fontSize: 13px
    fontWeight: 700
    lineHeight: 1.2
    fontFeature: tnum
  kpi:
    fontFamily: Space Grotesk
    fontSize: 30px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.02em
    fontFeature: tnum
rounded:
  sm: 8px
  md: 12px
  lg: 20px
  full: 999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  3xl: 48px
  4xl: 64px
  gutter: 24px
  page: 48px
components:
  sidebar:
    backgroundColor: "{colors.secondary}"
    width: 232px
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
  card-footer:
    backgroundColor: "{colors.surface-2}"
  card-title:
    textColor: "{colors.foreground-strong}"
  card-sub:
    textColor: "{colors.foreground-muted}"
  table-header:
    textColor: "{colors.foreground-muted}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
    padding: 9px 16px
  button-primary-hover:
    backgroundColor: oklch(0.72 0.15 165)
  button-ai:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-dark}"
    rounded: "{rounded.sm}"
    padding: 9px 16px
  button-ghost:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.surface}"
    rounded: "{rounded.sm}"
  link:
    textColor: "{colors.info}"
  row-selected:
    backgroundColor: "{colors.primary-soft}"
  badge-fit:
    backgroundColor: "#e7f7f1"
    textColor: "{colors.primary-hover}"
  badge-injured:
    backgroundColor: "#fde9ea"
    textColor: "{colors.pillar-physique-text}"
  badge-reserve:
    backgroundColor: "#fdf1dc"
    textColor: "{colors.accent-strong}"
  badge-info:
    backgroundColor: "#e8f1fc"
    textColor: "{colors.pillar-technique-text}"
  kpi-card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
  kpi-alert-dot:
    backgroundColor: "{colors.accent}"
  offline-banner:
    backgroundColor: "#fdf0d6"
    textColor: "{colors.accent-strong}"
  radar-fill:
    backgroundColor: oklch(0.69 0.15 165 / 0.14)
  legend-dot-physique:
    backgroundColor: "{colors.pillar-physique}"
  legend-dot-technique:
    backgroundColor: "{colors.pillar-technique}"
  legend-dot-tactique:
    backgroundColor: "{colors.pillar-tactique}"
  legend-dot-mental:
    backgroundColor: "{colors.pillar-mental}"
  radar-label-physique:
    textColor: "{colors.pillar-physique-text}"
  radar-label-technique:
    textColor: "{colors.pillar-technique-text}"
  radar-label-tactique:
    textColor: "{colors.pillar-tactique-text}"
  radar-label-mental:
    textColor: "{colors.pillar-mental-text}"
  note-avatar:
    size: 28px
    rounded: "{rounded.full}"
  note-time:
    textColor: "{colors.foreground-faint}"
---

# Analystaff — Le banc technique

## Overview

Analystaff est l'outil du staff, pas du supporter : un banc de touche professionnel où chaque écran sert une décision. Deux forces gouvernent le design : **la donnée froide** — chiffres justes, denses, alignés, le radar comme vitrine — et **la voix chaude** — le banc parle, avec des notes signées, des heures humaines et des phrases de terrain. Le style est un Data-Dense Dashboard : calme, structuré, orienté décision, utilisé au stade en plein soleil sur réseau faible. L'identité visuelle prend les couleurs du terrain (émeraude, bleu nuit, neutres), jamais celles d'un drapeau.

## Colors

Le système repose sur trois dominantes : l'émeraude pour l'action, le bleu nuit pour la structure, et les neutres pour le contenu. L'ambre est un accent mesuré, réservé à ce qui demande attention. Les quatre piliers (Physique rouge, Technique bleu, Tactique violet, Mental ambre) sont des couleurs fixes, cohérentes dans tout le produit : un joueur « physique fort » est rouge partout. Les variantes `-text` (plus foncées) sont obligatoires pour tout texte ou badge sur fond clair. Un seul fond coloré par vue : l'action primaire ; les secondaires restent neutres. Une couleur = un sens, jamais de lien décoratif avec une couleur sémantique.

Le dark mode (V1) repense les surfaces par luminosité au lieu d'inverser : fond très sombre, surfaces échelonnées plus claires, primaire désaturé et monté en luminosité, texte off-white (jamais de blanc pur), bordures en blanc à faible opacité. Chaque paire fond/texte est re-vérifiée en sombre.

## Typography

Inter porte l'interface et le corps : la voix calme. Space Grotesk porte la donnée — notes, RPE, pourcentages, coordonnées — et donne au produit sa personnalité « data ». Un chiffre de donnée ne s'écrit jamais en Inter quand il est une valeur. `tabular-nums` (fontFeature `tnum`) est obligatoire sur tout chiffre en colonne ou en KPI, pour un alignement parfait des colonnes. Une seule emphase par bloc (600 max) : jamais gras + couleur + taille en même temps.

## Layout

Grille 12 colonnes desktop, 8 tablette, 4 mobile, gouttière 24px (16px mobile). Système d'espacement strict de 8pt avec demi-pas de 4px pour les micro-ajustements. Densité maîtrisée : padding de carte 16-24px, lignes de tableau 10px, gap de grille 16px — le produit tient un maximum de décisions visibles sans scrolling inutile. Le contenu principal est borné à 1280px, centré, avec marge de page 48px en desktop.

## Elevation & Depth

La hiérarchie passe par des ombres légères en couches transparentes à trois niveaux (cartes, hover, panneaux), jamais d'ombres lourdes ni de profondeur décorative. Le fond de page est un blanc cassé très légèrement teinté ; les cartes en blanc pur portent le contenu. Les cartes et boutons sont délimités par une bordure 1px `border` (ou `border-strong` pour les éléments plus marqués : boutons ghost, en-têtes de tableau).

## Shapes

Rayons concentriques : l'extérieur vaut l'intérieur plus son padding. 8px pour les inputs et badges, 12px pour les cartes, 20px pour les panneaux et la sidebar, pill complet pour les avatars, chips et boutons de statut. Aucune forme ornée, aucun angle agressif.

## Components

- **Radar 4 piliers (le héros)** : 4 axes 0-10, remplissage émeraude semi-transparent (`radar-fill`), trait 2px, moyenne du club superposable en pointillés, note globale en Space Grotesk 34-44px au centre, légende avec valeurs et barres de proportion, labels d'axes dans les variantes `-text` des piliers. Toujours un commentaire terrain sous la légende.
- **Notes du staff (la voix)** : avatar initiales 28px + nom + rôle + heure humaine (« Hier 18:40 », jamais de timestamp brut). Texte court, concret, qui croise les données du produit. Jamais de note anonyme.
- **KPI cards** : chiffre Space Grotesk 30px (`kpi`), label Inter uppercase 10.5px, delta coloré. Une seule carte peut passer en accent bleu nuit : la priorité du moment.
- **Boutons** : primaire émeraude texte très foncé, IA bleu nuit avec icône ✨ SVG, ghost bordé neutre, destructif rouge à texte clair. Désactivé = opacité 50 % + tooltip qui explique pourquoi.
- **Badges** : Fit émeraude pâle, Blessé rouge pâle, Réserve/Suspendu ambre pâle, sync chaud/froid/ok. Chaque texte de badge utilise la variante foncée de sa couleur (AA garanti).

## Do's and Don'ts

- **Ne pas** utiliser de glassmorphism, HUD/Sci-Fi, néon, 3D décorative, ni d'ombres lourdes.
- **Ne pas** utiliser d'emojis comme icônes — uniquement des SVG Lucide (stroke 2).
- **Ne pas** écrire de hex en dur : tout passe par un token sémantique.
- **Ne pas** animer width/height : transform et opacity uniquement, 150-300ms, `prefers-reduced-motion` respecté.
- **Ne pas** utiliser de jargon mou, d'ém-dash en prose, de voix passive — le banc parle court et concret.
- **Faire** démarrer chaque chargement par un skeleton (jamais d'écran blanc), chaque erreur avec un bouton « Réessayer », chaque état vide avec une action claire.
- **Faire** afficher les boutons IA selon la permission, désactivés avec explication, et les résultats en carte avec Accepter / Modifier / Rejeter (jamais de prompt libre dans le parcours principal).
