import { spawn, ChildProcess } from 'child_process';
import { request as httpRequest } from 'http';
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const apiPort = process.env.ZUBA_API_PORT ? parseInt(process.env.ZUBA_API_PORT, 10) : 5001;
  const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
  let apiProcess: ChildProcess | undefined;

  apiProcess = spawn(python, [path.join(__dirname, 'backend', 'app.py')], {
    cwd: __dirname,
    env: { ...process.env, ZUBA_API_PORT: String(apiPort) },
    stdio: 'inherit',
  });
  apiProcess.on('error', (error) => {
    console.error(`Could not start the Python API (${python}):`, error.message);
  });
  apiProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`Python API stopped with exit code ${code}.`);
    }
  });

  app.use('/api', (req, res) => {
    const headers = { ...req.headers, host: `127.0.0.1:${apiPort}` };
    delete headers.connection;
    const proxyRequest = httpRequest(
      {
        hostname: '127.0.0.1',
        port: apiPort,
        path: req.originalUrl,
        method: req.method,
        headers,
      },
      (proxyResponse) => {
        res.writeHead(proxyResponse.statusCode || 502, proxyResponse.headers);
        proxyResponse.pipe(res);
      }
    );

    proxyRequest.on('error', (error) => {
      console.error('Python API request failed:', error.message);
      if (!res.headersSent) {
        res.status(503).json({ error: 'Python API is unavailable. Restart the app and try again.' });
      }
    });
    req.pipe(proxyRequest);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const server = app.listen(port, '127.0.0.1', () => {
    console.log(`Zuba Solar app running at http://127.0.0.1:${port}`);
  });

  const shutdown = () => {
    apiProcess?.kill();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1500).unref();
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

startServer();
