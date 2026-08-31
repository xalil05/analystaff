-- Migration SQL manuelle (en attendant la connexion PostgreSQL)
-- Correspond aux corrections C-01, C-02, C-03, C-04, C-05, C-06

-- C-01 : Convertir les clés primaires en BIGINT GENERATED ALWAYS AS IDENTITY
-- Note : PostgreSQL ne permet pas de convertir directement SERIAL → IDENTITY
-- Il faut recréer les séquences. Script à exécuter avec précaution.

-- Exemple pour la table players :
-- ALTER TABLE players ALTER COLUMN id DROP DEFAULT;
-- ALTER TABLE players ALTER COLUMN id TYPE BIGINT;
-- ALTER TABLE players ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY;

-- C-02 : Créer la table audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    club_id BIGINT REFERENCES clubs(id),
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    resource_id BIGINT,
    details JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_club_id ON audit_logs(club_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- C-03 : Créer la table player_parental_consents
CREATE TABLE IF NOT EXISTS player_parental_consents (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    player_id BIGINT NOT NULL REFERENCES players(id),
    parent_name VARCHAR(200) NOT NULL,
    parent_relation VARCHAR(50) NOT NULL,
    consent_file_path TEXT NOT NULL,
    consented_at TIMESTAMPTZ NOT NULL,
    collected_by BIGINT NOT NULL REFERENCES users(id),
    is_valid BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_player_parental_consents_player_id ON player_parental_consents(player_id);

-- C-04 : Créer la table user_preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    club_id BIGINT NOT NULL REFERENCES clubs(id),
    preferences JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, club_id)
);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- C-05 : Ajouter synchronisee à evaluations
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS synchronisee BOOLEAN NOT NULL DEFAULT FALSE;

-- C-06 : Corriger le défaut de synchronisee dans training_evaluations
ALTER TABLE training_evaluations ALTER COLUMN synchronisee SET DEFAULT FALSE;
