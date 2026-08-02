import { rowsToCells, level3FromKey } from '../snapshot-utils.js';

const FINAL_L3 = 'Điểm tổng kết';
const FINAL_FIELDS = ['Điểm tổng kết', 'Thang điểm 4', 'Điểm chữ', 'Xếp loại', 'Đạt'];
const GREEN = 3066993;
const GOLD = 15844367;

function finalCluster(entity) {
  return Object.entries(entity.cells || {})
    .filter(([key, value]) => value !== '' && FINAL_FIELDS.some((name) => level3FromKey(key) === name || key.includes(name)))
    .map(([cellKey, value]) => ({ cellKey, new: value }));
}

export const gradesEndpoint = {
  id: 'grades',

  async collect({ ctx, identity, request }) {
    const result = await request(ctx, 'api/v1/SinhVien/KetQuaHocTap', { idSinhVien: identity.idSV });
    const entities = {};
    for (const term of result?.tongKetHocKys || []) {
      for (const subject of term.chiTiets || []) {
        try {
          const detail = await request(ctx, 'api/v1/SinhVien/KetQuaHocTapChiTiet', {
            idSinhVien: identity.idSV,
            idLopHocPhan: subject.idLopHocPhan,
          });
          entities[subject.idLopHocPhan] = {
            tenMonHoc: subject.tenMonHoc,
            tenDot: term.tenDot,
            maMonHoc: subject.maMonHoc,
            idDot: term.idDot,
            cells: rowsToCells(detail?.rows),
          };
        } catch (e) {
          console.error(`Bỏ qua môn ${subject.idLopHocPhan}: ${e.message}`);
        }
      }
    }
    return entities;
  },

  render(change, { makeEmbed, fieldValue, labelFromKey }, opts) {
    const finalized = change.isFinalized || change.changes.some((c) => c.old === '' && c.cellKey && level3FromKey(c.cellKey) === FINAL_L3);
    const prefix = opts.testMode ? '🧪 ' : '';
    if (finalized) {
      const fields = (change.finalCluster || finalCluster(change.entity || {})).map((c) => ({
        name: c.label || labelFromKey(c.cellKey),
        value: /tổng kết/i.test(c.label || labelFromKey(c.cellKey)) ? `**${c.new}**` : String(c.new),
        inline: true,
      }));
      return makeEmbed(`${prefix}✅ Điểm tổng kết — ${change.tenMonHoc}`, `${change.tenDot} • Mã LHP ${change.maMonHoc}`, GOLD, fields);
    }
    return makeEmbed(`${prefix}📊 ${change.tenMonHoc}`, `${change.tenDot} • Mã LHP ${change.maMonHoc}`, GREEN,
      change.changes.map((c) => ({ name: c.label, value: fieldValue(c), inline: true })));
  },

  selectForTest(entries, limit) {
    const maxDot = entries.reduce((max, [, entity]) => Math.max(max, entity.idDot || 0), 0);
    const newest = entries.filter(([, entity]) => (entity.idDot || 0) === maxDot);
    return (newest.length ? newest : entries).slice(0, limit);
  },
};
