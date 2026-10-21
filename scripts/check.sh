#!/usr/bin/env bash
# Repo gate: pipeline lint + tests, web lint + tests + build.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"

py="$root/pipeline/.venv/Scripts/python.exe"
[ -x "$py" ] || py="$root/pipeline/.venv/bin/python"

echo "== pipeline: ruff"
(cd "$root/pipeline" && "$py" -m ruff check src tests)
echo "== pipeline: pytest"
(cd "$root/pipeline" && { code=0; "$py" -m pytest -q || code=$?; [ "$code" -eq 0 ] || [ "$code" -eq 5 ]; })  # 5 = no tests yet

echo "== web: lint"
(cd "$root/web" && npm run --silent lint)
echo "== web: test"
(cd "$root/web" && npx --no-install vitest run --passWithNoTests)
echo "== web: build"
(cd "$root/web" && npm run --silent build)
echo "ALL CHECKS PASSED"
