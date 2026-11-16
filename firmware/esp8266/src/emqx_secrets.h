#pragma once

// Safe compile-only defaults. GitHub Actions overwrites this file in the
// runner workspace when EMQX_SERVER and EMQX_CA_PEM are configured.
// Never put MQTT usernames, passwords, or other credentials in this file.
#define MQTT_SERVER "YOUR_EMQX_SERVERLESS_ENDPOINT"
static const char MQTT_ROOT_CA_PEM[] PROGMEM = R"EMQXCA(
)EMQXCA";
