import express from 'express';
import path from 'path';
import { spawn } from 'child_process';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;
const PYTHON_PORT = 8001;

async function startServer() {
  const app = express();

  // Ensure Python FastAPI is running with reload support
  const pyProcess = spawn('python3', ['-m', 'uvicorn', 'backend.app.main:app', '--host', '0.0.0.0', '--port', String(PYTHON_PORT), '--reload'], {
    stdio: 'inherit',
    env: { ...process.env }
  });

  pyProcess.on('error', (err) => {
    console.error('Failed to start Python backend:', err);
  });

  process.on('exit', () => {
    pyProcess.kill();
  });

  // Proxy /api requests to Python FastAPI
  app.use(
    '/api',
    createProxyMiddleware({
      target: `http://127.0.0.1:${PYTHON_PORT}`,
      changeOrigin: true,
      ws: true,
    })
  );

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server unified gateway running on http://localhost:${PORT}`);
  });
}

startServer();
