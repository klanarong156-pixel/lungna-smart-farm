#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

log() { printf '\n[%s] %s\n' "pre-deploy" "$1"; }
fail() { printf '\n[pre-deploy] FAILED: %s\n' "$1" >&2; exit 1; }

command -v node >/dev/null 2>&1 || fail 'Node.js is required'

log 'Checking JavaScript syntax'
while IFS= read -r -d '' file; do
  node --check "$file"
done < <(find dashboard/js -type f -name '*.js' -print0 | sort -z)
node --check dashboard/sw.js

log 'Checking dashboard JSON manifest'
python3 -m json.tool dashboard/manifest.json >/dev/null

log 'Running unit and regression tests'
while IFS= read -r -d '' test_file; do
  [[ "$test_file" == *'/firmware-contract.test.cjs' ]] && continue
  node --test "$test_file"
done < <(find tests -maxdepth 1 -type f -name '*.cjs' -print0 | sort -z)

log 'Running firmware contract test'
node --test tests/firmware-contract.test.cjs

if [[ "${MQTT_HEALTHCHECK:-0}" == "1" ]]; then
  log 'Running hardware-safe MQTT read-only health check'
  [[ -d node_modules/mqtt ]] || fail 'MQTT health check requires npm ci first'
  node scripts/mqtt-health-check.cjs
else
  log 'Skipping MQTT hardware check (set MQTT_HEALTHCHECK=1 to enable; no commands are published)'
fi

log 'All pre-deploy checks passed'
