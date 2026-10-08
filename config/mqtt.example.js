// Copy to a local-only file if you need custom broker settings; do not commit credentials.
// The current dashboard uses a public, credential-free host definition in dashboard/js/config.js.
// Username and password must be entered by the operator in the browser Settings page.
export const mqttExample = {
  url: 'wss://YOUR_HIVEMQ_HOST:8884/mqtt',
  username: 'smartfarm',
  password: '', // Set at runtime; never commit a real value.
};
