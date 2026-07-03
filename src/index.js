// ponytail: sv.iuh.edu.vn thiếu intermediate CA → tắt verify TLS cho toàn process.
// Spec cho phép (mục 2c). Upgrade path: bundle CA + undici Agent rejectUnauthorized:false.
// Đặt TRƯỚC mọi fetch.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { buildConfig, assertConfig } from './config.js';
import { buildSnapshot, labelFromKey } from './snapshot.js';
import { diff } from './diff.js';
import { loadState, saveState, writeLastChecked } from './state.js';
import { sendGradeUpdate, sendAlert } from './discord.js';

async function runNormal(cfg) {
  assertConfig(cfg, { needState: true });
  const old = await loadState(cfg.stateKey);
  const { snapshot } = await buildSnapshot(cfg);

  if (old === null) {
    // Lần đầu: dựng baseline, lưu, KHÔNG gửi (tránh spam điểm cũ).
    await saveState(snapshot, cfg.stateKey);
    await writeLastChecked();
    console.log(`Baseline: ${Object.keys(snapshot).length} entity, không gửi Discord.`);
    if (cfg.notifyOnFirstRun) {
      await sendGradeUpdate(cfg.webhook, [], { content: '✅ Đã bật theo dõi điểm IUH.' });
    }
    return;
  }

  const changed = diff(old, snapshot);
  if (changed.length) {
    await sendGradeUpdate(cfg.webhook, changed);
    console.log(`Đã gửi cập nhật ${changed.length} môn/entity.`);
  } else {
    console.log('Không có điểm mới.');
  }
  await saveState(snapshot, cfg.stateKey);
  await writeLastChecked();
}

// TEST_MODE: login + fetch điểm có sẵn, gửi Discord bằng đúng code path production.
// KHÔNG đụng state. exit 0 nếu webhook 2xx.
async function runTest(cfg) {
  assertConfig(cfg, { needState: false });
  const { snapshot } = await buildSnapshot(cfg);

  const entries = Object.entries(snapshot)
    .filter(([, v]) => Object.values(v.cells || {}).some((x) => x !== ''));
  const totalCells = entries.reduce(
    (n, [, v]) => n + Object.values(v.cells).filter((x) => x !== '').length, 0);

  // Kỳ gần nhất = idDot lớn nhất có điểm (không tính phiếu thu — không có idDot).
  const grades = entries.filter(([k]) => !k.startsWith('phieuthu:'));
  const phieuThu = entries.filter(([k]) => k.startsWith('phieuthu:'));
  const maxDot = grades.reduce((m, [, v]) => Math.max(m, v.idDot || 0), 0);
  let picked = grades.filter(([, v]) => (v.idDot || 0) === maxDot);
  if (!picked.length) picked = grades;
  // vài môn kỳ mới nhất + vài phiếu thu có sẵn để kiểm cả 2 code path.
  picked = picked.slice(0, cfg.testSubjectCount).concat(phieuThu.slice(0, cfg.testSubjectCount));

  const subjects = picked.map(([k, v]) => ({
    key: k,
    idLHP: k,
    tenMonHoc: v.tenMonHoc,
    tenDot: v.tenDot,
    maMonHoc: v.maMonHoc,
    isRenLuyen: !!v.isRenLuyen || k.startsWith('renluyen:'),
    changes: Object.keys(v.cells)
      .filter((ck) => v.cells[ck] !== '')
      .map((ck) => ({ cellKey: ck, label: labelFromKey(ck), old: '', new: v.cells[ck] })),
  }));

  const status = await sendGradeUpdate(cfg.webhook, subjects, {
    testMode: true,
    content: '🧪 [TEST] Kiểm tra pipeline — đây KHÔNG phải điểm mới',
  });

  // Chỉ in số liệu, không lộ điểm ra log Actions của repo public.
  console.log(`[TEST] mônLoad=${entries.length} gửi=${subjects.length} tổngÔ=${totalCells} discordStatus=${status}`);
  if (status < 200 || status >= 300) process.exit(1);
}

async function main() {
  const cfg = buildConfig();
  try {
    if (cfg.testMode) await runTest(cfg);
    else await runNormal(cfg);
  } catch (e) {
    console.error('FATAL:', e.message);
    await sendAlert(cfg.alertWebhook, `Grade bot lỗi: ${e.message}`);
    process.exit(1);
  }
}

main();
