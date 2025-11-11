# Demo Script (15–20 minutes)

1. Show `.env` (server host/port, key).
2. Start `npm run server` then `npm run client`.
3. Open Wireshark on client. Filter by `tcp.port == 4444`. Show ciphertext only.
4. Set browser/system proxy to `SOCKS5 127.0.0.1:1080`. Visit an IP checker site.
5. Toggle `npm run corrupt` briefly; client logs AEAD failures and drops frames.
6. Run `npm run measure` and record throughput/latency with and without the tunnel.
