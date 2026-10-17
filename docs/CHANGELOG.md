# Changelog

## Compact field-journal dashboard — 2026-10-17

- Applied the approved warm-ivory, forest-green and muted-terracotta visual direction across all six dashboard routes, with tighter spacing and a responsive desktop sidebar/mobile navigation.
- Removed the duplicate global ESP badge, consolidated the regional-weather caveats, and split Events and Finance into tabs while preserving legacy `#events` and `#finance` links and local finance data.
- Preserved existing relay, AUTO/MANUAL, schedule, telemetry and safety behavior; bumped the PWA shell cache to `lungna-shell-v9` and updated the app theme metadata.

## Full Dashboard redesign — 2026-10-17 (pending review)

- Expanded the redesign from Home to every route and reduced primary navigation from seven entries to six real-use workspaces: Home, Water, Devices, System, Weather, Records.
- Mapped the four user-marked device points as relative schematic markers; selecting a marker only opens the existing Water control and never sends a command from Home.
- Merged MQTT connection and actual web-system tools into System; removed the unused static admin-info shortcut and the uninstalled Soil Sensor card. Preserved relay/schedule safety, credential handling, and firmware acknowledgement.
- Consolidated session-only event history and browser-local finance records under Records, preserving finance entries, clear confirmation, and CSV export. Added legacy hash aliases.
- Replaced visible exact farm-point weather labels with a coarse regional forecast reference; the forecast may differ from conditions at the parcel and remains separate from DHT11/control.
- Bumped the PWA shell cache to `lungna-shell-v8`. This change is pending review and has not been merged or deployed.

## Bright Farm dashboard refresh — 2026-10-16

- Reworked the dashboard into a brighter farm-oriented visual hierarchy with clearer status cards, warmer accents, and a simplified connection workspace.
- Added automatic MQTT connection on page load when credentials already exist in browser storage; first-time setup still requires the operator to enter the password and credentials are never committed to source.
- Added live connection hero status and bumped the PWA shell cache to `lungna-shell-v6` so the new UI is picked up after deployment.

## Dashboard UX refresh — 2026-10-15

- Rebuilt Home as a farm command center, consolidated water mode/relay/schedule controls into one dedicated page, removed repeated sensor and relay panels, and trimmed inactive settings shortcuts/placeholders.
- Reorganized Water, Devices, Weather and Settings into page-specific workspaces while preserving all MQTT, schedule, finance, weather and device-detail workflows.
- Added a modern leaf-and-field emblem and refreshed the PWA icons; the Thai farm name remains rendered as real text.
- Bumped the offline shell to `lungna-shell-v5`; Service Worker activation now deletes only older `lungna-shell-*` caches and preserves other applications' caches.
- Added regression coverage for unique control surfaces and cache isolation. Firmware, MQTT topics/payloads and safety logic are unchanged.

## V7.2.0 — production baseline

- Initialize clean production repository, mobile-first dashboard, MQTT state manager with relay/mode ACKs and bounded exponential reconnect, PWA shell, local finance ledger with receivables/export, weather forecast view, and compatibility documentation.
- Firmware source based on audited `V7.2.0-OTA-STABLE` from New140869; relay pin mapping and safety logic retained.
- PlatformIO NodeMCU build succeeds; RAM 51.6%, Flash 58.0%; release binary and SHA-256 verified in `releases/firmware/` and `docs/build-report.md`.
- Dashboard schedule editor configures four daily slots per relay, validates HH:MM and overlaps (including overnight intervals), publishes the existing MQTT contract, and waits for `schedule/status` before claiming success.
- Static regression and dashboard browser smoke tests pass. Physical ESP/MQTT integration, real relay behavior and OTA remain pending hardware verification.

## Dashboard UI refresh — 2026-10-10

- Reorganized the application into the requested seven shared-shell pages: Home, Water, Devices, Connection, Weather, Settings, and Data/Events.
- Added shared green design tokens, distinct MQTT/ESP badges, desktop sidebar, seven-item mobile bottom navigation with safe-area padding, and consistent footer.
- Added device inventory populated only from firmware telemetry, explicit not-installed Soil Sensor state, real connection details, and session-observed MQTT event filters.
- Expanded Open-Meteo presentation to current humidity/wind/rain chance and three-day forecast; weather remains separate from DHT11.
- Preserved the existing local-only finance ledger within the Data page; did not change firmware or MQTT topics/payloads.
- Bumped PWA cache to `lungna-shell-v3` so users receive the updated app shell. Hardware/MQTT integration is not claimed as tested by this UI update.
