// Simple throughput test: opens a local connection via SOCKS5 to echo server (if any) or to example.org:80 and sends data.
import net from 'net';
import { loadConfig } from '../common/config.js';

const cfg = loadConfig();

function bench(host, port, bytes=2*1024*1024) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const s = net.connect(port, host);
    s.on('connect', () => {
      const buf = Buffer.alloc(64*1024, 7);
      let sent = 0;
      const iv = setInterval(() => {
        if (sent >= bytes) {
          clearInterval(iv);
          s.end();
          const dur = (Date.now()-start)/1000;
          resolve({ bytes, seconds: dur, mbps: (bytes*8/1e6)/dur });
          return;
        }
        s.write(buf);
        sent += buf.length;
      }, 0);
    });
    s.on('error', reject);
  });
}

(async () => {
  console.log('Measuring tunnel TCP to server port (no SOCKS involved)...');
  const r = await bench(cfg.SERVER_HOST, cfg.SERVER_PORT);
  console.log(`Sent ${r.bytes} bytes in ${r.seconds.toFixed(2)}s ≈ ${r.mbps.toFixed(2)} Mbps`);
})();
