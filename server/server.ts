import express, { NextFunction, Request, Response } from 'express';
import path from 'path';
import { randomBytes, timingSafeEqual } from 'crypto';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  authenticateOperator,
  cleanExpiredSessions,
  createOperator,
  createSession,
  db,
  deleteSession,
  ensureAdminUser,
  getMaintenanceTaskOwner,
  getSessionUser,
  getSystemOwner,
  getUserData,
  listUsers,
  removeMaintenanceTask,
  removeSystem,
  removeUser,
  saveMaintenanceTask,
  saveMeterLog,
  saveSystem,
  saveUserSettings,
  setUserActive,
} from './database';
import { MaintenanceTask, MeterLog, SolarSystem, User, UserSettings } from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const SESSION_COOKIE = 'zuba_session';
const SESSION_MAX_AGE = 7 * 24 * 60 * 60;

interface AuthenticatedRequest extends Request {
  user?: User;
}

const adminEmail = (process.env.ZUBA_ADMIN_EMAIL || 'garrymapulanga@gmail.com').trim().toLowerCase();
ensureAdminUser(process.env.ZUBA_ADMIN_NAME || 'Garry Mapulanga', adminEmail);
cleanExpiredSessions();

function readSessionToken(request: Request): string | null {
  const cookie = request.headers.cookie?.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${SESSION_COOKIE}=`));
  return cookie ? decodeURIComponent(cookie.slice(SESSION_COOKIE.length + 1)) : null;
}

function setSessionCookie(response: Response, token: string): void {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  response.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_MAX_AGE}${secure}`
  );
}

function clearSessionCookie(response: Response): void {
  response.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
}

function requireAuth(request: Request, response: Response, next: NextFunction): void {
  const token = readSessionToken(request);
  const user = token ? getSessionUser(token) : null;
  if (!user) {
    response.status(401).json({ error: 'Please sign in to continue.' });
    return;
  }
  (request as AuthenticatedRequest).user = user;
  next();
}

function currentUser(request: Request): User {
  return (request as AuthenticatedRequest).user!;
}

function isAdmin(request: Request): boolean {
  return currentUser(request).role === 'admin';
}

function canAccessSystem(request: Request, systemId: string): boolean {
  const ownerId = getSystemOwner(systemId);
  return ownerId !== null && (isAdmin(request) || ownerId === currentUser(request).id);
}

function validString(value: unknown, minLength = 1, maxLength = 200): value is string {
  return typeof value === 'string' && value.trim().length >= minLength && value.length <= maxLength;
}

function validNumber(value: unknown, min = -1_000_000_000, max = 1_000_000_000): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTheme(value: unknown): value is UserSettings['theme'] {
  return value === 'light' || value === 'dark' || value === 'system';
}

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validSystem(value: unknown): value is SolarSystem {
  return (
    isRecord(value) &&
    validString(value.id, 1, 100) &&
    validString(value.name, 1, 200) &&
    (value.systemClass === 'Residential' || value.systemClass === 'Commercial' || value.systemClass === 'Industrial') &&
    validNumber(value.panelCount, 1, 100_000) &&
    validNumber(value.panelWattage, 1, 100_000) &&
    validNumber(value.capacityKwp, 0, 100_000_000) &&
    validNumber(value.batteryCapacityKwh, 0, 100_000_000) &&
    validString(value.city, 1, 200) &&
    validNumber(value.latitude, -90, 90) &&
    validNumber(value.longitude, -180, 180) &&
    validNumber(value.tilt, 0, 180) &&
    validNumber(value.azimuth, -360, 360) &&
    validNumber(value.correctionFactor, 0, 100) &&
    typeof value.isSimulated === 'boolean' &&
    validString(value.userId, 1, 100) &&
    validString(value.apiKey, 1, 200) &&
    validString(value.createdAt, 1, 64)
  );
}

