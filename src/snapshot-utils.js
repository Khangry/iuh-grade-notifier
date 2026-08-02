// Tiện ích chung cho endpoint: chuẩn hoá cells và nhãn hiển thị.
const SEP = '␟';

export function rowsToCells(rows) {
  const cells = {};
  const seen = {};
  for (const r of rows || []) {
    const l1 = (r.level1 ?? '').toString().trim();
    const l2 = (r.level2 ?? '').toString().trim();
    const l3 = (r.level3 ?? '').toString().trim();
    if (!l1 && !l2 && !l3) continue;
    let key = [l1, l2, l3].join(SEP);
    if (seen[key] != null) key = `${key}#${++seen[key]}`;
    else seen[key] = 0;
    let value = (r.value ?? '').toString().trim();
    if (r.isCheck === true) value = value ? '✅' : '';
    cells[key] = value;
  }
  return cells;
}

export function labelFromKey(key) {
  const base = key.replace(/#\d+$/, '');
  const parts = base.split(SEP).map((s) => s.trim()).filter(Boolean);
  return parts.filter((p, i) => p !== parts[i - 1]).join(' – ') || key;
}

export function level3FromKey(key) {
  return (key.replace(/#\d+$/, '').split(SEP)[2] || '').trim();
}
