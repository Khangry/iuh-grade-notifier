// HTTP client OneUni dùng chung. Endpoint tự giữ path và request body của mình.
import { login } from './auth.js';

export async function apiPost(ctx, path, body, fetchImpl = fetch) {
  const url = new URL(path, ctx.cfg.urlUni).toString();
  const doFetch = (tok) => fetchImpl(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tok}`,
      'Content-Type': 'application/json; charset=utf-8',
      accept: 'application/json',
      language: 'vi',
    },
    body: JSON.stringify(body),
  });

  let res = await doFetch(ctx.token);
  if (res.status === 401 && ctx.relogin) {
    ctx.token = await ctx.relogin();
    res = await doFetch(ctx.token);
  }
  if (!res.ok) throw new Error(`API ${path} HTTP ${res.status}`);

  const env = await res.json();
  if (env && env.isOk === false) {
    const e = new Error(`API ${path} isOk=false: ${JSON.stringify(env.errorMessages || [])}`);
    e.isApiError = true;
    e.errorMessages = env.errorMessages || [];
    throw e;
  }
  return env ? env.result : undefined;
}

export function makeCtx(cfg, token, fetchImpl = fetch) {
  return { token, cfg, relogin: async () => (await login(cfg, fetchImpl)).access_token };
}
