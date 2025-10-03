// ========================
// KLC Storage – Unified
// ========================

const DB_KEY = 'klc_database_v2';
const VERSION_KEY = 'klc_database_version';

// Các key legacy (bản cũ lưu rời từng collection)
const LEGACY_KEYS = {
  customers: 'klc_customers',
  care: 'klc_care',
  services: 'klc_services',
  checklists: 'klc_checklists',
  inventory: 'klc_inventory',
  finance: 'klc_finance',
  deletionRequests: 'klc_deletion_requests',
  layout: 'klc_layout_config'
};
const LEGACY_USERS_KEY = 'klc_users';
const LEGACY_BRANDING_KEY = 'klc_branding';

// LocalStorage an toàn + fallback bộ nhớ tạm
const nativeLocalStorage = (typeof window !== 'undefined' && window.localStorage) ? window.localStorage : null;
const memoryStorage = new Map();
const hasLocalStorage = (() => {
  if (!nativeLocalStorage) return false;
  try {
    const testKey = '__klc_storage_test__';
    nativeLocalStorage.setItem(testKey, '1');
    nativeLocalStorage.removeItem(testKey);
    return true;
  } catch (err) {
    console.warn('LocalStorage không khả dụng, sẽ dùng bộ nhớ tạm.', err);
    return false;
  }
})();

function storageGet(key) {
  if (hasLocalStorage) {
    try {
      const value = nativeLocalStorage.getItem(key);
      if (value !== null && value !== undefined) return value;
    } catch (err) {
      console.warn('Không thể đọc localStorage', err);
    }
  }
  return memoryStorage.has(key) ? memoryStorage.get(key) : null;
}

function storageSet(key, value) {
  if (hasLocalStorage) {
    try {
      nativeLocalStorage.setItem(key, value);
      memoryStorage.delete(key);
      return true;
    } catch (err) {
      console.warn('Không thể ghi localStorage', err);
    }
  }
  memoryStorage.set(key, value);
  return false;
}

function storageRemove(key) {
  if (hasLocalStorage) {
    try {
      nativeLocalStorage.removeItem(key);
    } catch (err) {
      console.warn('Không thể xóa localStorage', err);
    }
  }
  memoryStorage.delete(key);
}

const DEFAULT_BRANDING = {
  title: 'KLC Bến Lức',
  tagline: 'Cổng nội bộ',
  logo: 'assets/img/logo-klc.svg',
  accent: '#0b7c82'
};

const DEFAULT_STAFF = ['Đạt', 'Huỳnh'];

// =========== Đồng bộ từ xa (tùy chọn) ===========
const SYNC_CONFIG_KEY = 'klc_sync_config_v1';
const DEFAULT_SYNC_ENDPOINT = 'https://jsonstorage.net/api/items/klc-ben-luc-database';
const DEFAULT_SYNC_CONFIG = {
  enabled: true,
  endpoint: DEFAULT_SYNC_ENDPOINT,
  method: 'PUT',
  apiKey: '',
  authScheme: 'Bearer',
  headers: [],
  pollInterval: 15000
};

let syncConfig = null;
let syncUploadTimer = null;
let syncPullTimer = null;
let syncPushInFlight = false;
let syncPullInFlight = false;
let syncPendingUpload = false;
let syncServiceStarted = false;
const syncStatus = {
  enabled: false,
  lastPush: 0,
  lastPull: 0,
  lastError: ''
};

