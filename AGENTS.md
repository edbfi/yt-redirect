# AGENTS.md

This file provides guidance to AI coding agents when working with code in this
repository.

Single-page Astro 7 site that converts YouTube URLs to `yout-ube.com` equivalents. Static build,
published to GitHub Pages at `yt.edb.fi`. Two Svelte 5 islands carry all the interactivity;
everything else is server-rendered HTML.

`.agents/rules/astro-svelte5-islands.md` is the stack specification — Bun, Astro 7, Svelte 5 runes,
UnoCSS, Biome. Read it before writing code here. This file covers what is specific to *this* repo.

## Commands

A Bun repo — `bun.lock`, `packageManager: "bun@1.4.2"`, no `package-lock.json`. All four
workflows install with `bun install --frozen-lockfile`.

| Command | Purpose |
|---|---|
| `bun install` | Install; `--frozen-lockfile` is what CI does |
| `bun run dev` | Dev server on `localhost:4321` |
| `bun run build` | Static build to `dist/` |
| `bun run preview` | Serve the built site |
| `bun run check` | `astro check` **and** `svelte-check` — see below |
| `bun test` | The converter unit suite (`bun:test`) |
| `bun run test:e2e` | Playwright, against the built `dist/` |
| `bun run lint` / `lint:fix` | `biome check .` / `biome check --write .` |

Targeted runs:

```bash
bun test src/utils/youtube-converter.test.ts        # one file
bun test -t "youtu.be"                              # one case
bunx --bun playwright test language.spec.ts         # one e2e file
bunx --bun playwright test -g "survives a reload"   # one e2e case
```

Full gate, in CI order:

```bash
bunx --bun biome ci . && bun run check && bun test && bun run build && bun run test:e2e
```

`bunx --bun biome ci .` is the authoritative lint gate, not `bun run lint`. It is currently clean —
zero errors, zero warnings — so anything it reports is something you introduced.

**`bun run check` is two commands, and both are load-bearing.** `astro check` does not look inside
`.svelte` files: with only `astro check`, a genuine type error in either island passes silently
(verified — a deliberate `const x: number = someString` in `ConverterForm.svelte` was reported by
`svelte-check` alone). Do not reduce `check` to `astro check`.

**`bunfig.toml` scopes `bun test` to `src/`.** Without that `[test] root`, the bare command would
also collect `e2e/*.spec.ts`, which import `@playwright/test` and cannot run under `bun:test`.

## Architecture

```
src/
├─ pages/index.astro        # the document: <head>, layout, the two islands, footer icons
├─ components/
│  ├─ ConverterForm.svelte  # client:load — the form AND every language-dependent string
│  └─ LanguageSwitcher.svelte # client:load — the dropdown, <html lang>, document.title
├─ lib/stores/language.ts   # persistentAtom — the state both islands share
├─ i18n/                    # locale JSON + typed accessors, used server- and client-side
└─ utils/youtube-converter.ts # pure conversion logic, the only unit-tested module
```

`src/utils/youtube-converter.ts` holds all URL parsing, validation and conversion. Pure functions,
no DOM. New conversion logic goes here, not in a component, where it would be untestable.

The page is server-rendered in Danish and the islands take over on hydration. There are no
per-locale routes.

### The island boundary, and why it is where it is

`ConverterForm.svelte` owns more than the `<form>`: the heading, the description, the tip box and
the footer line are all inside it. That is deliberate. Every one of those strings depends on the
same language store the form does, and the alternative — the arrangement this repo used before —
was an inline script that reached across the page with
`document.getElementById(...).textContent = ...` to keep seven elements in step by hand.

The one thing that cannot move into the island is `astro:assets`: `<Image>` is a build-time
component. The footer's three optimised icons therefore stay in `index.astro` and are passed in
through a named slot (`<Fragment slot="footerLinks">`), which Astro renders to HTML and hands to
the component as a snippet. Astro wraps it in an `<astro-slot>` element, which is `display: contents`
and so does not affect layout.

