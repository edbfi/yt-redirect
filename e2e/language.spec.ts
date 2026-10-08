import { expect, test } from "@playwright/test";
import { LANGUAGE_STORAGE_KEY } from "../src/lib/stores/language";

/**
 * The language switcher, and the store both islands read.
 *
 * These are two separate `client:load` roots. Astro gives them no shared module
 * instance to rely on, so the fact that clicking a button in one retranslates
 * the other is the nanostore working — and is worth a test, because the failure
 * mode is silent (the switcher updates itself and nothing else).
 */

test.beforeEach(async ({ page }) => {
  expect((await page.goto("/"))?.status()).toBe(200);
  await expect(page.locator("#current-language")).toHaveText("Dansk");
});

test("the page is served in Danish before any choice is made", async ({ page }) => {
  await expect(page.locator("html")).toHaveAttribute("lang", "da");
  await expect(page.locator("#app-title")).toHaveText("YouTube Link Konverter");
  await expect(page.locator("#youtube-url")).toHaveAttribute(
    "placeholder",
    "Indsæt YouTube link her...",
  );
  await expect(page.locator("#info-text")).toHaveText(
    "Indsæt ethvert YouTube link format - vi håndterer konverteringen automatisk!",
  );
});

test("switching to English retranslates both islands", async ({ page }) => {
  await page.locator("#language-button").click();
  await page.locator('[data-lang="en"]').click();

  // The switcher's own island.
  await expect(page.locator("#current-language")).toHaveText("English");
  await expect(page.locator("#language-button")).toHaveAttribute("aria-label", "Select language");

  // The converter island, which nothing told directly — it reads the same store.
  await expect(page.locator("#app-title")).toHaveText("YouTube Link Converter");
  await expect(page.locator("#app-description")).toHaveText(
    "Convert YouTube links to yout-ube.com",
  );
  await expect(page.locator("#input-label")).toHaveText("Paste YouTube link here...");
  await expect(page.locator("#youtube-url")).toHaveAttribute(
    "placeholder",
    "Paste YouTube link here...",
  );
  await expect(page.locator("#button-text")).toHaveText("Convert and Open");
  await expect(page.locator("#info-text")).toHaveText(
    "Paste any YouTube link format - we'll handle the conversion automatically!",
  );
  await expect(page.locator("#footer-text")).toHaveText("Made with ❤️");

  // The document itself, which no component owns.
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page).toHaveTitle("YouTube Link Converter");
});

test("the choice survives a reload", async ({ page }) => {
  await page.locator("#language-button").click();
  await page.locator('[data-lang="en"]').click();
  await expect(page.locator("#app-title")).toHaveText("YouTube Link Converter");

  await page.reload();

  await expect(page.locator("#app-title")).toHaveText("YouTube Link Converter");
  await expect(page.locator("#current-language")).toHaveText("English");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("stores the bare language code under the pre-migration key", async ({ page }) => {
  // The persisted shape is a compatibility contract, not an implementation
  // detail: the code this island replaced wrote `localStorage.setItem("language",
  // lang)` directly. Changing the key or wrapping the value in JSON would
  // silently reset every visitor who had already chosen English.
  await page.locator("#language-button").click();
  await page.locator('[data-lang="en"]').click();
  await expect(page.locator("#app-title")).toHaveText("YouTube Link Converter");

  expect(await page.evaluate((key) => localStorage.getItem(key), LANGUAGE_STORAGE_KEY)).toBe("en");
});

test("honours a preference written by the pre-migration code", async ({ page }) => {
  await page.evaluate((key) => localStorage.setItem(key, "en"), LANGUAGE_STORAGE_KEY);
  await page.reload();

  await expect(page.locator("#app-title")).toHaveText("YouTube Link Converter");
});

test("falls back to Danish when the stored value is not a language we ship", async ({ page }) => {
  await page.evaluate((key) => localStorage.setItem(key, "de"), LANGUAGE_STORAGE_KEY);
  await page.reload();

  await expect(page.locator("#app-title")).toHaveText("YouTube Link Konverter");
  await expect(page.locator("#current-language")).toHaveText("Dansk");
});

test("the menu opens, closes on a click outside, and reports its state", async ({ page }) => {
  const menu = page.locator("#language-menu");
  await expect(menu).toBeHidden();
  await expect(page.locator("#language-button")).toHaveAttribute("aria-expanded", "false");

  await page.locator("#language-button").click();
  await expect(menu).toBeVisible();
  await expect(page.locator("#language-button")).toHaveAttribute("aria-expanded", "true");

  await page.locator("#app-title").click();
  await expect(menu).toBeHidden();
});

test("picking a language closes the menu", async ({ page }) => {
  await page.locator("#language-button").click();
  await page.locator('[data-lang="en"]').click();

  await expect(page.locator("#language-menu")).toBeHidden();
});

test("Escape closes the menu and returns focus to the trigger", async ({ page }) => {
  // The trigger reports aria-expanded, so a keyboard user has to be able to act
  // on that state. Without the Escape handler the attribute is a promise the
  // widget does not keep.
  const button = page.locator("#language-button");
  const menu = page.locator("#language-menu");

  await button.click();
  await expect(menu).toBeVisible();
  await expect(button).toHaveAttribute("aria-expanded", "true");

  await page.keyboard.press("Escape");

  await expect(menu).toBeHidden();
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await expect(button).toBeFocused();
});

test("selecting a language returns focus to the trigger", async ({ page }) => {
  await page.locator("#language-button").click();
  await page.locator('[data-lang="en"]').click();

  await expect(page.locator("#app-title")).toHaveText("YouTube Link Converter");
  await expect(page.locator("#language-button")).toBeFocused();
});

test("the trigger and menu are wired together for assistive tech", async ({ page }) => {
  const button = page.locator("#language-button");
  await expect(button).toHaveAttribute("aria-haspopup", "menu");
  await expect(button).toHaveAttribute("aria-controls", "language-menu");
  await expect(page.locator("#language-menu")).toHaveAttribute("role", "menu");
});
