// Auth: login, session, guard, roles
async function login(username, password, remember=false) {
  showLoading('Đang đăng nhập…');
  let data = load();
  let user = data.users.find(u => u.username === username && u.active);
  if (!user) { hideLoading(); toast('Tài khoản không tồn tại!', 'error'); return false; }
  let passHash = await sha256(password);
  if (user.passHash !== passHash && user.passHash !== password) { // seed demo: hash hoặc plain
    hideLoading(); toast('Sai mật khẩu!', 'error'); return false;
  }
  data.session = {
    userId: user.id,
    role: user.role,
    remember,
    deviceId: makeId('dev'),
    expiresAt: remember ? Date.now() + 1000*60*60*24*30 : Date.now() + 1000*60*30
  };
  save(data);
  hideLoading();
  toast('Đăng nhập thành công!', 'success');
  return true;
}
function logout() {
  let data = load();
  data.session = null;
  save(data);
  window.location.href = 'index.html';
}
function currentUser() {
  let data = load();
  if (!data.session) return null;
  if (Date.now() > data.session.expiresAt) { data.session = null; save(data); return null; }
  let user = data.users.find(u => u.id === data.session.userId);
  return user ? { ...user, role: data.session.role } : null;
}
function guard(role=null) {
  let user = currentUser();
  if (!user) window.location.href = 'index.html';
  if (role && user.role !== role) window.location.href = 'dashboard.html';
  document.querySelectorAll('[data-role="adminOnly"]').forEach(el => {
    if (user.role !== 'admin') el.style.display = 'none';
  });
}