**Adding UI that changes with the language** means putting it inside an island, not adding another
imperative DOM write. If it genuinely cannot live in one, add a small island rather than reaching
into the page.

### Cross-island state

`src/lib/stores/language.ts` is a `persistentAtom` from `@nanostores/persistent`. Astro gives two
separate `client:load` roots no shared module instance to rely on, so a nanostore is the documented
way for them to share state — and switching the language in one island retranslating the other is
exactly that mechanism working.

Consumed in Svelte as a plain `$` auto-subscription (`$languageStore`): nanostores implement the
Svelte store contract, so no adapter package is involved. **There is no `@nanostores/svelte`
package** — npm has never carried one, so an import of it will not resolve. The framework adapters
(`@nanostores/react`, `/preact`, `/vue`, `/solid`, `/lit`, `/angular`, `/alpine`) exist for
frameworks with no equivalent of that contract.

The one case that does need a package is a `.svelte.ts`/`.svelte.js` module, where `$`
auto-subscription is unavailable — it is a compiler feature of `.svelte` components.
`@nanostores/svelte-runes` covers that, read through `.current` rather than `$`. Both islands here
are `.svelte` components, so it is not needed and not installed.

**The persisted shape is a compatibility contract.** The store writes the bare string `da`/`en`
under the key `language`, which is exactly what the pre-migration `localStorage.setItem("language",
lang)` wrote. Changing the key, or wrapping the value in JSON, silently resets every visitor who
had already chosen English. `e2e/language.spec.ts` asserts both the key and the raw encoding, plus
that a value written by the old code is still honoured.

## Styling

UnoCSS, `presetWind4`. There is no `tailwind.config.js`, no PostCSS and no `@apply`; the reset comes
from `UnoCSS({ injectReset: true })` in `astro.config.mjs`. `src/styles/global.css` holds only the
handful of document-level base rules that are not utilities.

- **`presetWind4({ dark: "media" })` in `uno.config.ts` is the single most fragile line in the
  repo.** The preset defaults to `dark: "class"`, which compiles every `dark:` utility to a
  `.dark .foo` selector. This page has no theme toggle and never sets that class — dark mode is the
  operating system's, via `<meta name="color-scheme" content="light dark">`. Under the default, all
  ~30 `dark:` utilities compile to selectors that can never match: the build succeeds, the CSS looks
  full, and the site is quietly light-only. `e2e/appearance.spec.ts` is the guard; flipping the
  option back to `"class"` fails two of its tests immediately.
- **No `presetShadcn`, `presetAnimations` or `presetIcons`, unlike the sibling repos.** None has a
  consumer here: no `animate-*` utility, no `i-*` utility and no `@iconify-json/*` collection for
  `presetIcons` to resolve against, and no shadcn-svelte component, `components.json` or `cn()`
  helper for `presetShadcn` to serve. `presetShadcn` is not free when unused — it emits four
  `@keyframes` referencing `--radix-*` variables nothing here can define, and its `globals` would
  ship a `.dark` block, which is precisely the class-based dark mode this page must not have. Add
  one back in the shape `faktalink` uses when something actually needs it.
- **`safelist: ["hidden"]` is not decoration.** The language menu and the error box toggle
  visibility with Svelte's `class:hidden={…}` directive, and UnoCSS's default extractor reads
  `class="…"` string literals, not class directives. Remove the safelist entry and
  `.hidden{display:none}` disappears from the built CSS, leaving the menu permanently open.

## i18n

`src/i18n/utils.ts` exports `languages`, `defaultLang`, `translations`, `getTranslations(lang)` and
`t(lang, key)`.

| Want | Use |
|---|---|
| A key you know at author time | `getTranslations(lang).form.convertButton` — type-checked |
| A key computed at run time | `t(lang, \`errors.${key}\`)` — the converter's error keys |

