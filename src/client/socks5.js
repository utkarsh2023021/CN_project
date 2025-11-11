// Minimal SOCKS5 server supporting CONNECT (no auth)
import net from 'net';
import { MSG } from '../common/protocol.js';
import { log } from '../common/logger.js';

function parseSocksAddress(buf, offset) {
  const atype = buf[offset];
  if (atype === 1) { // IPv4
    const host = Array.from(buf.subarray(offset+1, offset+5)).join('.');
    const port = buf.readUInt16BE(offset+5);
    return { host, port, bytes: 1+4+2 };
  } else if (atype === 3) { // domain
    const len = buf[offset+1];
    const host = buf.subarray(offset+2, offset+2+len).toString();
    const port = buf.readUInt16BE(offset+2+len);
    return { host, port, bytes: 1+1+len+2 };
  } else if (atype === 4) {
    const host = buf.subarray(offset+1, offset+17).toString('hex').match(/.{1,4}/g).join(':');
    const port = buf.readUInt16BE(offset+17);
    return { host, port, bytes: 1+16+2 };
  } else {
    throw new Error('bad atype');
  }
}

export async function startSocks5(localPort, tunnel) {
  const server = net.createServer((client) => {
    client.once('data', (hello) => {
      // VER, NMETHODS, METHODS...
      client.write(Buffer.from([0x05, 0x00])); // no auth
      client.once('data', (req) => {
        // VER, CMD, RSV, ATYP, DST.ADDR, DST.PORT
        if (req[1] !== 0x01) { // CONNECT only
          client.end(Buffer.from([0x05, 0x07, 0x00, 0x01, 0,0,0,0, 0,0]));
          return;
        }
        try {
          const { host, port } = parseSocksAddress(req, 3);
          // allocate stream id and send OPEN
          const sid = tunnel.newStream(client, `${host}:${port}`);
          const payload = Buffer.from(JSON.stringify({ host, port }));
          tunnel.send(MSG.OPEN, sid, payload);
          // reply success immediately (we'll treat errors via DATA/ERROR)
          client.write(Buffer.from([0x05, 0x00, 0x00, 0x01, 0,0,0,0, 0,0]));

          client.on('data', (chunk) => {
            tunnel.send(MSG.DATA, sid, chunk);
          });
          client.on('close', () => {
            tunnel.send(MSG.CLOSE, sid, Buffer.alloc(0));
            tunnel.removeLocal(sid);
          });
          client.on('error', () => {
            client.destroy();
          });
        } catch (e) {
          log.error({ err: e.message }, 'SOCKS error');
          client.end(Buffer.from([0x05, 0x01, 0x00, 0x01, 0,0,0,0, 0,0]));
        }
      });
    });
  });
  await new Promise(res => server.listen(localPort, '127.0.0.1', res));
  log.info(`SOCKS5 listening on 127.0.0.1:${localPort}`);
  return server;
}
