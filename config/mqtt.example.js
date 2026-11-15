// Dashboard and ESP8266 use separate client connections to the same EMQX Serverless deployment.
// Copy the WSS endpoint from EMQX Console > Deployment > Overview.
// Never commit MQTT usernames/passwords or device-specific secrets.
export const mqttExample = {
  url: 'wss://YOUR_EMQX_SERVERLESS_ENDPOINT:8084/mqtt',
  username: 'smartfarm',
  password: '', // Set at runtime; never commit a real value.
  esp8266Port: 8883,
};
