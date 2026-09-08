import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { spawn } from 'child_process';
import { defineConfig, Plugin } from 'vite';

let pythonProc: any = null;

function pythonBackendPlugin(): Plugin {
  return {
    name: 'python-backend-runner',
    configureServer() {
      if (!pythonProc) {
        pythonProc = spawn(
          'python3',
          ['-m', 'uvicorn', 'backend.app.main:app', '--host', '0.0.0.0', '--port', '8001'],
          {
            stdio: 'inherit',
            env: { ...process.env, PYTHONPATH: '.' }
          }
        );
        process.on('exit', () => {
          if (pythonProc) pythonProc.kill();
        });
      }
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), pythonBackendPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8001',
          changeOrigin: true,
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