function validMeterLog(value: unknown): value is MeterLog {
  return (
    isRecord(value) &&
    validString(value.id, 1, 100) &&
    validString(value.systemId, 1, 100) &&
    validDate(value.date) &&
    validNumber(value.totalDayGenerationKwh, 0) &&
    validNumber(value.energyConsumedKwh, 0) &&
    validNumber(value.eveningRemainingKwh, 0) &&
    validNumber(value.netKwh) &&
    validNumber(value.predictedKwh, 0) &&
    validNumber(value.deltaKwh) &&
    (value.auditStatus === 'Verified' || value.auditStatus === 'Calibrated' || value.auditStatus === 'Pending') &&
    (value.note === undefined || validString(value.note, 0, 2000)) &&
    (value.morningReadingKwh === undefined || validNumber(value.morningReadingKwh, 0)) &&
    (value.daytimeReadingKwh === undefined || validNumber(value.daytimeReadingKwh, 0)) &&
    (value.eveningReadingKwh === undefined || validNumber(value.eveningReadingKwh, 0))
  );
}

function validTask(value: unknown): value is MaintenanceTask {
  return (
    isRecord(value) &&
    validString(value.id, 1, 120) &&
    (value.systemId === '' || validString(value.systemId, 1, 100)) &&
    validString(value.title, 1, 200) &&
    typeof value.cycleDays === 'number' &&
    Number.isInteger(value.cycleDays) &&
    value.cycleDays >= 1 &&
    value.cycleDays <= 3650 &&
    validDate(value.dueDate) &&
    typeof value.isDone === 'boolean' &&
    (value.lastCompletedAt === undefined || validString(value.lastCompletedAt, 1, 64))
  );
}

