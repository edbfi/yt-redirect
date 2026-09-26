# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Single static page (Astro 7, `output` static, no adapter) deployed from `dist/` to GitHub Pages at yt.edb.fi. All interactivity lives in two Svelte 5 islands; URL conversion runs entirely in the browser.

## Commands

- `bun run dev` (port 4321), `bun run build` (to `dist/`)
- `bun run check`: `astro check` + `svelte-check` + `svelte-check --tsgo` (native TypeScript 7). All three must pass.
- `bun run lint` / `bun run lint:fix`: Biome. CI runs `bunx --bun biome ci .`
- Unit tests: `bun test` (scoped to `src/` by `bunfig.toml`, uses `bun:test`, there is no Vitest)
  - one file: `bun test src/utils/youtube-converter.test.ts`
  - one case: `bun test src/utils/youtube-converter.test.ts -t "normalizeUrl"`
- Deploy-selection tests: `python3 -B -m unittest discover -s tests -p 'test_*.py'` (covers `.github/scripts/deployment.py`)
- E2E: `bun run build` first, then `bun run test:e2e`
  - one test: `bun run test:e2e e2e/converter.spec.ts -g "converts a standard watch link"`
  - one-time browser install: `bunx --bun playwright install chromium`
- Full local CI: `bash .github/scripts/check.sh`, then `bash .github/scripts/smoke.sh`

## Gotchas

- E2E serves the built `dist/` through `scripts/serve-dist.ts`, not `astro preview`, because Astro 7's preview runs as a daemon and Playwright's `webServer` then exits early. Rebuild before every e2e run, or you are testing stale output. Locally Playwright reuses anything already listening on 4321, so stop `bun run dev` first or the suite runs against the dev server.
- Keep Playwright specs in `e2e/`. `bun test` only looks under `src/`, and it can't run `@playwright/test` specs.
- Dark mode comes only from the OS: `presetWind4({ dark: "media" })` in `uno.config.ts`, with no `.dark` class and no toggle. Don't switch it to class mode or add a theme toggle, because every `dark:` utility would silently stop matching. `e2e/appearance.spec.ts` checks this.
- UnoCSS can't see classes that are applied only through a Svelte `class:foo={…}` directive. The repo handles this with `safelist: ["hidden"]` in `uno.config.ts`, not `@unocss/extractor-svelte`. Add any new class that is only toggled by a directive to that `safelist`.
- Shared state between islands goes through nanostores, not `.svelte.ts` rune modules. The language store is `$language` in `src/lib/stores/language.ts`. Inside a component, read it with the `$languageStore` auto-subscription; there is no `@nanostores/svelte` package. Don't change `LANGUAGE_STORAGE_KEY` or the identity encoding, because either change resets every visitor's saved language.
- The HTML is rendered in Danish (`defaultLang`), and the islands switch languages after hydration. Text that has to change with the language must be rendered inside an island (`ConverterForm.svelte` or `LanguageSwitcher.svelte`), not in `src/pages/index.astro`. `astro:assets` `<Image>` can't render inside an island, so the page renders it and passes it into `ConverterForm` through the `footerLinks` slot/snippet.
- The shape of `src/i18n/locales/da.json` defines the `TranslationKeys` type. Add every new key to both `da.json` and `en.json`.
- `convertYouTubeUrl` returns an error *key*, and the form turns it into a message with ``t(lang, `errors.${key}`)``. A new error needs an `errors.<key>` entry in both locale files. Always pass input through `normalizeUrl` first, because input without a scheme is otherwise rejected as `invalidUrl`.
- The element ids (`#youtube-url`, `#submit-button`, `#language-button`, `#app-title`, …) and the Danish button text "Konverter og Åbn" are asserted by `e2e/*.spec.ts` and `.github/scripts/smoke.sh`. If you rename one, update those files in the same change.
- Import with relative paths, as the existing code does. The `@/*` and `$lib` aliases in `tsconfig.json` are unused.
- prek blocks local commits to `main` (`no-commit-to-branch`) and checks commit messages with `conventional-pre-commit`. PR titles must also be Conventional Commits. Do your work on a branch.

## Island pattern

Language-dependent text, from `src/components/ConverterForm.svelte`:

```svelte
import { getTranslations, t } from "../i18n/utils";
import { $language as languageStore } from "../lib/stores/language";

const copy = $derived(getTranslations($languageStore));
const errorMessage = $derived(errorKey === null ? "" : t($languageStore, `errors.${errorKey}`));
```

Use `getTranslations` for keys known when you write the code, because it is type-checked. Use `t()` only for keys computed at runtime.

## Reference

- `.agents/rules/astro-svelte5-islands.md`: generic reference for this stack (Svelte 5 runes, Astro islands, UnoCSS). Read it before writing a new Svelte component or Astro page. Its sample configs (Vitest, shadcn-svelte, `@unocss/extractor-svelte`, package scripts, `bunfig.toml`, Biome `html` option) don't describe this repo. Where they differ, this repo's config files win.
- `README.md` "Adding a language": the five files to touch when adding a locale. Follow it step by step.
- Deployment workflows are disabled.
