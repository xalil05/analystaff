"""
Vocabulaire canonique des postes de football.

Source de vérité unique pour :
- le front (`frontend/src/lib/postes.ts` en est le portage TypeScript),
- l'import CSV (`app/players/importer.py`),
- le rattachement d'un joueur à son groupe de poste pour la pondération.

Pourquoi ce module existe
------------------------
`players.poste` est un VARCHAR(50) libre : la base n'impose rien. Avant ce
module, le vocabulaire était réinventé dans sept fichiers du front avec des
listes divergentes (7 postes ici, 12 là), et rien ne faisait autorité. Un
parseur d'import qui mappe « ATT » vers un code canonique suppose que ce code
existe et soit unique — c'est ce qui manquait.

Deux notions à ne pas confondre
-------------------------------
1. Le poste fin : 12 valeurs, la taxonomie du métier ci-dessous.
2. Le groupe de pondération : `PosteGroupe`, le type PostgreSQL
   `poste_groupe` à 4 valeurs (gardien, défenseur, milieu, attaquant), qui
   choisit la ligne de `weighting_matrices` utilisée pour la note globale.

Le pont est `groupe_de()`. La taxonomie métier compte une ligne
supplémentaire — l'animation latérale — qui n'a pas de groupe en base : ses
deux postes sont donc repliés, l'ailier sur `attaquant` et le milieu
excentré sur `milieu`. Le rôle réel prime sur la ligne. Ouvrir un cinquième
groupe exigerait un ALTER TYPE et une colonne de pondération par ligne.

`players.poste_groupe` n'existe toujours pas en base : l'évaluation le reçoit
en paramètre (`EvaluationCreate.poste_groupe`, qui le signale dans sa
docstring). Ce module fournit la correspondance pour que l'appelant n'ait
plus à la réinventer.
"""

from __future__ import annotations

from app.core.enums import PosteGroupe

# ─── Postes ──────────────────────────────────────────────────────────────────────
# Codes en MAJUSCULES_SANS_ESPACE, alignés sur ce que la base contient déjà
# (ATTAQUANT, MILIEU_CENTRAL, DEFENSEUR_CENTRAL) et sur SCHEMA_SQL.md §6.1.

# Gardien
ARRET_DE_GARD = "ARRET_DE_GARD"
GARDIEN = "GARDIEN"

# Ligne défensive
DEFENSEUR_CENTRAL = "DEFENSEUR_CENTRAL"
LATERAL_DROIT = "LATERAL_DROIT"
LATERAL_GAUCHE = "LATERAL_GAUCHE"
PISTON_DROIT = "PISTON_DROIT"
PISTON_GAUCHE = "PISTON_GAUCHE"

# Ligne milieu
MILIEU_DEFENSIF = "MILIEU_DEFENSIF"
MILIEU_RELOYEUR = "MILIEU_RELOYEUR"
MILIEU_OFFENSIF = "MILIEU_OFFENSIF"

# Ligne animation latérale
AILIER_DROIT = "AILIER_DROIT"
AILIER_GAUCHE = "AILIER_GAUCHE"
MILIEU_EXCENTRE_DROIT = "MILIEU_EXCENTRE_DROIT"
MILIEU_EXCENTRE_GAUCHE = "MILIEU_EXCENTRE_GAUCHE"

# Ligne offensive
AVANT_CENTRE = "AVANT_CENTRE"
SECOND_ATTAQUANT = "SECOND_ATTAQUANT"

POSTES: tuple[str, ...] = (
    ARRET_DE_GARD,
    GARDIEN,
    DEFENSEUR_CENTRAL,
    LATERAL_DROIT,
    LATERAL_GAUCHE,
    PISTON_DROIT,
    PISTON_GAUCHE,
    MILIEU_DEFENSIF,
    MILIEU_RELOYEUR,
    MILIEU_OFFENSIF,
    AILIER_DROIT,
    AILIER_GAUCHE,
    MILIEU_EXCENTRE_DROIT,
    MILIEU_EXCENTRE_GAUCHE,
    AVANT_CENTRE,
    SECOND_ATTAQUANT,
)

