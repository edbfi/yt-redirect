// @ts-check

import svelte from "@astrojs/svelte";
import { defineConfig } from "astro/config";
import UnoCSS from "unocss/astro";

// https://astro.build/config
export default defineConfig({
  integrations: [
    // injectReset pulls in the UnoCSS reset; presetWind4 does not separately
    // inject one, so there is exactly one reset in the output. src/styles/global.css
    // therefore carries only base rules, not a reset of its own.
    UnoCSS({ injectReset: true }),
    svelte(),
  ],
  vite: {
    build: {
      // Enable CSS code splitting
      cssCodeSplit: false, // Keep CSS in one file for this small app
    },
  },
  build: {
    // Don't inline stylesheets to keep them cacheable
    inlineStylesheets: "never",
  },
  compressHTML: true,
  i18n: {
    defaultLocale: "da",
    locales: ["da", "en"],
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
