(function(){
  const config = window.APP_CONFIG || {};
  const baseUrl = config.API_BASE || '';
  const token = config.API_TOKEN || '';

  async function apiGet(action, params = {}) {
    if (!baseUrl) throw new Error('API_BASE is not configured');
    const search = new URLSearchParams({ action, token, ...params });
    const res = await fetch(`${baseUrl}?${search.toString()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`GET ${action} failed: ${res.status}`);
    return res.json();
  }

  async function apiPost(action, data = {}) {
    if (!baseUrl) throw new Error('API_BASE is not configured');
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, token, ...data })
    });
    if (!res.ok) throw new Error(`POST ${action} failed: ${res.status}`);
    return res.json();
  }

  const listeners = new Set();

  function notify() {
    listeners.forEach(fn => {
      try {
        fn(window.STATE);
      } catch (err) {
        console.error('State subscriber failed', err);
      }
    });
  }

  const Data = {
    version: -1,
    subscribe(fn) {
      if (typeof fn === 'function') {
        listeners.add(fn);
        if (window.STATE) {
          try { fn(window.STATE); } catch (err) { console.error(err); }
        }
      }
      return () => listeners.delete(fn);
    },
    async syncAll(force = false) {
      const versionRes = await apiGet('getVersion');
      if (!force && versionRes.version === Data.version) {
        return;
      }
      const [customersRes, cskhRes, settingsRes] = await Promise.all([
        apiGet('listCustomers', { sinceVersion: Data.version }),
        apiGet('listCSKH', { sinceVersion: Data.version }),
        apiGet('getSettings')
      ]);
      Data.version = versionRes.version;
      window.STATE = {
        customers: Array.isArray(customersRes.items) ? customersRes.items : [],
        cskh: Array.isArray(cskhRes.items) ? cskhRes.items : [],
        settings: settingsRes.settings || {}
      };
      notify();
    },
    upsertCustomer(data, actor) {
      return apiPost('upsertCustomer', { data, actor });
    },
    logCSKH(data, actor) {
      return apiPost('logCSKH', { data, actor });
    },
    updateSettings(data, actor) {
      return apiPost('updateSettings', { data, actor });
    },
    backupNow() {
      return apiGet('backupNow');
    }
  };

  window.Api = { apiGet, apiPost };
  window.Data = Data;
  window.STATE = window.STATE || { customers: [], cskh: [], settings: {} };

  const pollMs = Number(config.POLL_MS || 0);
  if (pollMs > 0) {
    setInterval(() => {
      Data.syncAll(false).catch(err => console.error('Sync failed', err));
    }, pollMs);
  }
})();
