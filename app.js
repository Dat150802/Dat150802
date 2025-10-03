const STORAGE_KEY = 'klc-ben-luc-data-v1';
const REMEMBER_KEY = 'klc-ben-luc-remember';
const SESSION_KEY = 'klc-ben-luc-session';

const defaultState = () => ({
  siteName: 'KLC Bến Lức',
  primaryColor: '#0d7474',
  logo: null,
  users: [
    { username: 'admin', password: '123456', role: 'admin', fullName: 'Quản trị viên' },
    { username: 'nhanvien', password: '1234', role: 'employee', fullName: 'Nhân viên kinh doanh' }
  ],
  customers: [],
  care: [],
  warranties: [],
  maintenances: [],
  tasks: {
    templates: [],
    reports: []
  },
  inventory: [],
  finance: [],
  approvals: []
});

let state = loadState();
let currentUser = loadSession();
let charts = {};

const elements = {
  pages: document.querySelectorAll('.page'),
  navLinks: document.querySelectorAll('.nav-link'),
  loader: document.getElementById('loader'),
  loaderMessage: document.getElementById('loader-message'),
  loginCard: document.getElementById('login'),
  roleLabel: document.getElementById('role-label'),
  sidebar: document.getElementById('sidebar'),
  logoutBtn: document.getElementById('logout-btn'),
  brandLogo: document.getElementById('brand-logo'),
  dashboardWidgets: document.getElementById('dashboard-widgets')
};

init();

function init() {
  applyBranding();
  attachEventListeners();
  toggleSourceDetail.call(document.getElementById('customer-source'));
  if (currentUser) {
    bootApp();
  } else {
    showLogin();
    loadRemembered();
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return { ...defaultState(), ...JSON.parse(raw) };
  } catch (error) {
    console.error('Không thể tải dữ liệu, khởi tạo mặc định', error);
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function saveSession(user, persist = false) {
  currentUser = user;
  if (persist) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

function clearSession() {
  currentUser = null;
  localStorage.removeItem(SESSION_KEY);
}

function attachEventListeners() {
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  elements.logoutBtn.addEventListener('click', () => {
    withLoading('Đang đăng xuất...', () => {
      clearSession();
      showLogin();
    });
  });

  elements.navLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (!currentUser) return;
      elements.navLinks.forEach(btn => btn.classList.remove('active'));
      link.classList.add('active');
      showPage(link.dataset.target);
    });
  });

  document.getElementById('customer-form').addEventListener('submit', handleCustomerSubmit);
  document.getElementById('customer-reset').addEventListener('click', () => showToast('Đã xóa thông tin trong form khách hàng'));
  document.getElementById('customer-source').addEventListener('change', toggleSourceDetail);
  document.getElementById('has-purchased').addEventListener('change', togglePurchase);
  document.getElementById('customer-search').addEventListener('input', renderCustomers);
  document.getElementById('open-care-from-customer').addEventListener('click', openCareFromCustomer);
  document.getElementById('open-history').addEventListener('click', openCustomerHistory);

  document.getElementById('care-form').addEventListener('submit', handleCareSubmit);
  document.getElementById('care-reset').addEventListener('click', () => showToast('Đã xóa form CSKH'));
  document.getElementById('care-search').addEventListener('input', renderCare);
  document.getElementById('lost-reason').addEventListener('input', () => {});
  document.getElementById('care-form').addEventListener('change', evt => {
    if (evt.target.name === 'rating') {
      document.getElementById('lost-reason').classList.toggle('hidden', evt.target.value !== 'lost');
      document.getElementById('schedule-panel').classList.toggle('hidden', evt.target.value !== 'scheduled');
    }
  });

  document.querySelectorAll('#service .sub-tab').forEach(tab => tab.addEventListener('click', () => switchSubTab(tab)));
  document.getElementById('warranty-form').addEventListener('submit', evt => handleServiceSubmit(evt, 'warranty'));
  document.getElementById('maintenance-form').addEventListener('submit', evt => handleServiceSubmit(evt, 'maintenance'));
  document.getElementById('warranty-search').addEventListener('input', renderWarranties);
  document.getElementById('maintenance-search').addEventListener('input', renderMaintenances);
  document.getElementById('service-filter').addEventListener('change', renderMaintenances);

  document.querySelectorAll('#checklist .sub-tab').forEach(tab => tab.addEventListener('click', () => switchSubTab(tab)));
  document.getElementById('task-template').addEventListener('submit', handleTaskTemplateSubmit);
  document.getElementById('task-report').addEventListener('submit', handleTaskReportSubmit);
  document.getElementById('task-template-search').addEventListener('input', renderTaskTemplates);
  document.getElementById('task-report-search').addEventListener('input', renderTaskReports);

  document.getElementById('inventory-form').addEventListener('submit', handleInventorySubmit);
  document.getElementById('inventory-search').addEventListener('input', renderInventory);
  document.getElementById('inventory-filter').addEventListener('change', renderInventory);

  document.getElementById('finance-form').addEventListener('submit', handleFinanceSubmit);
  document.getElementById('finance-month').addEventListener('change', renderFinanceSummary);
  document.getElementById('finance-export').addEventListener('click', exportFinance);

  document.getElementById('branding-form').addEventListener('submit', handleBrandingSubmit);
  document.getElementById('branding-reset').addEventListener('click', resetBranding);
  document.getElementById('staff-form').addEventListener('submit', handleStaffSubmit);
  document.getElementById('clear-approvals').addEventListener('click', clearApprovals);
  document.getElementById('toggle-layout-edit').addEventListener('click', toggleLayoutEdit);

  document.addEventListener('click', evt => {
    if (evt.target.matches('[data-close]')) {
      const modal = evt.target.closest('.modal');
      modal?.remove();
    }
  });
}

function bootApp() {
  elements.loginCard.style.display = 'none';
  elements.sidebar.style.display = 'flex';
  document.body.classList.remove('auth-only');
  elements.roleLabel.textContent = `${currentUser.fullName} (${currentUser.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'})`;
  filterNavByRole();
  refreshAll();
  showPage('dashboard');
}

function showLogin() {
  elements.loginCard.style.display = 'block';
  elements.sidebar.style.display = 'none';
  elements.pages.forEach(page => page.classList.remove('active'));
  elements.navLinks.forEach(link => link.classList.remove('active'));
  document.getElementById('login-username').focus();
}