// ========= Layout mặc định cho Dashboard =========
const DEFAULT_LAYOUT = [
  { id: 'block_summary', type: 'summary', title: 'Chỉ số kinh doanh chủ đạo' },
  {
    id: 'block_shortcuts',
    type: 'shortcuts',
    title: 'Lối tắt nhanh',
    links: [
      { label: 'Khách hàng', href: 'customers.html' },
      { label: 'Chăm sóc khách', href: 'care.html' },
      { label: 'Bảo hành/Bảo dưỡng', href: 'service.html' },
      { label: 'Thu & Chi', href: 'finance.html' }
    ]
  },
  { id: 'block_range', type: 'range', title: 'Báo cáo thu chi theo khoảng ngày' },
  { id: 'block_chart', type: 'chart', title: 'Biểu đồ thu chi 12 tháng' },
  {
    id: 'block_media',
    type: 'media',
    title: 'Logo thương hiệu',
    image: 'assets/img/logo-klc.svg',
    caption: 'KLC Bến Lức – Đồng hành cùng trải nghiệm chuẩn 5 sao.'
  },
  { id: 'block_activity', type: 'activities', title: 'Hoạt động mới nhất' },
  {
    id: 'block_note',
    type: 'note',
    title: 'Ghi chú điều hành',
    content: 'Cập nhật nhanh thông báo nội bộ, phân công và lưu ý quan trọng cho đội ngũ.'
  }
];

// ========== State, watcher, broadcast ==========
let stateCache = null;
let lastVersion = 0;
const subscribers = new Map();
let watchersReady = false;
const syncChannel = (typeof window !== 'undefined' && 'BroadcastChannel' in window)
  ? new BroadcastChannel('klc-database-sync')
  : null;

function buildDefaultState() {
  return {
    version: Date.now(),
    collections: {
      customers: [],
      care: [],
      services: [],
      checklists: [],
      inventory: [],
      finance: [],
      deletionRequests: [],
      layout: cloneLayout(DEFAULT_LAYOUT)
    },
    users: [
      { username: 'admin', password: 'klcbenluc@2025', name: 'Quản trị viên', role: 'admin' },
      { username: 'nhanvien', password: '123456', name: 'Nhân viên CSKH', role: 'staff' }
    ],
    branding: { ...DEFAULT_BRANDING },
    staff: [...DEFAULT_STAFF]
  };
}

function cloneLayout(layout) {
  return layout.map(item => ({
    ...item,
    links: Array.isArray(item.links) ? item.links.map(link => ({ ...link })) : undefined
  }));
}

function clone(value) {
  return value ? JSON.parse(JSON.stringify(value)) : value;
}

// ----- Headers helper (sync) -----
function normalizeHeaders(headers) {
  if (!headers) return [];
  if (typeof headers === 'string') {
    return headers
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const [key, ...rest] = line.split(':');
        if (!key || !rest.length) return null;
        return { key: key.trim(), value: rest.join(':').trim() };
      })
      .filter(Boolean);
  }
  if (Array.isArray(headers)) {
    return headers
      .map(item => {
        if (!item) return null;
        const key = (item.key || item.name || '').trim();
        const value = (item.value || item.headerValue || '').trim();
        if (!key || !value) return null;
        return { key, value };
      })
      .filter(Boolean);
  }
  return [];
}
function cloneHeaders(headers) {
  return normalizeHeaders(headers).map(item => ({ ...item }));
}

// ----- Sync config -----
function loadSyncConfig() {
  if (syncConfig) return syncConfig;
  try {
    const raw = storageGet(SYNC_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      syncConfig = {
        ...DEFAULT_SYNC_CONFIG,
        ...parsed,
        headers: normalizeHeaders(parsed.headers)
      };
      if (!syncConfig.endpoint) syncConfig.endpoint = DEFAULT_SYNC_ENDPOINT;
    } else {
      syncConfig = { ...DEFAULT_SYNC_CONFIG };
    }
  } catch (err) {
    syncConfig = { ...DEFAULT_SYNC_CONFIG };
  }
  if (!syncConfig.endpoint) syncConfig.endpoint = DEFAULT_SYNC_ENDPOINT;
  updateSyncEnabledFlag();
  return syncConfig;
}
function getInternalSyncConfig() {
  return syncConfig ? syncConfig : loadSyncConfig();
}
function saveSyncConfigToStorage() {
  try {
    const payload = { ...getInternalSyncConfig(), headers: cloneHeaders(syncConfig.headers) };
    storageSet(SYNC_CONFIG_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('Không thể lưu cấu hình đồng bộ', err);
  }
}
function updateSyncEnabledFlag() {
  const config = syncConfig || DEFAULT_SYNC_CONFIG;
  syncStatus.enabled = !!(config.enabled && config.endpoint && typeof fetch === 'function');
  emitSyncStatus();
}
function emitSyncStatus() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('klc:sync-updated', { detail: getSyncStatus() }));
  }
}

