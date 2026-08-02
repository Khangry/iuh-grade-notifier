const ORANGE = 15105570;
const VND = new Intl.NumberFormat('vi-VN');

function entity(receipt) {
  return {
    tenMonHoc: 'Hóa đơn/phiếu thu học phí đã phát sinh',
    tenDot: receipt.ngayThu || '',
    maMonHoc: receipt.soPhieu || '',
    isPhieuThu: true,
    cells: {
      'Số tiền': receipt.tongTien != null && receipt.tongTien !== '' ? String(receipt.tongTien) : '',
      'Ngày thu': receipt.ngayThu || '',
      'Mã hóa đơn': receipt.maHoaDon || '',
      'Loại thu': receipt.idLoaiThu != null ? String(receipt.idLoaiThu) : '',
      'Đơn vị thu': receipt.donViThu || '',
      'Hóa đơn': receipt.urlInvoice || '',
    },
  };
}

export const tuitionReceiptsEndpoint = {
  id: 'tuition-receipts',

  async collect({ ctx, identity, request }) {
    if (identity.maMap == null) return {};
    const result = await request(ctx, 'api/v1/SinhVien/PhieuThuTongHop', { maSinhVien: identity.maMap });
    const receipts = Array.isArray(result) ? result : (Array.isArray(result?.result) ? result.result : []);
    return Object.fromEntries(receipts.filter((receipt) => receipt?.id != null)
      .map((receipt) => [`phieuthu:${receipt.id}`, entity(receipt)]));
  },

  render(change, { makeEmbed }, opts) {
    const prefix = opts.testMode ? '🧪 ' : '';
    let description = '';
    const fields = [];
    for (const cell of change.changes) {
      if (cell.label === 'Hóa đơn') {
        if (cell.new) description = `🧾 Hóa đơn: [Xem PDF](${cell.new})`;
        continue;
      }
      const value = cell.label === 'Số tiền' ? `${VND.format(Number(cell.new))} ₫` : String(cell.new);
      fields.push({ name: cell.label, value: `**${value}**`, inline: true });
    }
    return makeEmbed(`${prefix}💸 Hóa đơn/phiếu thu học phí đã phát sinh`, description, ORANGE, fields);
  },

  selectForTest(entries, limit) { return entries.slice(0, limit); },
};
