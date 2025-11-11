import net from 'net';
import { WebSocketServer } from 'ws';
import { MSG, decodeFrame } from '../common/protocol.js';
import { AEAD } from '../common/crypto.js';
import { Mux } from '../common/mux.js';
import { log } from '../common/logger.js';
import { dial } from './dialer.js';

export function startTcpServer(port, key) {
  const server = net.createServer((sock) => handleConnection(sock, key, false));
  server.listen(port, '0.0.0.0', () => log.info(`Tunnel TCP server on :${port}`));
  return server;
}

export function startWsServer(port, key) {
  const wss = new WebSocketServer({ port, path: '/tunnel' });
  wss.on('connection', (ws) => handleConnection(ws, key, true));
  log.info(`Tunnel WS server on :${port}/tunnel`);
  return wss;
}

function handleConnection(conn, key, isWs) {
  const aead = new AEAD(key);
  const sendRaw = (buf) => isWs ? conn.send(buf) : conn.write(buf);
  const mux = new Mux(conn, aead, sendRaw);
  const upstream = new Map(); // sid -> socket

  let buffer = Buffer.alloc(0);
  const onData = (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (buffer.length >= 21) {
      const len = buffer.readUInt32BE(17);
      const need = 21 + len;
      if (buffer.length < need) break;
      const frameBuf = buffer.subarray(0, need);
      buffer = buffer.subarray(need);
      const frame = decodeFrame(frameBuf);
      mux.handleFrame(frame, onMsg);
    }
  };

  if (isWs) conn.on('message', (data) => onData(Buffer.from(data)));
  else conn.on('data', onData);

  function onMsg(type, sid, pt) {
    if (type === MSG.OPEN) {
      try {
        const { host, port } = JSON.parse(pt.toString());
        const s = dial(host, port);
        upstream.set(sid, s);
        s.on('data', (chunk) => mux.send(MSG.DATA, sid, chunk));
        s.on('end', () => {
          mux.send(MSG.CLOSE, sid, Buffer.alloc(0));
          upstream.delete(sid);
        });
        s.on('error', () => {
          mux.send(MSG.ERROR, sid, Buffer.alloc(0));
          s.destroy();
          upstream.delete(sid);
        });
        mux.send(MSG.OK, sid, Buffer.alloc(0));
      } catch (e) {
        mux.send(MSG.ERROR, sid, Buffer.from('bad open'));
      }
    } else if (type === MSG.DATA) {
      const s = upstream.get(sid);
      if (s) s.write(pt);
    } else if (type === MSG.CLOSE) {
      const s = upstream.get(sid);
      if (s) {
        s.end();
        upstream.delete(sid);
      }
    } else if (type === MSG.PING) {
      mux.send(MSG.PONG, sid, Buffer.alloc(0));
    }
  }

  const onClose = () => {
    for (const s of upstream.values()) s.destroy();
    upstream.clear();
  };
  if (isWs) conn.on('close', onClose);
  else conn.on('close', onClose);
}
