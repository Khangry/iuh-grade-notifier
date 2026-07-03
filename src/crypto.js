// AES-256-GCM. File format = base64( iv(12) || ciphertext || authTag(16) ).
import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';

function loadKey(keyB64) {
  const key = Buffer.from(keyB64 || '', 'base64');
  if (key.length !== 32) throw new Error('STATE_ENCRYPTION_KEY phải là 32 byte base64 (openssl rand -base64 32)');
  return key;
}

export function encrypt(obj, keyB64) {
  const key = loadKey(keyB64);
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
  const tag = c.getAuthTag();
  return Buffer.concat([iv, ct, tag]).toString('base64');
}

export function decrypt(b64, keyB64) {
  const key = loadKey(keyB64);
  const buf = Buffer.from(b64, 'base64');
  if (buf.length < 12 + 16) throw new Error('state hỏng: quá ngắn');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(buf.length - 16);
  const ct = buf.subarray(12, buf.length - 16);
  const d = createDecipheriv('aes-256-gcm', key, iv);
  d.setAuthTag(tag);
  const pt = Buffer.concat([d.update(ct), d.final()]);
  return JSON.parse(pt.toString('utf8'));
}
