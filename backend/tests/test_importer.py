"""
Tests du parseur d'effectif CSV.

Ces tests verrouillent deux décisions produit : un fichier imparfait doit
produire un import partiel décrit (jamais une exception), et une valeur
inconnue doit être signalée plutôt que devinée.
"""
import csv as _csv
import io
from datetime import date

import pytest

from app.players.importer import ResultatImport, parse_csv, parse_date

TEMPLATE = (
    "Nom,Prénom,Date_Naissance,Poste,Numéro,Téléphone,Email\n"
    "Ndiaye,Moussa,15/03/2002,ATT,9,77XXXXXXX,moussa@email.sn\n"
    "Diallo,Amadou,22/07/2001,MC,8,77XXXXXXX,amadou@email.sn\n"
    "Fall,Ibrahima,10/01/2003,DC,4,77XXXXXXX,ibra@email.sn\n"
    "Sow,Ousmane,05/11/2000,GK,1,77XXXXXXX,ousmane@email.sn\n"
    "Ba,Aminata,18/09/2004,ATT,11,77XXXXXXX,aminata@email.sn\n"
)


def ecrire(lignes: list[list[str]], sep: str = ",") -> str:
    tampon = io.StringIO()
    _csv.writer(tampon, delimiter=sep).writerows(lignes)
    return tampon.getvalue()


class TestTemplateOfficiel:
    """Le fichier de référence du produit doit passer intégralement."""

    def test_les_cinq_lignes(self):
        r = parse_csv(TEMPLATE)
        assert len(r.acceptes) == 5
        assert r.rejetes == []

    def test_valeurs(self):
        r = parse_csv(TEMPLATE)
        ndiaye = r.acceptes[0]
        assert ndiaye.nom == "Ndiaye"
        assert ndiaye.prenom == "Moussa"
        assert ndiaye.poste == "AVANT_CENTRE"
        assert ndiaye.numero == 9
        assert ndiaye.date_naissance == date(2002, 3, 15)

    def test_postes_du_template_resolus(self):
        postes = {p.poste for p in parse_csv(TEMPLATE).acceptes}
        assert postes == {
            "AVANT_CENTRE",
            "MILIEU_RELOYEUR",
            "DEFENSEUR_CENTRAL",
            "GARDIEN",
        }

    def test_colonnes_sans_place_en_base(self):
        """Téléphone et Email n'existent pas dans players : acceptées puis
        écartées, sinon le fichier officiel du produit serait refusé."""
        r = parse_csv(TEMPLATE)
        assert sorted(r.colonnes_ignorees) == ["Email", "Téléphone"]
        assert r.colonnes_inconnues == []


class TestEnTetes:
    @pytest.mark.parametrize(
        "entete",
        ["prénom", "PRENOM", "Prenom", "prénom ", "prenom", "Prénom du joueur"],
    )
    def test_variantes_prenom(self, entete):
        r = parse_csv(ecrire([[entete], ["Moussa"]]))
        # Sans colonne Nom, la ligne est rejetée : c'est ce qu'on vérifie ici,
        # c'est que l'en-tête est reconnu et non classé « inconnue ».
        assert r.colonnes_inconnues == []

    def test_en_tetes_sans_accents(self):
        r = parse_csv(ecrire([["Nom", "Prénom", "Numéro"], ["Ndiaye", "Moussa", "9"]]))
        assert r.colonnes_inconnues == []
        assert r.acceptes[0].numero == 9

    def test_separateur_point_virgule(self):
        """Excel en configuration française produit des points-virgules."""
        r = parse_csv(ecrire([["Nom", "Prénom", "Numéro"], ["Ndiaye", "Moussa", "9"]], sep=";"))
        assert len(r.acceptes) == 1
        assert r.acceptes[0].nom == "Ndiaye"

    def test_colonne_nom_absente(self):
        r = parse_csv(ecrire([["Prénom", "Poste"], ["Moussa", "GK"]]))
        assert r.acceptes == []
        assert len(r.rejetes) == 1
        assert "Nom" in r.rejetes[0].raison

    def test_colonne_inconnue_signalee(self):
        r = parse_csv(ecrire([["Nom", "Couleur", "Poste"], ["Ndiaye", "rouge", "GK"]]))
        assert r.colonnes_inconnues == ["Couleur"]
        assert len(r.acceptes) == 1


