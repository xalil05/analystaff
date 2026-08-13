"""Tests unitaires des utilitaires JWT (aucune base de données requise)."""
import pytest

from app.auth.jwt import create_access_token, decode_access_token
from app.core.errors import AuthenticationError


def test_create_and_decode_access_token():
    token = create_access_token(user_id=42)
    assert decode_access_token(token) == 42


def test_decode_invalid_token_raises():
    with pytest.raises(AuthenticationError):
        decode_access_token("invalid.token.here")


def test_decode_tampered_token_raises():
    token = create_access_token(user_id=42)
    tampered = token[:-3] + "abc"
    with pytest.raises(AuthenticationError):
        decode_access_token(tampered)