// ----- Watchers / cross-tab -----
function ensureWatchers() {
  if (watchersReady || typeof window === 'undefined') return;
  watchersReady = true;
  try {
    lastVersion = Number(storageGet(VERSION_KEY) || '0') || 0;
  } catch (err) {
    lastVersion = 0;
  }
  if (syncChannel) {
    syncChannel.addEventListener('message', evt => {
      if (evt?.data?.type === 'sync') {
        handleExternalChange(evt.data.version);
      }
    });
  }
  window.addEventListener('storage', evt => {
    if (evt.key === DB_KEY || evt.key === VERSION_KEY) {
      handleExternalChange(evt.newValue);
    }
  });
  const poll = () => {
    try {
      const stored = Number(storageGet(VERSION_KEY) || '0');
      if (stored && stored !== lastVersion) {
        handleExternalChange(stored);
      }
    } catch {}
  };
  poll();
  setInterval(poll, 2500);
}

// ----- State I/O -----
function loadState() {
  if (stateCache) return stateCache;
  ensureWatchers();
  const raw = storageGet(DB_KEY);
  if (raw) {
    try {
      stateCache = JSON.parse(raw);
      lastVersion = Number(stateCache?.version) || Number(storageGet(VERSION_KEY) || '0') || 0;
      startSyncService();
      return stateCache;
    } catch (err) {
      console.error('Invalid state payload, rebuilding', err);
    }
  }
  const state = buildDefaultState();
  migrateLegacyData(state);
  persistState(state, { silent: true, skipSync: true });
  stateCache = state;
  lastVersion = Number(state.version) || Date.now();
  startSyncService();
  return state;
}

function persistState(state, { silent = false, skipSync = false, preserveVersion = false } = {}) {
  if (!preserveVersion) {
    state.version = Date.now();
  } else {
    state.version = Number(state.version) || Date.now();
  }
  storageSet(DB_KEY, JSON.stringify(state));
  storageSet(VERSION_KEY, String(state.version));
  stateCache = state;
  lastVersion = state.version;
  if (!skipSync) {
    scheduleSyncUpload();
  }
  if (!silent) {
    notifyAll();
    broadcastSync(state.version);
  }
}

// ----- Sync timers -----
function scheduleSyncUpload(delay = 600) {
  const config = getInternalSyncConfig();
  if (!config.enabled || !config.endpoint || typeof fetch !== 'function') return;
  if (syncUploadTimer) return;
  syncUploadTimer = setTimeout(() => {
    syncUploadTimer = null;
    pushToRemote().catch(() => {});
  }, Math.max(0, delay));
}

function queueRemotePull(initial = false, delay = 0) {
  if (syncPullTimer) {
    clearTimeout(syncPullTimer);
  }
  syncPullTimer = setTimeout(async () => {
    await pullFromRemote({ initial });
    const cfg = getInternalSyncConfig();
    if (cfg.enabled && cfg.endpoint && typeof fetch === 'function') {
      queueRemotePull(false, cfg.pollInterval || 15000);
    }
  }, Math.max(0, delay));
}

function restartSyncTimers() {
  if (syncPullTimer) {
    clearTimeout(syncPullTimer);
    syncPullTimer = null;
  }
  if (syncUploadTimer) {
    clearTimeout(syncUploadTimer);
    syncUploadTimer = null;
  }
  syncPendingUpload = false;
  const config = getInternalSyncConfig();
  if (!config.enabled || !config.endpoint || typeof fetch !== 'function') {
    syncServiceStarted = false;
    return;
  }
  syncServiceStarted = true;
  queueRemotePull(true, 200);
}

