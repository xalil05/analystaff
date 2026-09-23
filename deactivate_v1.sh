#!/bin/bash

# ==============================================================================
# Analystaff — Désactivation du Mode V1 (Retour au Mode Pilote V0)
# ==============================================================================
# Ce script désactive les fonctionnalités multi-équipes et multi-saisons
# pour revenir à la configuration "1 Club = 1 Équipe implicite".
# ==============================================================================

set -e # Arrêter le script en cas d'erreur

echo "🛑 Démarrage de la désactivation du mode V1 (Retour au Pilote V0)..."

# 1. Mise à jour du .env Backend
echo "⚙️  Mise à jour des variables d'environnement Backend..."
if [ -f backend/.env ]; then
    sed -i 's/ENABLE_MULTI_TEAM=true/ENABLE_MULTI_TEAM=false/g' backend/.env
    sed -i 's/ENABLE_SEASONS=true/ENABLE_SEASONS=false/g' backend/.env
    echo "✅ Variables Backend mises à jour."
else
    echo "❌ Fichier backend/.env introuvable. Vérifiez le chemin."
    exit 1
fi

# 2. Mise à jour du .env.local Frontend (Next.js)
echo "⚙️  Mise à jour des variables d'environnement Frontend..."
if [ -f frontend/.env.local ]; then
    sed -i 's/NEXT_PUBLIC_ENABLE_MULTI_TEAM=true/NEXT_PUBLIC_ENABLE_MULTI_TEAM=false/g' frontend/.env.local
    sed -i 's/NEXT_PUBLIC_ENABLE_SEASONS=true/NEXT_PUBLIC_ENABLE_SEASONS=false/g' frontend/.env.local
    echo "✅ Variables Frontend mises à jour."
else
    echo "⚠️  Fichier frontend/.env.local introuvable. Assurez-vous de mettre à jour vos variables Next.js manuellement si nécessaire."
fi

# 3. Nettoyage du cache Frontend (Next.js)
echo "🧹 Nettoyage du cache Next.js pour appliquer les changements UI..."
if [ -d frontend/.next ]; then
    rm -rf frontend/.next
    echo "✅ Cache Frontend nettoyé."
fi

echo ""
echo "=========================================================================="
echo "🔙 MODE PILOTE V0 RÉACTIVÉ !"
echo "=========================================================================="
echo "Prochaines étapes :"
echo "1. Redémarrez les conteneurs : docker compose up -d --build"
echo "2. Relancez le frontend : cd frontend && npm run dev"
echo ""
echo "Les fonctionnalités 'Teams' et 'Seasons' sont maintenant masquées."
echo "L'application fonctionne en mode '1 Club = 1 Équipe implicite'."
echo "=========================================================================="