import { FIREBASE_CONFIG, BACKUP_ENDPOINTS, BRAND } from './config.js';

const REQUIRED_COLLECTIONS = [
  'users',
  'customers',
  'care',
  'warranties',
  'maintenances',
  'tasks',
  'inventory',
  'finance',
  'approvals',
  'layouts',
  'branding',
  'logs'
];

const REMEMBER_KEY = 'klc-remember-auth';

const firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
const auth = firebase.auth();
const db = firebase.firestore();
const FieldValue = firebase.firestore.FieldValue;

const state = {
  user: null,
  profile: null,
  listeners: {},
  data: {
    customers: [],
    care: [],
    warranties: [],
    maintenances: [],
    tasks: { templates: [], reports: [] },
    inventory: [],
    finance: [],
  approvals: [],
  layouts: [],
  branding: [],
  users: [],
  logs: []
  },
  layoutEdit: false
};

const ui = {};

window.addEventListener('DOMContentLoaded', () => {
  captureUIReferences();
  applyBranding();
  populateBrandingForm();
  bindGlobalEvents();
  restoreLayoutEditToggle();
  observeAuth();
});

function captureUIReferences() {
  Object.assign(ui, {
    body: document.body,
    pages: document.querySelectorAll('.page'),
    navLinks: document.querySelectorAll('.nav-link'),
    loader: document.getElementById('loader'),
    loaderMessage: document.getElementById('loader-message'),
    loginCard: document.getElementById('login'),
    loginForm: document.getElementById('login-form'),
    loginEmail: document.getElementById('login-email'),
    loginPassword: document.getElementById('login-password'),
    rememberMe: document.getElementById('remember-me'),
    staySigned: document.getElementById('stay-signed'),
    seedCard: document.getElementById('seed-admin-card'),
    seedForm: document.getElementById('seed-admin-form'),
    roleLabel: document.getElementById('role-label'),
    sidebar: document.getElementById('sidebar'),
    logoutBtn: document.getElementById('logout-btn'),
    dashboardGrid: document.getElementById('dashboard-widgets'),
    dashboardCards: document.querySelectorAll('#dashboard-widgets .widget'),
    layoutToggle: document.getElementById('layout-edit-toggle'),
    layoutReset: document.getElementById('layout-reset'),
    backupExport: document.getElementById('backup-export'),
    backupLatest: document.getElementById('backup-latest'),
    backupStatus: document.getElementById('backup-status'),
    migrateBanner: document.getElementById('migration-banner'),
    migrateButton: document.getElementById('migration-run'),
    migrateDismiss: document.getElementById('migration-dismiss'),
    staffTable: document.querySelector('#staff-table tbody'),
    staffForm: document.getElementById('staff-form'),
    brandingForm: document.getElementById('branding-form'),
    brandingReset: document.getElementById('branding-reset'),
    approvalTable: document.querySelector('#approval-table tbody'),
    approvalClear: document.getElementById('clear-approvals'),
    checklistLinks: document.querySelectorAll('.checklist-link'),
    checklistPanels: document.querySelectorAll('.checklist-panel'),
    taskTemplateTable: document.querySelector('#task-template-table tbody'),
    taskTemplateForm: document.getElementById('task-template'),
    taskTemplateStaff: document.getElementById('task-template-staff'),
    taskScheduleStaff: document.getElementById('task-schedule-staff'),
    taskScheduleTable: document.querySelector('#task-schedule-table tbody'),
    taskReportForm: document.getElementById('task-report'),
    taskReportTemplate: document.getElementById('task-report-template'),
    taskReportTasks: document.getElementById('task-report-tasks'),
    taskReportSearch: document.getElementById('task-report-search'),
    taskReportTable: document.querySelector('#task-report-table tbody'),
    taskTemplateSearch: document.getElementById('task-template-search'),
    taskScheduleMonth: document.getElementById('task-schedule-month'),
    taskScheduleReset: document.getElementById('task-schedule-reset'),
    reportFilter: document.getElementById('report-filter'),
    reportResult: document.getElementById('report-result'),
    dashboardCounters: {
      customers: document.getElementById('total-customers'),
      care: document.getElementById('total-care'),
      service: document.getElementById('total-service'),
      finance: document.getElementById('finance-balance')
    },
    customerForm: document.getElementById('customer-form'),
    customerTable: document.querySelector('#customer-table tbody'),
    customerSearch: document.getElementById('customer-search'),
    careForm: document.getElementById('care-form'),
    careTable: document.querySelector('#care-table tbody'),
    careSearch: document.getElementById('care-search'),
    warrantyForm: document.getElementById('warranty-form'),
    maintenanceForm: document.getElementById('maintenance-form'),
    warrantyTable: document.querySelector('#warranty-table tbody'),
    maintenanceTable: document.querySelector('#maintenance-table tbody'),
    warrantySearch: document.getElementById('warranty-search'),
    maintenanceSearch: document.getElementById('maintenance-search'),
    serviceFilter: document.getElementById('service-filter'),
    inventoryForm: document.getElementById('inventory-form'),
    inventoryTable: document.querySelector('#inventory-table tbody'),
    inventorySearch: document.getElementById('inventory-search'),
    financeForm: document.getElementById('finance-form'),
    financeTable: document.querySelector('#finance-table tbody'),
    financeMonth: document.getElementById('finance-month'),
    financeSummary: document.getElementById('finance-summary'),
    financeExport: document.getElementById('finance-export'),
    logoutMobile: document.getElementById('logout-mobile'),
    toast: document.getElementById('toast')
  });
}

