PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS systems (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    system_class TEXT NOT NULL CHECK (system_class IN ('Residential', 'Commercial', 'Industrial')),
    panel_count INTEGER NOT NULL CHECK (panel_count > 0),
    panel_wattage REAL NOT NULL DEFAULT 450,
    capacity_kwp REAL NOT NULL,
    battery_capacity_kwh REAL NOT NULL,
    city TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    tilt REAL NOT NULL DEFAULT 15,
    azimuth REAL NOT NULL DEFAULT 0,
    correction_factor REAL NOT NULL DEFAULT 1,
    is_simulated INTEGER NOT NULL DEFAULT 1,
    api_key TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_settings (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('system', 'light', 'dark')),
    open_weather_api_key TEXT NOT NULL DEFAULT '',
    has_dismissed_welcome_guide INTEGER NOT NULL DEFAULT 1,
    selected_system_id TEXT
);

CREATE TABLE IF NOT EXISTS platform_settings (
    setting_key TEXT PRIMARY KEY,
    setting_value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meter_logs (
    id TEXT PRIMARY KEY,
    system_id TEXT NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    total_day_generation_kwh REAL NOT NULL,
    energy_consumed_kwh REAL NOT NULL DEFAULT 0,
    evening_remaining_kwh REAL NOT NULL DEFAULT 0,
    net_kwh REAL NOT NULL,
    predicted_kwh REAL NOT NULL,
    delta_kwh REAL NOT NULL,
    audit_status TEXT NOT NULL DEFAULT 'Calibrated',
    note TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS maintenance_tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    system_id TEXT REFERENCES systems(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    cycle_days INTEGER NOT NULL CHECK (cycle_days > 0),
    due_date TEXT NOT NULL,
    is_done INTEGER NOT NULL DEFAULT 0 CHECK (is_done IN (0, 1)),
    last_completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_systems_user_id ON systems(user_id);
CREATE INDEX IF NOT EXISTS idx_meter_logs_system_date ON meter_logs(system_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_user_id ON maintenance_tasks(user_id);

INSERT OR IGNORE INTO platform_settings (setting_key, setting_value)
VALUES ('tariff_zmw', '2.5');
