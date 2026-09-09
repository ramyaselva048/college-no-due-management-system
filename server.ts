import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './server/routes';

const PORT = 3000;

async function startServer() {
  const app = express();

  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Routes mounted before Vite middleware
  app.use('/api', apiRouter);

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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
