#!/bin/bash

# ==============================================================================
# Analystaff — Activation du Mode V1 (Multi-équipes & Saisons)
# ==============================================================================
# Ce script réactive les fonctionnalités masquées lors de la phase pilote.
# Il met à jour les configurations Backend/Frontend et prépare la base de données.
# ==============================================================================

set -e # Arrêter le script en cas d'erreur

echo "🚀 Démarrage de l'activation du mode V1..."

# 1. Mise à jour du .env Backend
echo "⚙️  Mise à jour des variables d'environnement Backend..."
if [ -f backend/.env ]; then
    sed -i 's/ENABLE_MULTI_TEAM=false/ENABLE_MULTI_TEAM=true/g' backend/.env
    sed -i 's/ENABLE_SEASONS=false/ENABLE_SEASONS=true/g' backend/.env
    echo "✅ Variables Backend mises à jour."
else
    echo "❌ Fichier backend/.env introuvable. Vérifiez le chemin."
    exit 1
fi

# 2. Mise à jour du .env.local Frontend (Next.js)
echo "⚙️  Mise à jour des variables d'environnement Frontend..."
if [ -f frontend/.env.local ]; then
    sed -i 's/NEXT_PUBLIC_ENABLE_MULTI_TEAM=false/NEXT_PUBLIC_ENABLE_MULTI_TEAM=true/g' frontend/.env.local
    sed -i 's/NEXT_PUBLIC_ENABLE_SEASONS=false/NEXT_PUBLIC_ENABLE_SEASONS=true/g' frontend/.env.local
    echo "✅ Variables Frontend mises à jour."
else
    echo "⚠️  Fichier frontend/.env.local introuvable. Assurez-vous de mettre à jour vos variables Next.js manuellement si nécessaire."
fi

# 3. Préparation de la Base de Données (Alembic)
echo "🗄️  Vérification des migrations Alembic..."
cd backend
if command -v alembic &> /dev/null; then
    # On génère une migration automatique pour s'assurer que toutes les contraintes 
    # (comme les NOT NULL sur team_id/season_id) sont bien appliquées pour la V1.
    alembic revision --autogenerate -m "activate_v1_features_constraints"
    echo "✅ Migration générée. N'oubliez pas de la valider avec 'alembic upgrade head'."
else
    echo "❌ Alembic non trouvé dans le PATH. Lancez la migration manuellement."
fi
cd ..

# 4. Nettoyage du cache Frontend (Next.js)
echo "🧹 Nettoyage du cache Next.js pour appliquer les changements UI..."
if [ -d frontend/.next ]; then
    rm -rf frontend/.next
    echo "✅ Cache Frontend nettoyé."
fi

echo ""
echo "=========================================================================="
echo "🎉 MODE V1 ACTIVÉ !"
echo "=========================================================================="
echo "Prochaines étapes :"
echo "1. Redémarrez les conteneurs : docker compose up -d --build"
echo "2. Appliquez la migration DB : cd backend && alembic upgrade head"
echo "3. Relancez le frontend : cd frontend && npm run dev"
echo ""
echo "Les fonctionnalités 'Teams' et 'Seasons' sont maintenant visibles."
echo "=========================================================================="