Prefer `getTranslations`. `t()` exists for the one case that cannot be type-checked: `convertYouTubeUrl`
returns an error *key*, and the form looks it up as `errors.<key>`. Storing the key rather than the
rendered message is what lets a visible error survive a language switch — `e2e/converter.spec.ts`
asserts that.

**Adding a language.** All of these must change together:

1. `src/i18n/locales/<lang>.json`
2. `src/i18n/utils.ts` — the `languages` and `translations` maps
3. `src/lib/stores/language.ts` — the `decode` guard, which currently reads
   `value === "en" ? "en" : defaultLang`
4. `src/components/LanguageSwitcher.svelte` — a `data-lang` menu button
5. `astro.config.mjs` — the `i18n.locales` array. Nothing reads it today (see Gotchas: no locale
   routing is active), but leaving it stale would mislead the next reader

Nothing else hardcodes the pair any more. The info-box tip and the language label used to be
inline `da`/`en` ternaries in the page; both are locale keys now (`form.tip`, and the `languages`
map). Keep it that way.

**Adding a converter failure mode.** `convertYouTubeUrl` returns an error key, never a message
(`emptyInput`, `invalidUrl`, `conversionFailed`). So: return the new key, add `errors.<key>` to
**both** locale JSONs (otherwise the UI renders the raw key string), and add a rejection case to the
`it.each` block in `youtube-converter.test.ts`.

## Gotchas

- **`astro.config.mjs` declares `i18n.locales: ["da", "en"]`, but no locale routing is active** —
  `index.astro` is the only page and the build emits exactly one. Don't link to `/en/` or assume
  Astro locale routing; the language is a client-side preference.
- **`convertYouTubeUrl` does not normalize.** It rejects `youtube.com/watch?v=…` as `invalidUrl`
  because `new URL()` throws without a scheme. Call `normalizeUrl()` first, as `ConverterForm.svelte`
  does.
- **Biome does not format `.astro` or `.svelte` files** (`biome.json` disables the formatter for
  both in an override) and does not type-check Svelte templates. It still lints their script blocks.
  Match the surrounding indentation by hand: `index.astro`'s markup is tab-indented while
  `biome.json` sets 2-space indent for JS.
- **Do not hand-edit the `$schema` version in `biome.json`.** A Renovate custom manager
  (from the shared preset) tracks the schema alongside the package.
  `biome-repair.yml` computes fixes with read-only permissions and publishes only
  allowlisted changes in a separate job, then explicitly dispatches full CI.
- **Dependency versions are pinned exactly, no `^` ranges** — estate convention, enforced by
  `exact = true` in `bunfig.toml`.
- **Successful final CI triggers deployment for the exact `main` commit.** The publisher checks
  that revision and its final CI before publishing. The custom domain remains the `cname:` input
  in `deploy.yml`, not a `public/CNAME` file.

## Not adopted, and why

- **shadcn-svelte / bits-ui.** The only candidate is the language dropdown. Adopting it would
  replace hand-written markup and change the DOM and classes, which puts visual parity at risk for
  no functional gain. `unocss-preset-shadcn` is not installed either — see Styling above.
- **Astro actions, middleware, content collections, an adapter.** There is no server: the site is
  static and the conversion is client-side by design.
- **`client:visible`.** Both islands are above the fold on a single-screen page and one of them *is*
  the reason a visitor is here, so both are `client:load`.

## Reference

- `.agents/rules/astro-svelte5-islands.md` — the stack specification. Canonical, byte-identical to
  the estate copy; do not edit it here.
- `uno.config.ts` — read the comments before touching the presets. Two of the settings guard
  failures that are invisible in a passing build.
- `.github/workflows/tests.yml` — the unit and Playwright tier. This is the workflow that actually
  covers the app's behaviour.
- `.github/workflows/smoke.yml` — build-serve-load. Its header explains what it cannot catch.
- `.github/workflows/code-quality.yml` — read-only lint/type/unit/build lane.
- `CI.md` — shared gate, build artifact handoff and isolated Biome repair contract.
