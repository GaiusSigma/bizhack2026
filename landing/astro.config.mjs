// @ts-check
import { defineConfig } from 'astro/config';

// Strona statyczna: `astro build` generuje ./dist, które serwuje nginx (patrz Dockerfile).
export default defineConfig({
  // Ustaw na publiczny adres landingu (używane m.in. w canonical / sitemap).
  site: process.env.SITE_URL || 'http://localhost:8080',
  output: 'static',
});