function filterNavByRole() {
  const settingsLink = [...elements.navLinks].find(link => link.dataset.target === 'settings');
  if (!settingsLink) return;
  if (currentUser.role !== 'admin') {
    settingsLink.style.display = 'none';
  } else {
    settingsLink.style.display = 'block';
  }
}

function showPage(id) {
  if (id === 'settings' && currentUser?.role !== 'admin') {
    showToast('Bạn không có quyền truy cập mục này', true);
    return;
  }
  elements.pages.forEach(page => page.classList.toggle('active', page.id === id));
}

function handleLogin(evt) {
  evt.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();
  const remember = document.getElementById('remember-me').checked;
  const staySigned = document.getElementById('stay-signed').checked;
  const user = state.users.find(u => u.username === username && u.password === password);
  withLoading('Đang kiểm tra tài khoản...', () => {
    if (!user) {
      showToast('Sai tài khoản hoặc mật khẩu', true);
      return;
    }
    if (remember) {
      localStorage.setItem(REMEMBER_KEY, JSON.stringify({ username, password }));
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }
    saveSession(user, staySigned);
    bootApp();
    showToast(`Xin chào ${user.fullName}!`);
  });
}

function loadRemembered() {
  try {
    const raw = localStorage.getItem(REMEMBER_KEY);
    if (!raw) return;
    const { username, password } = JSON.parse(raw);
    document.getElementById('login-username').value = username;
    document.getElementById('login-password').value = password;
    document.getElementById('remember-me').checked = true;
  } catch (error) {
    console.warn('Không đọc được thông tin ghi nhớ đăng nhập');
  }
}

function withLoading(message, fn) {
  elements.loaderMessage.textContent = message;
  elements.loader.classList.remove('hidden');
  setTimeout(async () => {
    try {
      const result = fn();
      if (result instanceof Promise) {
        await result;
      }
    } finally {
      elements.loader.classList.add('hidden');
    }
  }, 200);
}

function showToast(message, isError = false) {
  const toast = document.createElement('div');
  toast.className = `toast ${isError ? 'error' : 'success'}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('visible'));
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

function toggleSourceDetail() {
  const value = this.value;
  const wrapper = document.getElementById('source-detail-wrapper');
  wrapper.classList.toggle('hidden', !['online', 'referral', 'returning', 'staff', 'other'].includes(value));
  const label = {
    online: 'Nguồn bài viết / chiến dịch',
    referral: 'Tên khách hàng giới thiệu',
    returning: 'Khách cũ',
    staff: 'Tên nhân viên giới thiệu',
    other: 'Nguồn khác'
  }[value];
  wrapper.querySelector('span').textContent = label ?? 'Chi tiết nguồn khách';
}

function togglePurchase(evt) {
  const checked = evt.target.checked;
  document.getElementById('purchase-info').classList.toggle('hidden', !checked);
  document.getElementById('consult-info').classList.toggle('hidden', checked);
}

function handleCustomerSubmit(evt) {
  evt.preventDefault();
  const form = evt.target;
  withLoading('Đang lưu khách hàng...', () => {
    const data = Object.fromEntries(new FormData(form));
    data.id = crypto.randomUUID();
    data.createdBy = currentUser.username;
    data.createdAt = new Date().toISOString();
    data.hasPurchased = !!form.hasPurchased.checked;
    state.customers.push(data);
    saveState();
    form.reset();
    renderCustomers();
    populateCustomerHints();
    updateDashboard();
    showToast('Đã lưu khách hàng');
  });
}

function renderCustomers() {
  const tbody = document.querySelector('#customer-table tbody');
  const query = document.getElementById('customer-search').value.toLowerCase();
  const rows = state.customers
    .filter(c => !query || Object.values(c).some(v => String(v ?? '').toLowerCase().includes(query)))
    .sort((a, b) => new Date(b.date ?? b.createdAt) - new Date(a.date ?? a.createdAt))
    .map(c => {
      const tr = document.createElement('tr');
      tr.dataset.id = c.id;
      tr.innerHTML = `
        <td>${formatDate(c.date)}</td>
        <td>${c.name ?? ''}</td>
        <td>${c.phone ?? ''}</td>
        <td>${renderSource(c)}</td>
        <td>${renderCustomerStatus(c)}</td>
        <td>${c.notes ?? ''}</td>
        <td class="table-buttons">
          <button data-action="history">Lịch sử</button>
          <button data-action="care">CSKH</button>
          <button data-action="delete" class="danger">Xóa</button>
        </td>`;
      tr.addEventListener('click', evt => {
        if (evt.target.tagName === 'BUTTON') return;
        selectRow(tr);
      });
      return tr;
    });
  tbody.replaceChildren(...rows);
  tbody.querySelectorAll('button').forEach(btn => btn.addEventListener('click', handleCustomerAction));
}

function renderSource(customer) {
  const mapping = {
    store: 'Khách ghé ngang',
    online: 'Khách online',
    referral: 'Khách cũ giới thiệu',
    returning: 'Khách cũ mua lại',
    staff: 'Người quen nhân viên',
    other: 'Nguồn khác'
  };
  return [mapping[customer.source] ?? 'Khác', customer.sourceDetail].filter(Boolean).join(' - ');
}

function renderCustomerStatus(customer) {
  if (customer.hasPurchased) {
    return `<span class="badge success">Đã mua</span>`;
  }
  if (customer.consultedItems || customer.pricingOptions) {
    return `<span class="badge warning">Đang tư vấn</span>`;
  }
  return `<span class="badge">Mới</span>`;
}

function handleCustomerAction(evt) {
  const id = evt.target.closest('tr').dataset.id;
  if (evt.target.dataset.action === 'history') {
    openHistoryModal(id);
  }
  if (evt.target.dataset.action === 'care') {
    const customer = state.customers.find(c => c.id === id);
    if (!customer) return;
    showPage('care');
    elements.navLinks.forEach(btn => btn.classList.toggle('active', btn.dataset.target === 'care'));
    fillCareForm(customer);
  }
  if (evt.target.dataset.action === 'delete') {
    requestDelete('customer', id);
  }
}

function handleCareSubmit(evt) {
  evt.preventDefault();
  const form = evt.target;
  withLoading('Đang lưu CSKH...', () => {
    const data = Object.fromEntries(new FormData(form));
    data.id = crypto.randomUUID();
    data.createdAt = new Date().toISOString();
    data.createdBy = currentUser.username;
    if (data.rating !== 'lost') delete data.lostReason;
    if (data.rating !== 'scheduled') {
      delete data.appointmentDate;
      delete data.appointmentTime;
    }
    state.care.push(data);
    saveState();
    form.reset();
    renderCare();
    updateDashboard();
    showToast('Đã lưu chăm sóc khách hàng');
  });
}

function renderCare() {
  const tbody = document.querySelector('#care-table tbody');
  const query = document.getElementById('care-search').value.toLowerCase();
  const rows = state.care
    .filter(item => !query || Object.values(item).some(v => String(v ?? '').toLowerCase().includes(query)))
    .sort((a, b) => new Date(b.date ?? b.createdAt) - new Date(a.date ?? a.createdAt))
    .map(item => {
      const tr = document.createElement('tr');
      tr.dataset.id = item.id;
      tr.innerHTML = `
        <td>${formatDate(item.date)}</td>
        <td>${item.name}</td>
        <td>${item.staff}</td>
        <td>${renderCareMethod(item.method)}</td>
        <td>${renderRating(item)}</td>
        <td>
          <button data-action="details">Chi tiết</button>
          <button data-action="delete" class="danger">Xóa</button>
        </td>`;
      tr.addEventListener('click', evt => {
        if (evt.target.tagName === 'BUTTON') return;
        selectRow(tr);
      });
      return tr;
    });
  tbody.replaceChildren(...rows);
  tbody.querySelectorAll('button').forEach(btn => btn.addEventListener('click', handleCareAction));
}

function renderCareMethod(method) {
  return {
    call: 'Gọi điện',
    sms: 'Nhắn tin',
    broadcast: 'Gửi tin nhắn hàng loạt',
    call_sms: 'Gọi điện + nhắn tin'
  }[method] ?? method;
}

function renderRating(item) {
  const labels = {
    potential: 'Còn tiềm năng',
    nurturing: 'Đang nuôi',
    scheduled: 'Đang hẹn',
    lost: 'Hết tiềm năng'
  };
  const classes = {
    potential: 'success',
    nurturing: 'warning',
    scheduled: 'warning',
    lost: 'danger'
  };
  return `<span class="badge ${classes[item.rating] ?? ''}">${labels[item.rating] ?? 'N/A'}</span>`;
}

function handleCareAction(evt) {
  const id = evt.target.closest('tr').dataset.id;
  if (evt.target.dataset.action === 'details') {
    openCareDetails(id);
  }
  if (evt.target.dataset.action === 'delete') {
    requestDelete('care', id);
  }
}

function switchSubTab(tab) {
  const container = tab.closest('.card');
  container.querySelectorAll('.sub-tab').forEach(btn => btn.classList.remove('active'));
  container.querySelectorAll('.sub-tab-panel').forEach(panel => panel.classList.remove('active'));
  tab.classList.add('active');
  const target = container.querySelector(`#${tab.dataset.target}`);
  target?.classList.add('active');
}

