// @ts-check
import { defineConfig } from 'astro/config';

// The site is served from https://rafat12-cyber.github.io/LSTUDEmo/ on GitHub Pages.
// When moving to a custom domain, change `site` and set `base` to '/'.
export default defineConfig({
  site: 'https://rafat12-cyber.github.io',
  base: '/LSTUDEmo',
  trailingSlash: 'ignore',
});
