import { loadConfig } from '../common/config.js';
import { startTcpServer, startWsServer } from './tunnel-server.js';

const cfg = loadConfig();
startTcpServer(cfg.SERVER_PORT, cfg.KEY);
if (cfg.USE_WEBSOCKET) startWsServer(cfg.SERVER_PORT, cfg.KEY);
