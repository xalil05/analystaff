import os
import sys

def print_status(check_name, is_valid, details=""):
    status = "✅" if is_valid else "❌"
    print(f"{status} {check_name} {details}")

def audit_repo(root_dir):
    print("🔍 AUDIT D'ALIGNEMENT ANALYSTAFF (V0)\n")
    
    # 1. Architecture Monolithe Modulaire (architecture-mvp-reelle.md)
    print("--- 1. Architecture & Dossiers ---")
    expected_modules = ['auth', 'clubs', 'players', 'matches', 'training', 
                        'planning', 'evaluations', 'ai', 'files', 'audit', 'core']
    
    app_dir = os.path.join(root_dir, 'app')
    if os.path.exists(app_dir):
        for module in expected_modules:
            path = os.path.join(app_dir, module)
            print_status(f"Module '{module}'", os.path.exists(path))
    else:
        print_status("Dossier 'app/' trouvé", False, "(Architecture monolithe modulaire attendue)")

    # 2. Infrastructure & Docker (DECISIONS_FIGEES.md - ZG-2)
    print("\n--- 2. Infrastructure (Docker & ZG-2) ---")
    docker_compose = os.path.join(root_dir, 'docker-compose.yml')
    if os.path.exists(docker_compose):
        with open(docker_compose, 'r', encoding='utf-8') as f:
            content = f.read().lower()
            print_status("PostgreSQL présent", 'postgres' in content)
            print_status("MinIO présent (Amendement ZG-2)", 'minio' in content, "(Stockage S3-compatible)")
            print_status("Nginx présent", 'nginx' in content)
    else:
        print_status("docker-compose.yml trouvé", False)

    # 3. Base de données & Migrations (SCHEMA_SQL.md)
    print("\n--- 3. Base de données & Alembic ---")
    alembic_ini = os.path.join(root_dir, 'alembic.ini')
    alembic_dir = os.path.join(root_dir, 'alembic')
    print_status("Alembic configuré", os.path.exists(alembic_ini) or os.path.exists(alembic_dir))
    
    # Vérification rapide des modèles (Leçon apprise: Mapped[])
    models_found = False
    mapped_used = False
    for root, dirs, files in os.walk(app_dir):
        for file in files:
            if file.endswith('.py'):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if 'Base' in content and 'Column' in content or 'Mapped' in content:
                        models_found = True
                    if 'Mapped[' in content:
                        mapped_used = True
                        
    print_status("Modèles SQLAlchemy détectés", models_found)
    print_status("Typage Mapped[] utilisé (SQLAlchemy 2.x)", mapped_used, "(Leçon apprise ROADMAP)")

    # 4. Sécurité & Auth (DECISIONS_FIGEES.md - ZG-5)
    print("\n--- 4. Sécurité & Auth ---")
    auth_dir = os.path.join(app_dir, 'auth')
    if os.path.exists(auth_dir):
        # On cherche des traces de refresh tokens en base
        refresh_token_found = False
        for root, dirs, files in os.walk(auth_dir):
            for file in files:
                if file.endswith('.py'):
                    with open(os.path.join(root, file), 'r', encoding='utf-8') as f:
                        if 'refresh_token' in f.read().lower():
                            refresh_token_found = True
        print_status("Logique Refresh Token en base (ZG-5)", refresh_token_found)

    # 5. Module IA (DECISIONS_FIGEES.md - ZG-6, ZG-7)
    print("\n--- 5. Module IA ---")
    ai_dir = os.path.join(app_dir, 'ai')
    if os.path.exists(ai_dir):
        templates_in_db = False
        deepseek_used = False
        for root, dirs, files in os.walk(ai_dir):
            for file in files:
                if file.endswith('.py'):
                    with open(os.path.join(root, file), 'r', encoding='utf-8') as f:
                        content = f.read().lower()
                        if 'ai_template' in content or 'template' in content:
                            templates_in_db = True
                        if 'deepseek' in content:
                            deepseek_used = True
        print_status("Templates IA en base (ZG-7)", templates_in_db)
        print_status("Intégration DeepSeek", deepseek_used)
        print_status("Pas de prompt libre (Boutons métier)", True, "(À vérifier manuellement dans les routes)")

    print("\n--- 6. Priorités Pré-Pilote (ROADMAP_IDEES.md) ---")
    print("⚠️  Rappel : Vérifie manuellement les points suivants avant le pilote :")
    print("   - [ ] La permission `GERER_JOUEURS` est-elle dans le seed de la matrice ?")
    print("   - [ ] Les quotas d'appels IA (ex: 100/club/jour) sont-ils implémentés (slowapi) ?")
    print("   - [ ] Les tests MinIO réels sont-ils configurés (pas seulement mockés) ?")

# Remplace la dernière ligne du script par ceci :
if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # Si le script est dans /backend, on remonte d'un cran pour avoir la racine du projet
    if os.path.basename(script_dir) == 'analystaff':
        root_directory = os.path.dirname(script_dir)
    else:
        root_directory = script_dir
    audit_repo(root_directory)