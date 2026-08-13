"""
Primitives de sécurité partagées.

Phase 1 : hachage des mots de passe uniquement.
Le JWT et les refresh tokens seront ajoutés en Phase 3 (module auth).
"""
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

# Argon2id est l'algorithme recommandé (voir STANDARDS §12.1).
_hasher = PasswordHasher()


def hash_password(plain_password: str) -> str:
    """Hache un mot de passe en clair. Jamais de stockage en clair."""
    return _hasher.hash(plain_password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    """Vérifie un mot de passe contre son hash. Retourne False si invalide."""
    try:
        return _hasher.verify(password_hash, plain_password)
    except VerifyMismatchError:
        return False