function handleServiceSubmit(evt, type) {
  evt.preventDefault();
  const form = evt.target;
  withLoading('Đang lưu thông tin dịch vụ...', () => {
    const data = Object.fromEntries(new FormData(form));
    data.id = crypto.randomUUID();
    data.type = type;
    data.createdAt = new Date().toISOString();
    data.status = 'pending';
    data.parts = [];
    data.supported = false;
    state[type === 'warranty' ? 'warranties' : 'maintenances'].push(data);
    saveState();
    form.reset();
    renderWarranties();
    renderMaintenances();
    updateDashboard();
    showToast(type === 'warranty' ? 'Đã lưu bảo hành' : 'Đã lưu bảo dưỡng');
  });
}

function renderWarranties() {
  const tbody = document.querySelector('#warranty-table tbody');
  const query = document.getElementById('warranty-search').value.toLowerCase();
  const rows = state.warranties
    .filter(item => !query || Object.values(item).some(v => String(v ?? '').toLowerCase().includes(query)))
    .sort((a, b) => new Date(b.date ?? b.createdAt) - new Date(a.date ?? a.createdAt))
    .map(item => {
      const tr = document.createElement('tr');
      tr.dataset.id = item.id;
      tr.innerHTML = `
        <td>${formatDate(item.date)}</td>
        <td>${item.name}</td>
        <td>${item.model ?? ''}</td>
        <td>${item.status ?? ''}</td>
        <td>${renderServiceStatus(item)}</td>
        <td>
          <button data-action="update">Cập nhật</button>
          <button data-action="delete" class="danger">Xóa</button>
        </td>`;
      return tr;
    });
  tbody.replaceChildren(...rows);
  tbody.querySelectorAll('button').forEach(btn => btn.addEventListener('click', handleServiceAction));
}

function renderMaintenances() {
  const tbody = document.querySelector('#maintenance-table tbody');
  const query = document.getElementById('maintenance-search').value.toLowerCase();
  const filter = document.getElementById('service-filter').value;
  const rows = state.maintenances
    .filter(item => !query || Object.values(item).some(v => String(v ?? '').toLowerCase().includes(query)))
    .filter(item => filter === 'all' ||
      (filter === 'pending' && !item.supported) ||
      (filter === 'supported' && item.supported) ||
      (filter === 'shipped' && item.parts?.length))
    .sort((a, b) => new Date(b.date ?? b.createdAt) - new Date(a.date ?? a.createdAt))
    .map(item => {
      const tr = document.createElement('tr');
      tr.dataset.id = item.id;
      tr.innerHTML = `
        <td>${formatDate(item.date)}</td>
        <td>${item.name}</td>
        <td>${item.model ?? ''}</td>
        <td>${item.request ?? ''}</td>
        <td>${renderServiceStatus(item)}</td>
        <td>
          <button data-action="update">Cập nhật</button>
          <button data-action="delete" class="danger">Xóa</button>
        </td>`;
      return tr;
    });
  tbody.replaceChildren(...rows);
  tbody.querySelectorAll('button').forEach(btn => btn.addEventListener('click', handleServiceAction));
}

function renderServiceStatus(item) {
  const chips = [];
  chips.push(`<span class="chip">${item.supported ? 'Đã hỗ trợ' : 'Chưa hỗ trợ'}</span>`);
  if (item.parts?.length) {
    const latest = item.parts[item.parts.length - 1];
    chips.push(`<span class="chip">Gửi linh kiện: ${formatDate(latest.date)} - ${latest.detail}</span>`);
  }
  return chips.join('<br/>');
}

