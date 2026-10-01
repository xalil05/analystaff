"""
Tests du vocabulaire de postes.

Ces tests verrouillent la fondation dont dépend l'import CSV : si un code
canonique ou un synonyme change, l'import d'un club change de comportement.

La taxonomie est celle du métier : 16 postes répartis sur 5 lignes, dont
l'animation latérale qui n'a pas de groupe de pondération en base et se
replie sur deux groupes existants.
"""
import pytest

from app.players.postes import (
    LIGNES,
    LIBELLES,
    LIBELLES_LIGNE,
    POSTES,
    ROLES,
    groupe_de,
    normaliser,
    resoudre,
)


class TestTemplateOfficiel:
    """Le template_import_joueurs.csv ne doit jamais être refusé."""

    @pytest.mark.parametrize(
        ("saisie", "attendu"),
        [
            ("ATT", "AVANT_CENTRE"),
            ("MC", "MILIEU_RELOYEUR"),
            ("DC", "DEFENSEUR_CENTRAL"),
            ("GK", "GARDIEN"),
        ],
    )
    def test_codes_du_template(self, saisie, attendu):
        assert resoudre(saisie) == attendu


class TestFormesLibres:
    @pytest.mark.parametrize(
        "saisie",
        [
            "milieu relayeur",
            "Milieu Relayeur",
            "MILIEU_RELOYEUR",
            " Milieu-Relayeur ",
            "  MC  ",
            "\tGK\n",
        ],
    )
    def test_ecritures_variables(self, saisie):
        assert resoudre(saisie) is not None

    @pytest.mark.parametrize(
        ("saisie", "attendu"),
        [
            ("latéral droit", "LATERAL_DROIT"),
            ("Latéral gauche", "LATERAL_GAUCHE"),
            ("Piston gauche", "PISTON_GAUCHE"),
            ("avant-centre", "AVANT_CENTRE"),
            ("Second attaquant", "SECOND_ATTAQUANT"),
            ("Arrêt de garde", "ARRET_DE_GARD"),
            ("défenseur central", "DEFENSEUR_CENTRAL"),
        ],
    )
    def test_libelles_francais(self, saisie, attendu):
        assert resoudre(saisie) == attendu

    @pytest.mark.parametrize(
        ("saisie", "attendu"),
        [
            # Codes courts usuels par ligne
            ("DL", "LATERAL_DROIT"),
            ("RB", "LATERAL_GAUCHE"),
            ("PD", "PISTON_DROIT"),
            ("PG", "PISTON_GAUCHE"),
            ("MDC", "MILIEU_DEFENSIF"),
            ("MOC", "MILIEU_OFFENSIF"),
            ("MED", "MILIEU_EXCENTRE_DROIT"),
            ("MEG", "MILIEU_EXCENTRE_GAUCHE"),
            ("AD", "AILIER_DROIT"),
            ("AG", "AILIER_GAUCHE"),
            ("BU", "AVANT_CENTRE"),
            ("SA", "SECOND_ATTAQUANT"),
            # Anciens codes hérités du vocabulaire précédent
            ("MILIEU_CENTRAL", "MILIEU_RELOYEUR"),
            ("ATTAQUANT", "AVANT_CENTRE"),
            ("DEFENSEUR", "DEFENSEUR_CENTRAL"),
            ("PORTIER", "GARDIEN"),
        ],
    )
    def test_synonymes(self, saisie, attendu):
        assert resoudre(saisie) == attendu


class TestRejets:
    """Une valeur inconnue est refusée, jamais devinée."""

    @pytest.mark.parametrize(
        "saisie",
        ["inexistant", "GK2", "ZZZ", "défenseur quantique", "10", "milieu excentré"],
    )
    def test_inconnu(self, saisie):
        assert resoudre(saisie) is None

    @pytest.mark.parametrize("saisie", ["", "   ", None])
    def test_vide(self, saisie):
        assert resoudre(saisie) is None
        assert normaliser(saisie) == ""


class TestGroupes:
    """Chaque poste doit avoir un groupe : sans lui, pas de pondération."""

    @pytest.mark.parametrize("poste", POSTES)
    def test_tout_poste_a_un_groupe(self, poste):
        groupe = groupe_de(poste)
        assert groupe is not None, f"{poste} n'a pas de groupe de pondération"
        assert groupe.value in ("gardien", "defenseur", "milieu", "attaquant")

    def test_groupes_attendus(self):
        assert groupe_de("GARDIEN").value == "gardien"
        assert groupe_de("LATERAL_DROIT").value == "defenseur"
        assert groupe_de("PISTON_GAUCHE").value == "defenseur"
        assert groupe_de("MILIEU_OFFENSIF").value == "milieu"
        assert groupe_de("AVANT_CENTRE").value == "attaquant"

    def test_repli_animation_laterale(self):
        """Décision documentée : le rôle prime sur la ligne. L'ailier est un
        attaquant, le milieu excentré un milieu — même ligne, deux groupes."""
        assert groupe_de("AILIER_DROIT").value == "attaquant"
        assert groupe_de("MILIEU_EXCENTRE_DROIT").value == "milieu"
        assert LIGNES["AILIER_DROIT"] == LIGNES["MILIEU_EXCENTRE_DROIT"]

    def test_groupe_inconnu(self):
        assert groupe_de(None) is None
        assert groupe_de("poste_inexistant") is None


class TestTaxonomie:
    """La taxonomie métier doit rester complète et cohérente."""

    def test_quinze_postes_plus_gardien(self):
        assert len(POSTES) == 16
        assert len(set(POSTES)) == 16, "codes dupliqués"

    def test_les_cinq_lignes_sont_confrontees(self):
        couvertes = set(LIGNES.values())
        assert couvertes == set(LIBELLES_LIGNE)

    def test_animation_laterale_existe_bien_sans_groupe(self):
        """L'animation latérale est une ligne du métier, pas un groupe de
        pondération : c'est tout l'intérêt du repli."""
        animation = [p for p in POSTES if LIGNES[p] == "animation_laterale"]
        assert len(animation) == 4
        groupes = {groupe_de(p).value for p in animation}
        assert groupes == {"milieu", "attaquant"}

    @pytest.mark.parametrize("poste", POSTES)
    def test_libelle_et_role(self, poste):
        assert poste in LIBELLES
        assert poste in ROLES
        assert LIBELLES[poste].strip(), f"libellé vide pour {poste}"
        assert ROLES[poste].strip(), f"rôle vide pour {poste}"

    def test_aucun_poste_hors_liste(self):
        """Un code résolu doit toujours exister dans POSTES."""
        saisies = list(POSTES) + ["GK", "MC", "DC", "ATT", "MOC", "BU"]
        for saisie in saisies:
            code = resoudre(saisie)
            assert code is None or code in POSTES

    def test_codes_sans_accent(self):
        """Les codes stockés en base sont en ASCII : un accent les casserait."""
        for poste in POSTES:
            assert poste.isascii(), f"{poste} contient un accent"
            assert poste == poste.upper()
            assert " " not in poste

    def test_normaliser(self):
        assert normaliser("milieu central") == "MILIEU_CENTRAL"
        assert normaliser("  mc  ") == "MC"
        assert normaliser("avant-centre") == "AVANT_CENTRE"
        assert normaliser("Édouard") == "EDOUARD"
        assert normaliser(None) == ""