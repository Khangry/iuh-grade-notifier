// Section 9: kịch bản end-to-end với mock (không mạng, không đụng state thật).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSnapshot } from '../src/snapshot.js';
import { diff } from '../src/diff.js';
import { buildEmbeds } from '../src/discord.js';

// Mock API: 1 kỳ, 1 môn "Mạch điện", có chi tiết + rèn luyện.
function makeDeps(chiTietRows, rl) {
  return {
    login: async () => ({ access_token: 't', sub: '1763538' }),
    api: {
      ketQuaHocTap: async () => ({ tongKetHocKys: [
        { idDot: 62, tenDot: 'HK2 (2025 - 2026)', chiTiets: [
          { idLopHocPhan: 601645, maMonHoc: '001927', tenMonHoc: 'Mạch điện' },
        ] },
      ] }),
      ketQuaHocTapChiTiet: async () => ({ rows: chiTietRows }),
      danhGiaRenLuyen: async () => rl,
    },
  };
}

test('baseline: lần đầu (old=null) → không có gì gửi', async () => {
  const { snapshot } = await buildSnapshot({}, makeDeps([{ level2: 'GK', level3: '1', value: '9' }], []));
  // Mô phỏng index: old === null → không diff, không gửi.
  const old = null;
  const changed = old === null ? [] : diff(old, snapshot);
  assert.equal(changed.length, 0);
});

test('bỏ 1 cell trong state cũ rồi chạy lại → gửi đúng 1 tin có cell đó', async () => {
  const rows = [
    { level2: 'Giữa kỳ 30%', level3: '1', value: '9.5' },
    { level2: 'Cuối kỳ', level3: 'Điểm thi', value: '9.0' },
  ];
  const { snapshot } = await buildSnapshot({}, makeDeps(rows, []));
  // state cũ = snapshot nhưng thiếu cell "Cuối kỳ" (giả lập bỏ 1 cell)
  const old = JSON.parse(JSON.stringify(snapshot));
  delete old['601645'].cells['␟Cuối kỳ␟Điểm thi'];
  const changed = diff(old, snapshot);
  assert.equal(changed.length, 1);
  assert.equal(changed[0].changes.length, 1);
  assert.match(changed[0].changes[0].label, /Cuối kỳ/);
});

test('nhiều cột mới cùng lúc → 1 embed duy nhất cho môn', async () => {
  const rows = [
    { level1: 'Thực hành', level2: 'TH', level3: '1', value: '8' },
    { level1: 'Thực hành', level2: 'TH', level3: '2', value: '9' },
    { level1: 'Thực hành', level2: 'TH', level3: '3', value: '7' },
    { level2: 'Thường xuyên', level3: '1', value: '9' },
    { level2: 'Thường xuyên', level3: '2', value: '10' },
  ];
  const { snapshot } = await buildSnapshot({}, makeDeps(rows, []));
  const changed = diff({}, snapshot);
  const embeds = buildEmbeds(changed);
  assert.equal(embeds.length, 1); // 1 embed cho môn
  assert.equal(embeds[0].fields.length, 5); // 5 cột gộp chung
});

test('Điểm tổng kết rỗng → có → embed nổi bật vàng kèm Điểm chữ + Xếp loại', async () => {
  const rowsBefore = [{ level2: 'Giữa kỳ', level3: '1', value: '9.5' }];
  const rowsAfter = [
    { level2: 'Giữa kỳ', level3: '1', value: '9.5' },
    { level2: 'Điểm tổng kết', level3: 'Điểm tổng kết', value: '9.30' },
    { level3: 'Điểm chữ', value: 'A+' },
    { level3: 'Xếp loại', value: 'Xuất sắc' },
    { level3: 'Đạt', value: '1', isCheck: true },
  ];
  const before = (await buildSnapshot({}, makeDeps(rowsBefore, []))).snapshot;
  const after = (await buildSnapshot({}, makeDeps(rowsAfter, []))).snapshot;
  const changed = diff(before, after);
  const [e] = buildEmbeds(changed);
  assert.equal(e.color, 15844367); // gold
  assert.match(e.title, /✅ Điểm tổng kết/);
  const labels = e.fields.map((f) => f.name);
  assert.ok(labels.includes('Điểm chữ'));
  assert.ok(labels.includes('Xếp loại'));
});

test('rèn luyện gộp cùng cơ chế diff → embed tím', async () => {
  const rl = [{ idDot: 62, tenDot: 'HK2 (2025-2026)', tongDiem: 85, xepLoai: 'Tốt', trangThai: 'Đã duyệt' }];
  const after = (await buildSnapshot({}, makeDeps([{ level3: 'Điểm chữ', value: 'A' }], rl))).snapshot;
  const changed = diff({}, after);
  const rlEmbed = buildEmbeds(changed).find((e) => e.title.includes('rèn luyện'));
  assert.ok(rlEmbed);
  assert.equal(rlEmbed.color, 10181046); // purple
});