#: Libellé affiché dans l'interface.
LIBELLES: dict[str, str] = {
    ARRET_DE_GARD: "Arrêt de garde",
    GARDIEN: "Gardien",
    DEFENSEUR_CENTRAL: "Défenseur central",
    LATERAL_DROIT: "Latéral droit",
    LATERAL_GAUCHE: "Latéral gauche",
    PISTON_DROIT: "Piston droit",
    PISTON_GAUCHE: "Piston gauche",
    MILIEU_DEFENSIF: "Milieu défensif",
    MILIEU_RELOYEUR: "Milieu relayeur",
    MILIEU_OFFENSIF: "Milieu offensif",
    AILIER_DROIT: "Ailier droit",
    AILIER_GAUCHE: "Ailier gauche",
    MILIEU_EXCENTRE_DROIT: "Milieu excentré droit",
    MILIEU_EXCENTRE_GAUCHE: "Milieu excentré gauche",
    AVANT_CENTRE: "Avant-centre",
    SECOND_ATTAQUANT: "Second attaquant",
}

#: Ligne de jeu, pour regrouper les postes dans l'interface. Distincte du
#: groupe de pondération : l'animation latérale est une ligne du métier sans
#: groupe correspondant en base.
LIGNES: dict[str, str] = {
    ARRET_DE_GARD: "gardien",
    GARDIEN: "gardien",
    DEFENSEUR_CENTRAL: "defensif",
    LATERAL_DROIT: "defensif",
    LATERAL_GAUCHE: "defensif",
    PISTON_DROIT: "defensif",
    PISTON_GAUCHE: "defensif",
    MILIEU_DEFENSIF: "milieu",
    MILIEU_RELOYEUR: "milieu",
    MILIEU_OFFENSIF: "milieu",
    AILIER_DROIT: "animation_laterale",
    AILIER_GAUCHE: "animation_laterale",
    MILIEU_EXCENTRE_DROIT: "animation_laterale",
    MILIEU_EXCENTRE_GAUCHE: "animation_laterale",
    AVANT_CENTRE: "attaquant",
    SECOND_ATTAQUANT: "attaquant",
}

LIBELLES_LIGNE: dict[str, str] = {
    "gardien": "Gardien",
    "defensif": "Postes défensifs",
    "milieu": "Postes du milieu de terrain",
    "animation_laterale": "Postes d'animation latérale",
    "attaquant": "Postes attaquants",
}

#: Rôle du poste, pour l'aide à la saisie. Une phrase, pas un paragraphe.
ROLES: dict[str, str] = {
    ARRET_DE_GARD: "Spécialiste de la surface de réparation, au poste de l'entraîneur.",
    GARDIEN: "Le gardien de but.",
    DEFENSEUR_CENTRAL: "Le pilier de l'axe : stoppe les attaquants axiaux et gagne les duels aériens.",
    LATERAL_DROIT: "Le protecteur du côté droit : défend dans son couloir et apporte le surnombre en attaque.",
    LATERAL_GAUCHE: "Le protecteur du côté gauche : défend dans son couloir et apporte le surnombre en attaque.",
    PISTON_DROIT: "Poste ultra-physique des défenses à 3 : anime seul tout son couloir, de la défense jusqu'à l'attaque.",
    PISTON_GAUCHE: "Poste ultra-physique des défenses à 3 : anime seul tout son couloir, de la défense jusqu'à l'attaque.",
    MILIEU_DEFENSIF: "Le bouclier devant la défense : ratisse, coupe les passes adverses et oriente le premier ballon.",
    MILIEU_RELOYEUR: "Le moteur de l'équipe : fait la transition défense-attaque, capable de tacler et de se projeter.",
    MILIEU_OFFENSIF: "Le créateur, placé derrière les attaquants : dicte le rythme et distribue les passes décisives.",
    AILIER_DROIT: "L'attaquant de couloir droit : rapide et technique, cherche le débordement et le centre.",
    AILIER_GAUCHE: "L'attaquant de couloir gauche : rapide et technique, cherche le débordement et le centre.",
    MILIEU_EXCENTRE_DROIT: "Plus défensif qu'un ailier classique : aide son latéral et construit depuis le côté droit.",
    MILIEU_EXCENTRE_GAUCHE: "Plus défensif qu'un ailier classique : aide son latéral et construit depuis le côté gauche.",
    AVANT_CENTRE: "La pointe de l'attaque : joue dos au jeu, sert de point d'appui et rôde dans la surface.",
    SECOND_ATTAQUANT: "Électron libre : tourne autour du buteur et exploite les espaces qu'il crée.",
}


# ─── Groupes (pour la pondération) ───────────────────────────────────────────────

