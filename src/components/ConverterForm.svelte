<script lang="ts">
import type { Snippet } from "svelte";
import { getTranslations, t } from "../i18n/utils";
import { $language as languageStore } from "../lib/stores/language";
import { convertYouTubeUrl, normalizeUrl } from "../utils/youtube-converter";

/**
 * The converter, and with it every piece of text on the page that changes with
 * the language.
 *
 * The island boundary is drawn around the whole centre column rather than
 * around `<form>` alone, and deliberately: the heading, the description, the
 * tip and the footer line all depend on the same store as the form does, and
 * the alternative is the imperative `getElementById(...).textContent = ...`
 * sweep this migration exists to delete. The one thing that cannot move in
 * here is `astro:assets`, so the footer's optimised icons stay in the page and
 * arrive through a slot.
 */
interface Props {
  /** The footer's icon links, rendered by Astro so they keep `<Image>`. */
  footerLinks?: Snippet;
}

let { footerLinks }: Props = $props();

let url = $state("");
/**
 * The *key* the converter returned, not a message: it has to survive a
 * language switch, and only the key is language-independent.
 */
let errorKey = $state<string | null>(null);
let converting = $state(false);

const copy = $derived(getTranslations($languageStore));
const errorMessage = $derived(errorKey === null ? "" : t($languageStore, `errors.${errorKey}`));

function convert(event: SubmitEvent): void {
  event.preventDefault();
  errorKey = null;

  const raw = url.trim();
  if (raw === "") {
    errorKey = "emptyInput";
    return;
  }

  // normalizeUrl first: convertYouTubeUrl rejects a bare `youtube.com/watch?v=…`
  // as invalidUrl, because `new URL()` throws without a scheme.
  const result = convertYouTubeUrl(normalizeUrl(raw));
  if (!result.success || result.convertedUrl === undefined) {
    errorKey = result.error ?? "conversionFailed";
    return;
  }

  // The button locks and reads "Converting…" for 300 ms before the redirect, so
  // that a same-origin-feeling navigation still acknowledges the click.
  converting = true;
  const target = result.convertedUrl;
  setTimeout(() => {
    window.location.href = target;
  }, 300);
}
</script>

<!-- Header -->
<div class="text-center mb-8 sm:mb-12">
  <div
    class="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-red-500 rounded-2xl mb-4 sm:mb-6 shadow-lg"
  >
    <svg
      aria-hidden="true"
      focusable="false"
      class="w-10 h-10 sm:w-12 sm:h-12 text-white"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
      />
    </svg>
  </div>
  <h1
    id="app-title"
    class="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-800 dark:text-white mb-2 sm:mb-3"
  >
    {copy.app.title}
  </h1>
  <p id="app-description" class="text-base sm:text-lg text-slate-600 dark:text-slate-300">
    {copy.app.description}
  </p>
</div>

<!-- Converter Form -->
<div
  class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700"
>
  <form id="converter-form" class="space-y-4 sm:space-y-6" onsubmit={convert}>
    <!-- Input Field -->
    <div>
      <label for="youtube-url" class="sr-only" id="input-label">
        {copy.form.inputPlaceholder}
      </label>
      <input
        type="text"
        id="youtube-url"
        name="youtube-url"
        placeholder={copy.form.inputPlaceholder}
        class="w-full px-4 sm:px-6 py-3 sm:py-4 text-base sm:text-lg bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
        autocomplete="off"
        spellcheck="false"
        aria-invalid={errorKey !== null}
        aria-describedby={errorKey === null ? undefined : "error-message"}
        bind:value={url}
        oninput={() => {
  errorKey = null;
}}
      >
    </div>

    <!-- Error Message -->
    <!--
      role="alert" so a screen reader announces the failure: without it the
      message simply appears and nothing is spoken. aria-invalid/aria-describedby
      below tie it to the field it is about.
    -->
    <div
      id="error-message"
      role="alert"
      class:hidden={errorKey === null}
      class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
    >
      <p class="text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
        <svg
          aria-hidden="true"
          focusable="false"
          class="w-5 h-5 flex-shrink-0 mt-0.5"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clip-rule="evenodd"
          />
        </svg>
        <span id="error-text">{errorMessage}</span>
      </p>
    </div>

    <!-- Submit Button -->
    <button
      type="submit"
      id="submit-button"
      disabled={converting}
      class="w-full px-6 py-3 sm:py-4 bg-red-500 hover:bg-red-600 text-white font-semibold text-base sm:text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span id="button-text">{converting ? copy.form.converting : copy.form.convertButton}</span>
    </button>
  </form>

  <!-- Info Box -->
  <div
    class="mt-6 sm:mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
  >
    <p class="text-xs sm:text-sm text-blue-800 dark:text-blue-300">
      <strong>ℹ️ Tip:</strong> <span id="info-text">{copy.form.tip}</span>
    </p>
  </div>
</div>

<!-- Footer -->
<div class="text-center mt-8 text-sm text-slate-500 dark:text-slate-400">
  <p id="footer-text">{copy.footer.madeWith} ❤️</p>
  {@render footerLinks?.()}
</div>
