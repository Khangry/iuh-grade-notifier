// So snapshot cũ vs mới. Báo MỌI giá trị mới xuất hiện + giá trị đổi. Xoá → bỏ qua.
import { labelFromKey } from './snapshot-utils.js';
import { endpointIdForEntity } from './endpoints/index.js';

export function diff(oldSnap = {}, newSnap = {}) {
  const out = [];
  for (const key of Object.keys(newSnap)) {
    const nsub = newSnap[key];
    const osub = oldSnap[key] || { cells: {} };
    const oldCells = osub.cells || {};
    const changes = [];

    for (const ck of Object.keys(nsub.cells || {})) {
      const nv = nsub.cells[ck] ?? '';
      const ov = oldCells[ck] ?? '';
      if (nv === '') continue;   // rỗng hoặc bị xoá → bỏ qua
      if (nv === ov) continue;   // không đổi
      changes.push({ cellKey: ck, label: labelFromKey(ck), old: ov, new: nv });
    }

    if (!changes.length) continue;

    const item = {
      key,
      idLHP: key,
      tenMonHoc: nsub.tenMonHoc,
      tenDot: nsub.tenDot,
      maMonHoc: nsub.maMonHoc,
      endpoint: endpointIdForEntity(key, nsub),
      entity: nsub,
      // Các cờ này tương thích với consumer cũ; renderer mới tự suy từ changes/entity.
      isRenLuyen: endpointIdForEntity(key, nsub) === 'training',
      changes,
    };
    out.push(item);
  }
  return out;
}
