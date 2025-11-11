import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dotEnvPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(dotEnvPath)) dotenv.config({ path: dotEnvPath });

function parseKey(v) {
  if (!v) throw new Error('TUNNEL_KEY missing');
  if (v.startsWith('base64:')) return Buffer.from(v.slice(7), 'base64');
  if (v.startsWith('hex:')) return Buffer.from(v.slice(4), 'hex');
  return Buffer.from(v, 'utf8');
}

export function loadConfig() {
  return {
    KEY: parseKey(process.env.TUNNEL_KEY),
    SERVER_HOST: process.env.SERVER_HOST || '127.0.0.1',
    SERVER_PORT: parseInt(process.env.SERVER_PORT || '4444', 10),
    LOCAL_SOCKS_PORT: parseInt(process.env.LOCAL_SOCKS_PORT || '1080', 10),
    USE_WEBSOCKET: (process.env.USE_WEBSOCKET || 'false').toLowerCase() === 'true',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info'
  };
}
