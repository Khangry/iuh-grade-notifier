// Đọc/ghi state/grades.enc (mã hoá). last_checked.txt để repo có commit đều (cron không bị tắt).
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { encrypt, decrypt } from './crypto.js';

const STATE_DIR = 'state';
const STATE_FILE = 'state/grades.enc';
const LAST_FILE = 'state/last_checked.txt';

export async function loadState(keyB64) {
  let raw;
  try {
    raw = await readFile(STATE_FILE, 'utf8');
  } catch (e) {
    if (e.code === 'ENOENT') return null; // lần đầu, chưa có state
    throw e;
  }
  return decrypt(raw.trim(), keyB64);
}

export async function saveState(obj, keyB64) {
  await mkdir(STATE_DIR, { recursive: true });
  await writeFile(STATE_FILE, encrypt(obj, keyB64));
}

export async function writeLastChecked(ts = new Date().toISOString()) {
  await mkdir(STATE_DIR, { recursive: true });
  await writeFile(LAST_FILE, ts + '\n');
}
