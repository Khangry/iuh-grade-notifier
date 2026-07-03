// Gửi 1 tin gom mọi thay đổi trong 1 run. Mỗi môn 1 embed.
const GREEN = 3066993;
const GOLD = 15844367;
const PURPLE = 10181046;
const ORANGE = 15105570; // phiếu thu học phí
const VND = new Intl.NumberFormat('vi-VN');
const MAX_FIELDS = 25;
const MAX_EMBEDS = 10;

function fieldValue(c) {
  return c.old ? `${c.old} → **${c.new}**` : `**${c.new}**`;
}

function makeEmbed(title, description, color, fields) {
  let desc = description || '';
  let fs = fields;
  if (fs.length > MAX_FIELDS) {
    const extra = fs.slice(MAX_FIELDS);
    fs = fs.slice(0, MAX_FIELDS);
    desc += (desc ? '\n' : '') + extra.map((f) => `• ${f.name}: ${f.value}`).join('\n');
  }
  return { title, description: desc, color, fields: fs, timestamp: new Date().toISOString() };
}

export function buildEmbeds(subjects, opts = {}) {
  const prefix = opts.testMode ? '🧪 ' : '';
  const embeds = [];
  for (const s of subjects) {
    const isPhieuThu = s.isPhieuThu || (s.key && s.key.startsWith('phieuthu:'));
    if (isPhieuThu) {
      let desc = '';
      const fields = [];
      for (const c of s.changes) {
        if (c.label === 'Hóa đơn') {
          if (c.new) desc = `🧾 Hóa đơn: [Xem PDF](${c.new})`;
          continue;
        }
        const val = c.label === 'Số tiền' ? `${VND.format(Number(c.new))} ₫` : String(c.new);
        fields.push({ name: c.label, value: `**${val}**`, inline: true });
      }
      embeds.push(makeEmbed(`${prefix}💸 Phiếu thu học phí mới`, desc, ORANGE, fields));
    } else if (s.isRenLuyen) {
      const fields = s.changes.map((c) => ({ name: c.label, value: fieldValue(c), inline: true }));
      embeds.push(makeEmbed(`${prefix}📋 Điểm rèn luyện — ${s.tenDot}`, '', PURPLE, fields));
    } else if (s.isFinalized) {
      const fields = (s.finalCluster || []).map((c) => ({
        name: c.label,
        value: /tổng kết/i.test(c.label) ? `**${c.new}**` : String(c.new),
        inline: true,
      }));
      embeds.push(makeEmbed(`${prefix}✅ Điểm tổng kết — ${s.tenMonHoc}`, `${s.tenDot} • Mã LHP ${s.maMonHoc}`, GOLD, fields));
    } else {
      const fields = s.changes.map((c) => ({ name: c.label, value: fieldValue(c), inline: true }));
      embeds.push(makeEmbed(`${prefix}📊 ${s.tenMonHoc}`, `${s.tenDot} • Mã LHP ${s.maMonHoc}`, GREEN, fields));
    }
  }
  return embeds;
}

// Discord tối đa 10 embed/tin → chia nhiều POST. content chỉ gắn tin đầu.
export async function sendGradeUpdate(webhook, subjects, opts = {}, fetchImpl = fetch) {
  const embeds = buildEmbeds(subjects, opts);
  if (!embeds.length && !opts.content) return 204; // không có gì gửi
  const chunks = [];
  for (let i = 0; i < embeds.length; i += MAX_EMBEDS) chunks.push(embeds.slice(i, i + MAX_EMBEDS));
  if (!chunks.length) chunks.push([]); // trường hợp chỉ có content

  let lastStatus = 204;
  for (let i = 0; i < chunks.length; i++) {
    const payload = { embeds: chunks[i] };
    if (i === 0 && opts.content) payload.content = opts.content;
    const res = await fetchImpl(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    lastStatus = res.status;
    if (res.status < 200 || res.status >= 300) throw new Error(`Discord HTTP ${res.status}`);
  }
  return lastStatus;
}

export async function sendAlert(webhook, msg, fetchImpl = fetch) {
  if (!webhook) return;
  try {
    await fetchImpl(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: `⚠️ ${msg}` }),
    });
  } catch { /* alert best-effort */ }
}
