# Changelog

## Security and CI hardening — 2026-10-28

- Replaced insecure Telegram TLS with CA trust-anchor and clock validation.
- Added Dashboard emergency-stop and firmware-error visibility from MQTT status topics.
- Added Pull Request dashboard validation and firmware source contract checks.
- Disabled HTTP OTA by default and normalized compiler date/time for reproducible firmware builds.

## Mobile Records refinement — 2026-10-19

- Converted the monthly finance summary in the Events tab to a disclosure: open by default on desktop, collapsed by default on phones, while preserving the monthly values and CSV action.
- Reduced the empty event timeline's minimum height and enlarged Records tab/filter touch targets; bumped Dashboard to v1.6.4 and the offline shell cache to `lungna-shell-v14`.
- Replaced umbrella symbols in rain forecasts with cloud-and-rain icons, and a cloud-and-lightning icon for thunderstorms.

## Mobile weather refinement — 2026-10-19

- Collapsed the secondary current-conditions metrics into a compact disclosure so the hourly forecast stays prominent on phones; added a swipe hint, horizontal snap behavior, shorter hour tiles and extra end-of-page clearance above the fixed bottom navigation.
- Bumped Dashboard to v1.6.3 and offline shell cache to `lungna-shell-v13` with versioned CSS/JS URLs.

## Hourly weather forecast redesign — 2026-10-18

- Replaced the weather page's default three-day grid with a dark, horizontally scrollable 24-hour forecast inspired by the supplied reference, including cloud, rain-probability and wind metric toggles; kept the daily outlook available in a collapsed section.
- Added a six-hour rain-trend notice based on regional Open-Meteo hourly probability/precipitation values. The notice identifies itself as model-based, not an official Thai Meteorological Department warning.
- Preserved the current-condition summary and approximate regional location; bumped the Dashboard label to v1.6.2 and offline shell cache to `lungna-shell-v12`.

## Farm map and sage background refinement — 2026-10-18

- Moved the Home map's ไฟบ้าน status marker over the illustrated house and ไฟศาลา over the pavilion; relay IDs and control behavior are unchanged.
- Changed the main page background from warm ivory to a soft pale sage, preserving warm-white cards and readable contrast; matched the browser/PWA theme colors.
- Bumped the Dashboard label to v1.6.1 and the offline shell cache to `lungna-shell-v11`.

## Approved-reference dashboard implementation — 2026-10-18

- Replaced the previously published visual treatment with the user-approved reference direction across Home, Water, Devices, System, Weather and Records; aligned desktop sidebar/mobile navigation, condensed status cards, full-width relay and device rows, stepped system setup, and monthly finance summary.
- Kept existing MQTT, relay/mode/schedule acknowledgements, safety behavior, weather source, session event history and browser-local finance storage; repaired duplicate RTC and device IP DOM surfaces.
- Converted the two reference-led farm illustrations to WebP (without changing their aspect ratios) to reduce transferred image data; updated the PWA shell cache to `lungna-shell-v10` and the Dashboard label to v1.6.0.
- Validated all repository Node regression tests, JavaScript syntax, JSON and static asset paths; physical ESP/MQTT behavior remains unverified without hardware.

## Compact field-journal dashboard — 2026-10-17

- Applied the approved warm-ivory, forest-green and muted-terracotta visual direction across all six dashboard routes, with tighter spacing and a responsive desktop sidebar/mobile navigation.
- Removed the duplicate global ESP badge, consolidated the regional-weather caveats, and split Events and Finance into tabs while preserving legacy `#events` and `#finance` links and local finance data.
- Preserved existing relay, AUTO/MANUAL, schedule, telemetry and safety behavior; bumped the PWA shell cache to `lungna-shell-v9` and updated the app theme metadata.

## Initial full dashboard redesign — 2026-10-17 (superseded 2026-10-18)

- Expanded the redesign from Home to every route and reduced primary navigation from seven entries to six real-use workspaces: Home, Water, Devices, System, Weather, Records.
- Mapped the four user-marked device points as relative schematic markers; selecting a marker only opens the existing Water control and never sends a command from Home.
- Merged MQTT connection and actual web-system tools into System; removed the unused static admin-info shortcut and the uninstalled Soil Sensor card. Preserved relay/schedule safety, credential handling, and firmware acknowledgement.
- Consolidated session-only event history and browser-local finance records under Records, preserving finance entries, clear confirmation, and CSV export. Added legacy hash aliases.
- Replaced visible exact farm-point weather labels with a coarse regional forecast reference; the forecast may differ from conditions at the parcel and remains separate from DHT11/control.
- The initial visual variant was superseded by the user-approved reference implementation above; cache v8 is historical only.

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