class TestDates:
    @pytest.mark.parametrize(
        ("brut", "attendu"),
        [
            ("15/03/2002", date(2002, 3, 15)),
            ("01/01/2000", date(2000, 1, 1)),
            ("2002-03-15", date(2002, 3, 15)),
            ("31/12/1999", date(1999, 12, 31)),
        ],
    )
    def test_formats_acceptes(self, brut, attendu):
        assert parse_date(brut) == attendu

    @pytest.mark.parametrize("brut", ["", "   ", "hier", "32/01/2000", "15/13/2002"])
    def test_formats_rejetes(self, brut):
        assert parse_date(brut) is None

    def test_date_illisible_rejette_la_ligne(self):
        r = parse_csv(ecrire([["Nom", "Date_Naissance"], ["Ndiaye", "hier"]]))
        assert r.acceptes == []
        assert "date illisible" in r.rejetes[0].raison

    def test_date_vide_laisse_le_champ_nul(self):
        r = parse_csv(ecrire([["Nom", "Date_Naissance"], ["Ndiaye", ""]]))
        assert len(r.acceptes) == 1
        assert r.acceptes[0].date_naissance is None


class TestPostes:
    @pytest.mark.parametrize(
        ("saisie", "attendu"),
        [("GK", "GARDIEN"), ("DC", "DEFENSEUR_CENTRAL"), ("MC", "MILIEU_RELOYEUR")],
    )
    def test_codes_courts(self, saisie, attendu):
        r = parse_csv(ecrire([["Nom", "Poste"], ["Ndiaye", saisie]]))
        assert r.acceptes[0].poste == attendu

    def test_poste_inconnu_rejette_la_ligne(self):
        r = parse_csv(ecrire([["Nom", "Poste"], ["Ndiaye", "GK2"]]))
        assert r.acceptes == []
        assert "poste inconnu" in r.rejetes[0].raison

    def test_poste_vide_laisse_le_champ_nul(self):
        r = parse_csv(ecrire([["Nom", "Poste"], ["Ndiaye", ""]]))
        assert len(r.acceptes) == 1
        assert r.acceptes[0].poste is None


class TestNumeros:
    def test_numero_valide(self):
        r = parse_csv(ecrire([["Nom", "Numéro"], ["Ndiaye", "9"]]))
        assert r.acceptes[0].numero == 9

    @pytest.mark.parametrize("brut", ["0", "100", "-3"])
    def test_hors_bornes(self, brut):
        r = parse_csv(ecrire([["Nom", "Numéro"], ["Ndiaye", brut]]))
        assert r.acceptes == []
        assert "hors bornes" in r.rejetes[0].raison

    def test_gabarit_non_numerique(self):
        r = parse_csv(ecrire([["Nom", "Numéro"], ["Ndiaye", "10 bis"]]))
        assert "illisible" in r.rejetes[0].raison


class TestImportPartiel:
    """Un fichier imparfait donne un résultat partiel décrit, pas une erreur."""

    def test_ligne_valide_entourant_une_ligne_invalide(self):
        r = parse_csv(
            ecrire(
                [
                    ["Nom", "Poste"],
                    ["Bon", "GK"],
                    ["Mauvais", "GK2"],
                    ["Bon aussi", "DC"],
                ]
            )
        )
        assert len(r.acceptes) == 2
        assert [x.nom for x in r.acceptes] == ["Bon", "Bon aussi"]
        assert len(r.rejetes) == 1
        assert r.rejetes[0].ligne == 3
        assert r.rejetes[0].nom == "Mauvais"

    def test_nom_vide(self):
        r = parse_csv(ecrire([["Nom", "Poste"], ["", "GK"]]))
        assert r.rejetes[0].raison == "nom vide"

    def test_lignes_vides_ignorees(self):
        r = parse_csv(ecrire([["Nom", "Poste"], ["Ndiaye", "GK"], [], ["", ""]]))
        assert len(r.acceptes) == 1
        assert r.rejetes == []

    def test_numeros_de_ligne_commenc_a_2(self):
        """La ligne 1 est l'en-tête : une erreur doit pointer vers le bon
        numéro de fichier, sinon le coach cherche au mauvais endroit."""
        r = parse_csv(ecrire([["Nom", "Poste"], ["Ndiaye", "GK2"]]))
        assert r.rejetes[0].ligne == 2

    def test_rien_ne_leve(self):
        for contenu in ("", "   ", "sans,colonnes", ",,,", "Nom\n"):
            parse_csv(contenu)  # ne doit rien lever

    def test_total_lignes(self):
        r = parse_csv(ecrire([["Nom", "Poste"], ["A", "GK"], ["B", "GK2"]]))
        assert r.total_lignes == 2


class TestBomExcel:
    def test_bom_utf8(self):
        """Excel préfixe le fichier d'un BOM : sans retrait, la colonne Nom
        devient invisible et tout le fichier est refusé."""
        r = parse_csv("﻿" + TEMPLATE)
        assert len(r.acceptes) == 5