<script lang="ts">
import { getTranslations, type Language, languages } from "../i18n/utils";
import { $language as languageStore } from "../lib/stores/language";

/**
 * The language dropdown.
 *
 * It takes no props: everything it renders comes from the shared language
 * store, which is also what makes the converter island re-render. That store is
 * the whole reason this is a Svelte island rather than the inline script it
 * replaced — the old code reached across the page with
 * `document.getElementById(...).textContent = ...` to keep seven elements in
 * step by hand.
 *
 * Nanostores implement the Svelte store contract, so `$languageStore` is a
 * plain auto-subscription. (There is no `@nanostores/svelte` package to install
 * — the registry 404s on it; the adapter exists for React, Vue and Solid, whose
 * frameworks have no equivalent built in.)
 */

let open = $state(false);
let button = $state<HTMLButtonElement | null>(null);
let menu = $state<HTMLDivElement | null>(null);

const copy = $derived(getTranslations($languageStore));

/**
 * The two document-level properties no component owns.
 *
 * A genuine side effect on state that lives outside Svelte's tree, which is
 * what $effect is for. Note that <title> and <meta name="description"> are
 * still server-rendered in the default language, exactly as before — this
 * corrects the title once the visitor's stored choice is known.
 */
$effect(() => {
  document.documentElement.lang = $languageStore;
  document.title = copy.app.title;
});

function select(lang: Language): void {
  languageStore.set(lang);
  open = false;
  // Focus returns to the trigger, otherwise selecting an item drops focus to
  // <body> and a keyboard user restarts their traversal from the top of the page.
  button?.focus();
}

/**
 * Escape closes the menu and returns focus.
 *
 * The trigger reports `aria-expanded`, and a control that announces that state
 * has to let a keyboard user act on it; an aria-expanded Escape cannot change
 * is a promise the widget does not keep.
 */
function closeOnEscape(event: KeyboardEvent): void {
  if (event.key === "Escape" && open) {
    open = false;
    button?.focus();
  }
}

/** Close on any click that landed outside both the trigger and the menu. */
function closeOnOutsideClick(event: MouseEvent): void {
  const target = event.target as Node | null;
  if (target === null) return;
  if (!button?.contains(target) && !menu?.contains(target)) {
    open = false;
  }
}
</script>

<svelte:document onclick={closeOnOutsideClick} onkeydown={closeOnEscape} />

<div class="absolute top-4 right-4 sm:top-6 sm:right-6">
  <div class="relative">
    <button
      bind:this={button}
      id="language-button"
      type="button"
      class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 border border-slate-200 dark:border-slate-700"
      aria-label={copy.language.select}
      aria-expanded={open}
      aria-haspopup="menu"
      aria-controls="language-menu"
      onclick={() => {
  open = !open;
}}
    >
      <svg
        aria-hidden="true"
        focusable="false"
        class="w-5 h-5 text-slate-600 dark:text-slate-300"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
        ></path>
      </svg>
      <span id="current-language" class="text-sm font-medium text-slate-700 dark:text-slate-200"
        >{languages[$languageStore]}</span
      >
      <svg
        aria-hidden="true"
        focusable="false"
        class="w-4 h-4 text-slate-500 dark:text-slate-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 9l-7 7-7-7"
        ></path>
      </svg>
    </button>
    <div
      bind:this={menu}
      id="language-menu"
      role="menu"
      class:hidden={!open}
      class="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-10"
    >
      <button
        type="button"
        data-lang="da"
        role="menuitem"
        class="language-option w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        onclick={() => select("da")}
      >
        🇩🇰 Dansk
      </button>
      <button
        type="button"
        data-lang="en"
        role="menuitem"
        class="language-option w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        onclick={() => select("en")}
      >
        🇬🇧 English
      </button>
    </div>
  </div>
</div>
