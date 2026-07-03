// So snapshot cũ vs mới. Báo MỌI giá trị mới xuất hiện + giá trị đổi. Xoá → bỏ qua.
import { labelFromKey, level3FromKey } from './snapshot.js';

const FINAL_L3 = 'Điểm tổng kết';
// Cụm kết quả cuối gom vào embed nổi bật khi môn được chốt điểm.
const CLUSTER = ['Điểm tổng kết', 'Thang điểm 4', 'Điểm chữ', 'Xếp loại', 'Đạt'];

function clusterCells(sub) {
  const res = [];
  for (const ck of Object.keys(sub.cells || {})) {
    const l3 = level3FromKey(ck);
    const lbl = labelFromKey(ck);
    const v = sub.cells[ck];
    if (v === '' ) continue;
    if (CLUSTER.some((m) => l3 === m || lbl.includes(m))) res.push({ label: lbl, new: v, cellKey: ck });
  }
  return res;
}

export function diff(oldSnap = {}, newSnap = {}) {
  const out = [];
  for (const key of Object.keys(newSnap)) {
    const nsub = newSnap[key];
    const osub = oldSnap[key] || { cells: {} };
    const oldCells = osub.cells || {};
    const changes = [];
    let finalized = false;

    for (const ck of Object.keys(nsub.cells || {})) {
      const nv = nsub.cells[ck] ?? '';
      const ov = oldCells[ck] ?? '';
      if (nv === '') continue;   // rỗng hoặc bị xoá → bỏ qua
      if (nv === ov) continue;   // không đổi
      changes.push({ cellKey: ck, label: labelFromKey(ck), old: ov, new: nv });
      if (ov === '' && level3FromKey(ck) === FINAL_L3) finalized = true; // rỗng → có Điểm tổng kết
    }

    if (!changes.length) continue;

    const item = {
      key,
      idLHP: key,
      tenMonHoc: nsub.tenMonHoc,
      tenDot: nsub.tenDot,
      maMonHoc: nsub.maMonHoc,
      changes,
      isRenLuyen: !!nsub.isRenLuyen || key.startsWith('renluyen:'),
      isFinalized: finalized,
    };
    if (finalized) item.finalCluster = clusterCells(nsub);
    out.push(item);
  }
  return out;
}
