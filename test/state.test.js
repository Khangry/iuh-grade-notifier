import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadState, saveState, writeLastChecked } from '../src/state.js';

const KEY = Buffer.alloc(32, 3).toString('base64');
let dir, cwd0;

before(async () => { cwd0 = process.cwd(); dir = await mkdtemp(join(tmpdir(), 'gn-')); process.chdir(dir); });
after(async () => { process.chdir(cwd0); await rm(dir, { recursive: true, force: true }); });

test('loadState = null khi chưa có file', async () => {
  assert.equal(await loadState(KEY), null);
});

test('save → load roundtrip; file trên đĩa không đọc được nếu không có key', async () => {
  const snap = { 601645: { tenMonHoc: 'M', cells: { a: '9' } } };
  await saveState(snap, KEY);
  assert.deepEqual(await loadState(KEY), snap);
  const raw = await readFile('state/grades.enc', 'utf8');
  assert.doesNotMatch(raw, /Mạch|601645|tenMonHoc/); // ciphertext, không plaintext
  const WRONG = Buffer.alloc(32, 5).toString('base64');
  await assert.rejects(() => loadState(WRONG));
});

test('writeLastChecked ghi timestamp', async () => {
  await writeLastChecked('2026-07-03T01:00:00.000Z');
  assert.match(await readFile('state/last_checked.txt', 'utf8'), /2026-07-03/);
});
