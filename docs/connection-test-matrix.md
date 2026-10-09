# Connection Test Matrix

| ESP | MQTT broker | Dashboard | Expected dashboard behavior | Evidence/status |
|---|---|---|---|---|
| offline | online | online | broker pill Online; ESP Offline after LWT/25s timeout; relays null | Static logic tested; live not run |
| online | online | online | broker Online and ESP Online only after live device heartbeat; relay status from MQTT | Requires live ESP/broker |
| unknown | offline | online | broker Offline/Reconnecting; relays null | state contract tested |
| online | offline | online | broker Offline/Reconnecting; no command allowed; relays null | state contract tested |
| online | online | offline | Browser has no live connection; next load starts null and awaits MQTT | PWA shell only |
| online | online | reconnecting | shared manager moves all UI from one FarmState; relays null until refreshed status | Single state manager / subscription code inspected |
| online | online | online, no fresh heartbeat | ESP remains unknown until heartbeat timeout, then ESP Offline | watchdog code; static test coverage |
| online | online | online, schedule/status not received | Schedule editor remains unknown/disabled; publish waits for ESP status, not only broker PUBACK | Fake MQTT contract tested; hardware/broker pending |
| online | online | online, schedule update accepted | Editor publishes four slots non-retained and displays confirmed status only after matching ESP payload | Fake MQTT contract and browser UI smoke tested |

No physical connection tests, broker connect/disconnect tests, authenticated command delivery or real watering schedule execution were performed in the sandbox. Dashboard uses a single state manager and one MQTT client owner; reconnect uses MQTT.js built-in reconnect, with subscribe once per client/session and built-in resubscribe enabled.
