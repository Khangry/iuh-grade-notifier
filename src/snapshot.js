// Dựng snapshot 1 lần chạy: login -> list môn -> chi tiết từng môn -> điểm rèn luyện.
// Chuẩn hoá mỗi ô điểm thành cell. cellKey ổn định qua các lần chạy (không đưa stt* vào).
import { login as realLogin } from './auth.js';
import { makeCtx, realApi } from './api.js';

const SEP = '␟'; // ␟ ký tự hiếm phân tách level1|level2|level3

// rows[] -> { [cellKey]: value }. Generic, không hardcode cột.
export function rowsToCells(rows) {
  const cells = {};
  const seen = {};
  for (const r of rows || []) {
    const l1 = (r.level1 ?? '').toString().trim();
    const l2 = (r.level2 ?? '').toString().trim();
    const l3 = (r.level3 ?? '').toString().trim();
    if (!l1 && !l2 && !l3) continue; // row rỗng hoàn toàn, bỏ
    let key = [l1, l2, l3].join(SEP);
    if (seen[key] != null) {
      seen[key] += 1;
      key = `${key}#${seen[key]}`;
    } else {
      seen[key] = 0;
    }
    let value = (r.value ?? '').toString().trim();
    if (r.isCheck === true) value = value ? '✅' : ''; // ✅ nếu truthy
    cells[key] = value;
  }
  return cells;
}

// cellKey -> label hiển thị ("Thường xuyên 20% – LT Hệ số 1 – 1").
export function labelFromKey(key) {
  const base = key.replace(/#\d+$/, '');
  const parts = base.split(SEP).map((s) => s.trim()).filter(Boolean);
  // Bỏ phần lặp liền kề (vd level2=level3="Điểm tổng kết" → hiển thị 1 lần).
  const dedup = parts.filter((p, i) => p !== parts[i - 1]);
  return dedup.join(' – ') || key;
}

// level3 (đã trim) từ cellKey — để nhận mốc "Điểm tổng kết".
export function level3FromKey(key) {
  const base = key.replace(/#\d+$/, '');
  return (base.split(SEP)[2] || '').trim();
}

// Tìm linh hoạt mảng object điểm rèn luyện (có idDot + tongDiem) ở bất kỳ độ sâu nào.
export function parseRenLuyen(result) {
  const found = [];
  const visit = (v) => {
    if (Array.isArray(v)) {
      v.forEach(visit);
    } else if (v && typeof v === 'object') {
      if ('idDot' in v && ('tongDiem' in v || 'xepLoai' in v || 'trangThai' in v)) found.push(v);
      else Object.values(v).forEach(visit);
    }
  };
  visit(result);
  const byId = {};
  for (const r of found) byId[r.idDot] = r; // dedupe theo idDot
  return Object.values(byId);
}

function renLuyenEntity(d) {
  return {
    tenMonHoc: 'Điểm rèn luyện',
    tenDot: d.tenDot || (d.namHoc && d.hocKy ? `${d.namHoc} HK${d.hocKy}` : `Đợt ${d.idDot}`),
    maMonHoc: '',
    idDot: d.idDot,
    isRenLuyen: true,
    cells: {
      'Tổng điểm': d.tongDiem != null && d.tongDiem !== '' ? String(d.tongDiem) : '',
      'Xếp loại': d.xepLoai || '',
      'Trạng thái': d.trangThai || '',
    },
  };
}

// deps cho test: { login, api:{ketQuaHocTap,...} }. Mặc định = real.
export async function buildSnapshot(cfg, deps = {}) {
  const login = deps.login || realLogin;
  const api = deps.api || realApi;

  const { access_token, sub } = await login(cfg);
  const idSV = Number(sub);
  const ctx = deps.ctx || makeCtx(cfg, access_token);
  ctx.token = access_token;

  const kqht = await api.ketQuaHocTap(ctx, idSV);
  const subjects = [];
  for (const ky of kqht?.tongKetHocKys || []) {
    for (const ct of ky.chiTiets || []) {
      subjects.push({
        idLopHocPhan: ct.idLopHocPhan,
        maMonHoc: ct.maMonHoc,
        tenMonHoc: ct.tenMonHoc,
        tenDot: ky.tenDot,
        idDot: ky.idDot,
      });
    }
  }

  const snapshot = {};
  for (const s of subjects) {
    try {
      const detail = await api.ketQuaHocTapChiTiet(ctx, idSV, s.idLopHocPhan);
      snapshot[s.idLopHocPhan] = {
        tenMonHoc: s.tenMonHoc,
        tenDot: s.tenDot,
        maMonHoc: s.maMonHoc,
        idDot: s.idDot,
        cells: rowsToCells(detail?.rows),
      };
    } catch (e) {
      // 1 môn lỗi/timeout → skip, không crash cả run.
      console.error(`Bỏ qua môn ${s.idLopHocPhan}: ${e.message}`);
    }
  }

  try {
    const rl = await api.danhGiaRenLuyen(ctx, idSV);
    for (const d of parseRenLuyen(rl)) {
      snapshot[`renluyen:${d.idDot}`] = renLuyenEntity(d);
    }
  } catch (e) {
    console.error(`Bỏ qua điểm rèn luyện: ${e.message}`);
  }

  return { snapshot, idSV };
}
