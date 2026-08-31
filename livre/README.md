# 📖 Péripéties de la création d'Analystaff

> *De l'idée au déploiement, problème par problème.*
> Chaque chapitre raconte une péripétie réelle rencontrée pendant la
> construction d'Analystaff : le contexte, le symptôme, les fausses
> pistes, la cause réelle, la résolution, et l'enseignement à en tirer.

---

## Pourquoi ce livre existe

J'ai construit Analystaff en plusieurs phases. À chaque étape, j'ai
rencontré des problèmes. Certains m'ont pris des heures. Tous m'ont
appris quelque chose que je n'oublierai plus.

Ce livre est ma mémoire de développeur : **les erreurs que j'ai faites,
pour ne plus jamais les refaire**. Et si un autre autodidacte passe par
là, qu'il apprenne plus vite que moi.

---

## Les phases du projet

| Phase | Contenu | Statut |
|---|---|---|
| 0 | Conception : vision, décisions, schéma SQL, matrice permissions, specs IA | ✅ |
| 1 | Fondations : structure backend, core, Docker, nginx, healthcheck | ✅ |
| 2 | Modèles & schéma : SQLAlchemy, seed, Alembic, migration initiale | ✅ |
| 3 | Tests : auth, JWT, permissions, modèles, conftest | ✅ |
| 4 | Entraînements, planification, évaluations | 🔜 |
| 5 | Module IA (boutons métier) | 🔜 |

---

## Comment lire un chapitre

Chaque chapitre suit la même trame :

1. **Le contexte** — ce que je construisais, pourquoi
2. **Le symptôme / le défi** — l'erreur affichée ou la difficulté rencontrée
3. **Où je cherchais** — mes hypothèses, mes essais
4. **Où était le problème réellement** — la cause racine
5. **Comment on l'a résolu** — la démarche
6. **L'enseignement** — la leçon générale, réutilisable

---

## Chapitres

- [Chapitre 0 — « De l'idée au document : dompter une vision » (Phase 0)](chapitre-00-conception.md)
- [Chapitre 1 — « Le squelette : choisir la structure avant le code » (Phase 1)](chapitre-01-fondations.md)
- [Chapitre 2 — « Les modèles : une seule source de vérité » (Phase 2)](chapitre-02-modeles.md)
- [Chapitre 3 — « Pourquoi mes tests ne passent pas ? » (Phase 3)](chapitre-03-tests.md)
- [Chapitre 4 — « Les tests passent… mais ma base a disparu » (Phase 4)](chapitre-04-tests-qui-detruisent.md)
- [Chapitre 5 — « L'import fantôme : le backend qui refuse de démarrer » (Phase 4)](chapitre-05-import-fantome.md)
- [Chapitre 6 — « La dépendance invisible : "Form data requires python-multipart" » (Phase 4 → 5)](chapitre-06-dependance-invisible.md)
- [Chapitre 7 — « Le squash n'a rien réglé : les migrations fantômes sont revenues » (Phase 5)](chapitre-07-squash-ne-suffit-pas.md)
- [Chapitre 8 — « Le socle fantôme : deux phrases dans le code, cent huit dans les specs » (Phase 5)](chapitre-08-le-socle-fantome.md)
- [Chapitre 9 — « Le socle prend racine : 108 lignes de specs qui descendent enfin en base » (Phase 5)](chapitre-09-le-socle-prend-racine.md)
