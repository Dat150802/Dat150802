import { toast } from './ui.js';
import { getUsers } from './storage.js';

const SESSION_KEY = 'klc_session';
const SESSION_EXP_KEY = 'klc_session_exp';
const SESSION_DURATION = 1000 * 60 * 60 * 24 * 30; // 30 days

// ===== Storage helpers với fallback (localStorage/sessionStorage -> cookie -> memory) =====
const nativeLocalStorage = (typeof window !== 'undefined' && window.localStorage) ? window.localStorage : null;
const nativeSessionStorage = (typeof window !== 'undefined' && window.sessionStorage) ? window.sessionStorage : null;
const memoryLocal = new Map();
const memorySession = new Map();

function cookieSet(key, value, { days = null } = {}) {
  if (typeof document === 'undefined') return false;
  try {
    let cookie = `${encodeURIComponent(key)}=${encodeURIComponent(value || '')}; path=/`;
    if (days !== null) {
      const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      cookie += `; expires=${expires.toUTCString()}`;
    }
    document.cookie = cookie;
    return true;
  } catch (err) {
    console.warn('Không thể lưu cookie', err);
    return false;
  }
}

function cookieGet(key) {
  if (typeof document === 'undefined') return null;
  const target = encodeURIComponent(key);
  const parts = document.cookie ? document.cookie.split('; ') : [];
  for (const part of parts) {
    const [name, ...rest] = part.split('=');
    if (name === target) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return null;
}

function cookieRemove(key) {
  if (typeof document === 'undefined') return;
  document.cookie = `${encodeURIComponent(key)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

function localSet(key, value) {
  if (nativeLocalStorage) {
    try {
      nativeLocalStorage.setItem(key, value);
      memoryLocal.delete(key);
      return true;
    } catch (err) {
      console.warn('Không thể ghi localStorage', err);
    }
  }
  const cookiePersisted = cookieSet(key, value, { days: 120 });
  if (cookiePersisted) return true;
  memoryLocal.set(key, value);
  return false;
}

function localGet(key) {
  if (nativeLocalStorage) {
    try {
      const value = nativeLocalStorage.getItem(key);
      if (value !== null && value !== undefined) return value;
    } catch (err) {
      console.warn('Không thể đọc localStorage', err);
    }
  }
  const cookieValue = cookieGet(key);
  if (cookieValue !== null && cookieValue !== undefined) return cookieValue;
  return memoryLocal.has(key) ? memoryLocal.get(key) : null;
}

function localRemove(key) {
  if (nativeLocalStorage) {
    try { nativeLocalStorage.removeItem(key); } catch (err) {
      console.warn('Không thể xóa localStorage', err);
    }
  }
  cookieRemove(key);
  memoryLocal.delete(key);
}

function sessionSet(key, value) {
  if (nativeSessionStorage) {
    try {
      nativeSessionStorage.setItem(key, value);
      memorySession.delete(key);
      return true;
    } catch (err) {
      console.warn('Không thể ghi sessionStorage', err);
    }
  }
  if (cookieSet(key, value)) return true;
  memorySession.set(key, value);
  return false;
}

function sessionGet(key) {
  if (nativeSessionStorage) {
    try {
      const value = nativeSessionStorage.getItem(key);
      if (value !== null && value !== undefined) return value;
    } catch (err) {
      console.warn('Không thể đọc sessionStorage', err);
    }
  }
  const cookieValue = cookieGet(key);
  if (cookieValue !== null && cookieValue !== undefined) return cookieValue;
  return memorySession.has(key) ? memorySession.get(key) : null;
}

function sessionRemove(key) {
  if (nativeSessionStorage) {
    try { nativeSessionStorage.removeItem(key); } catch (err) {
      console.warn('Không thể xóa sessionStorage', err);
    }
  }
  cookieRemove(key);
  memorySession.delete(key);
}
// ===== End helpers =====

export function login(username, password, remember) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const users = getUsers();
      const user = users.find(u => u.username === username);
      if (!user || user.password !== password) {
        reject(new Error('Sai tài khoản hoặc mật khẩu.'));
        return;
      }
      const payload = { username: user.username, role: user.role, name: user.name, loginAt: Date.now() };

      const sessionPersisted = sessionSet(SESSION_KEY, JSON.stringify(payload));
      if (!sessionPersisted) {
        toast('Trình duyệt đang chặn lưu phiên, có thể bị đăng xuất khi đóng tab.', 'warning');
      }

      if (remember) {
        const persisted = localSet(SESSION_KEY, JSON.stringify(payload));
        localSet(SESSION_EXP_KEY, String(Date.now() + SESSION_DURATION));
        if (!persisted) {
          toast('Thiết bị không hỗ trợ lưu đăng nhập lâu dài; phiên chỉ tồn tại trong trình duyệt hiện tại.', 'warning');
        }
      } else {
        localRemove(SESSION_KEY);
        localRemove(SESSION_EXP_KEY);
      }

      resolve(payload);
    }, 400);
  });
}

export function getCurrentUser() {
  const session = sessionGet(SESSION_KEY);
  if (session) return JSON.parse(session);

  const exp = localGet(SESSION_EXP_KEY);
  if (exp && Date.now() > Number(exp)) {
    localRemove(SESSION_KEY);
    localRemove(SESSION_EXP_KEY);
    return null;
  }
  const stored = localGet(SESSION_KEY);
  return stored ? JSON.parse(stored) : null;
}

export function requireAuth() {
  const user = getCurrentUser();
  if (!user) {
    toast('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.', 'error');
    setTimeout(() => location.href = 'index.html', 600);
    throw new Error('Unauthenticated');
  }
  return user;
}

export function logout() {
  sessionRemove(SESSION_KEY);
  localRemove(SESSION_KEY);
  localRemove(SESSION_EXP_KEY);
  toast('Bạn đã đăng xuất khỏi hệ thống.', 'info');
  setTimeout(() => location.href = 'index.html', 300);
}

export function ensurePermission(user, action) {
  if (user.role === 'admin') return true;
  if (action === 'read' || action === 'write') return true;
  if (action === 'delete') {
    toast('Nhân viên không thể xóa trực tiếp – vui lòng gửi yêu cầu duyệt cho quản trị viên.', 'error');
    return false;
  }
  if (action === 'system') {
    toast('Bạn không có quyền truy cập khu vực thiết lập hệ thống.', 'error');
    return false;
  }
  toast('Bạn không có quyền thực hiện thao tác này.', 'error');
  return false;
}
