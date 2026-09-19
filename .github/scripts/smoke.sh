#!/usr/bin/env bash
set -euo pipefail
smoke_temp="$(mktemp -d)"
export RUNNER_TEMP="$smoke_temp"

server=''
trap 'if [[ -n "$server" ]]; then kill "$server" 2>/dev/null || true; fi; rm -rf "$smoke_temp"' EXIT
# CI delegates readiness, deadlines and process cleanup to the shared smoke action.
# Keep the standalone entry point useful after a local production build.
if [[ "${1:-}" != '--assert-only' ]]; then
  PORT=4321 bun run scripts/serve-dist.ts &
  server=$!
  timeout 90 bash -c 'until curl --noproxy "*" -fsS -o /dev/null http://127.0.0.1:4321/; do sleep 1; done'
fi

# Assert on CONTENT, not just status — a 200 error page would sail
# through a status-only check.
#
# The body goes to a file rather than into `curl ... | grep -q`:
# grep -q exits at the first match, curl then dies of SIGPIPE with
# exit 23, and `pipefail` turns that into a failure. Whether it trips
# depends on response size and timing, so the piped form is
# intermittently red rather than reliably broken.
#
# Single-page site: `/` is the whole surface.
for path in /; do
  echo "==> ${path}"
  curl --noproxy "*" -fsS -m 10 -o "${RUNNER_TEMP}/page.html" "http://127.0.0.1:4321${path}"
  grep -q '<title>' "${RUNNER_TEMP}/page.html" \
    || { echo "SMOKE FAILED: ${path} served no <title>"; exit 1; }
done

# The islands must server-render, not just hydrate. If @astrojs/svelte
# were misconfigured the page would still be a valid 200 document with
# a <title> and an empty middle, so these three probes check that the
# form and the switcher are in the HTML itself, in the default locale.
echo "==> the converter is server-rendered in Danish"
grep -q 'id="youtube-url"' "${RUNNER_TEMP}/page.html" \
  || { echo "SMOKE FAILED: the page has no input field"; exit 1; }
grep -q 'Konverter og Åbn' "${RUNNER_TEMP}/page.html" \
  || { echo "SMOKE FAILED: the submit button is missing or untranslated"; exit 1; }
grep -q 'id="language-button"' "${RUNNER_TEMP}/page.html" \
  || { echo "SMOKE FAILED: the language switcher is missing"; exit 1; }
