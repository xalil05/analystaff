FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
WORKDIR /code

COPY pyproject.toml ./
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./
RUN pip install --upgrade pip

# ---------------------------------------------------------
# Étape 1 : Image de Développement (inclut pytest et les volumes)
# ---------------------------------------------------------
FROM base AS development
# On copie aussi les tests pour le conteneur de dev
COPY tests ./tests
# On installe AVEC les dépendances [dev]
RUN pip install --no-cache-dir ".[dev]"
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# ---------------------------------------------------------
# Étape 2 : Image de Production (Légère et sécurisée)
# ---------------------------------------------------------
FROM base AS production
# On installe UNIQUEMENT les dépendances de base (sans pytest)
RUN pip install --no-cache-dir .
# Utilisateur non-root pour la sécurité
RUN groupadd -r appuser && useradd -r -g appuser appuser
USER appuser
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
