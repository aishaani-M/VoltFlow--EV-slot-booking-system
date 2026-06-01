/* ══════════════════════════════════════════
   api.js – Centralised API helper
   ══════════════════════════════════════════ */
const API = {
  BASE: '',

  async request(method, url, body = null) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(this.BASE + url, opts);
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      throw new Error(`Server error (${res.status})`);
    }
    const data = await res.json();
    if (!res.ok && data.error) throw new Error(data.error);
    return data;
  },

  get(url)          { return this.request('GET',    url); },
  post(url, body)   { return this.request('POST',   url, body); },
  put(url, body)    { return this.request('PUT',    url, body); },
  delete(url)       { return this.request('DELETE', url); },
};
