# Architecture

```text
Browser Dashboard (GitHub Pages / PWA)
  ├── single FarmState (live source of truth in browser)
  ├── single FarmMqtt manager (WSS TLS, MQTT.js)
  │     ├── subscribes to firmware status topics
  │     └── sends non-retained command topics → HiveMQ Cloud
  ├── Finance ledger → browser localStorage (independent of MQTT)
  └── Weather forecast → Open-Meteo HTTPS (separate from DHT11)
                     ⇵ MQTT/TLS
              ESP8266 NodeMCU (controller)
              ├── 4-channel relay / pump / local AUTO + schedule
              ├── DHT11 D2, RTC DS3231 D3/D4
              ├── emergency + OTA safety state
              └── firmware V7.2.0-OTA-STABLE
```

## Source of truth / state boundaries

- Relay, mode, DHT sensor and ESP liveness come from ESP/MQTT; cloud storage is never a relay controller.
- Broker ONLINE is not the same as ESP ONLINE. ESP liveness requires a fresh, non-retained heartbeat; 25-second watchdog.
- All relay values initialize to `null`; only strict `ON`/`OFF` payloads update them.
- Finance works while MQTT is disconnected. Current Finance implementation is browser-local and does not sync between devices.
- Weather API reports forecast values in its own UI; it never fills sensor values.
- Firmware owns AUTO, relay switching, scheduling, emergency handling and OTA safety.

## Data model for later backend integration

```json
{
  "farm": {"id":"string","name":"string","timezone":"Asia/Bangkok"},
  "plots": [{"id":"string","farmId":"string","name":"string","area":{"value":"number","unit":"string"},"createdAt":"ISO-8601"}],
  "crops": [{"id":"string","plotId":"string","name":"string","variety":"string","plantedAt":"YYYY-MM-DD","expectedHarvestAt":"YYYY-MM-DD|null"}],
  "harvests": [{"id":"string","cropId":"string","harvestedAt":"ISO-8601","quantity":{"value":"number","unit":"string"},"unitPrice":"number|null","buyerId":"string|null"}],
  "financeEntries": [{"id":"string","type":"income|expense","category":"string","description":"string","amount":"number","currency":"THB","occurredAt":"ISO-8601","harvestId":"string|null","counterpartyId":"string|null","paidAmount":"number","balanceDue":"number"}],
  "buyers": [{"id":"string","name":"string","contact":"string|null"}],
  "weatherObservations": [{"source":"provider|sensor","observedAt":"ISO-8601","values":"object"}],
  "users": [{"id":"string","role":"owner|admin|operator|viewer"}],
  "settings": {"farmId":"string","preferences":"object"}
}
```

## Hosting caveat

Dashboard is a static app deployed from `dashboard/` using GitHub Actions. MQTT browser credentials cannot be kept secret from browser users; use broker ACLs with narrowly scoped topic permissions and rotate credentials according to broker policy. Firmware credentials are provisioned on device and are not checked into this repository.
