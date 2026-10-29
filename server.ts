import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { timingSafeEqual } from 'crypto';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '10kb' }));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'Zuva Solar Energy System', time: new Date().toISOString() });
  });

  app.post('/api/auth/admin', (req, res) => {
    const adminEmail = (process.env.ZUBA_ADMIN_EMAIL || 'garrymapulanga@gmail.com').trim().toLowerCase();
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const submittedEmail = Buffer.from(email.trim().toLowerCase());
    const configuredEmail = Buffer.from(adminEmail);
    const emailMatches =
      submittedEmail.length === configuredEmail.length && timingSafeEqual(submittedEmail, configuredEmail);

    if (!emailMatches) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const adminPassword = process.env.ZUBA_ADMIN_PASSWORD;
    if (!adminPassword) {
      res.status(503).json({ error: 'Admin sign-in is not configured on this server.' });
      return;
    }

    const submittedPassword = Buffer.from(password);
    const configuredPassword = Buffer.from(adminPassword);
    const passwordMatches =
      submittedPassword.length === configuredPassword.length && timingSafeEqual(submittedPassword, configuredPassword);

    if (!passwordMatches) {
      res.status(403).json({ error: 'Invalid email or password.' });
      return;
    }

    res.json({
      id: 'usr_admin',
      name: process.env.ZUBA_ADMIN_NAME || 'Garry Mapulanga',
      email: adminEmail,
      role: 'admin',
      isActive: true,
      createdAt: new Date().toISOString(),
    });
  });

  // Mount Vite middlewares in development, or serve static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Zuva Solar server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