// ----- Push/Pull -----
async function pushToRemote({ manual = false } = {}) {
  const config = getInternalSyncConfig();
  if (!config.enabled || !config.endpoint || typeof fetch !== 'function') return false;
  if (syncPushInFlight) {
    if (manual) throw new Error('Đang có phiên đồng bộ khác đang xử lý.');
    syncPendingUpload = true;
    return false;
  }
  syncPushInFlight = true;
  syncPendingUpload = false;
  syncStatus.lastError = '';
  emitSyncStatus();
  try {
    const payload = clone(loadState());
    const response = await fetch(config.endpoint, {
      method: config.method || 'PUT',
      headers: buildSyncHeaders(config, true),
      body: JSON.stringify(payload),
      cache: 'no-store'
    });
    if (!response.ok) throw new Error(`Máy chủ trả về mã ${response.status}`);
    syncStatus.lastPush = Date.now();
    emitSyncStatus();
    return true;
  } catch (err) {
    syncStatus.lastError = err.message || 'Không thể đẩy dữ liệu.';
    emitSyncStatus();
    if (manual) throw err;
    console.warn('Không thể đồng bộ lên máy chủ', err);
    return false;
  } finally {
    syncPushInFlight = false;
    if (syncPendingUpload) {
      syncPendingUpload = false;
      scheduleSyncUpload(800);
    }
  }
}

async function pullFromRemote({ initial = false, manual = false } = {}) {
  const config = getInternalSyncConfig();
  if (!config.enabled || !config.endpoint || typeof fetch !== 'function') return false;
  if (syncPullInFlight) {
    if (manual) throw new Error('Đang tải dữ liệu mới từ máy chủ.');
    return false;
  }
  syncPullInFlight = true;
  syncStatus.lastError = '';
  emitSyncStatus();
  try {
    const response = await fetch(config.endpoint, {
      method: 'GET',
      headers: buildSyncHeaders(config, false),
      cache: 'no-store'
    });
    if (response.status === 404) {
      if (initial) scheduleSyncUpload(300);
      return false;
    }
    if (!response.ok) throw new Error(`Máy chủ trả về mã ${response.status}`);
    const text = await response.text();
    if (!text) {
      if (initial) scheduleSyncUpload(300);
      return false;
    }
    const remote = JSON.parse(text);
    if (remote && typeof remote === 'object') {
      const normalized = normalizeRemoteState(remote);
      const remoteVersion = Number(normalized.version) || 0;
      if (!lastVersion || remoteVersion > lastVersion) {
        persistState(normalized, { silent: true, skipSync: true, preserveVersion: true });
        stateCache = normalized;
        lastVersion = remoteVersion;
        notifyAll();
        broadcastSync(remoteVersion);
      }
      syncStatus.lastPull = Date.now();
      emitSyncStatus();
      return true;
    }
  } catch (err) {
    syncStatus.lastError = err.message || 'Không thể tải dữ liệu.';
    emitSyncStatus();
    if (manual) throw err;
    console.warn('Không thể đồng bộ từ máy chủ', err);
  } finally {
    syncPullInFlight = false;
  }
  return false;
}

function normalizeRemoteState(remote) {
  const base = buildDefaultState();
  const normalized = {
    ...base,
    ...remote,
    collections: {
      ...base.collections,
      ...(remote.collections || {})
    },
    branding: {
      ...base.branding,
      ...(remote.branding || {})
    }
  };
  if (!Array.isArray(normalized.users)) normalized.users = base.users;
  if (!Array.isArray(normalized.staff)) normalized.staff = base.staff;
  return normalized;
}

function buildSyncHeaders(config, isWrite) {
  const headers = {};
  if (isWrite) headers['Content-Type'] = 'application/json';
  const scheme = (config.authScheme || 'Bearer').trim();
  if (config.apiKey) {
    if (scheme === 'Api-Key') {
      headers['X-API-Key'] = config.apiKey;
    } else if (scheme && scheme !== 'None') {
      headers['Authorization'] = `${scheme} ${config.apiKey}`.trim();
    }
  }
  normalizeHeaders(config.headers).forEach(item => {
    headers[item.key] = item.value;
  });
  return headers;
}

function startSyncService() {
  if (syncServiceStarted) return;
  syncServiceStarted = true;
  restartSyncTimers();
}