function bindGlobalEvents() {
  ui.navLinks.forEach(link => {
    link.addEventListener('click', () => {
      const target = link.dataset.target;
      if (!target) return;
      navigateTo(target);
    });
  });

  ui.logoutBtn?.addEventListener('click', () => auth.signOut());
  ui.logoutMobile?.addEventListener('click', () => auth.signOut());

  ui.loginForm?.addEventListener('submit', handleLoginSubmit);
  ui.seedForm?.addEventListener('submit', handleSeedSubmit);

  ui.layoutToggle?.addEventListener('change', handleLayoutToggle);
  ui.layoutReset?.addEventListener('click', resetLayout);
  ui.backupExport?.addEventListener('click', backupAllCollections);
  ui.backupLatest?.addEventListener('click', fetchLatestBackup);

  ui.migrateButton?.addEventListener('click', migrateLocalToCloud);
  ui.migrateDismiss?.addEventListener('click', () => {
    ui.migrateBanner?.classList.add('hidden');
    localStorage.setItem('klc-migration-dismissed', '1');
  });

  ui.checklistLinks.forEach(link => {
    link.addEventListener('click', () => {
      const target = link.dataset.subpage;
      ui.checklistLinks.forEach(l => l.classList.toggle('active', l === link));
      ui.checklistPanels.forEach(panel => {
        panel.classList.toggle('active', panel.dataset.subpage === target);
      });
    });
  });

  ui.taskTemplateForm?.addEventListener('submit', evt => {
    evt.preventDefault();
    persistTaskTemplate(new FormData(ui.taskTemplateForm));
  });
  ui.taskReportForm?.addEventListener('submit', evt => {
    evt.preventDefault();
    persistTaskReport(new FormData(ui.taskReportForm));
  });
  ui.taskReportTemplate?.addEventListener('change', handleReportTemplateChange);
  ui.taskReportSearch?.addEventListener('input', renderTaskReports);
  ui.taskTemplateSearch?.addEventListener('input', () => renderTaskTemplates());
  ui.taskScheduleStaff?.addEventListener('change', () => renderTaskSchedule());
  ui.taskScheduleMonth?.addEventListener('input', () => renderTaskSchedule());
  ui.taskScheduleReset?.addEventListener('click', () => {
    ui.taskScheduleStaff.value = 'all';
    ui.taskScheduleMonth.value = '';
    renderTaskSchedule();
  });

  ui.customerForm?.addEventListener('submit', evt => {
    evt.preventDefault();
    persistCollectionDoc('customers', serializeForm(ui.customerForm));
    ui.customerForm.reset();
  });
  ui.customerSearch?.addEventListener('input', renderCustomers);

  ui.careForm?.addEventListener('submit', evt => {
    evt.preventDefault();
    const data = serializeForm(ui.careForm);
    if (data.rating !== 'lost') {
      data.lostReason = '';
    }
    persistCollectionDoc('care', data);
    ui.careForm.reset();
  });
  ui.careSearch?.addEventListener('input', renderCare);

  ui.warrantyForm?.addEventListener('submit', evt => {
    evt.preventDefault();
    persistCollectionDoc('warranties', serializeForm(ui.warrantyForm));
    ui.warrantyForm.reset();
  });

  ui.maintenanceForm?.addEventListener('submit', evt => {
    evt.preventDefault();
    persistCollectionDoc('maintenances', serializeForm(ui.maintenanceForm));
    ui.maintenanceForm.reset();
  });

  ui.warrantySearch?.addEventListener('input', renderServiceTables);
  ui.maintenanceSearch?.addEventListener('input', renderServiceTables);
  ui.serviceFilter?.addEventListener('change', renderServiceTables);

  ui.inventoryForm?.addEventListener('submit', evt => {
    evt.preventDefault();
    persistCollectionDoc('inventory', serializeForm(ui.inventoryForm));
    ui.inventoryForm.reset();
  });
  ui.inventorySearch?.addEventListener('input', renderInventory);

  ui.financeForm?.addEventListener('submit', evt => {
    evt.preventDefault();
    const data = serializeForm(ui.financeForm);
    data.amount = Number(data.amount || 0);
    persistCollectionDoc('finance', data);
    ui.financeForm.reset();
  });
  ui.financeMonth?.addEventListener('input', renderFinance);
  ui.financeExport?.addEventListener('click', exportFinance);

  ui.staffForm?.addEventListener('submit', evt => {
    evt.preventDefault();
    upsertStaffAccount(new FormData(ui.staffForm));
  });

  ui.brandingForm?.addEventListener('submit', evt => {
    evt.preventDefault();
    updateBranding(new FormData(ui.brandingForm));
  });
  ui.brandingReset?.addEventListener('click', () => resetBranding());

  ui.approvalClear?.addEventListener('click', async () => {
    await bulkDeleteCollection('approvals');
    showToast('Đã xóa danh sách phê duyệt');
  });

  ui.reportFilter?.addEventListener('submit', evt => {
    evt.preventDefault();
    renderReport(new FormData(ui.reportFilter));
  });

  attachTableActions();
}

function attachTableActions() {
  const tables = [
    ui.customerTable,
    ui.careTable,
    ui.warrantyTable,
    ui.maintenanceTable,
    ui.inventoryTable,
    ui.financeTable,
    ui.approvalTable,
    ui.taskTemplateTable,
    ui.taskReportTable
  ];

  tables.forEach(table => {
    table?.addEventListener('click', evt => {
      const btn = evt.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      const collection = btn.dataset.collection;
      if (!action || !id || !collection) return;
      if (action === 'delete') {
        deleteCollectionDoc(collection, id);
      } else if (action === 'report-from-template') {
        const template = state.data.tasks.templates.find(item => item.id === id);
        if (!template) return;
        ui.checklistLinks.forEach(link => {
          const isReport = link.dataset.subpage === 'reports';
          link.classList.toggle('active', isReport);
        });
        ui.checklistPanels.forEach(panel => {
          panel.classList.toggle('active', panel.dataset.subpage === 'reports');
        });
        ui.taskReportTemplate.value = template.id;
        handleReportTemplateChange();
        const dateField = ui.taskReportForm.querySelector('[name="date"]');
        if (dateField) dateField.value = formatDateInput(new Date());
      }
    });
  });
}

function observeAuth() {
  auth.onAuthStateChanged(async user => {
    state.user = user;
    if (user) {
      await ensureUserProfile(user);
      afterLogin();
    } else {
      cleanupListeners();
      state.profile = null;
      showLogin();
      maybePromptMigration();
    }
  });
}

