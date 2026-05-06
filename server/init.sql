-- ─── GeospatialTool-SBA  ·  Database initialisation ──────────────────────────
-- Passwords stored as MD5 hex digest (frontend sends md5(plaintext)).
-- Default test user: admin / password  →  md5('password') = 5f4dcc3b5aa765d61d8327deb882cf99

CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    username    VARCHAR(120) UNIQUE NOT NULL,
    password    VARCHAR(64)  NOT NULL,   -- MD5 hex digest
    email       VARCHAR(254),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS parcels (
    id             SERIAL PRIMARY KEY,
    user_id        INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    catastral_ref  VARCHAR(50)  NOT NULL,
    geojson_data   JSONB,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── File-browser (file_service) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS folders (
    id        SERIAL PRIMARY KEY,
    name      VARCHAR(255) NOT NULL,
    parent_id INTEGER REFERENCES folders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS files (
    id        SERIAL PRIMARY KEY,
    name      VARCHAR(255) NOT NULL,
    folder_id INTEGER REFERENCES folders(id) ON DELETE CASCADE,
    content   BYTEA        NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_parcels_user_id ON parcels(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_files_folder_id ON files(folder_id);

-- Seed: default root folder for the file browser
INSERT INTO folders (id, name, parent_id)
VALUES (1, 'SBA', NULL)
ON CONFLICT (id) DO NOTHING;

-- Seed: default admin user (password = "password")
INSERT INTO users (username, password, email)
VALUES ('admin', '5f4dcc3b5aa765d61d8327deb882cf99', 'admin@example.com')
ON CONFLICT (username) DO NOTHING;