// ----- Migration legacy -----
function migrateLegacyData(target) {
  let migrated = false;
  Object.entries(LEGACY_KEYS).forEach(([name, key]) => {
    const raw = storageGet(key);
    if (raw) {
      try {
        const data = JSON.parse(raw);
        if (Array.isArray(data)) {
          target.collections[name] = data;
          migrated = true;
        } else if (name === 'layout' && Array.isArray(data)) {
          target.collections.layout = data;
          migrated = true;
        }
      } catch (err) {
        console.warn('Không thể migrate bộ sưu tập', name, err);
      }
    }
  });
  const rawUsers = storageGet(LEGACY_USERS_KEY);
  if (rawUsers) {
    try {
      const users = JSON.parse(rawUsers);
      if (Array.isArray(users) && users.length) {
        target.users = users;
        migrated = true;
      }
    } catch (err) {
      console.warn('Không thể migrate người dùng', err);
    }
  }
  const rawBranding = storageGet(LEGACY_BRANDING_KEY);
  if (rawBranding) {
    try {
      const branding = JSON.parse(rawBranding);
      target.branding = { ...DEFAULT_BRANDING, ...branding };
      migrated = true;
    } catch (err) {
      console.warn('Không thể migrate branding', err);
    }
  }
  if (migrated) {
    Object.values(LEGACY_KEYS).forEach(key => storageRemove(key));
    storageRemove(LEGACY_USERS_KEY);
    storageRemove(LEGACY_BRANDING_KEY);
  }
}

// ----- Pub/Sub & cross-tab notify -----
function notifyAll() {
  loadState();
  subscribers.forEach((handlers, name) => {
    const data = readCollection(name);
    handlers.forEach(fn => fn(data));
  });
}

function handleExternalChange(versionCandidate) {
  let numeric = Number(versionCandidate || 0);
  if (!numeric) {
    try {
      numeric = Number(storageGet(VERSION_KEY) || '0');
    } catch (err) {
      numeric = 0;
    }
  }
  if (!numeric || numeric === lastVersion) return;
  lastVersion = numeric;
  stateCache = null;
  notifyAll();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('klc:userlist-updated', { detail: { users: getUsers() } }));
  }
}

function broadcastSync(version) {
  try {
    syncChannel?.postMessage({ type: 'sync', version });
  } catch (err) {
    console.warn('Không thể phát thông điệp đồng bộ', err);
  }
}

// ======= API chính cho các module =======
export function subscribeCollection(name, handler) {
  if (!subscribers.has(name)) {
    subscribers.set(name, new Set());
  }
  subscribers.get(name).add(handler);
  return () => subscribers.get(name)?.delete(handler);
}

export function seedIfEmpty() {
  loadState();
}

export function readCollection(name) {
  const state = loadState();
  const collection = state.collections?.[name];
  if (collection === undefined) throw new Error('Unknown collection');
  return clone(collection) || [];
}

export function saveCollection(name, data) {
  const state = loadState();
  if (!state.collections[name]) {
    state.collections[name] = [];
  }
  state.collections[name] = clone(data) || [];
  persistState(state);
}

export function appendItem(name, item) {
  const data = readCollection(name);
  data.unshift(item);
  saveCollection(name, data);
  return item;
}

export function updateItem(name, id, updater) {
  const data = readCollection(name);
  const index = data.findIndex(item => item.id === id);
  if (index === -1) return null;
  data[index] = updater({ ...data[index] });
  saveCollection(name, data);
  return data[index];
}

export function removeItem(name, id) {
  const data = readCollection(name);
  const filtered = data.filter(item => item.id !== id);
  saveCollection(name, filtered);
  return filtered.length !== data.length;
}

export function generateId(prefix = 'item') {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

// ======= Users & Branding =======
export function getUsers() {
  const state = loadState();
  return clone(state.users) || [];
}

export function saveUsers(users) {
  const state = loadState();
  state.users = clone(users) || [];
  persistState(state);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('klc:userlist-updated', { detail: { users: getUsers() } }));
  }
}

