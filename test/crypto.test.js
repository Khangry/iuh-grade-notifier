import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encrypt, decrypt } from '../src/crypto.js';

const KEY = Buffer.alloc(32, 7).toString('base64');
const KEY2 = Buffer.alloc(32, 9).toString('base64');

test('roundtrip encrypt/decrypt', () => {
  const obj = { a: 1, b: 'điểm', nested: { x: [1, 2, 3] } };
  const enc = encrypt(obj, KEY);
  assert.equal(typeof enc, 'string');
  assert.deepEqual(decrypt(enc, KEY), obj);
});

test('wrong key fails (GCM auth)', () => {
  const enc = encrypt({ a: 1 }, KEY);
  assert.throws(() => decrypt(enc, KEY2));
});

test('tampered ciphertext fails', () => {
  const enc = encrypt({ a: 1 }, KEY);
  const buf = Buffer.from(enc, 'base64');
  buf[20] ^= 0xff; // lật 1 byte trong ciphertext
  assert.throws(() => decrypt(buf.toString('base64'), KEY));
});

test('bad key length rejected', () => {
  assert.throws(() => encrypt({}, Buffer.alloc(16).toString('base64')));
});
