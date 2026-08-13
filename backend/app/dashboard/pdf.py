"""Export PDF basique (voir DECISIONS_FIGEES.md : Export PDF basique)."""
from io import BytesIO

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from app.dashboard.schemas import RadarResponse


def _draw_header(p: canvas.Canvas, title: str) -> None:
    """En-tête commun à tous les exports."""
    p.setFont("Helvetica-Bold", 16)
    p.drawString(50, 780, title)
    p.setFont("Helvetica", 10)
    p.drawString(50, 760, "Analystaff — export généré automatiquement")
    p.line(50, 750, 550, 750)


def generate_player_pdf(data: dict) -> bytes:
    """
    Génère le PDF du profil joueur.
    NOTE HONNÊTE : le radar est rendu en tableau numérique, pas en graphique.
    """
    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    identite = data["identite"]
    _draw_header(p, f"Profil joueur — {identite['nom']}")

    y = 720
    p.setFont("Helvetica-Bold", 12)
    p.drawString(50, y, "Identité")
    y -= 20
    p.setFont("Helvetica", 10)
    p.drawString(50, y, f"Nom : {identite['nom']}")
    y -= 15
    p.drawString(50, y, f"Prénom : {identite['prenom'] or '-'}")
    y -= 15
    p.drawString(50, y, f"Poste : {identite['poste'] or '-'}")
    y -= 15
    p.drawString(50, y, f"Numéro : {identite['numero'] or '-'}")

    # Section sportif : radar + historique.
    y -= 30
    p.setFont("Helvetica-Bold", 12)
    p.drawString(50, y, "Sportif — Radar (5 derniers matchs)")
    y -= 20
    p.setFont("Helvetica", 10)

    radar: RadarResponse = data["sportif"]["radar"]
    p.drawString(50, y, f"Physique : {radar.physique or '-'}")
    y -= 15
    p.drawString(50, y, f"Technique : {radar.technique or '-'}")
    y -= 15
    p.drawString(50, y, f"Tactique : {radar.tactique or '-'}")
    y -= 15
    p.drawString(50, y, f"Mental : {radar.mental or '-'}")
    y -= 15
    p.drawString(50, y, f"Note globale moyenne : {radar.note_globale_moyenne or '-'}")

    y -= 30
    p.setFont("Helvetica-Bold", 12)
    p.drawString(50, y, "Historique des notes")
    y -= 20
    p.setFont("Helvetica", 10)
    for entry in data["sportif"]["history"][:10]:
        date_str = entry.date_match.strftime("%d/%m/%Y")
        note = entry.note_globale or "-"
        p.drawString(50, y, f"{date_str} vs {entry.adversaire} : {note}")
        y -= 15
        if y < 60:
            p.showPage()
            y = 780

    # Section physique (si autorisée).
    if data.get("physique") is not None:
        y -= 20
        p.setFont("Helvetica-Bold", 12)
        p.drawString(50, y, "Physique / Morphologie")
        y -= 20
        p.setFont("Helvetica", 10)
        phys = data["physique"]
        p.drawString(50, y, f"Taille : {phys['taille_cm'] or '-'} cm")
        y -= 15
        p.drawString(50, y, f"Poids : {phys['poids_kg'] or '-'} kg")
        y -= 15
        p.drawString(50, y, f"IMC : {phys['imc'] or '-'}")
        y -= 15
        p.drawString(50, y, f"Charge de travail : {phys['charge_travail'] or '-'}")

    p.save()
    buffer.seek(0)
    return buffer.read()


def generate_match_pdf(data: dict) -> bytes:
    """Génère le PDF de la synthèse match."""
    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)

    _draw_header(p, f"Synthèse match — vs {data['adversaire']}")

    y = 720
    p.setFont("Helvetica", 11)
    p.drawString(50, y, f"Adversaire : {data['adversaire']}")
    y -= 20
    date_str = data["date_match"].strftime("%d/%m/%Y %H:%M")
    p.drawString(50, y, f"Date : {date_str}")
    y -= 20
    p.drawString(50, y, f"Compétition : {data['competition'] or '-'}")
    y -= 20
    p.drawString(50, y, f"Score : {data['score']}")
    y -= 20
    p.drawString(50, y, f"Statut : {data['statut']}")

    p.save()
    buffer.seek(0)
    return buffer.read()