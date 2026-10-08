# YouTube Link Converter

A minimalist web app that converts YouTube links to yout-ube.com equivalents with automatic
redirection. Built with Astro 7, Svelte 5 islands, TypeScript and UnoCSS, run by Bun.

Live at [yt.edb.fi](https://yt.edb.fi).

## Features

- Converts all YouTube URL formats (standard, short, mobile, embed, shorts, live, music)
- Preserves timestamps, playlists, and other parameters
- Bilingual (Danish/English) with a persistent language choice
- Dark mode follows the operating system; responsive down to phone widths
- Conversion happens entirely in the browser — the link you paste never leaves your device

## Quick Start

```bash
bun install
bun run dev      # localhost:4321
bun run build    # static build to ./dist/
```

## Development

| Command | Action |
|---------|--------|
| `bun run dev` | Start the dev server |
| `bun run build` | Build to `./dist/` |
| `bun run preview` | Preview the production build |
| `bun run check` | Type-check `.astro` (`astro check`) and `.svelte` (`svelte-check`) |
| `bun test` | Unit tests for the URL converter |
| `bun run test:e2e` | Playwright end-to-end tests against the built site |
| `bun run lint` / `lint:fix` | Biome check / check with safe fixes |

`bun run test:e2e` needs a browser once: `bunx --bun playwright install chromium`. It serves
the current `./dist/`, so run `bun run build` first.

## How it is put together

The page is server-rendered as static HTML. Two Svelte islands carry the interactivity:

- `src/components/ConverterForm.svelte` — the form, and every string that changes with the language
- `src/components/LanguageSwitcher.svelte` — the language dropdown

They share the selected language through a nanostore (`src/lib/stores/language.ts`), persisted to
`localStorage`, which is what lets a click in one island retranslate the other. The URL conversion
itself lives in `src/utils/youtube-converter.ts` as pure functions with no DOM access, which is why
it can be unit-tested directly.

## Adding a language

1. Copy `src/i18n/locales/en.json` to `src/i18n/locales/<lang>.json` and translate it
2. Add the language to the `languages` and `translations` maps in `src/i18n/utils.ts`
3. Widen the `decode` guard in `src/lib/stores/language.ts`
4. Add a menu button in `src/components/LanguageSwitcher.svelte`
5. Add the code to the `i18n.locales` array in `astro.config.mjs`

## License

This project is open source and available under the
[GNU Affero General Public License v3.0](LICENSE).
