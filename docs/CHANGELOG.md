# Changelog

## V7.2.0 — production baseline

- Initialize clean production repository, mobile-first dashboard, MQTT state manager with relay/mode ACKs and bounded exponential reconnect, PWA shell, local finance ledger with receivables/export, weather forecast view, and compatibility documentation.
- Firmware source based on audited `V7.2.0-OTA-STABLE` from New140869; relay pin mapping and safety logic retained.
- PlatformIO NodeMCU build succeeds; RAM 51.6%, Flash 58.0%; release binary and SHA-256 verified in `releases/firmware/` and `docs/build-report.md`.
- Static regression and dashboard browser smoke tests pass. Physical ESP/MQTT integration, real relay behavior and OTA remain pending hardware verification.