function handleServiceAction(evt) {
  const id = evt.target.closest('tr').dataset.id;
  const type = evt.target.closest('table').id.includes('warranty') ? 'warranty' : 'maintenance';
  if (evt.target.dataset.action === 'delete') {
    requestDelete(type, id);
  }
  if (evt.target.dataset.action === 'update') {
    openServiceModal(type, id);
  }
}

function handleTaskTemplateSubmit(evt) {
  evt.preventDefault();
  withLoading('Đang lưu hạng mục...', () => {
    const data = Object.fromEntries(new FormData(evt.target));
    data.id = crypto.randomUUID();
    data.tasks = data.tasks.split('\n').map(t => t.trim()).filter(Boolean);
    data.createdAt = new Date().toISOString();
    state.tasks.templates.push(data);
    saveState();
    evt.target.reset();
    renderTaskTemplates();
    showToast('Đã lưu hạng mục công việc');
  });
}

function handleTaskReportSubmit(evt) {
  evt.preventDefault();
  withLoading('Đang lưu báo cáo...', () => {
    const data = Object.fromEntries(new FormData(evt.target));
    data.id = crypto.randomUUID();
    data.createdAt = new Date().toISOString();
    state.tasks.reports.push(data);
    saveState();
    evt.target.reset();
    renderTaskReports();
    showToast('Đã lưu báo cáo công việc');
  });
}

function renderTaskTemplates() {
  const tbody = document.querySelector('#task-template-table tbody');
  const query = document.getElementById('task-template-search').value.toLowerCase();
  const rows = state.tasks.templates
    .filter(item => !query || Object.values(item).some(v => String(v ?? '').toLowerCase().includes(query)))
    .sort((a, b) => new Date(b.date ?? b.createdAt) - new Date(a.date ?? a.createdAt))
    .map(item => {
      const tr = document.createElement('tr');
      tr.dataset.id = item.id;
      tr.innerHTML = `
        <td>${formatDate(item.date)}</td>
        <td>${item.staff}</td>
        <td>${renderShift(item.shift)}</td>
        <td>${item.tasks.length}</td>
        <td>
          <button data-action="view">Xem</button>
          <button data-action="delete" class="danger">Xóa</button>
        </td>`;
      return tr;
    });
  tbody.replaceChildren(...rows);
  tbody.querySelectorAll('button').forEach(btn => btn.addEventListener('click', handleTaskTemplateAction));
}

function renderTaskReports() {
  const tbody = document.querySelector('#task-report-table tbody');
  const query = document.getElementById('task-report-search').value.toLowerCase();
  const rows = state.tasks.reports
    .filter(item => !query || Object.values(item).some(v => String(v ?? '').toLowerCase().includes(query)))
    .sort((a, b) => new Date(b.date ?? b.createdAt) - new Date(a.date ?? a.createdAt))
    .map(item => {
      const tr = document.createElement('tr');
      tr.dataset.id = item.id;
      tr.innerHTML = `
        <td>${formatDate(item.date)}</td>
        <td>${item.staff}</td>
        <td>${renderShift(item.shift)}</td>
        <td>${renderTaskStatus(item.status)}</td>
        <td>
          <button data-action="view">Xem</button>
          <button data-action="delete" class="danger">Xóa</button>
        </td>`;
      return tr;
    });
  tbody.replaceChildren(...rows);
  tbody.querySelectorAll('button').forEach(btn => btn.addEventListener('click', handleTaskReportAction));
}

function handleTaskTemplateAction(evt) {
  const id = evt.target.closest('tr').dataset.id;
  if (evt.target.dataset.action === 'view') {
    const template = state.tasks.templates.find(t => t.id === id);
    if (!template) return;
    const relatedReports = state.tasks.reports.filter(r => r.staff === template.staff && r.date === template.date && r.shift === template.shift);
    openInfoModal('Chi tiết hạng mục', renderTaskTemplateDetail(template, relatedReports));
  }
  if (evt.target.dataset.action === 'delete') {
    requestDelete('taskTemplate', id);
  }
}

function handleTaskReportAction(evt) {
  const id = evt.target.closest('tr').dataset.id;
  if (evt.target.dataset.action === 'view') {
    const report = state.tasks.reports.find(t => t.id === id);
    if (!report) return;
    const template = state.tasks.templates.find(t => t.staff === report.staff && t.date === report.date && t.shift === report.shift);
    openInfoModal('Báo cáo công việc', renderTaskReportDetail(report, template));
  }
  if (evt.target.dataset.action === 'delete') {
    requestDelete('taskReport', id);
  }
}

function renderTaskTemplateDetail(template, reports) {
  const tasks = template.tasks.map(task => `<li>${task}</li>`).join('');
  const reportList = reports.map(r => `<li>${formatDate(r.date)} - ${renderShift(r.shift)}: ${renderTaskStatus(r.status)}</li>`).join('') || '<li>Chưa có báo cáo</li>';
  return `
    <p><strong>Ngày:</strong> ${formatDate(template.date)}</p>
    <p><strong>Nhân viên:</strong> ${template.staff}</p>
    <p><strong>Ca:</strong> ${renderShift(template.shift)}</p>
    <p><strong>Ghi chú:</strong> ${template.notes ?? 'Không có'}</p>
    <h4>Danh sách công việc</h4>
    <ol>${tasks}</ol>
    <h4>Báo cáo liên quan</h4>
    <ul>${reportList}</ul>`;
}

function renderTaskReportDetail(report, template) {
  return `
    <p><strong>Ngày:</strong> ${formatDate(report.date)}</p>
    <p><strong>Nhân viên:</strong> ${report.staff}</p>
    <p><strong>Ca:</strong> ${renderShift(report.shift)}</p>
    <p><strong>Tiến độ:</strong> ${report.progress.replace(/\n/g, '<br/>')}</p>
    <p><strong>Trạng thái:</strong> ${renderTaskStatus(report.status)}</p>
    <p><strong>Lý do:</strong> ${report.reason || 'Không'}</p>
    <p><strong>Dự kiến hoàn thành:</strong> ${report.expected || 'Không'}</p>
    <p><strong>Tổng kết:</strong> ${report.summary || 'Không'}</p>
    <hr/>
    <h4>Hạng mục liên quan</h4>
    ${template ? renderTaskTemplateDetail(template, []) : '<p>Không tìm thấy hạng mục</p>'}`;
}

function renderShift(shift) {
  return {
    morning: 'Ca sáng (08:00 - 16:00)',
    evening: 'Ca chiều (13:00 - 21:00)',
    full: 'Ca full (08:00 - 21:00)'
  }[shift] ?? shift;
}