_GROUPES: dict[str, PosteGroupe] = {
    ARRET_DE_GARD: PosteGroupe.gardien,
    GARDIEN: PosteGroupe.gardien,
    DEFENSEUR_CENTRAL: PosteGroupe.defenseur,
    LATERAL_DROIT: PosteGroupe.defenseur,
    LATERAL_GAUCHE: PosteGroupe.defenseur,
    PISTON_DROIT: PosteGroupe.defenseur,
    PISTON_GAUCHE: PosteGroupe.defenseur,
    MILIEU_DEFENSIF: PosteGroupe.milieu,
    MILIEU_RELOYEUR: PosteGroupe.milieu,
    MILIEU_OFFENSIF: PosteGroupe.milieu,
    # Repli de l'animation latérale : pas de groupe en base. Le rôle prime
    # sur la ligne — un ailier est un attaquant, un milieu excentré un milieu.
    AILIER_DROIT: PosteGroupe.attaquant,
    AILIER_GAUCHE: PosteGroupe.attaquant,
    MILIEU_EXCENTRE_DROIT: PosteGroupe.milieu,
    MILIEU_EXCENTRE_GAUCHE: PosteGroupe.milieu,
    AVANT_CENTRE: PosteGroupe.attaquant,
    SECOND_ATTAQUANT: PosteGroupe.attaquant,
}


def groupe_de(poste: str | None) -> PosteGroupe | None:
    """Groupe de poste servant à choisir la matrice de pondération.

    Accepte un code canonique, un libellé, ou un code d'import (« GK », « MC »).
    Renvoie None si le poste est inconnu — l'appelant décide du repli.
    """
    if poste is None:
        return None
    return _GROUPES.get(normaliser(poste))


def normaliser(valeur: str | None) -> str:
    """Ramène une écriture libre au code canonique (majuscules, sans accent).

    « milieu central », « MILIEU_CENTRAL », « Milieu Central » donnent tous
    MILIEU_CENTRAL. Les espaces autour sont retirés : un CSV les contient
    souvent. Renvoie une chaîne vide si la valeur est vide.
    """
    if not valeur:
        return ""
    return _sans_accent(valeur).strip().upper().replace(" ", "_").replace("-", "_")


# ─── Synonymes d'import ──────────────────────────────────────────────────────────
# Les clubs n'emploient pas nos codes. Le template officiel
# (template_import_joueurs.csv) utilise ATT / MC / DC / GK, mais un club réel
# peut écrire autrement. Toute valeur non reconnue est rejetée ligne par ligne
# plutôt que devinée : une erreur visible vaut mieux qu'un joueur mal classé.

