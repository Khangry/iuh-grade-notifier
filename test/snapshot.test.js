import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rowsToCells, labelFromKey, level3FromKey, parseRenLuyen, buildSnapshot } from '../src/snapshot.js';

test('rowsToCells: chuẩn hoá, trim, isCheck → ✅, null→bỏ', () => {
  const rows = [
    { level1: 'Thường xuyên 20%', level2: 'LT Hệ số 1', level3: '1 ', value: '9.50', isCheck: false },
    { level1: null, level2: 'Giữa kỳ 30%', level3: '1 ', value: '9.50' },
    { level1: null, level2: 'Cuối kỳ ', level3: 'Điểm thi', value: '9.00' },
    { level1: null, level2: 'Điểm tổng kết ', level3: 'Điểm tổng kết', value: '9.30' },
    { level1: null, level2: null, level3: 'Điểm chữ', value: 'A+' },
    { level1: null, level2: null, level3: 'Đạt', value: '1', isCheck: true },
    { level1: null, level2: null, level3: 'Ghi chú', value: '' },
  ];
  const cells = rowsToCells(rows);
  assert.equal(cells['Thường xuyên 20%␟LT Hệ số 1␟1'], '9.50');
  assert.equal(cells['␟Điểm tổng kết␟Điểm tổng kết'], '9.30');
  assert.equal(cells['␟␟Điểm chữ'], 'A+');
  assert.equal(cells['␟␟Đạt'], '✅'); // isCheck truthy
  assert.equal(cells['␟␟Ghi chú'], ''); // rỗng giữ nhưng = không có điểm
});

test('rowsToCells: dup key thêm hậu tố index', () => {
  const rows = [
    { level1: 'TH', level2: 'x', level3: '1', value: '8' },
    { level1: 'TH', level2: 'x', level3: '1', value: '9' },
  ];
  const cells = rowsToCells(rows);
  assert.equal(cells['TH␟x␟1'], '8');
  assert.equal(cells['TH␟x␟1#1'], '9');
});

test('labelFromKey + level3FromKey', () => {
  assert.equal(labelFromKey('Thường xuyên 20%␟LT Hệ số 1␟1'), 'Thường xuyên 20% – LT Hệ số 1 – 1');
  assert.equal(labelFromKey('␟␟Điểm chữ'), 'Điểm chữ');
  assert.equal(labelFromKey('TH␟x␟1#2'), 'TH – x – 1');
  assert.equal(level3FromKey('␟Điểm tổng kết␟Điểm tổng kết'), 'Điểm tổng kết');
});

test('parseRenLuyen: list phẳng', () => {
  const r = parseRenLuyen([
    { idDot: 62, tenDot: 'HK2', tongDiem: 85, xepLoai: 'Tốt', trangThai: 'Đã duyệt' },
    { idDot: 61, tongDiem: 80, xepLoai: 'Khá', trangThai: 'Đã duyệt' },
  ]);
  assert.equal(r.length, 2);
  assert.equal(r.find((x) => x.idDot === 62).tongDiem, 85);
});

test('parseRenLuyen: lồng trong diemRenLuyens[]', () => {
  const r = parseRenLuyen({ diemRenLuyens: [{ idDot: 62, tongDiem: 90, xepLoai: 'Xuất sắc' }] });
  assert.equal(r.length, 1);
  assert.equal(r[0].idDot, 62);
});

test('buildSnapshot: orchestrate với mock, gộp rèn luyện thành entity ảo', async () => {
  const deps = {
    login: async () => ({ access_token: 'tok', sub: '1763538' }),
    api: {
      ketQuaHocTap: async () => ({
        tongKetHocKys: [
          { idDot: 62, tenDot: 'HK2 (2025 - 2026)', chiTiets: [
            { idLopHocPhan: 601645, maMonHoc: '001927', tenMonHoc: 'Mạch điện' },
          ] },
        ],
      }),
      ketQuaHocTapChiTiet: async () => ({ rows: [
        { level2: 'Giữa kỳ 30%', level3: '1', value: '9.5' },
        { level3: 'Điểm tổng kết', level2: 'Điểm tổng kết', value: '9.30' },
      ] }),
      danhGiaRenLuyen: async () => ([{ idDot: 62, tenDot: 'HK2 (2025-2026)', tongDiem: 85, xepLoai: 'Tốt', trangThai: 'Đã duyệt' }]),
    },
  };
  const { snapshot, idSV } = await buildSnapshot({}, deps);
  assert.equal(idSV, 1763538);
  assert.ok(snapshot['601645']);
  assert.equal(snapshot['601645'].tenMonHoc, 'Mạch điện');
  assert.ok(snapshot['renluyen:62']);
  assert.equal(snapshot['renluyen:62'].cells['Tổng điểm'], '85');
  assert.equal(snapshot['renluyen:62'].cells['Trạng thái'], 'Đã duyệt');
});

test('buildSnapshot: 1 môn lỗi ChiTiet → skip, không crash', async () => {
  const deps = {
    login: async () => ({ access_token: 't', sub: '1' }),
    api: {
      ketQuaHocTap: async () => ({ tongKetHocKys: [{ idDot: 1, tenDot: 'HK1', chiTiets: [
        { idLopHocPhan: 1, maMonHoc: 'a', tenMonHoc: 'A' },
        { idLopHocPhan: 2, maMonHoc: 'b', tenMonHoc: 'B' },
      ] }] }),
      ketQuaHocTapChiTiet: async (ctx, idSV, idLHP) => {
        if (idLHP === 1) throw new Error('timeout');
        return { rows: [{ level3: 'Điểm chữ', value: 'A' }] };
      },
      danhGiaRenLuyen: async () => { throw new Error('HTTP 400'); },
    },
  };
  const { snapshot } = await buildSnapshot({}, deps);
  assert.equal(snapshot['1'], undefined); // môn lỗi bị skip
  assert.ok(snapshot['2']);
});
