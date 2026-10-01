"""
Import d'un effectif depuis un CSV.

Choix produit
-------------
Le club fournit sa liste de joueurs sous forme de CSV. Le format de référence
est `template_import_joueurs.csv` :

    Nom,Prénom,Date_Naissance,Poste,Numéro,Téléphone,Email
    Ndiaye,Moussa,15/03/2002,ATT,9,77XXXXXXX,moussa@email.sn

Trois partis pris, tous visibles dans les tests :

1. **Colonnes reconnues sans distinction d'accents ni de casse.** « Prenom »,
   « PRÉNOM » et « prenom » désignent la même colonne. Un club qui écrit son
   CSV dans un tableur n'y pensera pas.

2. **Colonnes ignorées explicitement.** Le template officiel contient
   Téléphone et Email, que la table `players` ne porte pas (SCHEMA_SQL §6.1).
   Elles sont acceptées et écartées, pas rejetées : refuser le fichier officiel
   du produit serait absurde.

3. **Rejet ligne par ligne, jamais de_devinette.** Une date illisible ou un
   poste inconnu n'abandonne pas l'import : la ligne est signalée avec sa
   raison et les autres passent. Un joueur mal classé reçoit la mauvaise
   pondération en silence — mieux vaut une ligne refusée et visible.

Dates au format JJ/MM/AAAA, comme dans le template. L'ISO (YYYY-MM-DD) est
aussi accepté : Excel français exporte parfois dans l'un ou l'autre, et
refuser la moitié des fichiers réels n'aide personne.
"""

from __future__ import annotations

import csv
import io
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Optional

from app.players.postes import LIBELLES, _sans_accent, resoudre
from app.players.schemas import PlayerCreate

# ─── Reconnaissance des en-têtes ────────────────────────────────────────────────

_NOM = "nom"
_PRENOM = "prenom"
_DATE = "date_naissance"
_POSTE = "poste"
_NUMERO = "numero"

#: En-tête canonique -> synonymes acceptés. Comparaison faite sur la forme
#: normalisée (minuscules, sans accent, sans ponctuation).
COLONNES: dict[str, tuple[str, ...]] = {
    _NOM: ("nom", "nomjoueur", "nomdefamille", "lastname", "nomdejoueur"),
    _PRENOM: ("prenom", "firstname", "prenomdujoueur"),
    _DATE: ("datenaissance", "datedenaissance", "naissance", "datenais", "birthdate"),
    _POSTE: ("poste", "postejoueur", "position", "role"),
    _NUMERO: ("numero", "numeromaillot", "maillot", "num", "dossard"),
}

#: Colonnes présentes dans des fichiers de club mais absentes de la table
#: players : acceptées puis écartées (voir le module, point 2).
COLONNES_IGNOREES: tuple[str, ...] = (
    "telephone",
    "portable",
    "tel",
    "telmobile",
    "email",
    "mail",
    "courriel",
    "nationalite",
    "licence",
    "nolicence",
    "sexe",
    "groupe",
    "equipe",
)

_TOUTES = {c for synonymes in COLONNES.values() for c in synonymes} | set(
    COLONNES_IGNOREES
)


def _cle(valeur: str) -> str:
    """Forme de comparaison d'un en-tête : minuscules, sans accent ni séparateur.

    Les synonymes de COLONNES sont écrits en ASCII : « Prénom » doit se
    normaliser en « prenom » sans accent, sinon la colonne du template
    officiel ne serait jamais reconnue.
    """
    return (
        _sans_accent(valeur.strip().lower())
        .replace(" ", "")
        .replace("-", "")
        .replace("_", "")
        .replace("'", "")
        .replace("’", "")
    )


# ─── Résultat ───────────────────────────────────────────────────────────────────


@dataclass
class LigneRejetee:
    """Une ligne du CSV qui n'a pas pu être importée."""

    ligne: int
    nom: str
    raison: str


@dataclass
class ResultatImport:
    """Ce que l'import a produit. Toujours renvoyé, même en cas d'échec."""

    acceptes: list[PlayerCreate] = field(default_factory=list)
    rejetes: list[LigneRejetee] = field(default_factory=list)
    colonnes_inconnues: list[str] = field(default_factory=list)
    colonnes_ignorees: list[str] = field(default_factory=list)

    @property
    def total_lignes(self) -> int:
        return len(self.acceptes) + len(self.rejetes)


# ─── Dates ──────────────────────────────────────────────────────────────────────


def parse_date(valeur: str) -> date | None:
    """Date au format JJ/MM/AAAA (template) ou ISO AAAA-MM-JJ.

    Renvoie None si la valeur est vide ou illisible : l'appelant décide entre
    « champ laissé vide » et « ligne rejetée ». Une date invalide n'est jamais
    devinée.
    """
    brut = valeur.strip()
    if not brut:
        return None
    for gabarit in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
        try:
            return datetime.strptime(brut, gabarit).date()
        except ValueError:
            continue
    return None


# ─── En-têtes ───────────────────────────────────────────────────────────────────