SYNONYMES: dict[str, str] = {
    # ── Gardiens
    "GK": GARDIEN,
    "G": GARDIEN,
    "GO": GARDIEN,
    "GARD": GARDIEN,
    "PORTIER": GARDIEN,
    "ARRET_DE_GARDE": ARRET_DE_GARD,
    # ── Défenseurs centraux
    "DC": DEFENSEUR_CENTRAL,
    "CB": DEFENSEUR_CENTRAL,
    "DEF": DEFENSEUR_CENTRAL,
    "DEFC": DEFENSEUR_CENTRAL,
    "CENTRE": DEFENSEUR_CENTRAL,
    "DEFENSEUR_CENTRE": DEFENSEUR_CENTRAL,
    # « défenseur » sans précision : la taxonomie n'a pas de poste
    # générique, on retient le central, le plus fréquent.
    "DEFENSEUR": DEFENSEUR_CENTRAL,
    # ── Latéraux
    "DL": LATERAL_DROIT,
    "LB": LATERAL_DROIT,
    "LD": LATERAL_DROIT,
    "DR": LATERAL_DROIT,
    "LAT": LATERAL_DROIT,
    "LATERAL_DROIT": LATERAL_DROIT,
    "DG": LATERAL_GAUCHE,
    "RB": LATERAL_GAUCHE,
    "LG": LATERAL_GAUCHE,
    "GAU": LATERAL_GAUCHE,
    "LATERAL_GAUCHE": LATERAL_GAUCHE,
    # ── Pistons (défense à 3)
    "PD": PISTON_DROIT,
    "PS_D": PISTON_DROIT,
    "PISTON_D": PISTON_DROIT,
    "PG": PISTON_GAUCHE,
    "PS_G": PISTON_GAUCHE,
    "PISTON_G": PISTON_GAUCHE,
    # ── Milieux
    "MDC": MILIEU_DEFENSIF,
    "MD": MILIEU_DEFENSIF,
    "DEFENSIF": MILIEU_DEFENSIF,
    "SENTINELLE": MILIEU_DEFENSIF,
    "M6": MILIEU_DEFENSIF,
    "MC": MILIEU_RELOYEUR,
    "M8": MILIEU_RELOYEUR,
    "MI": MILIEU_RELOYEUR,
    "M": MILIEU_RELOYEUR,
    "RELOYEUR": MILIEU_RELOYEUR,
    "RECURRENT": MILIEU_RELOYEUR,
    "MOC": MILIEU_OFFENSIF,
    "MO": MILIEU_OFFENSIF,
    "M10": MILIEU_OFFENSIF,
    "MENEUR": MILIEU_OFFENSIF,
    "OFFENSIF": MILIEU_OFFENSIF,
    "MILIEU_CENTRAL": MILIEU_RELOYEUR,
    "MILIEU": MILIEU_RELOYEUR,
    # ── Animation latérale
    "AD": AILIER_DROIT,
    "AID": AILIER_DROIT,
    "AG": AILIER_GAUCHE,
    "AIG": AILIER_GAUCHE,
    "AILIER": AILIER_DROIT,
    "MED": MILIEU_EXCENTRE_DROIT,
    "MEC": MILIEU_EXCENTRE_DROIT,
    "EXCENTRE_D": MILIEU_EXCENTRE_DROIT,
    "MEG": MILIEU_EXCENTRE_GAUCHE,
    "MEC_G": MILIEU_EXCENTRE_GAUCHE,
    "EXCENTRE_G": MILIEU_EXCENTRE_GAUCHE,
    # ── Attaquants
    # « ATT » est le code du template officiel et recouvre l'avant-centre
    # comme le second attaquant. La taxonomie du métier n'a plus de poste
    # « attaquant » générique, donc il est interprété comme avant-centre —
    # c'est le plus fréquent et le club pourra corriger en éditant.
    "ATT": AVANT_CENTRE,
    "AT": AVANT_CENTRE,
    "BU": AVANT_CENTRE,
    "AC": AVANT_CENTRE,
    "AV": AVANT_CENTRE,
    "AVANT": AVANT_CENTRE,
    "N9": AVANT_CENTRE,
    "ATTAQUANT": AVANT_CENTRE,
    "SA": SECOND_ATTAQUANT,
    "N9_5": SECOND_ATTAQUANT,
    "SECOND": SECOND_ATTAQUANT,
    "RET": SECOND_ATTAQUANT,
}


def resoudre(valeur: str | None) -> str | None:
    """Code canonique d'un poste saisi librement.

    Accepte un code canonique, un synonyme d'import ou un libellé français.
    Renvoie None si la valeur est vide ou si elle ne correspond à rien — un
    poste inconnu doit être signalé à l'utilisateur, jamais deviné : un joueur
    mal classé reçoit la mauvaise pondération, en silence.
    """
    norm = normaliser(valeur)
    if not norm:
        return None
    if norm in LIBELLES:
        return norm
    # Certains codes ne sont pas la graphie de leur libellé : MILIEU_RELOYEUR
    # s'écrit « Milieu relayeur », qui se normalise en MILIEU_RELAYEUR. La
    # comparaison au libellé couvre ces cas.
    for code, libelle in LIBELLES.items():
        if normaliser(libelle) == norm:
            return code
    if norm in SYNONYMES:
        return SYNONYMES[norm]
    return None


def _construire_table_accents() -> dict[int, str]:
    table: dict[int, str] = {}
    paires = (
        ("ÀÁÂÃÄÅàáâãäå", "AAAAAAaaaaaa"),
        ("ÈÉÊËèéêë", "EEEEeeee"),
        ("ÌÍÎÏìíîï", "IIIIiiii"),
        ("ÒÓÔÕÖòóôõö", "OOOOOooooo"),
        ("ÙÚÛÜùúûü", "UUUUuuuu"),
        ("ÝŸýÿ", "YYyy"),
        ("Çç", "Cc"),
        ("Ææ", "AE"),
        ("Œœ", "OE"),
        ("Ññ", "Nn"),
    )
    for accents, remplacants in paires:
        assert len(accents) == len(remplacants), (accents, remplacants)
        for a, r in zip(accents, remplacants, strict=True):
            table[ord(a)] = r
    return table


_ACCENTS = _construire_table_accents()


def _sans_accent(valeur: str) -> str:
    """Retire les accents. Table construite par paires et vérifiée à l'import."""
    return valeur.translate(_ACCENTS)