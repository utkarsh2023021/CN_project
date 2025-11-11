import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
const ALG = 'aes-256-gcm';

export class AEAD {
  constructor(key, salt = randomBytes(4)) {
    if (key.length !== 32) throw new Error('require 32-byte key');
    this.key = key;
    this.salt = salt; // 4 bytes
    this.txCounter = 0n;
    this.rxSeen = new Set(); // for demo; production needs window/anti-replay
  }
  nextNonce() {
    const ctr = this.txCounter++;
    const nonce = Buffer.alloc(12);
    this.salt.copy(nonce, 0);
    // 8-byte big-endian counter
    nonce.writeBigUInt64BE(ctr, 4);
    return nonce;
  }
  seal(plaintext, aad) {
    const nonce = this.nextNonce();
    const c = createCipheriv(ALG, this.key, nonce, { authTagLength: 16 });
    if (aad) c.setAAD(aad);
    const enc = Buffer.concat([c.update(plaintext), c.final()]);
    const tag = c.getAuthTag();
    return { nonce, ct: Buffer.concat([enc, tag]) };
  }
  open(nonce, ciphertextTag, aad) {
    // Very simple replay guard (nonce string)
    const k = nonce.toString('hex');
    if (this.rxSeen.has(k)) throw new Error('replay');
    const tag = ciphertextTag.subarray(-16);
    const ct = ciphertextTag.subarray(0, -16);
    const d = createDecipheriv(ALG, this.key, nonce, { authTagLength: 16 });
    if (aad) d.setAAD(aad);
    d.setAuthTag(tag);
    const pt = Buffer.concat([d.update(ct), d.final()]);
    this.rxSeen.add(k);
    if (this.rxSeen.size > 10000) this.rxSeen.clear();
    return pt;
  }
}