function renderTaskStatus(status) {
  return status === 'done' ? '<span class="badge success">Hoàn thành</span>' : '<span class="badge warning">Chưa hoàn thành</span>';
}

function handleInventorySubmit(evt) {
  evt.preventDefault();
  withLoading('Đang lưu tồn kho...', () => {
    const data = Object.fromEntries(new FormData(evt.target));
    data.id = crypto.randomUUID();
    data.createdAt = new Date().toISOString();
    state.inventory.push(data);
    saveState();
    evt.target.reset();
    renderInventory();
    updateDashboard();
    showToast('Đã lưu giao dịch tồn kho');
  });
}

function renderInventory() {
  const tbody = document.querySelector('#inventory-table tbody');
  const query = document.getElementById('inventory-search').value.toLowerCase();
  const typeFilter = document.getElementById('inventory-filter').value;
  const stock = calculateStock();
  const rows = state.inventory
    .filter(item => !query || Object.values(item).some(v => String(v ?? '').toLowerCase().includes(query)))
    .filter(item => typeFilter === 'all' || item.type === typeFilter)
    .sort((a, b) => new Date(b.date ?? b.createdAt) - new Date(a.date ?? a.createdAt))
    .map(item => {
      const tr = document.createElement('tr');
      tr.dataset.id = item.id;
      tr.innerHTML = `
        <td>${formatDate(item.date)}</td>
        <td>${item.item}</td>
        <td>${item.type === 'import' ? 'Nhập kho' : 'Xuất kho'}</td>
        <td>${item.quantity} ${item.unit ?? ''}</td>
        <td>${stock[item.item] ?? 0}</td>
        <td>${item.notes ?? ''}</td>
        <td>
          <button data-action="delete" class="danger">Xóa</button>
        </td>`;
      return tr;
    });
  tbody.replaceChildren(...rows);
  tbody.querySelectorAll('button').forEach(btn => btn.addEventListener('click', handleInventoryAction));
}

function calculateStock() {
  const stock = {};
  state.inventory.forEach(item => {
    const quantity = Number(item.quantity) || 0;
    if (!stock[item.item]) stock[item.item] = 0;
    stock[item.item] += item.type === 'import' ? quantity : -quantity;
  });
  return stock;
}

function handleInventoryAction(evt) {
  const id = evt.target.closest('tr').dataset.id;
  requestDelete('inventory', id);
}

function handleFinanceSubmit(evt) {
  evt.preventDefault();
  withLoading('Đang lưu giao dịch...', () => {
    const data = Object.fromEntries(new FormData(evt.target));
    data.id = crypto.randomUUID();
    data.createdAt = new Date().toISOString();
    state.finance.push(data);
    saveState();
    evt.target.reset();
    renderFinance();
    updateDashboard();
    showToast('Đã lưu giao dịch thu/chi');
  });
}

function renderFinance() {
  const tbody = document.querySelector('#finance-table tbody');
  const rows = state.finance
    .sort((a, b) => new Date(b.date ?? b.createdAt) - new Date(a.date ?? a.createdAt))
    .map(item => {
      const tr = document.createElement('tr');
      tr.dataset.id = item.id;
      tr.innerHTML = `
        <td>${formatDate(item.date)}</td>
        <td>${item.type === 'income' ? 'Thu' : 'Chi'}</td>
        <td>${item.category}</td>
        <td>${Number(item.amount).toLocaleString('vi-VN')} đ</td>
        <td>${item.method ?? ''}</td>
        <td>${item.notes ?? ''}</td>
        <td><button data-action="delete" class="danger">Xóa</button></td>`;
      return tr;
    });
  tbody.replaceChildren(...rows);
  tbody.querySelectorAll('button').forEach(btn => btn.addEventListener('click', handleFinanceAction));
  renderFinanceSummary();
}

function handleFinanceAction(evt) {
  const id = evt.target.closest('tr').dataset.id;
  requestDelete('finance', id);
}

function renderFinanceSummary() {
  const monthValue = document.getElementById('finance-month').value;
  const summaryEl = document.getElementById('finance-summary');
  const [year, month] = monthValue ? monthValue.split('-') : [null, null];
  const filtered = state.finance.filter(item => {
    if (!monthValue) return true;
    const date = new Date(item.date);
    return date.getFullYear() === Number(year) && date.getMonth() + 1 === Number(month);
  });
  const income = filtered.filter(i => i.type === 'income').reduce((sum, i) => sum + Number(i.amount || 0), 0);
  const expense = filtered.filter(i => i.type === 'expense').reduce((sum, i) => sum + Number(i.amount || 0), 0);
  summaryEl.innerHTML = `
    <p><strong>Tổng thu:</strong> ${income.toLocaleString('vi-VN')} đ</p>
    <p><strong>Tổng chi:</strong> ${expense.toLocaleString('vi-VN')} đ</p>
    <p><strong>Cân đối:</strong> ${(income - expense).toLocaleString('vi-VN')} đ</p>`;
  updateDashboard();
}

