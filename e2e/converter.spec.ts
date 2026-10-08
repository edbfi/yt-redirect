import { expect, type Page, test } from "@playwright/test";

/**
 * The converter form.
 *
 * Everything this page does happens in the browser, so this file is what
 * actually covers it: a prerendered Astro page answers 200 with a valid <title>
 * even when the island never hydrates. This suite is the CI smoke job.
 */

/**
 * Intercepts the redirect instead of following it.
 *
 * The form's whole purpose is to send the visitor to yout-ube.com. Letting the
 * test actually go there would make the suite depend on a third-party site being
 * up, so the navigation is aborted at the network layer and the URL it asked for
 * is what gets asserted. Returns the array the handler appends to.
 */
async function captureRedirects(page: Page): Promise<string[]> {
  const requested: string[] = [];
  await page.route("https://yout-ube.com/**", async (route) => {
    requested.push(route.request().url());
    await route.abort();
  });
  return requested;
}

test.beforeEach(async ({ page }) => {
  expect((await page.goto("/"))?.status()).toBe(200);
  // The island owns the field, so nothing below is meaningful until it hydrates.
  await expect(page.locator("#youtube-url")).toBeEnabled();
});

test("converts a standard watch link", async ({ page }) => {
  const requested = await captureRedirects(page);

  await page.locator("#youtube-url").fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  await page.locator("#submit-button").click();

  await expect.poll(() => requested[0]).toBe("https://yout-ube.com/watch?v=dQw4w9WgXcQ");
});

test("accepts a link with no scheme, which needs normalizeUrl first", async ({ page }) => {
  const requested = await captureRedirects(page);

  await page.locator("#youtube-url").fill("youtube.com/watch?v=dQw4w9WgXcQ");
  await page.locator("#submit-button").click();

  await expect.poll(() => requested[0]).toBe("https://yout-ube.com/watch?v=dQw4w9WgXcQ");
  await expect(page.locator("#error-message")).toBeHidden();
});

test("carries the timestamp across from a youtu.be short link", async ({ page }) => {
  const requested = await captureRedirects(page);

  await page.locator("#youtube-url").fill("https://youtu.be/dQw4w9WgXcQ?t=42");
  await page.locator("#submit-button").click();

  await expect.poll(() => requested[0]).toBe("https://yout-ube.com/watch?v=dQw4w9WgXcQ&t=42");
});

test("locks the button and says so while the redirect is in flight", async ({ page }) => {
  await captureRedirects(page);

  await page.locator("#youtube-url").fill("https://www.youtube.com/shorts/dQw4w9WgXcQ");
  await page.locator("#submit-button").click();

  await expect(page.locator("#submit-button")).toBeDisabled();
  await expect(page.locator("#button-text")).toHaveText("Konverterer...");
});

test("refuses a URL that is not YouTube, and does not navigate", async ({ page }) => {
  const requested = await captureRedirects(page);

  await page.locator("#youtube-url").fill("https://vimeo.com/123456");
  await page.locator("#submit-button").click();

  await expect(page.locator("#error-message")).toBeVisible();
  await expect(page.locator("#error-text")).toHaveText(
    "Ugyldig YouTube URL. Indsæt venligst et gyldigt YouTube link.",
  );
  expect(requested).toHaveLength(0);
});

test("refuses an empty field with its own message", async ({ page }) => {
  const requested = await captureRedirects(page);

  await page.locator("#submit-button").click();

  await expect(page.locator("#error-message")).toBeVisible();
  await expect(page.locator("#error-text")).toHaveText("Indsæt venligst et YouTube link.");
  expect(requested).toHaveLength(0);
});

test("clears the error as soon as the field is edited again", async ({ page }) => {
  await captureRedirects(page);

  await page.locator("#submit-button").click();
  await expect(page.locator("#error-message")).toBeVisible();

  await page.locator("#youtube-url").fill("h");
  await expect(page.locator("#error-message")).toBeHidden();
});

test("shows the error in the language the visitor picked", async ({ page }) => {
  // The error survives a language switch because the island stores the error
  // *key*, not the rendered message.
  await page.locator("#submit-button").click();
  await expect(page.locator("#error-text")).toHaveText("Indsæt venligst et YouTube link.");

  await page.locator("#language-button").click();
  await page.locator('[data-lang="en"]').click();

  await expect(page.locator("#error-text")).toHaveText("Please paste a YouTube link.");
});

test("a failed submit is announced and tied to the field", async ({ page }) => {
  // Without role="alert" the message appears silently for a screen-reader user.
  await page.locator("#youtube-url").fill("https://example.com/not-youtube");
  await page.locator("#submit-button").click();

  const error = page.locator("#error-message");
  await expect(error).toBeVisible();
  await expect(error).toHaveAttribute("role", "alert");
  await expect(page.locator("#youtube-url")).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#youtube-url")).toHaveAttribute("aria-describedby", "error-message");
});
