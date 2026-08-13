"""Test du healthcheck — vérifie que la fondation démarre correctement."""
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_healthcheck_returns_expected_structure():
    """Le healthcheck doit répondre avec les champs attendus."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")

    # La DB peut être indisponible en test : on accepte ok ou degraded.
    assert response.status_code == 200
    body = response.json()
    assert body["service"] == "analystaff-api"
    assert body["status"] in ("ok", "degraded")
    assert body["database"] in ("ok", "unavailable")