import { MSG, encodeFrame } from './protocol.js';
import { log } from './logger.js';

export class Mux {
  constructor(sock, aead, sendRaw) {
    this.sock = sock;     // underlying socket (TCP or WS with .send())
    this.aead = aead;
    this.sendRaw = sendRaw; // function(buf)
    this.nextSid = 1;
    this.streams = new Map(); // sid -> { socket, name }
  }

  createStream(socket, name='') {
    const sid = this.nextSid++;
    this.streams.set(sid, { socket, name });
    return sid;
  }

  removeStream(sid) {
    this.streams.delete(sid);
  }

  send(type, sid, payloadBuf) {
    const aad = Buffer.from([type, ...Buffer.alloc(4)]); // simple AAD start
    aad.writeUInt32BE(sid, 1);
    const { nonce, ct } = this.aead.seal(payloadBuf, aad);
    const frame = encodeFrame(type, sid, nonce, ct);
    this.sendRaw(frame);
  }

  handleFrame(frame, onMsg) {
    const aad = Buffer.from([frame.type, ...Buffer.alloc(4)]);
    aad.writeUInt32BE(frame.sid, 1);
    let pt;
    try {
      pt = this.aead.open(frame.nonce, frame.body, aad);
    } catch (e) {
      log.warn({ err: e.message }, 'drop frame (auth/replay)');
      return;
    }
    onMsg(frame.type, frame.sid, pt);
  }
}
