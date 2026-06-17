// Minimal fetch wrapper. Adds Authorization header when a token is in
// localStorage, parses JSON, surfaces server error messages.

let inMemoryAccessToken = null;

export function setAccessToken(t) { inMemoryAccessToken = t; }
export function getAccessToken() { return inMemoryAccessToken; }

export async function api(path, { method = 'GET', body, headers = {} } = {}) {
  const opts = { method, headers: { Accept: 'application/json', ...headers } };
  if (inMemoryAccessToken) opts.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(path, opts);
  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
  }
  if (!res.ok) {
    const err = new Error(data?.error || `http_${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}
