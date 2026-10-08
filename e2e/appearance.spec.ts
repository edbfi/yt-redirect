import { expect, test } from "@playwright/test";

/**
 * Dark mode, which on this page is the operating system's and nothing else.
 *
 * This file exists because of one specific, silent failure mode in the styling
 * engine: presetWind4 defaults to `dark: "class"`, which compiles every
 * `dark:` utility to a `.dark .foo` selector. This page has no
 * theme toggle and never sets that class, so under the default all ~30 `dark:`
 * utilities would compile to selectors that can never match — the build would
 * succeed, the CSS would look full, and the site would just quietly be
 * light-only for everyone. uno.config.ts sets `dark: "media"`; these tests are
 * what keeps that true.
 */

/** Reads the rules the browser actually parsed, not the source we hoped it got. */
async function auditDarkRules(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    let inPrefersColorScheme = 0;
    let underDarkClass = 0;

    const walk = (rules: CSSRuleList, insideDarkMedia: boolean) => {
      for (const rule of Array.from(rules)) {
        if (rule instanceof CSSMediaRule) {
          const dark = rule.conditionText.includes("prefers-color-scheme");
          walk(rule.cssRules, insideDarkMedia || dark);
        } else if (rule instanceof CSSStyleRule) {
          // `.dark\:text-white` is a utility *named* dark; `.dark .foo` is
          // class-based dark mode. The lookahead tells them apart.
          if (/(^|[\s,>+~])\.dark(?![\w\\-])/.test(rule.selectorText)) underDarkClass++;
          if (insideDarkMedia && rule.selectorText.includes("dark\\:")) inPrefersColorScheme++;
        } else if ("cssRules" in rule) {
          walk((rule as CSSGroupingRule).cssRules, insideDarkMedia);
        }
      }
    };

    for (const sheet of Array.from(document.styleSheets)) walk(sheet.cssRules, false);
    return { inPrefersColorScheme, underDarkClass };
  });
}

test("dark utilities compile to a media query, not to a .dark class", async ({ page }) => {
  expect((await page.goto("/"))?.status()).toBe(200);

  const audit = await auditDarkRules(page);
  expect(audit.underDarkClass).toBe(0);
  expect(audit.inPrefersColorScheme).toBeGreaterThan(20);
});

test("no .dark class is ever put on the document", async ({ page }) => {
  expect((await page.goto("/"))?.status()).toBe(200);
  await expect(page.locator("html")).not.toHaveClass(/(^|\s)dark(\s|$)/);
  await expect(page.locator("body")).not.toHaveClass(/(^|\s)dark(\s|$)/);
});

test("the palette follows the operating system preference", async ({ page }) => {
  const read = () =>
    page.evaluate(() => {
      const title = document.querySelector("#app-title");
      const card = document.querySelector("#converter-form")?.parentElement;
      if (!title || !card) throw new Error("page did not render");
      return {
        title: getComputedStyle(title).color,
        card: getComputedStyle(card).backgroundColor,
      };
    });

  await page.emulateMedia({ colorScheme: "light" });
  expect((await page.goto("/"))?.status()).toBe(200);
  const light = await read();

  await page.emulateMedia({ colorScheme: "dark" });
  const dark = await read();

  // `text-slate-800 dark:text-white` on the heading, `bg-white dark:bg-slate-800`
  // on the card: the two swap places, which is the tightest assertion available
  // without hard-coding a colour notation the engine is free to change.
  expect(dark.title).not.toBe(light.title);
  expect(dark.title).toBe(light.card);
  expect(dark.card).toBe(light.title);
});

test("the page declares that it supports both schemes", async ({ page }) => {
  // Without this the browser paints form controls and scrollbars light even
  // where the page is dark, and `prefers-color-scheme` styling looks half-applied.
  expect((await page.goto("/"))?.status()).toBe(200);
  await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute("content", "light dark");
});
