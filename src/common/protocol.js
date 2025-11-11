export const MSG = { OPEN:1, DATA:2, CLOSE:3, PING:4, PONG:5, HELLO:6, OK:7, ERROR:8 };

// frame: [type(1)][sid(4)][nonce(12)][len(4)][ciphertext+tag(len)]
export function encodeFrame(type, sid, nonce, bodyBuf) {
  const len = bodyBuf.length;
  const out = Buffer.allocUnsafe(1+4+12+4+len);
  out[0] = type;
  out.writeUInt32BE(sid, 1);
  nonce.copy(out, 5);
  out.writeUInt32BE(len, 17);
  bodyBuf.copy(out, 21);
  return out;
}

export function decodeFrame(buf) {
  if (buf.length < 21) throw new Error('short frame');
  const type = buf[0];
  const sid = buf.readUInt32BE(1);
  const nonce = buf.subarray(5, 17);
  const len = buf.readUInt32BE(17);
  const body = buf.subarray(21);
  if (body.length !== len) throw new Error('bad len');
  return { type, sid, nonce, body };
}
