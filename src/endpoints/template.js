// Copy file này, đổi id và thêm endpoint vào ./index.js.
// Entity key phải ổn định giữa các lần chạy; chỉ cells được dùng để diff.
export const exampleEndpoint = {
  id: 'example',

  async collect({ ctx, identity, request }) {
    // const result = await request(ctx, 'api/v1/...', { idSinhVien: identity.idSV });
    // return { 'example:stable-id': { tenMonHoc: '...', tenDot: '', maMonHoc: '', cells: { 'Nhãn': 'Giá trị' } } };
    return {};
  },

  render(change, { makeEmbed, fieldValue }, opts) {
    const prefix = opts.testMode ? '🧪 ' : '';
    return makeEmbed(`${prefix}📌 Thông báo mới`, '', 0x5865f2,
      change.changes.map((cell) => ({ name: cell.label, value: fieldValue(cell), inline: true })));
  },

  selectForTest(entries, limit) { return entries.slice(0, limit); },
};
