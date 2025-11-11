import { loadConfig } from '../common/config.js';
import { connectTunnel } from './tunnel-client.js';
import { startSocks5 } from './socks5.js';
import { log } from '../common/logger.js';

const cfg = loadConfig();

(async () => {
  try {
    const tunnel = await connectTunnel(cfg);
    await startSocks5(cfg.LOCAL_SOCKS_PORT, tunnel);
    log.info(`Client ready: tunneling to ${cfg.SERVER_HOST}:${cfg.SERVER_PORT}`);
  } catch (e) {
    log.error(e, 'client failed');
    process.exit(1);
  }
})();