function exportFinance() {
  const rows = state.finance.map(item => [item.date, item.type, item.category, item.amount, item.method, item.notes]);
  const header = ['Ngày', 'Loại', 'Danh mục', 'Số tiền', 'Phương thức', 'Ghi chú'];
  const csv = [header, ...rows].map(row => row.map(value => `"${(value ?? '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'bao-cao-thu-chi.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('Đã xuất báo cáo thu chi (CSV)');
}

function handleBrandingSubmit(evt) {
  evt.preventDefault();
  withLoading('Đang cập nhật thương hiệu...', () => {
    const formData = new FormData(evt.target);
    const siteName = formData.get('siteName')?.trim();
    const primaryColor = formData.get('primaryColor');
    if (siteName) state.siteName = siteName;
    if (primaryColor) state.primaryColor = primaryColor;
    const logoFile = formData.get('logo');
    if (logoFile && logoFile.size) {
      return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => {
          state.logo = reader.result;
          finalizeBrandingUpdate();
          resolve();
        };
        reader.readAsDataURL(logoFile);
      });
    } else {
      finalizeBrandingUpdate();
    }
  });
}

function finalizeBrandingUpdate() {
  saveState();
  applyBranding();
  showToast('Đã cập nhật thương hiệu');
}

function resetBranding() {
  state.siteName = defaultState().siteName;
  state.primaryColor = defaultState().primaryColor;
  state.logo = null;
  saveState();
  applyBranding();
  showToast('Đã khôi phục mặc định');
}

function applyBranding() {
  document.documentElement.style.setProperty('--primary', state.primaryColor);
  document.documentElement.style.setProperty('--primary-dark', shadeColor(state.primaryColor, -15));
  document.documentElement.style.setProperty('--primary-light', shadeColor(state.primaryColor, 70));
  document.title = `${state.siteName} - Hệ thống quản trị nội bộ`;
  document.querySelectorAll('.brand h1').forEach(el => el.textContent = state.siteName);
  if (state.logo) {
    elements.brandLogo.src = state.logo;
    document.querySelector('.login-logo').src = state.logo;
  } else {
    elements.brandLogo.src = 'assets/logo.svg';
    document.querySelector('.login-logo').src = 'assets/logo.svg';
  }
}

function handleStaffSubmit(evt) {
  evt.preventDefault();
  if (currentUser.role !== 'admin') {
    showToast('Chỉ quản trị viên mới có thể cập nhật nhân sự', true);
    return;
  }
  withLoading('Đang lưu nhân sự...', () => {
    const data = Object.fromEntries(new FormData(evt.target));
    const existing = state.users.find(u => u.username === data.username);
    if (existing) {
      existing.password = data.password;
      existing.fullName = data.fullName;
      existing.role = data.role;
    } else {
      state.users.push({ ...data });
    }
    saveState();
    evt.target.reset();
    renderStaff();
    populateStaffSelectors();
    showToast('Đã cập nhật danh sách nhân sự');
  });
}

function renderStaff() {
  const tbody = document.querySelector('#staff-table tbody');
  const rows = state.users.map(user => {
    const tr = document.createElement('tr');
    tr.dataset.username = user.username;
    tr.innerHTML = `
      <td>${user.username}</td>
      <td>${user.fullName}</td>
      <td>${user.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}</td>
      <td><button data-action="remove" class="danger">Xóa</button></td>`;
    return tr;
  });
  tbody.replaceChildren(...rows);
  tbody.querySelectorAll('button').forEach(btn => btn.addEventListener('click', handleStaffAction));
}

function handleStaffAction(evt) {
  const username = evt.target.closest('tr').dataset.username;
  if (username === currentUser.username) {
    showToast('Không thể tự xóa tài khoản đang đăng nhập', true);
    return;
  }
  withLoading('Đang cập nhật nhân sự...', () => {
    state.users = state.users.filter(u => u.username !== username);
    saveState();
    renderStaff();
    populateStaffSelectors();
    showToast('Đã xóa tài khoản');
  });
}

function clearApprovals() {
  if (currentUser.role !== 'admin') return;
  withLoading('Đang dọn danh sách phê duyệt...', () => {
    state.approvals = [];
    saveState();
    renderApprovals();
    showToast('Đã xóa danh sách phê duyệt');
  });
}

function requestDelete(collection, id) {
  if (currentUser.role === 'admin') {
    withLoading('Đang xóa dữ liệu...', () => performDelete(collection, id));
    return;
  }
  const approval = {
    id: crypto.randomUUID(),
    collection,
    targetId: id,
    createdAt: new Date().toISOString(),
    requestedBy: currentUser.username
  };
  state.approvals.push(approval);
  saveState();
  renderApprovals();
  showToast('Đã gửi yêu cầu phê duyệt xóa tới quản trị viên');
}

function performDelete(collection, id) {
  const mapping = {
    customer: () => state.customers = state.customers.filter(item => item.id !== id),
    care: () => state.care = state.care.filter(item => item.id !== id),
    warranty: () => state.warranties = state.warranties.filter(item => item.id !== id),
    maintenance: () => state.maintenances = state.maintenances.filter(item => item.id !== id),
    taskTemplate: () => state.tasks.templates = state.tasks.templates.filter(item => item.id !== id),
    taskReport: () => state.tasks.reports = state.tasks.reports.filter(item => item.id !== id),
    inventory: () => state.inventory = state.inventory.filter(item => item.id !== id),
    finance: () => state.finance = state.finance.filter(item => item.id !== id)
  };
  mapping[collection]?.();
  state.approvals = state.approvals.filter(app => app.targetId !== id);
  saveState();
  refreshAll();
  showToast('Đã xóa thành công');
}

function renderApprovals() {
  const tbody = document.querySelector('#approval-table tbody');
  const rows = state.approvals
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(item => {
      const tr = document.createElement('tr');
      tr.dataset.id = item.id;
      tr.innerHTML = `
        <td>${formatDateTime(item.createdAt)}</td>
        <td>${renderCollectionName(item.collection)}</td>
        <td>${item.targetId}</td>
        <td>${item.requestedBy}</td>
        <td>
          <button data-action="approve">Duyệt</button>
          <button data-action="reject" class="danger">Từ chối</button>
        </td>`;
      return tr;
    });
  tbody.replaceChildren(...rows);
  tbody.querySelectorAll('button').forEach(btn => btn.addEventListener('click', handleApprovalAction));
}

function handleApprovalAction(evt) {
  if (currentUser.role !== 'admin') {
    showToast('Chỉ quản trị viên mới xử lý phê duyệt', true);
    return;
  }
  const tr = evt.target.closest('tr');
  const id = tr.dataset.id;
  const approval = state.approvals.find(item => item.id === id);
  if (!approval) return;
  if (evt.target.dataset.action === 'approve') {
    withLoading('Đang duyệt yêu cầu...', () => performDelete(approval.collection, approval.targetId));
  } else {
    state.approvals = state.approvals.filter(item => item.id !== id);
    saveState();
    renderApprovals();
    showToast('Đã từ chối yêu cầu');
  }
}

function renderCollectionName(collection) {
  return {
    customer: 'Khách hàng',
    care: 'CSKH',
    warranty: 'Bảo hành',
    maintenance: 'Bảo dưỡng',
    taskTemplate: 'Hạng mục công việc',
    taskReport: 'Báo cáo công việc',
    inventory: 'Tồn kho',
    finance: 'Thu/Chi'
  }[collection] ?? collection;
}

function toggleLayoutEdit() {
  if (currentUser.role !== 'admin') {
    showToast('Chỉ quản trị viên mới chỉnh sửa bố cục', true);
    return;
  }
  const enabled = !elements.dashboardWidgets.classList.toggle('editable');
  const button = document.getElementById('toggle-layout-edit');
  if (elements.dashboardWidgets.classList.contains('editable')) {
    button.textContent = 'Tắt chế độ chỉnh sửa';
    enableDragAndDrop();
  } else {
    button.textContent = 'Bật chế độ chỉnh sửa';
    disableDragAndDrop();
  }
}

function enableDragAndDrop() {
  elements.dashboardWidgets.querySelectorAll('.widget').forEach(widget => {
    widget.setAttribute('draggable', 'true');
    widget.addEventListener('dragstart', onDragStart);
    widget.addEventListener('dragover', onDragOver);
    widget.addEventListener('drop', onDrop);
  });
}

function disableDragAndDrop() {
  elements.dashboardWidgets.querySelectorAll('.widget').forEach(widget => {
    widget.removeAttribute('draggable');
    widget.removeEventListener('dragstart', onDragStart);
    widget.removeEventListener('dragover', onDragOver);
    widget.removeEventListener('drop', onDrop);
  });
}

let draggedWidget = null;
function onDragStart(evt) {
  draggedWidget = evt.currentTarget;
}
function onDragOver(evt) {
  evt.preventDefault();
}
function onDrop(evt) {
  evt.preventDefault();
  if (!draggedWidget) return;
  const target = evt.currentTarget;
  if (draggedWidget === target) return;
  const widgets = [...elements.dashboardWidgets.children];
  const draggedIndex = widgets.indexOf(draggedWidget);
  const targetIndex = widgets.indexOf(target);
  if (draggedIndex < targetIndex) {
    target.after(draggedWidget);
  } else {
    target.before(draggedWidget);
  }
  draggedWidget = null;
}

function refreshAll() {
  renderCustomers();
  renderCare();
  renderWarranties();
  renderMaintenances();
  renderTaskTemplates();
  renderTaskReports();
  renderInventory();
  renderFinance();
  renderStaff();
  renderApprovals();
  populateCustomerHints();
  populateStaffSelectors();
  populateShiftSelectors();
  updateDashboard();
}

function populateCustomerHints() {
  const nameList = document.getElementById('customer-names');
  const phoneList = document.getElementById('customer-phones');
  const optionsName = state.customers.map(c => `<option value="${c.name}"></option>`).join('');
  const optionsPhone = state.customers.map(c => `<option value="${c.phone}"></option>`).join('');
  nameList.innerHTML = optionsName;
  phoneList.innerHTML = optionsPhone;
}

function populateStaffSelectors() {
  const staffOptions = state.users.filter(u => u.role !== 'admin' || currentUser.role === 'admin');
  const optionHtml = staffOptions.map(u => `<option value="${u.fullName}">${u.fullName}</option>`).join('');
  ['care-staff', 'task-template-staff', 'task-report-staff'].forEach(id => {
    const select = document.getElementById(id);
    if (select) select.innerHTML = optionHtml;
  });
}

function populateShiftSelectors() {
  const templateShift = document.getElementById('task-template-shift');
  const reportShift = document.getElementById('task-report-shift');
  if (reportShift && templateShift) {
    reportShift.innerHTML = templateShift.innerHTML;
  }
}

function fillCareForm(customer) {
  const form = document.getElementById('care-form');
  form.name.value = customer.name ?? '';
  form.phone.value = customer.phone ?? '';
  form.address.value = customer.address ?? '';
}

function openCareFromCustomer() {
  const selected = getSelectedRow('customer-table');
  if (!selected) {
    showToast('Vui lòng chọn khách hàng từ danh sách', true);
    return;
  }
  const id = selected.dataset.id;
  const customer = state.customers.find(c => c.id === id);
  if (!customer) return;
  showPage('care');
  elements.navLinks.forEach(btn => btn.classList.toggle('active', btn.dataset.target === 'care'));
  fillCareForm(customer);
}

function openCustomerHistory() {
  const selected = getSelectedRow('customer-table');
  if (!selected) {
    showToast('Chọn khách hàng để xem lịch sử', true);
    return;
  }
  openHistoryModal(selected.dataset.id);
}

function openHistoryModal(id) {
  const customer = state.customers.find(c => c.id === id);
  if (!customer) return;
  const careHistory = state.care.filter(c => c.phone === customer.phone || c.name === customer.name);
  const statusHistory = careHistory
    .filter(c => c.rating === 'scheduled')
    .map(item => `<li>${formatDate(item.date)} - Hẹn: ${formatDate(item.appointmentDate)} ${item.appointmentTime ?? ''}</li>`)
    .join('');
  const template = document.getElementById('history-modal-template');
  const modal = template.content.cloneNode(true);
  modal.querySelector('[data-customer]').innerHTML = `
    <p><strong>Tên:</strong> ${customer.name}</p>
    <p><strong>Số điện thoại:</strong> ${customer.phone}</p>
    <p><strong>Địa chỉ:</strong> ${customer.address || 'Chưa có'}</p>
    <p><strong>Nguồn:</strong> ${renderSource(customer)}</p>
    <p><strong>Trạng thái:</strong> ${renderCustomerStatus(customer)}</p>`;
  modal.querySelector('[data-care]').innerHTML = careHistory.map(item => `
    <div class="history-entry">
      <p><strong>${formatDate(item.date)}</strong> - ${renderCareMethod(item.method)} - ${renderRating(item)}</p>
      <p>Nội dung: ${item.content}</p>
      <p>Phản hồi: ${item.feedback || 'Không'}</p>
      <p>Ghi chú: ${item.notes || 'Không'}</p>
    </div>`).join('') || '<p>Chưa có lịch sử CSKH</p>';
  modal.querySelector('[data-status]').innerHTML = statusHistory || '<p>Chưa có lịch hẹn</p>';
  document.body.appendChild(modal);
}

function openCareDetails(id) {
  const item = state.care.find(c => c.id === id);
  if (!item) return;
  openInfoModal('Chi tiết CSKH', `
    <p><strong>Ngày:</strong> ${formatDate(item.date)}</p>
    <p><strong>Khách hàng:</strong> ${item.name} (${item.phone})</p>
    <p><strong>Nhân viên:</strong> ${item.staff}</p>
    <p><strong>Hình thức:</strong> ${renderCareMethod(item.method)}</p>
    <p><strong>Nội dung:</strong> ${item.content}</p>
    <p><strong>Phản hồi:</strong> ${item.feedback || 'Không'}</p>
    <p><strong>Ghi chú:</strong> ${item.notes || 'Không'}</p>
    <p><strong>Đánh giá:</strong> ${renderRating(item)}</p>
    ${item.rating === 'lost' ? `<p><strong>Lý do mất khách:</strong> ${item.lostReason || 'Không'}</p>` : ''}
    ${item.rating === 'scheduled' ? `<p><strong>Ngày hẹn:</strong> ${formatDate(item.appointmentDate)} ${item.appointmentTime ?? ''}</p>` : ''}`);
}

function selectRow(row) {
  const tbody = row.closest('tbody');
  tbody.querySelectorAll('tr').forEach(tr => tr.classList.remove('selected'));
  row.classList.add('selected');
}

function getSelectedRow(tableId) {
  return document.querySelector(`#${tableId} tbody tr.selected`);
}

function openServiceModal(type, id) {
  const item = type === 'warranty' ? state.warranties.find(w => w.id === id) : state.maintenances.find(m => m.id === id);
  if (!item) return;
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <header>
        <h3>Cập nhật ${type === 'warranty' ? 'bảo hành' : 'bảo dưỡng'}</h3>
        <button class="icon" data-close>&times;</button>
      </header>
      <form class="form-grid" id="service-update-form">
        <label>Trạng thái hỗ trợ
          <select name="supported">
            <option value="false" ${!item.supported ? 'selected' : ''}>Chưa hỗ trợ</option>
            <option value="true" ${item.supported ? 'selected' : ''}>Đã hỗ trợ</option>
          </select>
        </label>
        <label>Ngày gửi linh kiện
          <input type="date" name="partDate" value="${item.parts?.at(-1)?.date ?? ''}" />
        </label>
        <label>Chi tiết linh kiện
          <input type="text" name="partDetail" value="${item.parts?.at(-1)?.detail ?? ''}" />
        </label>
        <label class="full">Ghi chú
          <textarea name="notes" rows="3">${item.notes ?? ''}</textarea>
        </label>
        <div class="form-actions full">
          <button type="submit" class="primary">Lưu</button>
          <button type="button" class="ghost" data-close>Đóng</button>
        </div>
      </form>
    </div>`;
  modal.querySelector('#service-update-form').addEventListener('submit', evt => {
    evt.preventDefault();
    const formData = new FormData(evt.target);
    item.supported = formData.get('supported') === 'true';
    const partDate = formData.get('partDate');
    const partDetail = formData.get('partDetail');
    if (partDate && partDetail) {
      item.parts = item.parts ?? [];
      item.parts.push({ date: partDate, detail: partDetail });
    }
    item.notes = formData.get('notes');
    saveState();
    renderWarranties();
    renderMaintenances();
    modal.remove();
    showToast('Đã cập nhật trạng thái');
  });
  document.body.appendChild(modal);
}

function openInfoModal(title, body) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <header>
        <h3>${title}</h3>
        <button class="icon" data-close>&times;</button>
      </header>
      <div>${body}</div>
    </div>`;
  document.body.appendChild(modal);
}

function updateDashboard() {
  document.getElementById('total-customers').textContent = state.customers.length;
  document.getElementById('total-care').textContent = state.care.length;
  document.getElementById('total-service').textContent = state.warranties.length + state.maintenances.length;
  const income = state.finance.filter(i => i.type === 'income').reduce((sum, i) => sum + Number(i.amount || 0), 0);
  const expense = state.finance.filter(i => i.type === 'expense').reduce((sum, i) => sum + Number(i.amount || 0), 0);
  document.getElementById('finance-balance').textContent = `${(income - expense).toLocaleString('vi-VN')} đ`;
  drawCharts();
}

function drawCharts() {
  drawLineChart('customer-growth', aggregateByMonth(state.customers, 'date'), 'Khách hàng mới');
  drawLineChart('care-chart', aggregateByMonth(state.care, 'date'), 'CSKH');
  drawLineChart('service-chart', aggregateByMonth([...state.warranties, ...state.maintenances], 'date'), 'Bảo hành/Bảo dưỡng');
  drawFinanceChart();
}

function aggregateByMonth(list, field) {
  const map = new Map();
  list.forEach(item => {
    const date = item[field] || item.createdAt;
    if (!date) return;
    const d = new Date(date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    map.set(key, (map.get(key) || 0) + 1);
  });
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function drawLineChart(canvasId, data, label) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  if (charts[canvasId]) charts[canvasId].destroy();
  charts[canvasId] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(([key]) => key),
      datasets: [{
        label,
        data: data.map(([, value]) => value),
        borderColor: getComputedStyle(document.documentElement).getPropertyValue('--primary'),
        tension: 0.35,
        fill: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } }
    }
  });
}

