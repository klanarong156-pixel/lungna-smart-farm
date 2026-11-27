#pragma once
// EMQX endpoint and public CA for Lungna Smart Farm staging deployment.
//
// Credential setup (do NOT put MQTT/OTA passwords in this header):
// 1. In EMQX, create an MQTT authentication user/password and grant it the
//    publish/subscribe ACLs required by this device's SmartFarm topics.
// 2. Power the ESP8266. On first setup / missing Wi-Fi config, it opens an AP
//    named "SmartFarm_Setup" (Wi-FiManager default: open, no AP password).
// 3. Connect a phone/computer to that AP; accept the captive-portal prompt or
//    browse to http://192.168.4.1. Keep mobile data/VPN off if it hijacks setup.
// 4. Choose the farm router SSID and enter its Wi-Fi password. Fill in the
//    custom fields "MQTT username" and "MQTT password" with EMQX credentials;
//    set a separate strong "OTA password" (OTA username is "admin").
// 5. Submit/save and wait for the success message/serial log. The portal times
//    out after 180 seconds. Reconnect to the farm Wi-Fi after the ESP exits AP.
// 6. Verify Serial Monitor (115200 baud): Wi-Fi connected, MQTT credentials
//    PRESENT, then MQTT connected / heartbeat publish success. Never paste
//    credentials into logs or share screenshots containing them.
//
// To edit later: ensure all relays are OFF, open Serial Monitor at 115200 baud,
// send OPEN_AP with newline, reconnect to "SmartFarm_Setup", then edit/save.
// The AP setup button can also request the portal; hold it per board wiring.
// Credentials are stored on the device, not compiled from this header. Keep
// passwords private; never commit them. Erasing device config requires setup
// again. OTA password protects OTA access; use a unique strong password.
#define MQTT_SERVER "w1ee1d8d.ala.asia-southeast1.emqxsl.com"
static const char MQTT_ROOT_CA_PEM[] PROGMEM = R"EMQXCA(
-----BEGIN CERTIFICATE-----
MIIDjjCCAnagAwIBAgIQAzrx5qcRqaC7KGSxHQn65TANBgkqhkiG9w0BAQsFADBh
MQswCQYDVQQGEwJVUzEVMBMGA1UEChMMRGlnaUNlcnQgSW5jMRkwFwYDVQQLExB3
d3cuZGlnaWNlcnQuY29tMSAwHgYDVQQDExdEaWdpQ2VydCBHbG9iYWwgUm9vdCBH
MjAeFw0xMzA4MDExMjAwMDBaFw0zODAxMTUxMjAwMDBaMGExCzAJBgNVBAYTAlVT
MRUwEwYDVQQKEwxEaWdpQ2VydCBJbmMxGTAXBgNVBAsTEHd3dy5kaWdpY2VydC5j
b20xIDAeBgNVBAMTF0RpZ2lDZXJ0IEdsb2JhbCBSb290IEcyMIIBIjANBgkqhkiG
9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuzfNNNx7a8myaJCtSnX/RrohCgiN9RlUyfuI
2/Ou8jqJkTx65qsGGmvPrC3oXgkkRLpimn7Wo6h+4FR1IAWsULecYxpsMNzaHxmx
1x7e/dfgy5SDN67sH0NO3Xss0r0upS/kqbitOtSZpLYl6ZtrAGCSYP9PIUkY92eQ
q2EGnI/yuum06ZIya7XzV+hdG82MHauVBJVJ8zUtluNJbd134/tJS7SsVQepj5Wz
tCO7TG1F8PapspUwtP1MVYwnSlcUfIKdzXOS0xZKBgyMUNGPHgm+F6HmIcr9g+UQ
vIOlCsRnKPZzFBQ9RnbDhxSJITRNrw9FDKZJobq7nMWxM4MphQIDAQABo0IwQDAP
BgNVHRMBAf8EBTADAQH/MA4GA1UdDwEB/wQEAwIBhjAdBgNVHQ4EFgQUTiJUIBiV
5uNu5g/6+rkS7QYXjzkwDQYJKoZIhvcNAQELBQADggEBAGBnKJRvDkhj6zHd6mcY
1Yl9PMWLSn/pvtsrF9+wX3N3KjITOYFnQoQj8kVnNeyIv/iPsGEMNKSuIEyExtv4
NeF22d+mQrvHRAiGfzZ0JFrabA0UWTW98kndth/Jsw1HKj2ZL7tcu7XUIOGZX1NG
Fdtom/DzMNU+MeKNhJ7jitralj41E6Vf8PlwUHBHQRFXGU7Aj64GxJUTFy8bJZ91
8rGOmaFvE7FBcf6IKshPECBV1/MUReXgRPTqh5Uykw7+U0b6LJ3/iyK5S9kJRaTe
pLiaWN0bfVKfjllDiIGknibVb63dDcY3fe0Dkhvld1927jyNxF1WW6LZZm6zNTfl
MrY=
-----END CERTIFICATE-----
)EMQXCA";