export function removeUser(username) {
  const users = getUsers().filter(user => user.username !== username);
  saveUsers(users);
}

export function getBranding() {
  const state = loadState();
  return { ...DEFAULT_BRANDING, ...clone(state.branding) };
}

export function saveBranding(config) {
  const state = loadState();
  state.branding = { ...DEFAULT_BRANDING, ...clone(config) };
  persistState(state);
}

export function applyBrandingTheme() {
  const branding = getBranding();
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--brand-blue', branding.accent || DEFAULT_BRANDING.accent);
  }
  return branding;
}

// ======= Staff =======
export function getStaff() {
  const state = loadState();
  return Array.from(new Set([...(state.staff || []), ...DEFAULT_STAFF])).filter(Boolean);
}

export function saveStaff(list) {
  const state = loadState();
  state.staff = Array.from(new Set(list.filter(Boolean)));
  persistState(state);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('klc:staff-updated', { detail: { staff: getStaff() } }));
  }
}

// ======= Sync public API =======
export function getSyncConfig() {
  const config = getInternalSyncConfig();
  return { ...config, headers: cloneHeaders(config.headers) };
}

export function saveSyncConfig(config) {
  const endpoint = (config.endpoint || '').trim() || DEFAULT_SYNC_ENDPOINT;
  syncConfig = {
    ...DEFAULT_SYNC_CONFIG,
    ...config,
    endpoint,
    headers: normalizeHeaders(config.headers)
  };
  saveSyncConfigToStorage();
  updateSyncEnabledFlag();
  restartSyncTimers();
  return getSyncConfig();
}

export function getSyncStatus() {
  return { ...syncStatus };
}

export async function testSyncConnection() {
  const config = getInternalSyncConfig();
  if (!config.enabled || !config.endpoint) throw new Error('Chưa bật đồng bộ hoặc chưa nhập địa chỉ máy chủ.');
  if (typeof fetch !== 'function') throw new Error('Trình duyệt hiện tại không hỗ trợ đồng bộ từ xa.');
  try {
    const response = await fetch(config.endpoint, {
      method: 'GET',
      headers: buildSyncHeaders(config, false),
      cache: 'no-store'
    });
    if (response.status === 404) return true;
    if (!response.ok) throw new Error(`Máy chủ trả về mã ${response.status}`);
    return true;
  } catch (err) {
    throw new Error(err.message || 'Không thể kết nối máy chủ đồng bộ.');
  }
}

export async function triggerSyncNow(mode = 'both') {
  const config = getInternalSyncConfig();
  if (!config.enabled || !config.endpoint) throw new Error('Đồng bộ chưa được bật.');
  if (mode === 'pull' || mode === 'both') {
    await pullFromRemote({ manual: true });
  }
  if (mode === 'push' || mode === 'both') {
    await pushToRemote({ manual: true });
  }
  return getSyncStatus();
}

// ======= Layout helpers =======
export function getDefaultLayout() {
  return cloneLayout(DEFAULT_LAYOUT);
}

export function getLayoutConfig() {
  const state = loadState();
  const stored = state.collections.layout;
  const source = Array.isArray(stored) && stored.length ? stored : DEFAULT_LAYOUT;
  return cloneLayout(source);
}

export function saveLayoutConfig(layout) {
  const state = loadState();
  state.collections.layout = normalizeLayout(layout);
  persistState(state);
}

function normalizeLayout(layout) {
  return layout
    .filter(item => item && item.type)
    .map(item => {
      const normalized = {
        id: item.id || generateId('layout'),
        type: item.type,
        title: item.title || ''
      };
      if (item.content) normalized.content = item.content;
      if (Array.isArray(item.links)) {
        const links = item.links
          .filter(link => link && (link.label || link.href))
          .map(link => ({
            label: (link.label || '').trim(),
            href: (link.href || '').trim()
          }));
        if (links.length) normalized.links = links;
      }
      if (item.image) normalized.image = item.image;
      if (item.caption) normalized.caption = item.caption;
      if (item.html) normalized.html = item.html;
      return normalized;
    });
}
