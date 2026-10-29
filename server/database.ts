import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MaintenanceTask, MeterLog, SolarSystem, User, UserSettings } from '../src/types';

dotenv.config();

const directory = path.dirname(fileURLToPath(import.meta.url));
const databasePath = process.env.ZUBA_DATABASE_PATH
  ? path.resolve(process.env.ZUBA_DATABASE_PATH)
  : path.join(directory, '..', 'data', 'zuba.sqlite');
fs.mkdirSync(path.dirname(databasePath), { recursive: true });

export const db = new Database(databasePath);
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
  CREATE TABLE IF NOT EXISTS systems (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    system_class TEXT NOT NULL,
    panel_count INTEGER NOT NULL,
    panel_wattage REAL NOT NULL,
    capacity_kwp REAL NOT NULL,
    battery_capacity_kwh REAL NOT NULL,
    city TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    tilt REAL NOT NULL,
    azimuth REAL NOT NULL,
    correction_factor REAL NOT NULL,
    is_simulated INTEGER NOT NULL,
    api_key TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS meter_logs (
    id TEXT PRIMARY KEY,
    system_id TEXT NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    total_day_generation_kwh REAL NOT NULL,
    energy_consumed_kwh REAL NOT NULL,
    evening_remaining_kwh REAL NOT NULL,
    net_kwh REAL NOT NULL,
    predicted_kwh REAL NOT NULL,
    delta_kwh REAL NOT NULL,
    audit_status TEXT NOT NULL,
    note TEXT,
    morning_reading_kwh REAL,
    daytime_reading_kwh REAL,
    evening_reading_kwh REAL
  );
  CREATE TABLE IF NOT EXISTS maintenance_tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    system_id TEXT REFERENCES systems(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    cycle_days INTEGER NOT NULL,
    due_date TEXT NOT NULL,
    is_done INTEGER NOT NULL DEFAULT 0,
    last_completed_at TEXT
  );
  CREATE TABLE IF NOT EXISTS user_settings (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    tariff_zmw REAL NOT NULL DEFAULT 2.5,
    open_weather_api_key TEXT NOT NULL DEFAULT '',
    has_dismissed_welcome_guide INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS systems_owner ON systems(user_id);
  CREATE INDEX IF NOT EXISTS maintenance_owner ON maintenance_tasks(user_id);
  CREATE INDEX IF NOT EXISTS meter_system ON meter_logs(system_id);
`);

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'system',
  tariffZmw: 2.5,
  openWeatherApiKey: '',
  hasDismissedWelcomeGuide: true,
};

type DatabaseRow = Record<string, unknown>;

function stringField(row: DatabaseRow, key: string): string {
  const value = row[key];
  if (typeof value !== 'string') throw new Error(`Invalid database value for ${key}.`);
  return value;
}

function numberField(row: DatabaseRow, key: string): number {
  const value = row[key];
  if (typeof value !== 'number') throw new Error(`Invalid database value for ${key}.`);
  return value;
}

function isThemeSetting(value: string): UserSettings['theme'] {
  if (value === 'light' || value === 'dark' || value === 'system') return value;
  throw new Error('Invalid theme setting in the database.');
}

function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function hashSession(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function toUser(row: DatabaseRow): User {
  const role = stringField(row, 'role');
  if (role !== 'admin' && role !== 'user') throw new Error('Invalid user role in the database.');
  return {
    id: stringField(row, 'id'),
    name: stringField(row, 'name'),
    email: stringField(row, 'email'),
    role,
    isActive: Boolean(numberField(row, 'is_active')),
    createdAt: stringField(row, 'created_at'),
  };
}

export function getUserById(id: string): User | null {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as DatabaseRow | undefined;
  return row ? toUser(row) : null;
}

export function ensureAdminUser(name: string, email: string): void {
  const existing = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(email) as DatabaseRow | undefined;
  if (existing && stringField(existing, 'id') !== 'usr_admin') {
    throw new Error('Configured admin email is already registered as an operator account.');
  }
  const seed = db.transaction(() => {
    db.prepare(
      `INSERT INTO users (id, name, email, password_hash, role, is_active, created_at)
       VALUES ('usr_admin', ?, ?, 'environment-configured', 'admin', 1, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, email = excluded.email, role = 'admin', is_active = 1`
    ).run(name, email, new Date().toISOString());
    db.prepare('INSERT OR IGNORE INTO user_settings (user_id) VALUES (?)').run('usr_admin');
  });
  seed();
}

export function listUsers(): User[] {
  return (db.prepare("SELECT * FROM users WHERE role = 'user' ORDER BY created_at").all() as DatabaseRow[]).map(toUser);
}

export function createOperator(name: string, email: string, password: string): User {
  const user: User = {
    id: `usr_${randomBytes(16).toString('hex')}`,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role: 'user',
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  const create = db.transaction(() => {
    db.prepare(
      'INSERT INTO users (id, name, email, password_hash, role, is_active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)'
    ).run(user.id, user.name, user.email, hashPassword(password), user.role, user.createdAt);
    db.prepare('INSERT INTO user_settings (user_id) VALUES (?)').run(user.id);
    const addTask = db.prepare(
      'INSERT INTO maintenance_tasks (id, user_id, title, cycle_days, due_date, is_done) VALUES (?, ?, ?, ?, ?, 0)'
    );
    const today = new Date();
    [
      ['task_clean_panels', 'Clean solar panels surface & remove dust', 30, 12],
      ['task_battery_terminals', 'Inspect battery terminals & storage health', 60, 35],
      ['task_inverter_wiring', 'Check inverter wiring & circuit breakers', 90, 72],
    ].forEach(([id, title, cycle, days]) => {
      const due = new Date(today);
      due.setDate(due.getDate() + Number(days));
      addTask.run(`${String(id)}_${user.id}`, user.id, title, cycle, due.toISOString().slice(0, 10));
    });
  });
  create();
  return user;
}

export function authenticateOperator(email: string, password: string): User | null {
  const row = db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(email.trim()) as DatabaseRow | undefined;
  if (!row || !numberField(row, 'is_active') || !verifyPassword(password, stringField(row, 'password_hash'))) return null;
  return toUser(row);
}

export function setUserActive(id: string, isActive: boolean): void {
  db.prepare("UPDATE users SET is_active = ? WHERE id = ? AND role = 'user'").run(Number(isActive), id);
  if (!isActive) db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
}

export function removeUser(id: string): void {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
  db.prepare("DELETE FROM users WHERE id = ? AND role = 'user'").run(id);
}

export function createSession(userId: string): string {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(
    hashSession(token),
    userId,
    expiresAt
  );
  return token;
}

export function getSessionUser(token: string): User | null {
  const row = db
    .prepare(
      `SELECT users.* FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token_hash = ? AND sessions.expires_at > ?`
    )
    .get(hashSession(token), Date.now()) as DatabaseRow | undefined;
  if (!row || !numberField(row, 'is_active')) return null;
  return toUser(row);
}

export function deleteSession(token: string): void {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashSession(token));
}

export function cleanExpiredSessions(): void {
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());
}

function systemFromRow(row: DatabaseRow): SolarSystem {
  const systemClass = stringField(row, 'system_class');
  if (systemClass !== 'Residential' && systemClass !== 'Commercial' && systemClass !== 'Industrial') {
    throw new Error('Invalid solar system class in the database.');
  }
  return {
    id: stringField(row, 'id'),
    userId: stringField(row, 'user_id'),
    name: stringField(row, 'name'),
    systemClass,
    panelCount: numberField(row, 'panel_count'),
    panelWattage: numberField(row, 'panel_wattage'),
    capacityKwp: numberField(row, 'capacity_kwp'),
    batteryCapacityKwh: numberField(row, 'battery_capacity_kwh'),
    city: stringField(row, 'city'),
    latitude: numberField(row, 'latitude'),
    longitude: numberField(row, 'longitude'),
    tilt: numberField(row, 'tilt'),
    azimuth: numberField(row, 'azimuth'),
    correctionFactor: numberField(row, 'correction_factor'),
    isSimulated: Boolean(numberField(row, 'is_simulated')),
    apiKey: stringField(row, 'api_key'),
    createdAt: stringField(row, 'created_at'),
  };
}

function logFromRow(row: DatabaseRow): MeterLog {
  const auditStatus = stringField(row, 'audit_status');
  if (auditStatus !== 'Verified' && auditStatus !== 'Calibrated' && auditStatus !== 'Pending') {
    throw new Error('Invalid meter audit status in the database.');
  }
  return {
    id: stringField(row, 'id'),
    systemId: stringField(row, 'system_id'),
    date: stringField(row, 'date'),
    totalDayGenerationKwh: numberField(row, 'total_day_generation_kwh'),
    energyConsumedKwh: numberField(row, 'energy_consumed_kwh'),
    eveningRemainingKwh: numberField(row, 'evening_remaining_kwh'),
    netKwh: numberField(row, 'net_kwh'),
    predictedKwh: numberField(row, 'predicted_kwh'),
    deltaKwh: numberField(row, 'delta_kwh'),
    auditStatus,
    note: row.note === null ? undefined : stringField(row, 'note'),
    morningReadingKwh: row.morning_reading_kwh === null ? undefined : numberField(row, 'morning_reading_kwh'),
    daytimeReadingKwh: row.daytime_reading_kwh === null ? undefined : numberField(row, 'daytime_reading_kwh'),
    eveningReadingKwh: row.evening_reading_kwh === null ? undefined : numberField(row, 'evening_reading_kwh'),
  };
}

function taskFromRow(row: DatabaseRow): MaintenanceTask {
  return {
    id: stringField(row, 'id'),
    systemId: row.system_id === null ? '' : stringField(row, 'system_id'),
    title: stringField(row, 'title'),
    cycleDays: numberField(row, 'cycle_days'),
    dueDate: stringField(row, 'due_date'),
    isDone: Boolean(numberField(row, 'is_done')),
    lastCompletedAt: row.last_completed_at === null ? undefined : stringField(row, 'last_completed_at'),
  };
}

export function getUserData(user: User) {
  db.prepare(
    `UPDATE maintenance_tasks
     SET is_done = 0, due_date = date('now', '+' || cycle_days || ' days'), last_completed_at = NULL
     WHERE is_done = 1 AND last_completed_at IS NOT NULL
       AND date(last_completed_at, '+' || cycle_days || ' days') <= date('now')`
  ).run();
  const isAdmin = user.role === 'admin';
  const ownerFilter = isAdmin ? '' : ' WHERE user_id = ?';
  const ownerArg = isAdmin ? [] : [user.id];
  const systems = (db.prepare(`SELECT * FROM systems${ownerFilter} ORDER BY created_at DESC`).all(...ownerArg) as DatabaseRow[]).map(systemFromRow);
  const ids = systems.map((system) => system.id);
  const logs = ids.length
    ? (db
        .prepare(`SELECT * FROM meter_logs WHERE system_id IN (${ids.map(() => '?').join(',')}) ORDER BY date DESC`)
        .all(...ids) as DatabaseRow[]).map(logFromRow)
    : [];
  const tasks = (db
    .prepare(`SELECT * FROM maintenance_tasks${ownerFilter} ORDER BY due_date`)
    .all(...ownerArg) as DatabaseRow[]).map(taskFromRow);
  const row = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(user.id) as DatabaseRow | undefined;
  const settings: UserSettings = row
    ? {
        theme: isThemeSetting(stringField(row, 'theme')),
        tariffZmw: numberField(row, 'tariff_zmw'),
        openWeatherApiKey: stringField(row, 'open_weather_api_key'),
        hasDismissedWelcomeGuide: Boolean(numberField(row, 'has_dismissed_welcome_guide')),
      }
    : { ...DEFAULT_SETTINGS };
  const tariff = db.prepare("SELECT value FROM app_settings WHERE key = 'tariff_zmw'").get() as DatabaseRow | undefined;
  if (tariff) settings.tariffZmw = Number(stringField(tariff, 'value'));
  return { systems, meterLogs: logs, maintenanceTasks: tasks, settings };
}

const systemColumns = [
  'name', 'system_class', 'panel_count', 'panel_wattage', 'capacity_kwp', 'battery_capacity_kwh',
  'city', 'latitude', 'longitude', 'tilt', 'azimuth', 'correction_factor', 'is_simulated', 'api_key',
] as const;

export function saveSystem(system: SolarSystem): void {
  const values = [
    system.id, system.userId, system.name, system.systemClass, system.panelCount, system.panelWattage,
    system.capacityKwp, system.batteryCapacityKwh, system.city, system.latitude, system.longitude,
    system.tilt, system.azimuth, system.correctionFactor, Number(system.isSimulated), system.apiKey, system.createdAt,
  ];
  db.prepare(
    `INSERT INTO systems (id, user_id, name, system_class, panel_count, panel_wattage, capacity_kwp,
      battery_capacity_kwh, city, latitude, longitude, tilt, azimuth, correction_factor, is_simulated, api_key, created_at)
     VALUES (${values.map(() => '?').join(',')})
     ON CONFLICT(id) DO UPDATE SET ${systemColumns.map((column) => `${column} = excluded.${column}`).join(', ')}`
  ).run(...values);
}

export function getSystemOwner(systemId: string): string | null {
  const row = db.prepare('SELECT user_id FROM systems WHERE id = ?').get(systemId) as DatabaseRow | undefined;
  return row ? stringField(row, 'user_id') : null;
}

export function saveMeterLog(log: MeterLog): void {
  db.prepare(
    `INSERT INTO meter_logs (id, system_id, date, total_day_generation_kwh, energy_consumed_kwh,
      evening_remaining_kwh, net_kwh, predicted_kwh, delta_kwh, audit_status, note,
      morning_reading_kwh, daytime_reading_kwh, evening_reading_kwh)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    log.id, log.systemId, log.date, log.totalDayGenerationKwh, log.energyConsumedKwh,
    log.eveningRemainingKwh, log.netKwh, log.predictedKwh, log.deltaKwh, log.auditStatus,
    log.note ?? null, log.morningReadingKwh ?? null, log.daytimeReadingKwh ?? null, log.eveningReadingKwh ?? null
  );
}

export function getMaintenanceTaskOwner(taskId: string): string | null {
  const row = db.prepare('SELECT user_id FROM maintenance_tasks WHERE id = ?').get(taskId) as DatabaseRow | undefined;
  return row ? stringField(row, 'user_id') : null;
}

export function saveMaintenanceTask(userId: string, task: MaintenanceTask): void {
  db.prepare(
    `INSERT INTO maintenance_tasks (id, user_id, system_id, title, cycle_days, due_date, is_done, last_completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET system_id = excluded.system_id, title = excluded.title,
       cycle_days = excluded.cycle_days, due_date = excluded.due_date, is_done = excluded.is_done,
       last_completed_at = excluded.last_completed_at
     WHERE maintenance_tasks.user_id = excluded.user_id`
  ).run(
    task.id, userId, task.systemId || null, task.title, task.cycleDays, task.dueDate,
    Number(task.isDone), task.lastCompletedAt ?? null
  );
}

export function saveUserSettings(userId: string, settings: Partial<UserSettings>, isAdmin: boolean): void {
  const permitted = {
    theme: settings.theme,
    openWeatherApiKey: settings.openWeatherApiKey,
    hasDismissedWelcomeGuide: settings.hasDismissedWelcomeGuide,
  };
  const updates: string[] = [];
  const values: (string | number)[] = [];
  if (permitted.theme !== undefined) {
    updates.push('theme = ?');
    values.push(permitted.theme);
  }
  if (permitted.openWeatherApiKey !== undefined) {
    updates.push('open_weather_api_key = ?');
    values.push(permitted.openWeatherApiKey);
  }
  if (permitted.hasDismissedWelcomeGuide !== undefined) {
    updates.push('has_dismissed_welcome_guide = ?');
    values.push(Number(permitted.hasDismissedWelcomeGuide));
  }
  if (isAdmin && settings.tariffZmw !== undefined) {
    db.prepare(
      `INSERT INTO app_settings (key, value) VALUES ('tariff_zmw', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    ).run(String(settings.tariffZmw));
  }
  if (!updates.length) return;
  values.push(userId);
  db.prepare(`UPDATE user_settings SET ${updates.join(', ')} WHERE user_id = ?`).run(...values);
}

export function removeSystem(systemId: string): void {
  db.prepare('DELETE FROM systems WHERE id = ?').run(systemId);
}

export function removeMaintenanceTask(taskId: string): void {
  db.prepare('DELETE FROM maintenance_tasks WHERE id = ?').run(taskId);
}
