import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end configuration.
 *
 * Runs against the real static build rather than the dev server: the build is
 * what ships, and it is the only thing that exercises Astro's Rust compiler and
 * the Svelte hydration output together. Nearly all of this app's behaviour is
 * client-side, so this suite is the smoke job in .github/workflows/ci.yml. Run
 * `bun run build` first.
 *
 * The site deploys to the root of a custom domain (no `base` in
 * astro.config.mjs), so baseURL is the bare origin.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"]],
  use: {
    // Set by webServer.wait below once this run's own server is listening.
    baseURL: `http://127.0.0.1:${process.env.YT_REDIRECT_E2E_PORT}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Not `astro preview`: in Astro 7 it registers a background daemon, so a
    // second invocation detects the first and exits immediately, which Playwright
    // reports as "Process from config.webServer exited early".
    // scripts/serve-dist.ts is a plain foreground file server with no shared state
    // that serves dist/ the way GitHub Pages does.
    //
    // Port 0 lets the OS pick a free port, and readiness is this process's own
    // "Serving" line, never whatever answers on a port, so the suite cannot test
    // a dev server or another run's server. If the server exits first, the run
    // fails at once.
    command: "bun run scripts/serve-dist.ts --port 0",
    wait: { stdout: /Serving dist\/ at http:\/\/localhost:(?<yt_redirect_e2e_port>\d+)\// },
    timeout: 30_000,
  },
});
