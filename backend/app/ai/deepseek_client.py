"""Client DeepSeek asynchrone avec timeout et retry limité."""
import asyncio

import httpx

from app.core.config import get_settings
from app.core.errors import ValidationError

settings = get_settings()

MAX_RETRIES = 2
RETRY_DELAY_SECONDS = 2
MODEL = "deepseek-chat"
SYSTEM_PROMPT = (
    "Tu es un assistant pour staff technique de football. "
    "Réponds toujours avec un JSON valide, sans texte autour."
)


class DeepSeekUnavailableError(Exception):
    """DeepSeek est indisponible (timeout, erreur réseau, quota)."""


async def call_deepseek(
    user_prompt: str,
    timeout_seconds: int,
    system_prompt: str | None = None,
) -> str:
    """
    Appelle DeepSeek et retourne le contenu brut de la réponse.
    SÉCURITÉ : appel backend uniquement. Le prompt a déjà été filtré par permissions.
    Le system prompt est chargé depuis la base (action_key='__SYSTEM_PROMPT__')
    par le service ; ce paramètre est un fallback si aucun socle n'est seedé.
    """
    if not settings.deepseek_api_key:
        raise DeepSeekUnavailableError("Clé API DeepSeek non configurée.")

    effective_system_prompt = system_prompt or SYSTEM_PROMPT
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": effective_system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "response_format": {"type": "json_object"},
    }
    headers = {"Authorization": f"Bearer {settings.deepseek_api_key}"}

    last_error: Exception | None = None
    for attempt in range(MAX_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=timeout_seconds) as client:
                response = await client.post(
                    f"{settings.deepseek_base_url}/chat/completions",
                    headers=headers,
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
        except (httpx.HTTPError, KeyError, IndexError) as error:
            last_error = error
            if attempt < MAX_RETRIES:
                await asyncio.sleep(RETRY_DELAY_SECONDS)

    raise DeepSeekUnavailableError(f"DeepSeek indisponible : {last_error}")