def _mapper_entetes(champs: list[str] | None) -> tuple[dict[str, int], list[str], list[str]]:
    """Associe chaque colonne du CSV à une clé interne.

    Renvoie (index par colonne, en-têtes inconnus, en-têtes ignorés).
    """
    if not champs:
        return {}, [], []
    index: dict[str, int] = {}
    inconnus: list[str] = []
    ignores: list[str] = []
    for position, brut in enumerate(champs):
        cle = _cle(brut)
        if not cle:
            continue
        trouve = None
        for nom, synonymes in COLONNES.items():
            if cle in synonymes:
                trouve = nom
                break
        if trouve:
            # La première colonne lue gagne : un doublon « nom » / « Nom »
            # ne doit pas écraser une valeur valide.
            index.setdefault(trouve, position)
        elif cle in COLONNES_IGNOREES:
            ignores.append(brut.strip())
        else:
            inconnus.append(brut.strip())
    return index, inconnus, ignores


# ─── Valeurs ────────────────────────────────────────────────────────────────────


def _valeur(ligne: list[str], position: int | None) -> str:
    if position is None or position >= len(ligne):
        return ""
    return ligne[position].strip()


def _parse_numero(brut: str) -> tuple[int | None, str | None]:
    """Numéro de maillot. Renvoie (valeur, raison du refus)."""
    if not brut:
        return None, None
    # 77XXXXXXX et autres gabarits ne sont pas des numéros.
    try:
        numero = int(brut)
    except ValueError:
        return None, f"numéro illisible ({brut!r})"
    if not 1 <= numero <= 99:
        return None, f"numéro hors bornes 1-99 ({numero})"
    return numero, None


# ─── Point d'entrée ─────────────────────────────────────────────────────────────


def _lire(texte: str, separateur: str) -> list[list[str]]:
    return list(csv.reader(io.StringIO(texte), delimiter=separateur))


def parse_csv(contenu: str) -> ResultatImport:
    """Lit un CSV d'effectif et renvoie ce qui est importable.

    Ne lève pas : un fichier imparfait produit un résultat partiel décrit, pas
    une exception. C'est l'appelant (le router) qui décide du commit.
    """
    resultat = ResultatImport()

    # `utf-8-sig` retire le BOM qu'Excel ajoute en UTF-8 : sans cela le premier
    # en-tête devient « ﻿Nom » et la colonne est ignorée silencieusement.
    texte = contenu.lstrip("\ufeff")

    # Séparateur : le template officiel utilise la virgule, mais Excel en
    # configuration française produit un point-virgule. On lit les deux et on
    # garde celui qui reconnaît le plus de colonnes.
    lignes = _lire(texte, ",")
    index, inconnus, ignores = _mapper_entetes(lignes[0] if lignes else [])
    if _NOM not in index:
        lignes_alt = _lire(texte, ";")
        index_alt, inconnus_alt, ignores_alt = _mapper_entetes(
            lignes_alt[0] if lignes_alt else []
        )
        if _NOM in index_alt:
            lignes, index = lignes_alt, index_alt
            inconnus, ignores = inconnus_alt, ignores_alt

    resultat.colonnes_inconnues = inconnus
    resultat.colonnes_ignorees = ignores

    entetes = lignes[0] if lignes else []
    index, inconnus, ignores = _mapper_entetes(entetes)
    resultat.colonnes_inconnues = inconnus
    resultat.colonnes_ignorees = ignores

    if _NOM not in index:
        resultat.rejetes.append(
            LigneRejetee(
                ligne=1,
                nom="",
                raison="colonne « Nom » introuvable — en-têtes : "
                + ", ".join(entetes),
            )
        )
        return resultat

    for numero_ligne, ligne in enumerate(lignes[1:], start=2):
        if not any(cell.strip() for cell in ligne):
            continue  # ligne vide : ni rejetée ni comptée

        nom = _valeur(ligne, index.get(_NOM))
        if not nom:
            resultat.rejetes.append(
                LigneRejetee(ligne=numero_ligne, nom="", raison="nom vide")
            )
            continue

        player, raison = _construire(ligne, index, nom)
        if player is None:
            resultat.rejetes.append(
                LigneRejetee(ligne=numero_ligne, nom=nom, raison=raison or "invalide")
            )
        else:
            resultat.acceptes.append(player)

    return resultat


def _construire(
    ligne: list[str], index: dict[str, int], nom: str
) -> tuple[PlayerCreate | None, str | None]:
    prenom = _valeur(ligne, index.get(_PRENOM)) or None

    poste_brut = _valeur(ligne, index.get(_POSTE))
    poste = None
    if poste_brut:
        poste = resoudre(poste_brut)
        if poste is None:
            libelles = ", ".join(LIBELLES.values())
            return None, f"poste inconnu ({poste_brut!r}) — attendu parmi : {libelles}"

    numero, raison = _parse_numero(_valeur(ligne, index.get(_NUMERO)))
    if raison:
        return None, raison

    date_brut = _valeur(ligne, index.get(_DATE))
    date_naissance = None
    if date_brut:
        date_naissance = parse_date(date_brut)
        if date_naissance is None:
            return None, f"date illisible ({date_brut!r}) — attendu JJ/MM/AAAA"

    return (
        PlayerCreate(
            nom=nom,
            prenom=prenom,
            poste=poste,
            numero=numero,
            date_naissance=date_naissance,
        ),
        None,
    )
