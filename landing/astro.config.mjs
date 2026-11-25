// @ts-check
import { defineConfig } from 'astro/config';

// Static site: `astro build` generates ./dist, which nginx serves (see Dockerfile).
export default defineConfig({
  // Set to the landing page's public URL (used e.g. for canonical / sitemap).
  site: process.env.SITE_URL || 'http://localhost:8080',
  output: 'static',
});
