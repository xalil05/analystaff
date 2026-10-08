# Branche docs/alignement-contrat-api-2026-10-08

Cette branche est destinée à recevoir la mise à jour des documents de référence alignés sur le contrat API réel (audit du 08/10/2026).

## Fichiers concernés

- `DECISIONS_FIGEES.md` — Next.js 16, ZG-9 fetch natif, MinIO, §27–§28
- `SCHEMA_SQL.md` — enum `evaluation_statut` corrigé
- `SPECIFICATIONS_IA_ET_PROMPTS.md` — routes `/api/v1/ai/...` sans club_id
- `architecture-mvp-reelle.md` — catalogue API aligné code
- `STANDARDS_DEVELOPPEMENT.md` — Next 16, nginx `/api/v1/ai/`
- `MATRICE_PERMISSIONS_ET_REGLES_METIER.md` — note PermissionCode frontend

## Application

Les contenus complets ont été préparés localement. En raison de la taille des fichiers, appliquer via :

```bash
git fetch origin
git checkout docs/alignement-contrat-api-2026-10-08
# Copier les 6 .md mis à jour à la racine, puis :
git add DECISIONS_FIGEES.md SCHEMA_SQL.md SPECIFICATIONS_IA_ET_PROMPTS.md \
        architecture-mvp-reelle.md STANDARDS_DEVELOPPEMENT.md \
        MATRICE_PERMISSIONS_ET_REGLES_METIER.md
git commit -m "docs: aligner les références sur le contrat API réel (08/10/2026)"
git push
```

Base de la branche : `fix/frontend-contrat-api-et-tokens`.
