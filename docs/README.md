# vpn-sim-js (Level 1: SOCKS5 over encrypted tunnel)

This project simulates VPN behavior by tunneling application traffic from a local SOCKS5 proxy
through an encrypted multiplexed connection to a server, which then dials the real destination.

## Quick start

1. Copy `.env.example` to `.env` and set values (generate a key):
   ```bash
   node -e "console.log('base64:'+require('crypto').randomBytes(32).toString('base64'))"
   ```
   Put that value into `TUNNEL_KEY`.

2. Install deps:
   ```bash
   npm i
   ```

3. Run server (in one terminal):
   ```bash
   npm run server
   ```

4. Run client (another terminal):
   ```bash
   npm run client
   ```

5. Configure an app to use the SOCKS5 proxy at `127.0.0.1:1080` (or set `HTTP_PROXY`/`HTTPS_PROXY`),
   and browse to any site. Packet captures on the client should show only encrypted traffic to the server.

## Proving VPN-like behavior
- **IP change**: visit an IP checker; it should report the server's IP.
- **Packet capture**: only encrypted frames to the server are visible; destinations are hidden.
- **Integrity**: run `npm run corrupt` to flip bytes; client drops tampered frames.

## Notes
- This is a teaching/demo project; not production-ready.
- Uses AES-256-GCM with a pre-shared key; frames are individually AEAD-protected with a monotonically increasing nonce.
