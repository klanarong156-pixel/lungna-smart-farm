window.SmartFarmConfig = Object.freeze({
  mqtt: {
    url: 'wss://25305924f68c41f2a1e089a1836d3287.s1.eu.hivemq.cloud:8884/mqtt',
    defaultUsername: 'smartfarm',
    heartbeatTimeoutMs: 25000,
    commandTimeoutMs: 9000,
    scheduleCommandTimeoutMs: 15000,
    topics: {
      online: 'smartfarm/status/online',
      device: 'smartfarm/status/device',
      dht11: 'smartfarm/sensor/dht11',
      relayStatus: id => `smartfarm/relay/${id}/status`,
      relaySet: id => `smartfarm/relay/${id}/set`,
      modeStatus: 'smartfarm/mode/status',
      modeSet: 'smartfarm/mode/set',
      scheduleStatus: id => `smartfarm/schedule/${id}/status`,
      scheduleSet: id => `smartfarm/schedule/${id}/set`
    },
    subscriptions: [
      'smartfarm/status/online',
      'smartfarm/status/device',
      'smartfarm/sensor/dht11',
      'smartfarm/relay/+/status',
      'smartfarm/mode/status',
      'smartfarm/schedule/+/status'
    ]
  },
  scheduleSlotCount: 4,
  relays: [
    { id: 'pump', label: 'ปั๊มน้ำ', pin: 'D5 / GPIO14', icon: '◉' },
    { id: 'zone1', label: 'โซน 1', pin: 'D6 / GPIO12', icon: '🌿' },
    { id: 'lighthome', label: 'ไฟบ้าน', pin: 'D7 / GPIO13', icon: '⌂' },
    { id: 'lightsala', label: 'ไฟศาลา', pin: 'D8 / GPIO15', icon: '✦' }
  ],
  weather: { latitude: 7.798754, longitude: 99.990505, timezone: 'Asia/Bangkok' }
});
