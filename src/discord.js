// Gửi 1 tin gom mọi thay đổi trong 1 run. Renderer thuộc về từng endpoint.
import { endpointById, endpointIdForEntity } from './endpoints/index.js';
import { labelFromKey } from './snapshot-utils.js';
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
  const helpers = { makeEmbed, fieldValue, labelFromKey };
  return subjects.map((subject) => {
    const id = subject.endpoint || endpointIdForEntity(subject.key || '', subject.entity || subject);
    const endpoint = endpointById.get(id);
    if (!endpoint) throw new Error(`Không có renderer cho endpoint: ${id}`);
    return endpoint.render(subject, helpers, opts);
  });
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
