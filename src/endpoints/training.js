const PURPLE = 10181046;

export function parseRenLuyen(result) {
  const found = [];
  const visit = (value) => {
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') {
      if ('idDot' in value && ('tongDiem' in value || 'xepLoai' in value || 'trangThai' in value)) found.push(value);
      else Object.values(value).forEach(visit);
    }
  };
  visit(result);
  return Object.values(Object.fromEntries(found.map((row) => [row.idDot, row])));
}

function entity(row) {
  return {
    tenMonHoc: 'Điểm rèn luyện',
    tenDot: row.tenDot || (row.namHoc && row.hocKy ? `${row.namHoc} HK${row.hocKy}` : `Đợt ${row.idDot}`),
    maMonHoc: '',
    idDot: row.idDot,
    isRenLuyen: true,
    cells: {
      'Tổng điểm': row.tongDiem != null && row.tongDiem !== '' ? String(row.tongDiem) : '',
      'Xếp loại': row.xepLoai || '',
      'Trạng thái': row.trangThai || '',
    },
  };
}

export const trainingEndpoint = {
  id: 'training',

  async collect({ ctx, identity, request }) {
    const bodies = [{ idSinhVien: identity.idSV }, {}, { idSinhVien: identity.idSV, maSinhVien: identity.idSV }];
    let lastError;
    for (const body of bodies) {
      try {
        const result = await request(ctx, 'api/v1/SinhVien/DanhGiaRenLuyen', body);
        return Object.fromEntries(parseRenLuyen(result).map((row) => [`renluyen:${row.idDot}`, entity(row)]));
      } catch (e) {
        lastError = e;
        if (!/HTTP 400/.test(e.message)) throw e;
      }
    }
    throw lastError;
  },

  render(change, { makeEmbed, fieldValue }, opts) {
    const prefix = opts.testMode ? '🧪 ' : '';
    return makeEmbed(`${prefix}📋 Điểm rèn luyện — ${change.tenDot}`, '', PURPLE,
      change.changes.map((c) => ({ name: c.label, value: fieldValue(c), inline: true })));
  },

  selectForTest(entries, limit) { return entries.slice(0, limit); },
};
