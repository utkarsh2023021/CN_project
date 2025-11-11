import net from 'net';
import WebSocket from 'ws';
import { MSG, decodeFrame } from '../common/protocol.js';
import { AEAD } from '../common/crypto.js';
import { loadConfig } from '../common/config.js';
import { log } from '../common/logger.js';
import { Mux } from '../common/mux.js';

export async function connectTunnel(cfg = loadConfig()) {
  const aead = new AEAD(cfg.KEY);
  const streams = new Map();

  let sock;
  let sendRaw;

  if (cfg.USE_WEBSOCKET) {
    const url = `ws://${cfg.SERVER_HOST}:${cfg.SERVER_PORT}/tunnel`;
    const ws = new WebSocket(url);
    await new Promise((res, rej) => {
      ws.on('open', res);
      ws.on('error', rej);
    });
    sock = ws;
    sendRaw = (buf) => ws.send(buf);
    ws.on('message', (data) => onData(Buffer.from(data)));
  } else {
    const s = net.createConnection(cfg.SERVER_PORT, cfg.SERVER_HOST);
    await new Promise((res, rej) => {
      s.once('connect', res);
      s.once('error', rej);
    });
    sock = s;
    sendRaw = (buf) => s.write(buf);
    s.on('data', onData);
  }

  const mux = new Mux(sock, aead, sendRaw);

  function onData(chunk) {
    // frames may arrive concatenated; simple framing: process sequentially
    // Each decode will validate len; we keep a small buffer.
    buffer = Buffer.concat([buffer, chunk]);
    tryConsume();
  }

  let buffer = Buffer.alloc(0);
  function tryConsume() {
    while (buffer.length >= 21) {
      const len = buffer.readUInt32BE(17);
      const need = 21 + len;
      if (buffer.length < need) break;
      const frameBuf = buffer.subarray(0, need);
      buffer = buffer.subarray(need);
      const frame = decodeFrame(frameBuf);
      mux.handleFrame(frame, onMsg);
    }
  }

  function onMsg(type, sid, pt) {
    if (type === MSG.OK) {
      // handshake OK or OPEN OK
      return;
    } else if (type === MSG.DATA) {
      const ent = streams.get(sid);
      if (ent) ent.client.write(pt);
    } else if (type === MSG.CLOSE) {
      const ent = streams.get(sid);
      if (ent) {
        ent.client.end();
        streams.delete(sid);
      }
    } else if (type === MSG.ERROR) {
      const ent = streams.get(sid);
      if (ent) {
        ent.client.destroy();
        streams.delete(sid);
      }
      log.warn({ sid }, 'server error on stream');
    }
  }

  // client API exposed to SOCKS5
  return {
    newStream(client, name) {
      const sid = mux.createStream(client, name);
      streams.set(sid, { client, name });
      return sid;
    },
    send(type, sid, payload) {
      mux.send(type, sid, payload);
    },
    removeLocal(sid) {
      streams.delete(sid);
    }
  };
}