function drawFinanceChart() {
  const canvasId = 'finance-chart';
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  if (charts[canvasId]) charts[canvasId].destroy();
  const income = state.finance.filter(i => i.type === 'income').reduce((sum, i) => sum + Number(i.amount || 0), 0);
  const expense = state.finance.filter(i => i.type === 'expense').reduce((sum, i) => sum + Number(i.amount || 0), 0);
  charts[canvasId] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Thu', 'Chi'],
      datasets: [{
        data: [income, expense],
        backgroundColor: [
          shadeColor(state.primaryColor, -10),
          '#f39c12'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

function showPageFromHash() {
  const hash = location.hash.replace('#', '');
  if (!hash) return;
  const link = [...elements.navLinks].find(btn => btn.dataset.target === hash);
  if (link) link.click();
}

window.addEventListener('hashchange', showPageFromHash);

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN');
}

function formatDateTime(value) {
  const date = new Date(value);
  return date.toLocaleString('vi-VN');
}

function shadeColor(color, percent) {
  if (!color) return '#0d7474';
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const r = (num >> 16) + amt;
  const g = (num >> 8 & 0x00ff) + amt;
  const b = (num & 0x0000ff) + amt;
  return `#${(
    0x1000000 +
    (r < 255 ? (r < 1 ? 0 : r) : 255) * 0x10000 +
    (g < 255 ? (g < 1 ? 0 : g) : 255) * 0x100 +
    (b < 255 ? (b < 1 ? 0 : b) : 255)
  ).toString(16).slice(1)}`;
}

showPageFromHash();

// Toast styles
const style = document.createElement('style');
style.textContent = `
.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  padding: 0.9rem 1.5rem;
  border-radius: 999px;
  color: #fff;
  font-weight: 600;
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 0.3s, transform 0.3s;
  z-index: 4000;
  box-shadow: 0 12px 32px -16px rgba(0,0,0,0.3);
}
.toast.success { background: var(--primary); }
.toast.error { background: var(--danger); }
.toast.visible { opacity: 1; transform: translateY(0); }
`;
document.head.appendChild(style);
