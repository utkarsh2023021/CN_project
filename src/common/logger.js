import pino from 'pino';
import { loadConfig } from './config.js';

const cfg = loadConfig();
export const log = pino({ level: cfg.LOG_LEVEL, transport: { target: 'pino-pretty', options: { translateTime: true } } });
