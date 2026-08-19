# eSSL AiFace-ERIS Real Device Checklist

## Step A. Connect Network

- Record device IP
- Record subnet mask
- Record gateway
- Record DNS
- Record connection type

## Step B. Identify Communication Mode

- Open the device network/server/integration menus
- Record whether the firmware exposes `Cloud Server`, `ADMS`, `Push`, `Server Address`, `Domain Address`, `Port`, `HTTPS`, or `Proxy`
- Do not infer unsupported options from documentation for another firmware

## Step C. Register the Device

- Capture model
- Capture serial number
- Capture device ID shown on the device
- Capture MAC address
- Capture firmware/platform info

## Step D. Configure the Server

- Confirm the app is reachable over HTTPS
- Register the device under `Admin > Settings > Biometric Devices`
- Set provider to `essl`
- Set `device_id`, serial number, branch, and optional allowed IP
- If the device supports a shared secret, configure the same value in the app and the device
- Point the device to `POST /api/biometric/essl/events`

## Step E. Perform a Real Attendance Event

- Create one active member with a known `Biometric user ID`
- Enroll the same ID on the AiFace-ERIS device
- Perform one face check-in
- Capture the exact HTTP method
- Capture the exact URL and query string
- Capture headers
- Capture content type
- Capture the raw request body
- Capture the response body expected by the device
- Save the captured request as a fixture before changing the adapter

## Step F. Finalize the Adapter

- Update only [lib/biometric/essl.ts](/C:/Users/Hp/OneDrive/Desktop/SyncTyre/lib/biometric/essl.ts:1)
- Update [services/biometric.service.ts](/C:/Users/Hp/OneDrive/Desktop/SyncTyre/services/biometric.service.ts:1) only if the surrounding orchestration must change
- Do not spread protocol handling into unrelated routes, pages, or member logic
