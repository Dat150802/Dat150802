// Core authentication module
import storage from './storage.js';

const auth = {
  async hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  async login(username, password, remember = false) {
    const data = storage.load();
    const hashedPassword = await this.hashPassword(password);
    
    const user = data.users.find(u => 
      u.username === username && 
      u.passHash === hashedPassword
    );

    if (!user) {
      throw new Error('Tên đăng nhập hoặc mật khẩu không đúng');
    }

    const session = {
      id: crypto.randomUUID(),
      userId: user.id,
      role: user.role,
      deviceId: navigator.userAgent,
      remember,
      expiresAt: remember ? 
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : 
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };

    data.sessions.push(session);
    storage.save(data);
    
    localStorage.setItem('currentSession', session.id);
    
    return {
      user,
      session
    };
  },

  getCurrentSession() {
    const sessionId = localStorage.getItem('currentSession');
    if (!sessionId) return null;

    const data = storage.load();
    const session = data.sessions.find(s => s.id === sessionId);
    
    if (!session) return null;

    // Check expiration
    if (new Date(session.expiresAt) < new Date()) {
      this.logout();
      return null;
    }

    const user = data.users.find(u => u.id === session.userId);
    return { user, session };
  },

  logout() {
    const sessionId = localStorage.getItem('currentSession');
    if (sessionId) {
      const data = storage.load();
      data.sessions = data.sessions.filter(s => s.id !== sessionId);
      storage.save(data);
      localStorage.removeItem('currentSession');
    }
    window.location.href = '/index.html';
  },

  requireAuth() {
    const session = this.getCurrentSession();
    if (!session) {
      window.location.href = '/index.html?redirect=' + encodeURIComponent(window.location.pathname);
      return false;
    }
    return true;
  },

  requireRole(role) {
    const session = this.getCurrentSession();
    if (!session || (role && session.user.role !== role)) {
      window.location.href = '/index.html';
      return false;
    }
    return true;
  }
};

export default auth;