function validAdminPassword(submitted: string, configured: string): boolean {
  const submittedBuffer = Buffer.from(submitted);
  const configuredBuffer = Buffer.from(configured);
  return submittedBuffer.length === configuredBuffer.length && timingSafeEqual(submittedBuffer, configuredBuffer);
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3000;
  if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) throw new Error('PORT must be a valid TCP port.');

  app.use(express.json({ limit: '100kb' }));
  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok', service: 'Zuba Solar Energy System', time: new Date().toISOString() });
  });

  app.get('/api/auth/session', (request, response) => {
    const token = readSessionToken(request);
    const user = token ? getSessionUser(token) : null;
    response.json({ user });
  });

  app.post('/api/auth/login', (request, response) => {
    const { email, password } = request.body ?? {};
    if (!validString(email, 3, 254) || typeof password !== 'string' || password.length > 1024) {
      response.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    let user: User | null = null;
    if (cleanEmail === adminEmail) {
      const adminPassword = process.env.ZUBA_ADMIN_PASSWORD;
      if (!adminPassword) {
        response.status(503).json({ error: 'Admin sign-in is not configured on this server.' });
        return;
      }
      if (validAdminPassword(password, adminPassword)) {
        user = {
          id: 'usr_admin',
          name: process.env.ZUBA_ADMIN_NAME || 'Platform Administrator',
          email: adminEmail,
          role: 'admin',
          isActive: true,
          createdAt: new Date().toISOString(),
        };
      }
    } else {
      user = authenticateOperator(cleanEmail, password);
    }
    if (!user) {
      response.status(401).json({ error: 'Invalid email or password, or this account is inactive.' });
      return;
    }
    setSessionCookie(response, createSession(user.id));
    response.json({ user });
  });

  app.post('/api/auth/register', (request, response) => {
    const { name, email, password } = request.body ?? {};
    if (!validString(name, 1, 100) || !validString(email, 3, 254) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== 'string' || password.length < 8 || password.length > 1024) {
      response.status(400).json({ error: 'Enter a name, valid email address, and password with at least 8 characters.' });
      return;
    }
    if (email.trim().toLowerCase() === adminEmail) {
      response.status(409).json({ error: 'That email address is reserved for the administrator.' });
      return;
    }
    try {
      const user = createOperator(name, email, password);
      setSessionCookie(response, createSession(user.id));
      response.status(201).json({ user });
    } catch (error) {
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        response.status(409).json({ error: 'An account with this email address already exists.' });
        return;
      }
      throw error;
    }
  });

  app.post('/api/auth/logout', (request, response) => {
    const token = readSessionToken(request);
    if (token) deleteSession(token);
    clearSessionCookie(response);
    response.status(204).end();
  });

  app.get('/api/data', requireAuth, (request, response) => {
    const user = currentUser(request);
    const data = getUserData(user);
    const users = isAdmin(request) ? listUsers() : undefined;
    response.json({ ...data, users });
  });

  app.post('/api/systems', requireAuth, (request, response) => {
    const body = request.body;
    const user = currentUser(request);
    if (!validSystem(body)) {
      response.status(400).json({ error: 'Invalid solar system details.' });
      return;
    }
    if (db.prepare('SELECT 1 FROM systems WHERE id = ?').get(body.id)) {
      response.status(409).json({ error: 'That solar system already exists.' });
      return;
    }
    const system = { ...body, userId: isAdmin(request) ? body.userId : user.id };
    if (!db.prepare('SELECT 1 FROM users WHERE id = ?').get(system.userId)) {
      response.status(400).json({ error: 'The selected system owner does not exist.' });
      return;
    }
    saveSystem(system);
    response.status(201).json({ system });
  });

  app.put('/api/systems/:id', requireAuth, (request, response) => {
    const id = request.params.id;
    if (!canAccessSystem(request, id)) {
      response.status(404).json({ error: 'Solar system not found.' });
      return;
    }
    const existing = getUserData(currentUser(request)).systems.find((system) => system.id === id);
    const updates = request.body ?? {};
    const merged = existing && { ...existing, ...updates, id, userId: existing.userId };
    if (!merged || !validSystem(merged)) {
      response.status(400).json({ error: 'Invalid solar system details.' });
      return;
    }
    saveSystem(merged);
    response.json({ system: merged });
  });

  app.delete('/api/systems/:id', requireAuth, (request, response) => {
    const id = request.params.id;
    if (!canAccessSystem(request, id)) {
      response.status(404).json({ error: 'Solar system not found.' });
      return;
    }
    removeSystem(id);
    response.status(204).end();
  });

  app.post('/api/meter-logs', requireAuth, (request, response) => {
    const log = request.body;
    if (!validMeterLog(log) || !canAccessSystem(request, log.systemId)) {
      response.status(400).json({ error: 'Invalid meter log or solar system.' });
      return;
    }
    try {
      saveMeterLog(log);
    } catch (error) {
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        response.status(409).json({ error: 'That meter log already exists.' });
        return;
      }
      throw error;
    }
    response.status(201).json({ log });
  });

  app.post('/api/maintenance-tasks', requireAuth, (request, response) => {
    const task = request.body;
    const user = currentUser(request);
    const ownerId = task?.systemId ? getSystemOwner(task.systemId) : user.id;
    if (
      !validTask(task) ||
      !ownerId ||
      (!isAdmin(request) && ownerId !== user.id)
    ) {
      response.status(400).json({ error: 'Invalid maintenance task or solar system.' });
      return;
    }
    if (db.prepare('SELECT 1 FROM maintenance_tasks WHERE id = ?').get(task.id)) {
      response.status(409).json({ error: 'That maintenance task already exists.' });
      return;
    }
    saveMaintenanceTask(ownerId, task);
    response.status(201).json({ task });
  });

  app.put('/api/maintenance-tasks/:id', requireAuth, (request, response) => {
    const id = request.params.id;
    const ownerId = getMaintenanceTaskOwner(id);
    if (!ownerId || (!isAdmin(request) && ownerId !== currentUser(request).id)) {
      response.status(404).json({ error: 'Maintenance task not found.' });
      return;
    }
    const existing = getUserData(currentUser(request)).maintenanceTasks.find((task) => task.id === id);
    const merged = existing && {
      ...existing,
      ...request.body,
      id,
      lastCompletedAt: request.body?.lastCompletedAt ?? (request.body?.isDone === false ? undefined : existing.lastCompletedAt),
    };
    if (!merged || !validTask(merged)) {
      response.status(400).json({ error: 'Invalid maintenance task details.' });
      return;
    }
    const systemOwner = merged.systemId ? getSystemOwner(merged.systemId) : ownerId;
    if (!systemOwner || systemOwner !== ownerId || (!isAdmin(request) && systemOwner !== currentUser(request).id)) {
      response.status(403).json({ error: 'You cannot assign a task to that solar system.' });
      return;
    }
    saveMaintenanceTask(systemOwner, merged);
    response.json({ task: merged });
  });

  app.delete('/api/maintenance-tasks/:id', requireAuth, (request, response) => {
    const ownerId = getMaintenanceTaskOwner(request.params.id);
    if (!ownerId || (!isAdmin(request) && ownerId !== currentUser(request).id)) {
      response.status(404).json({ error: 'Maintenance task not found.' });
      return;
    }
    removeMaintenanceTask(request.params.id);
    response.status(204).end();
  });

  app.put('/api/settings', requireAuth, (request, response) => {
    const body: unknown = request.body;
    if (!isRecord(body)) {
      response.status(400).json({ error: 'Invalid settings.' });
      return;
    }
    const updates: Partial<UserSettings> = {};
    if (body.theme !== undefined) {
      if (!isTheme(body.theme)) {
        response.status(400).json({ error: 'Invalid theme selection.' });
        return;
      }
      updates.theme = body.theme;
    }
    if (body.tariffZmw !== undefined) {
      if (!validNumber(body.tariffZmw, 0, 1000) || !isAdmin(request)) {
        response.status(403).json({ error: 'Only an administrator can set the platform tariff.' });
        return;
      }
      updates.tariffZmw = body.tariffZmw;
    }
    if (body.openWeatherApiKey !== undefined) {
      if (!validString(body.openWeatherApiKey, 0, 512)) {
        response.status(400).json({ error: 'Invalid weather API key.' });
        return;
      }
      updates.openWeatherApiKey = body.openWeatherApiKey;
    }
    if (body.hasDismissedWelcomeGuide !== undefined) {
      if (typeof body.hasDismissedWelcomeGuide !== 'boolean') {
        response.status(400).json({ error: 'Invalid welcome guide setting.' });
        return;
      }
      updates.hasDismissedWelcomeGuide = body.hasDismissedWelcomeGuide;
    }
    saveUserSettings(currentUser(request).id, updates, isAdmin(request));
    response.json({ settings: getUserData(currentUser(request)).settings });
  });

  app.get('/api/admin/users', requireAuth, (request, response) => {
    if (!isAdmin(request)) {
      response.status(403).json({ error: 'Administrator access is required.' });
      return;
    }
    response.json({ users: listUsers() });
  });

  app.patch('/api/admin/users/:id', requireAuth, (request, response) => {
    if (!isAdmin(request)) {
      response.status(403).json({ error: 'Administrator access is required.' });
      return;
    }
    const { isActive } = request.body ?? {};
    if (typeof isActive !== 'boolean') {
      response.status(400).json({ error: 'isActive must be a boolean.' });
      return;
    }
    setUserActive(request.params.id, isActive);
    response.json({ users: listUsers() });
  });

  app.delete('/api/admin/users/:id', requireAuth, (request, response) => {
    if (!isAdmin(request)) {
      response.status(403).json({ error: 'Administrator access is required.' });
      return;
    }
    if (request.params.id === 'usr_admin') {
      response.status(400).json({ error: 'The administrator account cannot be deleted here.' });
      return;
    }
    removeUser(request.params.id);
    response.status(204).end();
  });

  app.use('/api', (_request, response) => response.status(404).json({ error: 'API route not found.' }));

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(projectRoot, 'dist')));
    app.get('*', (_request, response) => {
      response.sendFile(path.join(projectRoot, 'dist', 'index.html'));
    });
  }

  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    console.error('Request failed:', error);
    if (response.headersSent) return;
    response.status(500).json({ error: 'The request could not be completed.' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Zuba Solar server running at http://localhost:${PORT}`);
    console.log(`SQLite database: ${process.env.ZUBA_DATABASE_PATH || path.join(projectRoot, 'data', 'zuba.sqlite')}`);
  });
}

startServer().catch((error: unknown) => {
  console.error('Could not start Zuba Solar:', error);
  db.close();
  process.exitCode = 1;
});
