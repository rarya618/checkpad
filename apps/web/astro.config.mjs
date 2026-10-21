// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import react from '@astrojs/react';

// The check-in API in the Functions emulator (see CLAUDE.md for starting it). demo-checkpad
// is emulator-only, so local check-ins never reach production.
const API_EMULATOR = 'http://127.0.0.1:5001/demo-checkpad/australia-southeast1/api';

/**
 * Serves event and team links from their shared pages in development, as the Hosting
 * rewrites in firebase.json do once deployed: /<slug> → /check-in, /team/<slug> → /team.
 * @returns {import('vite').Plugin}
 */
function checkInRewrites() {
  return {
    name: 'checkpad-check-in-rewrites',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const [path, query = ''] = (req.url ?? '').split('?');
        const search = query ? `?${query}` : '';
        if (/^\/team\/[a-z0-9-]+\/?$/.test(path)) req.url = `/team${search}`;
        else if (/^\/[a-z0-9-]+\/?$/.test(path) && !['/api', '/check-in', '/team'].includes(path.replace(/\/$/, ''))) {
          req.url = `/check-in${search}`;
        }
        next();
      });
    }
  };
}

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss(), checkInRewrites()],
    server: {
      proxy: {
        '/api': { target: API_EMULATOR, changeOrigin: true, rewrite: (path) => path.replace(/^\/api/, '') }
      }
    }
  },

  integrations: [react()],

  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Bricolage Grotesque',
      cssVariable: '--font-bricolage',
      weights: ['200 800'],
      fallbacks: ['sans-serif'],
      options: {
        experimental: {
          variableAxis: { opsz: [['12', '96']] }
        }
      }
    },
    {
      provider: fontProviders.google(),
      name: 'Geist Mono',
      cssVariable: '--font-geist-mono',
      weights: ['400'],
      fallbacks: ['monospace']
    }
  ]
});
