import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diff } from '../src/diff.js';

const sub = (cells, extra = {}) => ({ tenMonHoc: 'M', tenDot: 'HK2', maMonHoc: '001', cells, ...extra });

test('điểm mới xuất hiện (cũ không có) → báo', () => {
  const out = diff({ 1: sub({}) }, { 1: sub({ '␟GK␟1': '9.0' }) });
  assert.equal(out.length, 1);
  assert.equal(out[0].changes.length, 1);
  assert.equal(out[0].changes[0].old, '');
  assert.equal(out[0].changes[0].new, '9.0');
});

test('giá trị đổi → báo cũ→mới', () => {
  const out = diff({ 1: sub({ '␟GK␟1': '8.0' }) }, { 1: sub({ '␟GK␟1': '9.0' }) });
  assert.equal(out[0].changes[0].old, '8.0');
  assert.equal(out[0].changes[0].new, '9.0');
});

test('giá trị bị xoá (mới rỗng) → KHÔNG báo', () => {
  const out = diff({ 1: sub({ '␟GK␟1': '8.0' }) }, { 1: sub({ '␟GK␟1': '' }) });
  assert.equal(out.length, 0);
});

test('không đổi → không báo', () => {
  const out = diff({ 1: sub({ '␟GK␟1': '8.0' }) }, { 1: sub({ '␟GK␟1': '8.0' }) });
  assert.equal(out.length, 0);
});

test('nhiều cột mới cùng lúc → gộp 1 entry nhiều changes', () => {
  const out = diff(
    { 1: sub({}) },
    { 1: sub({ 'TH␟a␟1': '8', 'TH␟a␟2': '9', 'TX␟b␟1': '7', '␟GK␟1': '9', '␟CK␟thi': '10' }) },
  );
  assert.equal(out.length, 1);
  assert.equal(out[0].changes.length, 5);
});

test('Điểm tổng kết rỗng → có → gán renderer grades cùng entity hiện tại', () => {
  const cells = {
    '␟Điểm tổng kết␟Điểm tổng kết': '9.30',
    '␟␟Điểm chữ': 'A+',
    '␟␟Xếp loại': 'Xuất sắc',
    '␟␟Thang điểm 4': '4.0',
    '␟␟Đạt': '✅',
    'TX␟a␟1': '9.5',
  };
  const out = diff({ 1: sub({ 'TX␟a␟1': '9.5' }) }, { 1: sub(cells) });
  assert.equal(out.length, 1);
  assert.equal(out[0].endpoint, 'grades');
  assert.equal(out[0].entity.cells['␟␟Điểm chữ'], 'A+');
});

test('rèn luyện: trạng thái đổi Chưa duyệt → Đã duyệt → báo, isRenLuyen', () => {
  const old = { 'renluyen:62': { tenMonHoc: 'Điểm rèn luyện', tenDot: 'HK2', maMonHoc: '', isRenLuyen: true, cells: { 'Tổng điểm': '85', 'Trạng thái': 'Chưa duyệt' } } };
  const neu = { 'renluyen:62': { tenMonHoc: 'Điểm rèn luyện', tenDot: 'HK2', maMonHoc: '', isRenLuyen: true, cells: { 'Tổng điểm': '85', 'Trạng thái': 'Đã duyệt' } } };
  const out = diff(old, neu);
  assert.equal(out.length, 1);
  assert.equal(out[0].isRenLuyen, true);
  assert.equal(out[0].changes[0].label, 'Trạng thái');
  assert.equal(out[0].changes[0].new, 'Đã duyệt');
});

test('môn hoàn toàn mới (không có trong old) → mọi cell có giá trị đều báo', () => {
  const out = diff({}, { 9: sub({ '␟␟Điểm chữ': 'B' }) });
  assert.equal(out.length, 1);
  assert.equal(out[0].changes[0].new, 'B');
});
