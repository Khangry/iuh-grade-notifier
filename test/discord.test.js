import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildEmbeds, sendGradeUpdate } from '../src/discord.js';

const green = 3066993, gold = 15844367, purple = 10181046;

test('embed thường: title/desc/color + field mới in đậm', () => {
  const [e] = buildEmbeds([{ tenMonHoc: 'Mạch điện', tenDot: 'HK2', maMonHoc: '001927',
    changes: [{ label: 'Giữa kỳ', old: '', new: '9.0' }] }]);
  assert.equal(e.title, '📊 Mạch điện');
  assert.equal(e.description, 'HK2 • Mã LHP 001927');
  assert.equal(e.color, green);
  assert.equal(e.fields[0].value, '**9.0**');
});

test('field đổi: cũ → **mới**', () => {
  const [e] = buildEmbeds([{ tenMonHoc: 'M', tenDot: 'HK2', maMonHoc: '1',
    changes: [{ label: 'GK', old: '8.0', new: '9.0' }] }]);
  assert.equal(e.fields[0].value, '8.0 → **9.0**');
});

test('finalized → embed vàng, title ✅, gom cụm cuối', () => {
  const [e] = buildEmbeds([{ tenMonHoc: 'M', tenDot: 'HK2', maMonHoc: '1', isFinalized: true,
    changes: [{ label: 'Điểm tổng kết', old: '', new: '9.3' }],
    finalCluster: [{ label: 'Điểm tổng kết', new: '9.3' }, { label: 'Điểm chữ', new: 'A+' }] }]);
  assert.equal(e.color, gold);
  assert.match(e.title, /^✅ Điểm tổng kết/);
  assert.equal(e.fields[0].value, '**9.3**'); // điểm tổng kết in đậm
  assert.equal(e.fields[1].value, 'A+');
});

test('rèn luyện → embed tím, title 📋', () => {
  const [e] = buildEmbeds([{ tenDot: 'HK2 (2025-2026)', isRenLuyen: true,
    changes: [{ label: 'Trạng thái', old: 'Chưa duyệt', new: 'Đã duyệt' }] }]);
  assert.equal(e.color, purple);
  assert.match(e.title, /^📋 Điểm rèn luyện/);
});

test('testMode → prefix 🧪 vào title', () => {
  const [e] = buildEmbeds([{ tenMonHoc: 'M', tenDot: 'HK2', maMonHoc: '1',
    changes: [{ label: 'GK', old: '', new: '9' }] }], { testMode: true });
  assert.match(e.title, /^🧪 📊/);
});

test('>25 field → dồn phần dư vào description', () => {
  const changes = Array.from({ length: 30 }, (_, i) => ({ label: `c${i}`, old: '', new: String(i) }));
  const [e] = buildEmbeds([{ tenMonHoc: 'M', tenDot: 'HK2', maMonHoc: '1', changes }]);
  assert.equal(e.fields.length, 25);
  assert.match(e.description, /c25/);
});

test('sendGradeUpdate: >10 embed → chia nhiều POST, trả status cuối', async () => {
  const subjects = Array.from({ length: 23 }, (_, i) => ({ tenMonHoc: `M${i}`, tenDot: 'HK2', maMonHoc: '1',
    changes: [{ label: 'x', old: '', new: '1' }] }));
  let posts = 0;
  const f = async () => { posts += 1; return { status: 204 }; };
  const status = await sendGradeUpdate('http://wh', subjects, {}, f);
  assert.equal(posts, 3); // 10+10+3
  assert.equal(status, 204);
});

test('sendGradeUpdate: content chỉ gắn tin đầu', async () => {
  const bodies = [];
  const f = async (url, opts) => { bodies.push(JSON.parse(opts.body)); return { status: 204 }; };
  const subjects = Array.from({ length: 11 }, () => ({ tenMonHoc: 'M', tenDot: 'H', maMonHoc: '1', changes: [{ label: 'x', old: '', new: '1' }] }));
  await sendGradeUpdate('http://wh', subjects, { content: 'HELLO' }, f);
  assert.equal(bodies[0].content, 'HELLO');
  assert.equal(bodies[1].content, undefined);
});

test('sendGradeUpdate: non-2xx → throw', async () => {
  const f = async () => ({ status: 500 });
  await assert.rejects(() => sendGradeUpdate('http://wh', [{ tenMonHoc: 'M', tenDot: 'H', maMonHoc: '1', changes: [{ label: 'x', old: '', new: '1' }] }], {}, f));
});