async function ensureUserProfile(user) {
  const userDoc = db.collection('users').doc(user.uid);
  const snap = await userDoc.get();
  if (!snap.exists) {
    await userDoc.set({
      uid: user.uid,
      email: user.email,
      fullName: user.displayName || user.email,
      role: 'employee',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
    await logAction('users', 'create', user.uid);
    state.profile = { role: 'employee', fullName: user.email, email: user.email, uid: user.uid };
  } else {
    state.profile = { id: snap.id, ...snap.data() };
  }
}

function afterLogin() {
  hideLogin();
  applyBranding();
  configureRoleAccess();
  navigateTo(resolveDefaultPage());
  startRealtimeListeners();
  renderAll();
  maybePromptMigration();
}

function configureRoleAccess() {
  const role = state.profile?.role || 'employee';
  ui.roleLabel.textContent = state.profile?.fullName ? `${state.profile.fullName} (${role})` : role;
  const singlePage = document.body.dataset.singlePage;
  ui.navLinks.forEach(link => {
    const target = link.dataset.target;
    let visible = isPageAccessible(target);
    if (singlePage) {
      const isSettings = target === 'settings';
      visible = target === singlePage || (isSettings && role === 'admin');
    }
    link.classList.toggle('hidden', !visible);
  });
  if (!isPageAccessible(getActivePage())) {
    navigateTo(resolveDefaultPage());
  }
  toggleSettingsAvailability(role === 'admin');
}

function toggleSettingsAvailability(enabled) {
  const disabledInputs = document.querySelectorAll('#settings input, #settings select, #settings button');
  disabledInputs.forEach(el => {
    if (el.id === 'logout-btn' || el.classList.contains('nav-link')) return;
    el.disabled = !enabled;
  });
}

async function handleLoginSubmit(evt) {
  evt.preventDefault();
  try {
    showLoader('Đang đăng nhập...');
    const email = ui.loginEmail.value.trim();
    const password = ui.loginPassword.value;
    const persistent = ui.staySigned?.checked || ui.rememberMe?.checked;
    const persistence = persistent ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION;
    await auth.setPersistence(persistence);
    await auth.signInWithEmailAndPassword(email, password);
    saveRememberedCredentials(ui.rememberMe?.checked ? email : null);
    hideLoader();
    showToast('Đăng nhập thành công');
  } catch (error) {
    hideLoader();
    if (error.code === 'auth/user-not-found') {
      showSeedForm(email);
    }
    showToast(mapAuthError(error));
  }
}

async function handleSeedSubmit(evt) {
  evt.preventDefault();
  try {
    showLoader('Tạo tài khoản quản trị...');
    const data = new FormData(ui.seedForm);
    const email = data.get('email').trim();
    const password = data.get('password');
    const fullName = data.get('fullName').trim();
    const credential = await auth.createUserWithEmailAndPassword(email, password);
    await db.collection('users').doc(credential.user.uid).set({
      uid: credential.user.uid,
      email,
      fullName,
      role: 'admin',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
    await logAction('users', 'seed-admin', credential.user.uid);
    ui.seedCard.classList.add('hidden');
    showToast('Đã tạo quản trị viên đầu tiên');
  } catch (error) {
    showToast(mapAuthError(error));
  } finally {
    hideLoader();
  }
}

function showSeedForm(email) {
  if (!ui.seedCard) return;
  ui.seedCard.classList.remove('hidden');
  ui.seedForm.querySelector('[name="email"]').value = email;
}

function mapAuthError(error) {
  switch (error.code) {
    case 'auth/wrong-password':
      return 'Mật khẩu không chính xác';
    case 'auth/user-not-found':
      return 'Không tìm thấy tài khoản, bạn có thể tạo quản trị viên mới';
    case 'auth/email-already-in-use':
      return 'Email đã tồn tại';
    default:
      return error.message || 'Đăng nhập thất bại';
  }
}

function showLogin() {
  ui.loginCard?.classList.remove('hidden');
  ui.seedCard?.classList.add('hidden');
  ui.sidebar?.classList.add('logged-out');
  ui.navLinks.forEach(link => link.classList.remove('active'));
  navigateTo(null);
  loadRememberedCredentials();
}

function hideLogin() {
  ui.loginCard?.classList.add('hidden');
  ui.sidebar?.classList.remove('logged-out');
}

function getActivePage() {
  const active = document.querySelector('.page.active');
  return active?.id || null;
}

function navigateTo(target) {
  ui.pages.forEach(page => {
    page.classList.toggle('active', page.id === target);
  });
  ui.navLinks.forEach(link => {
    link.classList.toggle('active', link.dataset.target === target);
  });
}

function resolveDefaultPage() {
  const singlePage = document.body.dataset.singlePage;
  if (singlePage) {
    if (singlePage === 'settings' && state.profile?.role !== 'admin') {
      return 'dashboard';
    }
    return singlePage;
  }
  const requested = document.body.dataset.defaultPage;
  if (requested && isPageAccessible(requested)) {
    return requested;
  }
  return 'dashboard';
}

function isPageAccessible(page) {
  if (!page) return true;
  if (page === 'settings' && state.profile?.role !== 'admin') return false;
  return true;
}

function startRealtimeListeners() {
  listenUsers();
  listenCollection('customers', snap => {
    state.data.customers = mapDocs(snap);
    renderCustomers();
    renderDashboard();
    refreshTaskStaffOptions();
  });
  listenCollection('care', snap => {
    state.data.care = mapDocs(snap);
    renderCare();
    renderDashboard();
  });
  listenCollection('warranties', snap => {
    state.data.warranties = mapDocs(snap);
    renderServiceTables();
    renderDashboard();
  });
  listenCollection('maintenances', snap => {
    state.data.maintenances = mapDocs(snap);
    renderServiceTables();
    renderDashboard();
  });
  listenCollection('inventory', snap => {
    state.data.inventory = mapDocs(snap);
    renderInventory();
  });
  listenCollection('finance', snap => {
    state.data.finance = mapDocs(snap);
    renderFinance();
    renderDashboard();
  });
  listenCollection('approvals', snap => {
    state.data.approvals = mapDocs(snap);
    renderApprovals();
  });
  listenCollection('layouts', snap => {
    state.data.layouts = mapDocs(snap);
    applySavedLayout();
  });
  listenCollection('branding', snap => {
    state.data.branding = mapDocs(snap);
    applyBranding();
    populateBrandingForm();
  });
  listenCollection('tasks', snap => {
    const docs = mapDocs(snap);
    state.data.tasks.templates = docs.filter(doc => doc.kind === 'template');
    state.data.tasks.reports = docs.filter(doc => doc.kind === 'report');
    renderTaskTemplates();
    renderTaskSchedule();
    renderTaskReports();
  });
}

function listenUsers() {
  listenCollection('users', snap => {
    state.data.users = mapDocs(snap);
    renderStaff();
    refreshTaskStaffOptions();
  }, query => query.orderBy('fullName'));
}

function listenCollection(collection, handler, queryBuilder) {
  state.listeners[collection]?.();
  let ref = db.collection(collection);
  if (queryBuilder) {
    ref = queryBuilder(ref);
  }
  state.listeners[collection] = ref.onSnapshot(handler, error => {
    console.error('Realtime error', collection, error);
    showToast(`Không thể đồng bộ ${collection}`);
  });
}

function cleanupListeners() {
  Object.values(state.listeners).forEach(unsub => unsub?.());
  state.listeners = {};
}

function mapDocs(snapshot) {
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

function renderDashboard() {
  ui.dashboardCounters.customers.textContent = state.data.customers.length;
  ui.dashboardCounters.care.textContent = state.data.care.length;
  const serviceCount = state.data.warranties.length + state.data.maintenances.length;
  ui.dashboardCounters.service.textContent = serviceCount;
  const financeBalance = state.data.finance.reduce((acc, entry) => {
    return acc + (entry.type === 'income' ? Number(entry.amount || 0) : -Number(entry.amount || 0));
  }, 0);
  ui.dashboardCounters.finance.textContent = formatCurrency(financeBalance);
}

function renderCustomers() {
  if (!ui.customerTable) return;
  const keyword = ui.customerSearch?.value?.toLowerCase?.() || '';
  const rows = state.data.customers
    .filter(item => {
      if (!keyword) return true;
      const haystack = [item.name, item.phone, item.source, item.notes].join(' ').toLowerCase();
      return haystack.includes(keyword);
    })
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
    .map(item => {
      const date = formatDate(item.date);
      const status = item.hasPurchased ? 'Đã mua' : 'Chưa mua';
      return `<tr>
        <td>${date}</td>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.phone || '')}</td>
        <td>${escapeHtml(item.source || '')}</td>
        <td>${status}</td>
        <td>${escapeHtml(item.notes || '')}</td>
        <td>
          ${renderDeleteButton('customers', item)}
        </td>
      </tr>`;
    })
    .join('');
  ui.customerTable.innerHTML = rows || emptyRow('Chưa có khách hàng');
}

function renderCare() {
  if (!ui.careTable) return;
  const keyword = ui.careSearch?.value?.toLowerCase?.() || '';
  const rows = state.data.care
    .filter(item => {
      if (!keyword) return true;
      const haystack = [item.name, item.phone, item.staff, item.notes].join(' ').toLowerCase();
      return haystack.includes(keyword);
    })
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
    .map(item => `<tr>
      <td>${formatDate(item.date)}</td>
      <td>${escapeHtml(item.name || '')}</td>
      <td>${escapeHtml(resolveStaffName(item.staff))}</td>
      <td>${translateCareMethod(item.method)}</td>
      <td>${translateCareRating(item.rating)}</td>
      <td>${renderDeleteButton('care', item)}</td>
    </tr>`)
    .join('');
  ui.careTable.innerHTML = rows || emptyRow('Chưa có lịch CSKH');
}

function renderServiceTables() {
  if (ui.warrantyTable) {
    const keyword = ui.warrantySearch?.value?.toLowerCase?.() || '';
    const rows = state.data.warranties
      .filter(item => {
        if (!keyword) return true;
        const haystack = [item.name, item.phone, item.model, item.status, item.request].join(' ').toLowerCase();
        return haystack.includes(keyword);
      })
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      .map(item => `<tr>
        <td>${formatDate(item.date)}</td>
        <td>${escapeHtml(item.name || '')}</td>
        <td>${escapeHtml(item.model || '')}</td>
        <td>${escapeHtml(item.status || '')}</td>
        <td>${escapeHtml(item.request || '')}</td>
        <td>${renderDeleteButton('warranties', item)}</td>
      </tr>`)
      .join('');
    ui.warrantyTable.innerHTML = rows || emptyRow('Chưa có yêu cầu bảo hành');
  }

  if (ui.maintenanceTable) {
    const keyword = ui.maintenanceSearch?.value?.toLowerCase?.() || '';
    const filter = ui.serviceFilter?.value || 'all';
    const rows = state.data.maintenances
      .filter(item => {
        if (keyword) {
          const haystack = [item.name, item.phone, item.model, item.request].join(' ').toLowerCase();
          if (!haystack.includes(keyword)) return false;
        }
        if (filter === 'pending') return item.status !== 'supported';
        if (filter === 'supported') return item.status === 'supported';
        if (filter === 'shipped') return item.status === 'shipped';
        return true;
      })
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      .map(item => `<tr>
        <td>${formatDate(item.date)}</td>
        <td>${escapeHtml(item.name || '')}</td>
        <td>${escapeHtml(item.model || '')}</td>
        <td>${escapeHtml(item.request || '')}</td>
        <td>${translateMaintenanceStatus(item.status)}</td>
        <td>${renderDeleteButton('maintenances', item)}</td>
      </tr>`)
      .join('');
    ui.maintenanceTable.innerHTML = rows || emptyRow('Chưa có yêu cầu bảo dưỡng');
  }
}

function renderInventory() {
  if (!ui.inventoryTable) return;
  const keyword = ui.inventorySearch?.value?.toLowerCase?.() || '';
  const rows = state.data.inventory
    .filter(item => {
      if (!keyword) return true;
      const haystack = [item.name, item.sku, item.location].join(' ').toLowerCase();
      return haystack.includes(keyword);
    })
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
    .map(item => `<tr>
      <td>${escapeHtml(item.sku || '')}</td>
      <td>${escapeHtml(item.name || '')}</td>
      <td>${escapeHtml(item.location || '')}</td>
      <td>${item.quantity || 0}</td>
      <td>${renderDeleteButton('inventory', item)}</td>
    </tr>`)
    .join('');
  ui.inventoryTable.innerHTML = rows || emptyRow('Chưa có dữ liệu tồn kho');
}

function renderFinance() {
  if (!ui.financeTable) return;
  const monthFilter = ui.financeMonth?.value;
  const filtered = state.data.finance.filter(entry => {
    if (!monthFilter) return true;
    return (entry.date || '').startsWith(monthFilter);
  });
  const rows = filtered
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .map(item => `<tr>
      <td>${formatDate(item.date)}</td>
      <td>${item.type === 'income' ? 'Thu' : 'Chi'}</td>
      <td>${escapeHtml(item.category || '')}</td>
      <td>${formatCurrency(item.amount)}</td>
      <td>${escapeHtml(item.method || '')}</td>
      <td>${escapeHtml(item.notes || '')}</td>
      <td>${renderDeleteButton('finance', item)}</td>
    </tr>`)
    .join('');
  ui.financeTable.innerHTML = rows || emptyRow('Chưa có thu chi');
  const totalIncome = filtered.filter(i => i.type === 'income').reduce((sum, i) => sum + Number(i.amount || 0), 0);
  const totalExpense = filtered.filter(i => i.type === 'expense').reduce((sum, i) => sum + Number(i.amount || 0), 0);
  ui.financeSummary.innerHTML = `
    <div class="stat">Tổng thu: <strong>${formatCurrency(totalIncome)}</strong></div>
    <div class="stat">Tổng chi: <strong>${formatCurrency(totalExpense)}</strong></div>
    <div class="stat">Chênh lệch: <strong>${formatCurrency(totalIncome - totalExpense)}</strong></div>`;
}

function exportFinance() {
  const data = state.data.finance.map(item => ({
    ...item,
    amount: Number(item.amount || 0)
  }));
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `finance-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function renderStaff() {
  if (!ui.staffTable) return;
  const rows = state.data.users
    .sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''))
    .map(user => `<tr>
      <td>${escapeHtml(user.email || user.username || '')}</td>
      <td>${escapeHtml(user.fullName || '')}</td>
      <td>${user.role || 'employee'}</td>
      <td>${state.profile?.role === 'admin' ? renderDeleteButton('users', user) : ''}</td>
    </tr>`)
    .join('');
  ui.staffTable.innerHTML = rows || emptyRow('Chưa có nhân viên');
}

function renderApprovals() {
  if (!ui.approvalTable) return;
  const rows = state.data.approvals
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
    .map(item => `<tr>
      <td>${formatDateTime(item.createdAt)}</td>
      <td>${escapeHtml(item.type || '')}</td>
      <td>${escapeHtml(item.details || '')}</td>
      <td>${escapeHtml(resolveStaffName(item.requester))}</td>
      <td>${renderDeleteButton('approvals', item)}</td>
    </tr>`)
    .join('');
  ui.approvalTable.innerHTML = rows || emptyRow('Chưa có yêu cầu phê duyệt');
}

function renderTaskTemplates() {
  if (!ui.taskTemplateTable) return;
  const keyword = ui.taskTemplateSearch?.value?.toLowerCase?.() || '';
  const rows = state.data.tasks.templates
    .filter(item => {
      if (!keyword) return true;
      const haystack = [item.staff, item.shift, ...(item.tasks || [])].join(' ').toLowerCase();
      return haystack.includes(keyword);
    })
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .map(item => `<tr>
      <td>${formatDate(item.date)}</td>
      <td>${escapeHtml(resolveStaffName(item.staff))}</td>
      <td>${translateShift(item.shift)}</td>
      <td>${item.tasks?.length || 0}</td>
      <td>${countReportsForTemplate(item.id)}</td>
      <td>
        ${renderDeleteButton('tasks', item)}
        <button class="secondary" data-action="report-from-template" data-id="${item.id}" data-collection="tasks">Báo cáo</button>
      </td>
    </tr>`)
    .join('');
  ui.taskTemplateTable.innerHTML = rows || emptyRow('Chưa có checklist');
}

function renderTaskSchedule() {
  if (!ui.taskScheduleTable) return;
  const staffFilter = ui.taskScheduleStaff?.value || 'all';
  const monthFilter = ui.taskScheduleMonth?.value;
  const rows = state.data.tasks.templates
    .filter(item => {
      if (staffFilter !== 'all' && item.staff !== staffFilter) return false;
      if (monthFilter && !(item.date || '').startsWith(monthFilter)) return false;
      return true;
    })
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .map(item => `<tr>
      <td>${formatDate(item.date)}</td>
      <td>${escapeHtml(resolveStaffName(item.staff))}</td>
      <td>${translateShift(item.shift)}</td>
      <td>${item.tasks?.length || 0}</td>
      <td>${countReportsForTemplate(item.id)}</td>
      <td>${renderDeleteButton('tasks', item)}</td>
    </tr>`)
    .join('');
  ui.taskScheduleTable.innerHTML = rows || emptyRow('Chưa có lịch làm việc');
}

function renderTaskReports() {
  if (!ui.taskReportTable) return;
  const keyword = ui.taskReportSearch?.value?.toLowerCase?.() || '';
  const rows = state.data.tasks.reports
    .filter(item => {
      if (!keyword) return true;
      const haystack = [resolveStaffName(item.staff), item.summary, item.status].join(' ').toLowerCase();
      return haystack.includes(keyword);
    })
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .map(item => `<tr>
      <td>${formatDate(item.date)}</td>
      <td>${escapeHtml(resolveStaffName(item.staff))}</td>
      <td>${translateShift(item.shift)}</td>
      <td>${translateReportStatus(item.status)} (${item.completedTasks?.length || 0}/${item.totalTasks || 0})</td>
      <td>${renderDeleteButton('tasks', item)}</td>
    </tr>`)
    .join('');
  ui.taskReportTable.innerHTML = rows || emptyRow('Chưa có báo cáo');
}

function countReportsForTemplate(templateId) {
  return state.data.tasks.reports.filter(report => report.templateId === templateId).length;
}

function renderReport(formData) {
  const module = formData.get('report-type');
  const start = formData.get('report-start');
  const end = formData.get('report-end');
  const collection = state.data[module] || [];
  const filtered = collection.filter(item => {
    const date = item.date || item.createdAt?.toDate?.()?.toISOString?.().slice(0, 10) || '';
    if (start && date < start) return false;
    if (end && date > end) return false;
    return true;
  });
  const json = JSON.stringify(filtered, null, 2);
  ui.reportResult.textContent = filtered.length ? json : 'Không có dữ liệu trong khoảng thời gian đã chọn';
}

async function persistCollectionDoc(collection, data) {
  try {
    showLoader('Đang lưu dữ liệu...');
    const payload = {
      ...data,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: state.user?.uid || null,
      updatedBy: state.user?.uid || null
    };
    await db.collection(collection).add(payload);
    await logAction(collection, 'create');
    hideLoader();
    showToast('Đã lưu');
  } catch (error) {
    console.error('persist error', error);
    hideLoader();
    showToast('Không thể lưu dữ liệu');
  }
}

async function deleteCollectionDoc(collection, id) {
  if (!confirm('Bạn có chắc chắn muốn xóa?')) return;
  try {
    await db.collection(collection).doc(id).delete();
    await logAction(collection, 'delete', id);
    showToast('Đã xóa');
  } catch (error) {
    console.error('delete error', error);
    showToast('Không thể xóa dữ liệu');
  }
}

async function bulkDeleteCollection(collection) {
  const batch = db.batch();
  const snapshot = await db.collection(collection).get();
  snapshot.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  await logAction(collection, 'bulk-delete');
}

async function persistTaskTemplate(formData) {
  const payload = serializeFormData(formData);
  payload.tasks = (payload.tasks || '').split('\n').map(item => item.trim()).filter(Boolean);
  payload.kind = 'template';
  await persistCollectionDoc('tasks', payload);
  ui.taskTemplateForm.reset();
}

async function persistTaskReport(formData) {
  const payload = serializeFormData(formData);
  payload.kind = 'report';
  const template = state.data.tasks.templates.find(item => item.id === payload.templateId);
  payload.completedTasks = [].concat(payload.completedTasks || []).filter(Boolean);
  payload.totalTasks = template?.tasks?.length || payload.completedTasks.length;
  payload.shift = payload.shift || template?.shift || '';
  payload.staff = payload.staff || template?.staff || '';
  payload.summary = payload.summary || '';
  payload.status = payload.status || 'done';
  await persistCollectionDoc('tasks', payload);
  ui.taskReportForm.reset();
  ui.taskReportTasks?.classList.add('empty');
  ui.taskReportTasks.innerHTML = 'Chọn checklist để hiển thị các hạng mục.';
}

function handleReportTemplateChange() {
  if (!ui.taskReportTemplate) return;
  const templateId = ui.taskReportTemplate.value;
  const template = state.data.tasks.templates.find(item => item.id === templateId);
  if (!template) {
    ui.taskReportTasks?.classList.add('empty');
    ui.taskReportTasks.innerHTML = 'Chọn checklist để hiển thị các hạng mục.';
    return;
  }
  ui.taskReportTasks?.classList.remove('empty');
  ui.taskReportTasks.innerHTML = template.tasks
    .map((task, index) => {
      return `<label class="checkbox"><input type="checkbox" name="completedTasks" value="${escapeHtml(task)}" /> ${escapeHtml(task)}</label>`;
    })
    .join('');
  const staffSelect = ui.taskReportForm?.querySelector('[name="staff"]');
  if (staffSelect) staffSelect.value = template.staff;
  const shiftSelect = ui.taskReportForm?.querySelector('[name="shift"]');
  if (shiftSelect) shiftSelect.value = template.shift;
  const dateField = ui.taskReportForm?.querySelector('[name="date"]');
  if (dateField && !dateField.value) dateField.value = template.date;
}

async function upsertStaffAccount(formData) {
  if (state.profile?.role !== 'admin') {
    showToast('Chỉ quản trị viên mới có thể quản lý nhân viên');
    return;
  }
  const data = serializeFormData(formData);
  const email = data.username?.trim();
  const password = data.password;
  const fullName = data.fullName?.trim();
  const role = data.role || 'employee';
  if (!email || (!password && !state.data.users.find(user => user.email === email))) {
    showToast('Vui lòng nhập email và mật khẩu');
    return;
  }
  try {
    showLoader('Đang đồng bộ nhân viên...');
    let userRecord = state.data.users.find(user => user.email === email || user.username === email);
    let uid = userRecord?.uid || userRecord?.id;
    if (!uid) {
      const secondary = firebase.initializeApp(FIREBASE_CONFIG, `secondary-${Date.now()}`);
      const credential = await secondary.auth().createUserWithEmailAndPassword(email, password);
      uid = credential.user.uid;
      await secondary.delete();
    }
    await db.collection('users').doc(uid).set({
      uid,
      email,
      fullName,
      role,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp()
    }, { merge: true });
    await logAction('users', userRecord ? 'update' : 'create', uid);
    showToast('Đã đồng bộ nhân viên');
    ui.staffForm.reset();
  } catch (error) {
    console.error(error);
    showToast('Không thể đồng bộ nhân viên: ' + error.message);
  } finally {
    hideLoader();
  }
}

async function logAction(module, action, docId = null) {
  if (!state.user) return;
  try {
    await db.collection('logs').add({
      module,
      action,
      docId,
      userId: state.user.uid,
      createdAt: FieldValue.serverTimestamp()
    });
  } catch (_) {
    // ignore logging errors
  }
}

function serializeForm(form) {
  const data = new FormData(form);
  return serializeFormData(data);
}

function serializeFormData(formData) {
  const payload = {};
  formData.forEach((value, key) => {
    if (payload[key]) {
      if (!Array.isArray(payload[key])) {
        payload[key] = [payload[key]];
      }
      payload[key].push(value);
    } else {
      payload[key] = value;
    }
  });
  return payload;
}

function renderDeleteButton(collection, item) {
  const canDelete = canCurrentUserEdit(item);
  if (!canDelete) return '';
  return `<button class="ghost" data-action="delete" data-id="${item.id}" data-collection="${collection}">Xóa</button>`;
}

function canCurrentUserEdit(item) {
  if (!state.profile) return false;
  if (state.profile.role === 'admin') return true;
  return item.createdBy === state.user?.uid;
}

function translateCareMethod(method) {
  switch (method) {
    case 'call':
      return 'Gọi điện';
    case 'sms':
      return 'Nhắn tin';
    case 'broadcast':
      return 'Gửi hàng loạt';
    case 'call_sms':
      return 'Gọi & nhắn';
    default:
      return method || '';
  }
}

function translateCareRating(rating) {
  switch (rating) {
    case 'potential':
      return 'Còn tiềm năng';
    case 'nurturing':
      return 'Đang nuôi dưỡng';
    case 'scheduled':
      return 'Đang hẹn';
    case 'lost':
      return 'Hết tiềm năng';
    default:
      return rating || '';
  }
}

function translateMaintenanceStatus(status) {
  switch (status) {
    case 'pending':
      return 'Chờ xử lý';
    case 'supported':
      return 'Đã hỗ trợ';
    case 'shipped':
      return 'Đã gửi linh kiện';
    default:
      return status || '';
  }
}

function translateReportStatus(status) {
  switch (status) {
    case 'done':
      return 'Hoàn thành';
    case 'partial':
      return 'Chưa hoàn thành';
    default:
      return status || '';
  }
}

function translateShift(shift) {
  switch (shift) {
    case 'morning':
      return 'Ca sáng';
    case 'evening':
      return 'Ca chiều';
    case 'full':
      return 'Ca full';
    default:
      return shift || '';
  }
}

function resolveStaffName(uid) {
  const user = state.data.users.find(user => user.uid === uid || user.id === uid);
  return user?.fullName || user?.email || uid || '';
}

function formatDate(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value?.toDate) return value.toDate().toISOString().slice(0, 10);
  return '';
}

function formatDateInput(date) {
  return date.toISOString().slice(0, 10);
}

function formatDateTime(value) {
  if (!value) return '';
  if (value.toDate) {
    const d = value.toDate();
    return d.toLocaleString('vi-VN');
  }
  return value;
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  return amount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
}

function escapeHtml(value) {
  if (!value) return '';
  return value
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function emptyRow(message) {
  return `<tr><td colspan="7" class="empty">${message}</td></tr>`;
}

function showLoader(message) {
  ui.loader?.classList.remove('hidden');
  if (message) ui.loaderMessage.textContent = message;
}

function hideLoader() {
  ui.loader?.classList.add('hidden');
}

function showToast(message) {
  if (!message) return;
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 3000);
}

function loadRememberedCredentials() {
  if (!ui.loginEmail) return;
  try {
    const raw = localStorage.getItem(REMEMBER_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    ui.loginEmail.value = data.email || '';
    if (ui.rememberMe) ui.rememberMe.checked = true;
  } catch (_) {
    localStorage.removeItem(REMEMBER_KEY);
  }
}

function saveRememberedCredentials(email) {
  if (!email) {
    localStorage.removeItem(REMEMBER_KEY);
    return;
  }
  localStorage.setItem(REMEMBER_KEY, JSON.stringify({ email }));
}

function applyBranding() {
  const brandingDoc = state.data.branding.find(doc => doc.id === 'global') || state.data.branding[0];
  const primary = brandingDoc?.primary || BRAND?.primary || '#0F52BA';
  const accent = brandingDoc?.accent || BRAND?.accent || '#F6C90E';
  const siteName = brandingDoc?.siteName || BRAND?.siteName || 'KLC Bến Lức';
  document.documentElement.style.setProperty('--brand-primary', primary);
  document.documentElement.style.setProperty('--brand-accent', accent);
  document.documentElement.style.setProperty('--primary', primary);
  const heading = document.querySelector('.brand h1');
  if (heading) heading.textContent = siteName;
  document.title = `${siteName} - Hệ thống quản trị nội bộ`;
}

function handleLayoutToggle() {
  state.layoutEdit = ui.layoutToggle.checked;
  saveLayoutToggle();
  initLayoutEditing();
}

function initLayoutEditing() {
  if (!ui.dashboardGrid) return;
  if (state.layoutEdit) {
    ui.dashboardGrid.classList.add('editing');
    new Sortable(ui.dashboardGrid, {
      animation: 150,
      onEnd: saveCurrentLayout
    });
  } else {
    ui.dashboardGrid.classList.remove('editing');
  }
}

function saveCurrentLayout() {
  if (!state.profile) return;
  const order = Array.from(ui.dashboardGrid.children).map(el => el.dataset.widget);
  const docId = `${getActiveLayoutScope()}-${state.profile.uid}`;
  db.collection('layouts').doc(docId).set({
    page: 'dashboard',
    userId: state.profile.uid,
    layoutJSON: order,
    updatedAt: FieldValue.serverTimestamp()
  });
}

function resetLayout() {
  if (!state.profile) return;
  const docId = `${getActiveLayoutScope()}-${state.profile.uid}`;
  db.collection('layouts').doc(docId).delete();
  applyDefaultLayout();
}

function getActiveLayoutScope() {
  return 'dashboard';
}

function applySavedLayout() {
  if (!state.profile) return;
  const docId = `${getActiveLayoutScope()}-${state.profile.uid}`;
  const layout = state.data.layouts.find(layout => layout.id === docId || layout.userId === state.profile.uid);
  if (layout?.layoutJSON && Array.isArray(layout.layoutJSON)) {
    reorderDashboard(layout.layoutJSON);
  } else {
    applyDefaultLayout();
  }
}

function applyDefaultLayout() {
  const defaultOrder = ['customers', 'care', 'service', 'finance'];
  reorderDashboard(defaultOrder);
}

function reorderDashboard(order) {
  if (!ui.dashboardGrid) return;
  const fragments = order
    .map(key => Array.from(ui.dashboardGrid.children).find(child => child.dataset.widget === key))
    .filter(Boolean);
  fragments.forEach(fragment => ui.dashboardGrid.appendChild(fragment));
}

function saveLayoutToggle() {
  localStorage.setItem('klc-layout-edit', state.layoutEdit ? '1' : '0');
}

function restoreLayoutEditToggle() {
  if (!ui.layoutToggle) return;
  const stored = localStorage.getItem('klc-layout-edit') === '1';
  ui.layoutToggle.checked = stored;
  state.layoutEdit = stored;
  if (stored) {
    initLayoutEditing();
  }
}

async function backupAllCollections() {
  try {
    showLoader('Đang sao lưu...');
    const payload = {};
    for (const collection of REQUIRED_COLLECTIONS) {
      const snapshot = await db.collection(collection).get();
      payload[collection] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    const response = await fetch(BACKUP_ENDPOINTS.upload, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    ui.backupStatus.textContent = data.ok ? 'Đã sao lưu lên Drive' : 'Sao lưu thất bại';
    await logAction('backup', 'upload');
  } catch (error) {
    console.error(error);
    ui.backupStatus.textContent = 'Không thể sao lưu';
  } finally {
    hideLoader();
  }
}

async function fetchLatestBackup() {
  try {
    showLoader('Đang kiểm tra sao lưu...');
    const response = await fetch(BACKUP_ENDPOINTS.latest);
    const data = await response.json();
    if (data.ok) {
      ui.backupStatus.textContent = `Bản gần nhất: ${data.name}`;
    } else {
      ui.backupStatus.textContent = 'Chưa có sao lưu nào';
    }
    await logAction('backup', 'latest');
  } catch (error) {
    console.error(error);
    ui.backupStatus.textContent = 'Không thể tải thông tin sao lưu';
  } finally {
    hideLoader();
  }
}

async function migrateLocalToCloud() {
  try {
    showLoader('Đang di chuyển dữ liệu...');
    const raw = localStorage.getItem('klc-ben-luc-data-v1');
    if (!raw) {
      showToast('Không tìm thấy dữ liệu cũ');
      return;
    }
    const parsed = JSON.parse(raw);
    const batch = db.batch();
    (parsed.customers || []).forEach(item => {
      const ref = db.collection('customers').doc();
      batch.set(ref, normalizeLegacy(item));
    });
    (parsed.care || []).forEach(item => {
      const ref = db.collection('care').doc();
      batch.set(ref, normalizeLegacy(item));
    });
    (parsed.warranties || []).forEach(item => {
      const ref = db.collection('warranties').doc();
      batch.set(ref, normalizeLegacy(item));
    });
    (parsed.maintenances || []).forEach(item => {
      const ref = db.collection('maintenances').doc();
      batch.set(ref, normalizeLegacy(item));
    });
    (parsed.inventory || []).forEach(item => {
      const ref = db.collection('inventory').doc();
      batch.set(ref, normalizeLegacy(item));
    });
    (parsed.finance || []).forEach(item => {
      const ref = db.collection('finance').doc();
      batch.set(ref, normalizeLegacy(item));
    });
    (parsed.approvals || []).forEach(item => {
      const ref = db.collection('approvals').doc();
      batch.set(ref, normalizeLegacy(item));
    });
    const legacyTasks = parsed.tasks || {};
    (legacyTasks.templates || []).forEach(item => {
      const ref = db.collection('tasks').doc();
      batch.set(ref, { ...normalizeLegacy(item), kind: 'template', tasks: item.items || item.tasks || [] });
    });
    (legacyTasks.reports || []).forEach(item => {
      const ref = db.collection('tasks').doc();
      batch.set(ref, { ...normalizeLegacy(item), kind: 'report' });
    });
    await batch.commit();
    localStorage.setItem('klc-migration-dismissed', '1');
    ui.migrateBanner?.classList.add('hidden');
    showToast('Đã di chuyển dữ liệu lên cloud');
  } catch (error) {
    console.error(error);
    showToast('Không thể di chuyển dữ liệu: ' + error.message);
  } finally {
    hideLoader();
  }
}

function normalizeLegacy(item) {
  return {
    ...item,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: state.user?.uid || null,
    updatedBy: state.user?.uid || null
  };
}

function maybePromptMigration() {
  if (!ui.migrateBanner) return;
  if (localStorage.getItem('klc-ben-luc-data-v1') && !localStorage.getItem('klc-migration-dismissed')) {
    ui.migrateBanner.classList.remove('hidden');
  }
}

function refreshTaskStaffOptions() {
  const options = state.data.users.map(user => `<option value="${user.uid}">${escapeHtml(user.fullName || user.email)}</option>`).join('');
  if (ui.taskTemplateStaff) {
    ui.taskTemplateStaff.innerHTML = options;
  }
  if (ui.taskScheduleStaff) {
    ui.taskScheduleStaff.innerHTML = '<option value="all">Tất cả</option>' + options;
  }
  if (ui.taskReportForm) {
    const select = ui.taskReportForm.querySelector('[name="staff"]');
    if (select) select.innerHTML = options;
    const templateSelect = ui.taskReportForm.querySelector('[name="templateId"]');
    if (templateSelect) {
      const templateOptions = state.data.tasks.templates.map(template => `<option value="${template.id}">${formatDate(template.date)} - ${escapeHtml(resolveStaffName(template.staff))}</option>`).join('');
      templateSelect.innerHTML = '<option value="">Chọn checklist</option>' + templateOptions;
    }
  }
}

function renderAll() {
  renderDashboard();
  renderCustomers();
  renderCare();
  renderServiceTables();
  renderInventory();
  renderFinance();
  renderStaff();
  renderApprovals();
  renderTaskTemplates();
  renderTaskSchedule();
  renderTaskReports();
}

function populateBrandingForm() {
  if (!ui.brandingForm) return;
  const brandingDoc = state.data.branding.find(doc => doc.id === 'global') || state.data.branding[0];
  ui.brandingForm.siteName.value = brandingDoc?.siteName || 'KLC Bến Lức';
  ui.brandingForm.primaryColor.value = brandingDoc?.primary || BRAND?.primary || '#0F52BA';
}

async function updateBranding(formData) {
  if (state.profile?.role !== 'admin') {
    showToast('Chỉ quản trị viên mới có thể chỉnh thương hiệu');
    return;
  }
  const values = serializeFormData(formData);
  try {
    showLoader('Đang cập nhật thương hiệu...');
    const current = state.data.branding.find(doc => doc.id === 'global') || {};
    await db.collection('branding').doc('global').set({
      siteName: values.siteName || 'KLC Bến Lức',
      primary: values.primaryColor || BRAND?.primary || '#0F52BA',
      accent: current.accent || BRAND?.accent || '#F6C90E',
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: state.user?.uid || null
    }, { merge: true });
    applyBranding();
    populateBrandingForm();
    showToast('Đã cập nhật thương hiệu');
  } catch (error) {
    console.error(error);
    showToast('Không thể cập nhật thương hiệu');
  } finally {
    hideLoader();
  }
}

async function resetBranding() {
  if (state.profile?.role !== 'admin') return;
  try {
    await db.collection('branding').doc('global').delete();
    applyBranding();
    populateBrandingForm();
    showToast('Đã khôi phục mặc định');
  } catch (error) {
    console.error(error);
    showToast('Không thể khôi phục thương hiệu');
  }
}
