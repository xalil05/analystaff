"""
Énumérations métier d'Analystaff.

Chaque énumération Python correspond à un type ENUM PostgreSQL défini dans
SCHEMA_SQL.md (§2). Les valeurs sont identiques au schéma (minuscules,
snake_case), sauf AiSuggestionStatut qui est en majuscules.
"""
import enum

from sqlalchemy import Enum


class ClubLevel(str, enum.Enum):
    amateur = "amateur"
    semi_pro = "semi_pro"
    pro = "pro"


class PlayerStatut(str, enum.Enum):
    actif = "actif"
    blesse = "blesse"
    suspendu = "suspendu"
    parti = "parti"
    archive = "archive"


class MatchStatut(str, enum.Enum):
    brouillon = "brouillon"
    programme = "programme"
    termine = "termine"
    archive = "archive"


class LineupStatut(str, enum.Enum):
    brouillon = "brouillon"
    valide = "valide"


class SubstitutionMotif(str, enum.Enum):
    tactique = "tactique"
    blessure = "blessure"
    fatigue = "fatigue"
    sanction = "sanction"
    autre = "autre"


class TrainingStatut(str, enum.Enum):
    planifiee = "planifiee"
    realisee = "realisee"
    annulee = "annulee"


class Assiduite(str, enum.Enum):
    present = "present"
    absent = "absent"
    retard = "retard"


class Pilier(str, enum.Enum):
    physique = "physique"
    technique = "technique"
    tactique = "tactique"
    mental = "mental"


class PosteGroupe(str, enum.Enum):
    gardien = "gardien"
    defenseur = "defenseur"
    milieu = "milieu"
    attaquant = "attaquant"


class AiSuggestionStatut(str, enum.Enum):
    DRAFT = "DRAFT"
    READY = "READY"
    VIEWED = "VIEWED"
    ACCEPTED = "ACCEPTED"
    MODIFIED = "MODIFIED"
    REJECTED = "REJECTED"
    OUTDATED = "OUTDATED"


class InvitationStatut(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    expired = "expired"
    revoked = "revoked"


class ContexteSaisie(str, enum.Enum):
    direct_stade = "direct_stade"
    apres_match = "apres_match"
    avant_entrainement = "avant_entrainement"
    apres_entrainement = "apres_entrainement"
    planification = "planification"
    autre = "autre"


class FileType(str, enum.Enum):
    pdf = "pdf"
    txt = "txt"
    docx = "docx"
    jpeg = "jpeg"
    png = "png"


class WorkPlanType(str, enum.Enum):
    hebdomadaire = "hebdomadaire"
    mensuel = "mensuel"


class StaffMemberStatut(str, enum.Enum):
    actif = "actif"
    suspendu = "suspendu"
    parti = "parti"


def sa_enum(enum_cls: type[enum.Enum], name: str) -> Enum:
    """
    Retourne un type colonne SQLAlchemy Enum basé sur les *valeurs* de
    l'énumération (et non les noms), conformément à SCHEMA_SQL.md.
    """
    return Enum(enum_cls, name=name, values_callable=lambda e: [m.value for m in e])