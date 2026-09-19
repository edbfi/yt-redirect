#!/usr/bin/env bash
set -euo pipefail
bunx --bun biome ci .
python3 -B -m unittest discover -s tests -p 'test_*.py'
bun run check
bun test
bun run build
