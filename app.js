 codex/fix-issues-in-checklist-page-tqo0oa
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

const STORAGE_KEY = 'klc-ben-luc-data-v1';
const REMEMBER_KEY = 'klc-ben-luc-remember';
const SESSION_KEY = 'klc-ben-luc-session';
const CLIENT_ID = crypto.randomUUID();
const REMOTE_PUSH_DEBOUNCE = 1200;

let remotePushTimer = null;
let remotePullTimer = null;
let remoteSyncInFlight = false;
let pendingRemotePush = false;
let broadcastChannel = null;

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
  approvals: [],
  sync: {
    enabled: false,
    remoteUrl: '',
    apiKey: '',
    method: 'PUT',
    autoPullMinutes: 5,
    lastPush: null,
    lastPull: null,
    lastError: null
  }
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
 main
};

const ui = {};

window.addEventListener('DOMContentLoaded', () => {
  captureUIReferences();
  applyBranding();
 codex/fix-issues-in-checklist-page-tqo0oa
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

  renderSyncStatus();
  updateSyncForm();
  attachEventListeners();
 codex/fix-issues-in-checklist-page-tahi62
  setupSyncListeners();

  setupSyncListeners(); // lắng nghe thay đổi localStorage & BroadcastChannel

 main
  const sourceSelect = document.getElementById('customer-source');
  if (sourceSelect) {
    toggleSourceDetail.call(sourceSelect);
  }
  if (currentUser) {
    bootApp();
  } else {
    showLogin();
    loadRemembered();
  }
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return parseStoredState(raw);
}

function saveState(options = {}) {
  const { skipRemote = false, skipBroadcast = false } = options;
codex/fix-issues-in-checklist-page-tahi62
  state = ensureStateIntegrity(state);

 main
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (!skipBroadcast) {
    broadcastState(skipRemote ? 'meta-update' : 'local-change');
  }
  if (!skipRemote) {
    scheduleRemoteSync();
  }
}

function parseStoredState(raw) {
 codex/fix-issues-in-checklist-page-tahi62
  if (!raw) return ensureStateIntegrity(defaultState());
  try {
    const parsed = JSON.parse(raw);
    return ensureStateIntegrity({ ...defaultState(), ...parsed });

  if (!raw) return defaultState();
  try {
    const parsed = JSON.parse(raw);
    return { ...defaultState(), ...parsed };
 main
  } catch (error) {
    console.error('Không thể tải dữ liệu, khởi tạo mặc định', error);
    return ensureStateIntegrity(defaultState());
  }
}

function handleExternalStateUpdate(raw) {
 codex/fix-issues-in-checklist-page-tahi62
  const nextState = raw ? parseStoredState(raw) : ensureStateIntegrity(defaultState());

  const nextState = raw ? parseStoredState(raw) : defaultState();
 main
  if (stateFingerprint(nextState) === stateFingerprint(state)) return;
  state = normalizeIncomingState(nextState);
  applyBranding();
  renderSyncStatus();
  updateSyncForm();
  if (currentUser) {
    refreshAll();
    showToast('Dữ liệu đã được đồng bộ từ tài khoản khác');
  }
  startRemotePolling();
  if (isRemoteSyncEnabled()) {
    pullRemoteState({ silent: true });
  }
}

function setupSyncListeners() {
  window.addEventListener('storage', evt => {
    if (evt.storageArea !== localStorage) return;
    if (evt.key === STORAGE_KEY || evt.key === null) {
      handleExternalStateUpdate(evt.newValue);
    }
  });

  if ('BroadcastChannel' in window) {
    broadcastChannel?.close?.();
    broadcastChannel = new BroadcastChannel('klc-ben-luc-sync');
    broadcastChannel.addEventListener('message', evt => {
      if (!evt?.data || evt.data.source === CLIENT_ID) return;
      if (evt.data.type === 'state-update') {
        handleExternalStateUpdate(JSON.stringify(evt.data.payload));
      }
    });
  }
}
main

  ui.logoutBtn?.addEventListener('click', () => auth.signOut());
  ui.logoutMobile?.addEventListener('click', () => auth.signOut());

 codex/fix-issues-in-checklist-page-tqo0oa
  ui.loginForm?.addEventListener('submit', handleLoginSubmit);
  ui.seedForm?.addEventListener('submit', handleSeedSubmit);

function broadcastState(reason = 'update') {
  if (!broadcastChannel) return;
  try {
    broadcastChannel.postMessage({
      type: 'state-update',
      payload: state,
      reason,
      source: CLIENT_ID
    });
  } catch (error) {
    console.warn('Không thể phát thông báo đồng bộ nội bộ', error);
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
 main

  ui.layoutToggle?.addEventListener('change', handleLayoutToggle);
  ui.layoutReset?.addEventListener('click', resetLayout);
  ui.backupExport?.addEventListener('click', backupAllCollections);
  ui.backupLatest?.addEventListener('click', fetchLatestBackup);

 codex/fix-issues-in-checklist-page-tqo0oa
  ui.migrateButton?.addEventListener('click', migrateLocalToCloud);
  ui.migrateDismiss?.addEventListener('click', () => {
    ui.migrateBanner?.classList.add('hidden');
    localStorage.setItem('klc-migration-dismissed', '1');

function attachEventListeners() {
  document.getElementById('login-form')?.addEventListener('submit', handleLogin);
  elements.logoutBtn?.addEventListener('click', () => {
    withLoading('Đang đăng xuất...', () => {
      clearSession();
      showLogin();
    });
 main
  });

  ui.checklistLinks.forEach(link => {
    link.addEventListener('click', () => {
 codex/fix-issues-in-checklist-page-tqo0oa
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

      if (!currentUser) return;
      const target = link.dataset.target;
      if (target === 'settings' && currentUser.role !== 'admin') {
        showToast('Bạn không có quyền truy cập mục này', true);
        return;
      }
      if (location.hash !== `#${target}`) {
        location.hash = target;
      } else {
        showPage(target);
      }
    });
  });

  const customerForm = document.getElementById('customer-form');
  if (customerForm) {
    customerForm.addEventListener('submit', handleCustomerSubmit);
    document.getElementById('customer-reset')?.addEventListener('click', () => showToast('Đã xóa thông tin trong form khách hàng'));
    document.getElementById('customer-source')?.addEventListener('change', toggleSourceDetail);
    document.getElementById('has-purchased')?.addEventListener('change', togglePurchase);
    document.getElementById('customer-search')?.addEventListener('input', renderCustomers);
    document.getElementById('open-care-from-customer')?.addEventListener('click', openCareFromCustomer);
    document.getElementById('open-history')?.addEventListener('click', openCustomerHistory);
  }

  const careForm = document.getElementById('care-form');
  if (careForm) {
    careForm.addEventListener('submit', handleCareSubmit);
    document.getElementById('care-reset')?.addEventListener('click', () => showToast('Đã xóa form CSKH'));
    document.getElementById('care-search')?.addEventListener('input', renderCare);
    document.getElementById('lost-reason')?.addEventListener('input', () => {});
    careForm.addEventListener('change', evt => {
      if (evt.target.name === 'rating') {
        document.getElementById('lost-reason')?.classList.toggle('hidden', evt.target.value !== 'lost');
        document.getElementById('schedule-panel')?.classList.toggle('hidden', evt.target.value !== 'scheduled');
      }
    });
  }
 codex/fix-issues-in-checklist-page-tahi62

  if (document.getElementById('service')) {
    document.querySelectorAll('#service .sub-tab').forEach(tab => tab.addEventListener('click', () => switchSubTab(tab)));
    document.getElementById('warranty-form')?.addEventListener('submit', evt => handleServiceSubmit(evt, 'warranty'));
    document.getElementById('maintenance-form')?.addEventListener('submit', evt => handleServiceSubmit(evt, 'maintenance'));
    document.getElementById('warranty-search')?.addEventListener('input', renderWarranties);
    document.getElementById('maintenance-search')?.addEventListener('input', renderMaintenances);
    document.getElementById('service-filter')?.addEventListener('change', renderMaintenances);
  }

  if (document.getElementById('checklist')) {
    document.querySelectorAll('#checklist .checklist-link').forEach(btn => btn.addEventListener('click', () => switchChecklistPane(btn.dataset.subpage)));
    document.getElementById('task-template')?.addEventListener('submit', handleTaskTemplateSubmit);
    document.getElementById('task-report')?.addEventListener('submit', handleTaskReportSubmit);
    document.getElementById('task-template-search')?.addEventListener('input', renderTaskTemplates);
    document.getElementById('task-report-search')?.addEventListener('input', renderTaskReports);
    document.getElementById('task-report-template')?.addEventListener('change', handleReportTemplateChange);
    document.getElementById('task-report')?.addEventListener('reset', () => syncReportTemplate(''));
    document.getElementById('task-schedule-staff')?.addEventListener('change', renderTaskSchedule);
    document.getElementById('task-schedule-month')?.addEventListener('change', renderTaskSchedule);
    document.getElementById('task-schedule-reset')?.addEventListener('click', resetTaskScheduleFilters);
  }

  const inventoryForm = document.getElementById('inventory-form');
  if (inventoryForm) {
    inventoryForm.addEventListener('submit', handleInventorySubmit);
    document.getElementById('inventory-search')?.addEventListener('input', renderInventory);
    document.getElementById('inventory-filter')?.addEventListener('change', renderInventory);
  }

  const financeForm = document.getElementById('finance-form');
  if (financeForm) {
    financeForm.addEventListener('submit', handleFinanceSubmit);
    document.getElementById('finance-month')?.addEventListener('change', renderFinanceSummary);
    document.getElementById('finance-export')?.addEventListener('click', exportFinance);
  }



  if (document.getElementById('service')) {
    document.querySelectorAll('#service .sub-tab').forEach(tab => tab.addEventListener('click', () => switchSubTab(tab)));
    document.getElementById('warranty-form')?.addEventListener('submit', evt => handleServiceSubmit(evt, 'warranty'));
    document.getElementById('maintenance-form')?.addEventListener('submit', evt => handleServiceSubmit(evt, 'maintenance'));
    document.getElementById('warranty-search')?.addEventListener('input', renderWarranties);
    document.getElementById('maintenance-search')?.addEventListener('input', renderMaintenances);
    document.getElementById('service-filter')?.addEventListener('change', renderMaintenances);
  }

  if (document.getElementById('checklist')) {
    document.querySelectorAll('#checklist .checklist-link').forEach(btn => btn.addEventListener('click', () => switchChecklistPane(btn.dataset.subpage)));
    document.getElementById('task-template')?.addEventListener('submit', handleTaskTemplateSubmit);
    document.getElementById('task-report')?.addEventListener('submit', handleTaskReportSubmit);
    document.getElementById('task-template-search')?.addEventListener('input', renderTaskTemplates);
    document.getElementById('task-report-search')?.addEventListener('input', renderTaskReports);
    document.getElementById('task-report-template')?.addEventListener('change', handleReportTemplateChange);
    document.getElementById('task-report')?.addEventListener('reset', () => syncReportTemplate(''));
    document.getElementById('task-schedule-staff')?.addEventListener('change', renderTaskSchedule);
    document.getElementById('task-schedule-month')?.addEventListener('change', renderTaskSchedule);
    document.getElementById('task-schedule-reset')?.addEventListener('click', resetTaskScheduleFilters);
  }

  const inventoryForm = document.getElementById('inventory-form');
  if (inventoryForm) {
    inventoryForm.addEventListener('submit', handleInventorySubmit);
    document.getElementById('inventory-search')?.addEventListener('input', renderInventory);
    document.getElementById('inventory-filter')?.addEventListener('change', renderInventory);
  }

  const financeForm = document.getElementById('finance-form');
  if (financeForm) {
    financeForm.addEventListener('submit', handleFinanceSubmit);
    document.getElementById('finance-month')?.addEventListener('change', renderFinanceSummary);
    document.getElementById('finance-export')?.addEventListener('click', exportFinance);
  }

 main
  const brandingForm = document.getElementById('branding-form');
  if (brandingForm) {
    brandingForm.addEventListener('submit', handleBrandingSubmit);
    document.getElementById('branding-reset')?.addEventListener('click', resetBranding);
    document.getElementById('staff-form')?.addEventListener('submit', handleStaffSubmit);
    document.getElementById('clear-approvals')?.addEventListener('click', clearApprovals);
    document.getElementById('toggle-layout-edit')?.addEventListener('click', toggleLayoutEdit);
  }

  const syncForm = document.getElementById('sync-config-form');
  if (syncForm) {
    syncForm.addEventListener('submit', handleSyncConfigSubmit);
    syncForm.querySelector('[name="enabled"]')?.addEventListener('change', handleSyncToggle);
    document.getElementById('sync-test')?.addEventListener('click', handleSyncTest);
    document.querySelectorAll('[data-sync-action]')
      .forEach(btn => btn.addEventListener('click', handleSyncAction));
    document.getElementById('sync-import-input')?.addEventListener('change', handleImportFile);
  }

  document.addEventListener('click', evt => {
    if (evt.target.matches('[data-close]')) {
      const modal = evt.target.closest('.modal');
      modal?.remove();
main
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

 codex/fix-issues-in-checklist-page-tqo0oa
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

function bootApp() {
  if (elements.loginCard) elements.loginCard.style.display = 'none';
  if (elements.sidebar) elements.sidebar.style.display = 'flex';
  document.body?.classList?.remove('auth-only');
  if (elements.roleLabel) {
    elements.roleLabel.textContent = `${currentUser.fullName} (${currentUser.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'})`;
  }
  filterNavByRole();
  refreshAll();
  if (location.hash) {
    const success = showPageFromHash({ silent: true });
    if (!success) {
      const fallback = getInitialPage({ preferHash: false });
      if (fallback) {
        showPage(fallback, { silent: true });
        updateHashSilently(fallback);
      }
    }
  } else {
    const initialPage = getInitialPage({ preferHash: false });
    if (initialPage) {
      showPage(initialPage);
      updateHashSilently(initialPage);
    }
  }
  startRemotePolling();
}

function showLogin() {
  if (elements.loginCard) elements.loginCard.style.display = 'block';
  if (elements.sidebar) elements.sidebar.style.display = 'none';
  elements.pages.forEach(page => page.classList.remove('active'));
  elements.navLinks.forEach(link => link.classList.remove('active'));
  document.getElementById('login-username')?.focus();
  stopRemotePolling();
}

function filterNavByRole() {
  const settingsLink = [...elements.navLinks].find(link => link.dataset.target === 'settings');
  if (!settingsLink) return;
  if (currentUser.role !== 'admin') {
    settingsLink.style.display = 'none';
 main
  } else {
    state.profile = { id: snap.id, ...snap.data() };
  }
}

 codex/fix-issues-in-checklist-page-tqo0oa
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

function getInitialPage({ preferHash = true } = {}) {
  const candidates = [
    preferHash ? location.hash.replace('#', '') : null,
    document.body?.dataset?.defaultPage,
    window.DEFAULT_PAGE,
    'dashboard'
  ];
  for (const candidate of candidates) {
    const id = candidate?.trim?.();
    if (!id) continue;
    if (id === 'settings' && currentUser?.role !== 'admin') continue;
    if ([...elements.pages].some(page => page.id === id)) {
      return id;
    }
  }
  return elements.pages[0]?.id ?? null;
}

function showPage(id, { silent = false } = {}) {
  if (!id) return false;
  if (id === 'settings' && currentUser?.role !== 'admin') {
    if (!silent) {
      showToast('Bạn không có quyền truy cập mục này', true);
    }
    return false;
  }
  const hasPage = [...elements.pages].some(page => page.id === id);
  if (!hasPage) return false;
  elements.pages.forEach(page => page.classList.toggle('active', page.id === id));
  elements.navLinks.forEach(link => link.classList.toggle('active', link.dataset.target === id));
  return true;
}

function handleLogin(evt) {
  evt.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();
  const remember = document.getElementById('remember-me').checked;
  const staySigned = document.getElementById('stay-signed').checked;
  state = ensureStateIntegrity(state);
  let user = state.users.find(u => u.username === username && u.password === password);
  if (!user) {
    const fallback = defaultState().users.find(
      u => u.username === username && u.password === password
    );
    const existing = state.users.find(u => u.username === username);
    if (fallback && !existing) {
      user = { ...fallback };
      state.users.push(user);
      saveState();
      user = state.users.find(u => u.username === username && u.password === password);
    } else if (fallback && existing) {
      existing.password = fallback.password;
      existing.role = existing.role || fallback.role;
      existing.fullName = existing.fullName || fallback.fullName;
      existing.updatedAt = new Date().toISOString();
      saveState();
      user = state.users.find(u => u.username === username && u.password === password);
    }
  }
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
main
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
 codex/fix-issues-in-checklist-page-tqo0oa
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

  const form = evt.target;
  withLoading('Đang lưu khách hàng...', () => {
    const data = Object.fromEntries(new FormData(form));
    data.id = crypto.randomUUID();
    data.createdBy = currentUser.username;
    data.createdAt = new Date().toISOString();
    data.updatedAt = data.createdAt;
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
    .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
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
 main
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

 codex/fix-issues-in-checklist-page-tqo0oa
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

function handleCustomerAction(evt) {
  const id = evt.target.closest('tr').dataset.id;
  if (evt.target.dataset.action === 'history') {
    openHistoryModal(id);
  }
  if (evt.target.dataset.action === 'care') {
    const customer = state.customers.find(c => c.id === id);
    if (!customer) return;
    showPage('care');
    if (location.hash !== '#care') {
      location.hash = 'care';
    }
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
    data.updatedAt = data.createdAt;
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
    .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
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
 main
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

codex/fix-issues-in-checklist-page-tqo0oa
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

function handleServiceSubmit(evt, type) {
  evt.preventDefault();
  const form = evt.target;
  withLoading('Đang lưu thông tin dịch vụ...', () => {
    const data = Object.fromEntries(new FormData(form));
    data.id = crypto.randomUUID();
    data.type = type;
    data.createdAt = new Date().toISOString();
    data.updatedAt = data.createdAt;
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
 main
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

 codex/fix-issues-in-checklist-page-tqo0oa
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

function handleTaskTemplateSubmit(evt) {
  evt.preventDefault();
  withLoading('Đang lưu hạng mục...', () => {
    const data = Object.fromEntries(new FormData(evt.target));
    data.id = crypto.randomUUID();
    data.tasks = data.tasks.split('\n').map(t => t.trim()).filter(Boolean);
    data.createdAt = new Date().toISOString();
    data.updatedAt = data.createdAt;
    state.tasks.templates.push(data);
    saveState();
    evt.target.reset();
    renderTaskTemplates();
    renderTaskSchedule();
    populateTaskReportTemplates();
    showToast('Đã lưu hạng mục công việc');
  });
}

function handleTaskReportSubmit(evt) {
  evt.preventDefault();
  withLoading('Đang lưu báo cáo...', () => {
    const formData = new FormData(evt.target);
    const data = Object.fromEntries(formData.entries());
    const template = state.tasks.templates.find(t => t.id === data.templateId);
    const taskResults = (template?.tasks ?? []).map((task, index) => ({
      name: task,
      status: formData.get(`task-status-${index}`) ?? 'pending',
      note: formData.get(`task-note-${index}`) ?? ''
    }));
    Object.keys(data).forEach(key => {
      if (key.startsWith('task-status-') || key.startsWith('task-note-')) {
        delete data[key];
      }
    });
    data.taskResults = taskResults;
    data.totalTasks = taskResults.length;
    data.completedTasks = taskResults.filter(item => item.status === 'done').length;
    if (data.totalTasks) {
      data.status = data.completedTasks === data.totalTasks ? 'done' : 'partial';
    }
    data.id = crypto.randomUUID();
    data.createdAt = new Date().toISOString();
    data.updatedAt = data.createdAt;
    state.tasks.reports.push(data);
    saveState();
    evt.target.reset();
    syncReportTemplate('');
    renderTaskTemplates();
    renderTaskSchedule();
    renderTaskReports();
    showToast('Đã lưu báo cáo công việc');
  });
}

function renderTaskTemplates() {
  const tbody = document.querySelector('#task-template-table tbody');
  if (!tbody) return;
  const searchInput = document.getElementById('task-template-search');
  const query = (searchInput?.value || '').toLowerCase();
  const rows = state.tasks.templates
    .filter(item => !query || Object.values(item).some(v => String(v ?? '').toLowerCase().includes(query)))
    .sort((a, b) => new Date(b.date ?? b.createdAt) - new Date(a.date ?? a.createdAt))
    .map(item => {
      const tr = document.createElement('tr');
      tr.dataset.id = item.id;
      const relatedReports = findReportsForTemplate(item);
      const reportLabel = relatedReports.length ? `${relatedReports.length} báo cáo` : 'Chưa có';
      tr.innerHTML = `
        <td>${formatDate(item.date || item.createdAt)}</td>
        <td>${item.staff ?? 'Chưa phân công'}</td>
        <td>${renderShift(item.shift)}</td>
        <td>${item.tasks.length}</td>
        <td>${reportLabel}</td>
        <td>
          <button data-action="view">Xem</button>
          <button data-action="report" class="ghost">Báo cáo</button>
          <button data-action="delete" class="danger">Xóa</button>
        </td>`;
      return tr;
    });
  if (!rows.length) {
    const empty = document.createElement('tr');
    empty.innerHTML = '<td colspan="6">Chưa có checklist nào.</td>';
    tbody.replaceChildren(empty);
    return;
  }
  tbody.replaceChildren(...rows);
  tbody.querySelectorAll('button').forEach(btn => btn.addEventListener('click', handleTaskTemplateAction));
}

function renderTaskSchedule() {
  const tbody = document.querySelector('#task-schedule-table tbody');
  if (!tbody) return;
  const staffFilter = document.getElementById('task-schedule-staff')?.value ?? 'all';
  const monthFilter = document.getElementById('task-schedule-month')?.value ?? '';
  const rows = state.tasks.templates
    .filter(item => staffFilter === 'all' || item.staff === staffFilter)
    .filter(item => {
      if (!monthFilter) return true;
      if (!item.date) return false;
      return item.date.startsWith(monthFilter);
    })
    .sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt))
    .map(item => {
      const tr = document.createElement('tr');
      tr.dataset.id = item.id;
      const reports = findReportsForTemplate(item);
      const reportLabel = reports.length ? `${reports.length} báo cáo` : 'Chưa có';
      tr.innerHTML = `
        <td>${formatDate(item.date || item.createdAt)}</td>
        <td>${item.staff ?? 'Chưa phân công'}</td>
        <td>${renderShift(item.shift)}</td>
        <td>${item.tasks.length}</td>
        <td>${reportLabel}</td>
        <td>
          <div class="task-schedule-actions">
            <button data-action="view">Xem</button>
            <button data-action="report" class="ghost">Báo cáo</button>
          </div>
        </td>`;
      return tr;
    });
  if (!rows.length) {
    const empty = document.createElement('tr');
    empty.innerHTML = '<td colspan="6">Chưa có checklist phù hợp với bộ lọc.</td>';
    tbody.replaceChildren(empty);
    return;
  }
  tbody.replaceChildren(...rows);
  tbody.querySelectorAll('button').forEach(btn => btn.addEventListener('click', handleTaskTemplateAction));
}

function renderTaskReports() {
  const tbody = document.querySelector('#task-report-table tbody');
  if (!tbody) return;
  const searchInput = document.getElementById('task-report-search');
  const query = (searchInput?.value || '').toLowerCase();
  const rows = state.tasks.reports
    .filter(item => {
      if (!query) return true;
      const values = [
        item.date,
        item.staff,
        item.shift,
        item.status,
        item.reason,
        item.expected,
        item.summary,
        ...(item.taskResults ?? []).map(result => `${result.name} ${result.note ?? ''}`)
      ];
      return values.some(v => String(v ?? '').toLowerCase().includes(query));
    })
    .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
    .map(item => {
      const tr = document.createElement('tr');
      tr.dataset.id = item.id;
      const template = state.tasks.templates.find(t => t.id === item.templateId);
      const totalTasks = Number(item.totalTasks ?? template?.tasks?.length ?? 0);
      const completedTasks = Number(item.completedTasks ?? (item.status === 'done' ? totalTasks : 0));
      const completion = totalTasks ? `<span class="muted">${completedTasks}/${totalTasks} mục</span>` : '';
      tr.innerHTML = `
        <td>${formatDate(item.date || item.createdAt)}</td>
        <td>${item.staff ?? 'Chưa phân công'}</td>
        <td>${renderShift(item.shift)}</td>
        <td>${renderTaskStatus(item.status)}${completion}</td>
        <td>
          <button data-action="view">Xem</button>
          <button data-action="delete" class="danger">Xóa</button>
        </td>`;
      return tr;
    });
  if (!rows.length) {
    const empty = document.createElement('tr');
    empty.innerHTML = '<td colspan="5">Chưa có báo cáo nào.</td>';
    tbody.replaceChildren(empty);
    return;
  }
  tbody.replaceChildren(...rows);
  tbody.querySelectorAll('button').forEach(btn => btn.addEventListener('click', handleTaskReportAction));
}

function handleTaskTemplateAction(evt) {
  const action = evt.target.dataset.action;
  if (!action) return;
  const row = evt.target.closest('tr');
  const id = row?.dataset.id;
  if (!id) return;
  if (action === 'view') {
    const template = state.tasks.templates.find(t => t.id === id);
    if (!template) return;
    const relatedReports = findReportsForTemplate(template);
    openInfoModal('Chi tiết checklist', renderTaskTemplateDetail(template, relatedReports));
  }
  if (action === 'report') {
    openReportForTemplate(id);
  }
  if (action === 'delete') {
    requestDelete('taskTemplate', id);
  }
}

function handleTaskReportAction(evt) {
  const id = evt.target.closest('tr').dataset.id;
  if (evt.target.dataset.action === 'view') {
    const report = state.tasks.reports.find(t => t.id === id);
    if (!report) return;
    const template = state.tasks.templates.find(t => t.id === report.templateId)
      ?? state.tasks.templates.find(t => t.staff === report.staff && t.date === report.date && t.shift === report.shift);
    openInfoModal('Báo cáo công việc', renderTaskReportDetail(report, template));
  }
  if (evt.target.dataset.action === 'delete') {
    requestDelete('taskReport', id);
  }
}

function renderTaskTemplateDetail(template, reports) {
  const tasks = (template.tasks ?? []).map(task => `<li>${task}</li>`).join('') || '<li>Chưa có hạng mục</li>';
  const reportList = reports.length
    ? reports.map(r => {
        const total = Number(r.totalTasks ?? template.tasks?.length ?? 0);
        const completed = Number(r.completedTasks ?? (r.status === 'done' ? total : 0));
        const summary = total ? `<span class="muted">${completed}/${total} mục</span>` : '';
        return `<li>${formatDate(r.date || r.createdAt)} - ${renderShift(r.shift)}: ${renderTaskStatus(r.status)} ${summary}</li>`;
      }).join('')
    : '<li>Chưa có báo cáo</li>';
  return `
    <p><strong>Ngày:</strong> ${formatDate(template.date || template.createdAt)}</p>
    <p><strong>Nhân viên:</strong> ${template.staff ?? 'Chưa phân công'}</p>
    <p><strong>Ca:</strong> ${renderShift(template.shift)}</p>
    <p><strong>Ghi chú:</strong> ${template.notes ?? 'Không có'}</p>
    <h4>Danh sách công việc</h4>
    <ol>${tasks}</ol>
    <h4>Báo cáo liên quan</h4>
    <ul>${reportList}</ul>`;
}

function renderTaskReportDetail(report, template) {
  const totalTasks = Number(report.totalTasks ?? template?.tasks?.length ?? 0);
  const completedTasks = Number(report.completedTasks ?? (report.status === 'done' ? totalTasks : 0));
  const progressNote = report.progress ? `<p><strong>Ghi chú tiến độ:</strong> ${report.progress.replace(/\n/g, '<br/>')}</p>` : '';
  const summary = totalTasks
    ? `<div class="task-report-summary"><span><strong>${completedTasks}</strong> / ${totalTasks} hạng mục hoàn thành</span></div>`
    : '';
  const tasks = report.taskResults?.length
    ? `<ol>${report.taskResults.map((task, index) => {
        const note = task.note ? `<div class="table-note">${task.note}</div>` : '';
        return `<li><div><strong>${index + 1}.</strong> ${task.name} ${renderTaskResultStatus(task.status)}</div>${note}</li>`;
      }).join('')}</ol>`
    : template?.tasks?.length
      ? `<ol>${template.tasks.map((task, index) => `<li><strong>${index + 1}.</strong> ${task}</li>`).join('')}</ol>`
      : '<p>Không có checklist tham chiếu.</p>';
  const templateNotice = template ? '' : '<p><em>Không tìm thấy checklist gốc.</em></p>';
  return `
    <p><strong>Ngày:</strong> ${formatDate(report.date || report.createdAt)}</p>
    <p><strong>Nhân viên:</strong> ${report.staff ?? 'Chưa phân công'}</p>
    <p><strong>Ca:</strong> ${renderShift(report.shift)}</p>
    ${summary}
    ${progressNote}
    <p><strong>Trạng thái:</strong> ${renderTaskStatus(report.status)}</p>
    <p><strong>Lý do:</strong> ${report.reason || 'Không'}</p>
    <p><strong>Dự kiến hoàn thành:</strong> ${report.expected || 'Không'}</p>
    <p><strong>Tổng kết:</strong> ${report.summary || 'Không'}</p>
    <hr/>
    <h4>Kết quả checklist</h4>
    ${tasks}
    ${templateNotice}`;
}

function findReportsForTemplate(template) {
  if (!template) return [];
  return state.tasks.reports.filter(r => r.staff === template.staff && r.date === template.date && r.shift === template.shift);
}

function handleReportTemplateChange(evt) {
  syncReportTemplate(evt.target.value);
}

function syncReportTemplate(templateId) {
  const form = document.getElementById('task-report');
  const taskContainer = document.getElementById('task-report-tasks');
  if (!form || !taskContainer) return;
  if (!templateId) {
    form.date.value = '';
    form.staff.value = '';
    if (form.staff.value) form.staff.selectedIndex = -1;
    form.shift.value = '';
    if (form.shift.value) form.shift.selectedIndex = -1;
    taskContainer.classList.add('empty');
    taskContainer.innerHTML = 'Chọn checklist để hiển thị các hạng mục.';
    return;
  }
  const template = state.tasks.templates.find(t => t.id === templateId);
  if (!template) {
    taskContainer.classList.add('empty');
    taskContainer.innerHTML = 'Không tìm thấy checklist đã chọn.';
    return;
  }
  if (template.date) {
    form.date.value = template.date;
  } else {
    form.date.value = '';
  }
  if (template.staff) {
    if (![...form.staff.options].some(opt => opt.value === template.staff)) {
      const option = document.createElement('option');
      option.value = template.staff;
      option.textContent = template.staff;
      form.staff.appendChild(option);
    }
    form.staff.value = template.staff;
  } else {
    form.staff.value = '';
    if (form.staff.value) form.staff.selectedIndex = -1;
  }
  if (template.shift) form.shift.value = template.shift;
  if (!template.shift) {
    form.shift.value = '';
    if (form.shift.value) form.shift.selectedIndex = -1;
  }
  if (template.tasks?.length) {
    taskContainer.classList.remove('empty');
    const items = template.tasks.map((task, index) => `
      <div class="task-report-item" data-index="${index}">
        <div class="task-report-item-header">
          <span>${index + 1}. ${task}</span>
          <select name="task-status-${index}">
            <option value="done">Hoàn thành</option>
            <option value="pending">Chưa hoàn thành</option>
          </select>
        </div>
        <textarea name="task-note-${index}" placeholder="Ghi chú (tuỳ chọn)"></textarea>
      </div>`).join('');
    taskContainer.innerHTML = `${items}<div class="task-report-summary"><span><strong>${template.tasks.length}</strong> hạng mục trong checklist</span></div>`;
  } else {
    taskContainer.classList.add('empty');
    taskContainer.innerHTML = 'Checklist chưa có hạng mục.';
  }
}

function switchChecklistPane(target) {
  const id = typeof target === 'string' ? target : target?.dataset?.subpage;
  if (!id) return;
  const buttons = document.querySelectorAll('#checklist .checklist-link');
  const panels = document.querySelectorAll('#checklist .checklist-panel');
  let matched = false;
  panels.forEach(panel => {
    const isActive = panel.dataset.subpage === id;
    panel.classList.toggle('active', isActive);
    if (isActive) matched = true;
  });
  buttons.forEach(btn => btn.classList.toggle('active', btn.dataset.subpage === id));
  if (!matched && panels.length) {
    panels[0].classList.add('active');
    buttons[0]?.classList.add('active');
  }
}

function resetTaskScheduleFilters() {
  const staffSelect = document.getElementById('task-schedule-staff');
  const monthInput = document.getElementById('task-schedule-month');
  if (staffSelect) staffSelect.value = 'all';
  if (monthInput) monthInput.value = '';
  renderTaskSchedule();
}

function openReportForTemplate(id) {
  const template = state.tasks.templates.find(t => t.id === id);
  if (!template) return;
  showPage('checklist', { silent: true });
  updateHashSilently('checklist');
  switchChecklistPane('reports');
  const select = document.getElementById('task-report-template');
  if (!select) return;
  populateTaskReportTemplates();
  if (![...select.options].some(opt => opt.value === id)) {
    const option = document.createElement('option');
    option.value = template.id;
    option.textContent = formatTemplateLabel(template);
    select.appendChild(option);
  }
  select.value = id;
  syncReportTemplate(id);
  document.getElementById('task-report')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function populateTaskReportTemplates() {
  const select = document.getElementById('task-report-template');
  if (!select) return;
  const current = select.value;
  const templates = [...state.tasks.templates].sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
  const options = templates.map(template => `<option value="${template.id}">${formatTemplateLabel(template)}</option>`).join('');
  select.innerHTML = `<option value="">-- Chọn checklist --</option>${options}`;
  if (current && templates.some(t => t.id === current)) {
    select.value = current;
    syncReportTemplate(current);
  } else {
    select.value = '';
    syncReportTemplate('');
  }
}

function formatTemplateLabel(template) {
  const dateLabel = formatDate(template.date || template.createdAt) || 'Chưa có ngày';
  const staffLabel = template.staff || 'Chưa phân công';
  const shiftLabel = renderShift(template.shift);
  return `${dateLabel} · ${staffLabel} · ${shiftLabel}`;
}

function renderShift(shift) {
  return {
    morning: 'Ca sáng (08:00 - 16:00)',
    evening: 'Ca chiều (13:00 - 21:00)',
    full: 'Ca full (08:00 - 21:00)'
  }[shift] ?? (shift || 'Chưa xác định');
 main
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

 codex/fix-issues-in-checklist-page-tqo0oa
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

function renderTaskResultStatus(status) {
  return status === 'done' ? '<span class="badge success">Hoàn thành</span>' : '<span class="badge warning">Chưa xong</span>';
}

function handleInventorySubmit(evt) {
  evt.preventDefault();
  withLoading('Đang lưu tồn kho...', () => {
    const data = Object.fromEntries(new FormData(evt.target));
    data.id = crypto.randomUUID();
    data.createdAt = new Date().toISOString();
    data.updatedAt = data.createdAt;
    state.inventory.push(data);
    saveState();
    evt.target.reset();
    renderInventory();
    updateDashboard();
    showToast('Đã lưu giao dịch tồn kho');
  });
 main
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

 codex/fix-issues-in-checklist-page-tqo0oa
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

function handleFinanceSubmit(evt) {
  evt.preventDefault();
  withLoading('Đang lưu giao dịch...', () => {
    const data = Object.fromEntries(new FormData(evt.target));
    data.id = crypto.randomUUID();
    data.createdAt = new Date().toISOString();
    data.updatedAt = data.createdAt;
    state.finance.push(data);
    saveState();
    evt.target.reset();
    renderFinance();
    updateDashboard();
    showToast('Đã lưu giao dịch thu/chi');
 main
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

 codex/fix-issues-in-checklist-page-tqo0oa
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

function applyBranding() {
  document.documentElement.style.setProperty('--primary', state.primaryColor);
  document.documentElement.style.setProperty('--primary-dark', shadeColor(state.primaryColor, -15));
  document.documentElement.style.setProperty('--primary-light', shadeColor(state.primaryColor, 70));
  document.title = `${state.siteName} - Hệ thống quản trị nội bộ`;
  document.querySelectorAll('.brand h1').forEach(el => el.textContent = state.siteName);
  if (state.logo) {
    if (elements.brandLogo) elements.brandLogo.src = state.logo;
    const loginLogo = document.querySelector('.login-logo');
    if (loginLogo) loginLogo.src = state.logo;
  } else {
    if (elements.brandLogo) elements.brandLogo.src = 'assets/logo.svg';
    const loginLogo = document.querySelector('.login-logo');
    if (loginLogo) loginLogo.src = 'assets/logo.svg';
 main
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
 codex/fix-issues-in-checklist-page-tqo0oa

  withLoading('Đang lưu nhân sự...', () => {
    const data = Object.fromEntries(new FormData(evt.target));
    const username = (data.username || '').trim();
    if (!username) {
      showToast('Vui lòng nhập tài khoản hợp lệ', true);
      return;
    }
    if (!data.password) {
      showToast('Vui lòng nhập mật khẩu', true);
      return;
    }
    const existing = state.users.find(u => u.username === username);
    const timestamp = new Date().toISOString();
    if (existing) {
      existing.password = data.password;
      existing.fullName = data.fullName || username;
      existing.role = data.role;
      existing.updatedAt = timestamp;
    } else {
      state.users.push({
        username,
        password: data.password,
        fullName: data.fullName || username,
        role: data.role,
        createdAt: timestamp,
        updatedAt: timestamp
      });
    }
    saveState();
    evt.target.reset();
    renderStaff();
    populateStaffSelectors();
    showToast('Đã cập nhật danh sách nhân sự');
  });
 main
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

 codex/fix-issues-in-checklist-page-tqo0oa
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

codex/fix-issues-in-checklist-page-tahi62

/* ====== SYNC UI & LOGIC ====== */
 main
function renderSyncStatus() {
  const wrapper = document.getElementById('sync-status');
  const badge = document.getElementById('sync-status-badge');
  if (!wrapper) return;
  const config = state.sync ?? defaultState().sync;
  const enabled = Boolean(config.enabled && config.remoteUrl);
  const statusDot = `<span class="status-dot ${enabled ? 'online' : 'offline'}"></span>`;
  const lines = [
    `<p><strong>Trạng thái:</strong> ${statusDot}${enabled ? 'Đã bật đồng bộ' : 'Đang tắt đồng bộ'}</p>`,
    `<p><strong>Máy chủ:</strong> ${config.remoteUrl ? `<span class="mono">${config.remoteUrl}</span>` : 'Chưa cấu hình'}</p>`,
    `<p><strong>Lần gửi:</strong> ${config.lastPush ? formatDateTime(config.lastPush) : 'Chưa có'}</p>`,
    `<p><strong>Lần tải:</strong> ${config.lastPull ? formatDateTime(config.lastPull) : 'Chưa có'}</p>`
  ];
  if (config.lastError) {
    lines.push(`<p class="error"><strong>Lỗi gần nhất:</strong> ${config.lastError}</p>`);
 codex/fix-issues-in-checklist-page-tahi62
  }
  wrapper.innerHTML = lines.join('');
  if (badge) {
    badge.textContent = enabled ? 'Đã bật' : 'Đang tắt';
    badge.classList.toggle('online', enabled);
    badge.classList.toggle('offline', !enabled);
  }
}

function updateSyncForm() {
  const form = document.getElementById('sync-config-form');
  if (!form) return;
  const config = state.sync ?? defaultState().sync;
  const enabledInput = form.querySelector('[name="enabled"]');
  const urlInput = form.querySelector('[name="remoteUrl"]');
  const keyInput = form.querySelector('[name="apiKey"]');
  const methodSelect = form.querySelector('[name="method"]');
  const intervalInput = form.querySelector('[name="interval"]');
  const enabled = Boolean(config.enabled);
  if (enabledInput) enabledInput.checked = enabled;
  if (urlInput) {
    urlInput.value = config.remoteUrl ?? '';
    urlInput.disabled = !enabled;
  }
  if (keyInput) {
    keyInput.value = config.apiKey ?? '';
    keyInput.disabled = !enabled;
  }
  if (methodSelect) {
    methodSelect.value = (config.method ?? 'PUT').toUpperCase();
    methodSelect.disabled = !enabled;
  }
  if (intervalInput) {
    intervalInput.value = config.autoPullMinutes ?? 5;
    intervalInput.disabled = !enabled;
  }
  const testButton = document.getElementById('sync-test');
  if (testButton) testButton.disabled = !enabled;
  document.querySelectorAll('[data-sync-action]').forEach(button => {
    const action = button.dataset.syncAction;
    const requiresRemote = !['export', 'import'].includes(action);
    button.disabled = requiresRemote ? !enabled : false;
  });
}

function scheduleRemoteSync(options = {}) {
  if (!isRemoteSyncEnabled()) return;
  const { immediate = false, reason = 'auto' } = options;
  if (immediate) {
    pushRemoteState({ reason }).catch(() => {});
    return;
  }
  clearTimeout(remotePushTimer);
  remotePushTimer = setTimeout(() => {
    pushRemoteState({ reason }).catch(() => {});
  }, REMOTE_PUSH_DEBOUNCE);
}

function isRemoteSyncEnabled() {
  const config = state.sync ?? defaultState().sync;
  return Boolean(config.enabled && config.remoteUrl);
}

async function pushRemoteState({ reason = 'auto' } = {}) {
  if (!isRemoteSyncEnabled()) return false;
  if (remoteSyncInFlight) {
    pendingRemotePush = true;
    return false;
  }
  remoteSyncInFlight = true;
  const config = state.sync;
  try {
    let payload = prepareStateForTransport();
    try {
      const remoteSnapshot = await fetchRemoteState();
      payload = mergeStateSnapshots(payload, remoteSnapshot);
    } catch (mergeError) {
      console.warn('Không thể hợp nhất dữ liệu từ máy chủ, sử dụng dữ liệu cục bộ', mergeError);
    }
    const response = await fetch(config.remoteUrl, {
      method: (config.method ?? 'PUT').toUpperCase(),
      headers: buildSyncHeaders({ includeJson: true }),
      body: JSON.stringify({
        reason,
        updatedAt: new Date().toISOString(),
        data: payload
      })
    });
    if (!response.ok) {
      throw new Error(`Máy chủ trả về mã ${response.status}`);
    }
    const pushedAt = new Date().toISOString();
    state.sync.lastPush = pushedAt;
    state.sync.lastError = null;
    saveState({ skipRemote: true });
    renderSyncStatus();
    return true;
  } catch (error) {
    state.sync.lastError = error.message;
    saveState({ skipRemote: true });
    renderSyncStatus();
    console.error('Đẩy dữ liệu lên máy chủ thất bại', error);
    return false;
  } finally {
    remoteSyncInFlight = false;
    if (pendingRemotePush) {
      pendingRemotePush = false;
      scheduleRemoteSync({ immediate: true, reason: 'retry' });
    }
  }
}

async function pullRemoteState({ silent = false } = {}) {
  if (!isRemoteSyncEnabled()) return false;
  try {
    const remoteState = await fetchRemoteState();
    const merged = mergeStateSnapshots(state, remoteState);
    const hasChanged = stateFingerprint(merged) !== stateFingerprint(state);
    state = merged;
    state.sync.lastPull = new Date().toISOString();
    state.sync.lastError = null;
    saveState({ skipRemote: true });
    renderSyncStatus();
    applyBranding();
    if (currentUser) {
      refreshAll();
      if (!silent && hasChanged) {
        showToast('Đã cập nhật dữ liệu từ máy chủ');
      }
    }
    startRemotePolling();
    return hasChanged;
  } catch (error) {
    state.sync.lastError = error.message;
    saveState({ skipRemote: true });
    renderSyncStatus();
    if (!silent) {
      showToast('Không thể tải dữ liệu từ máy chủ đồng bộ', true);
    }
    console.error('Không thể lấy dữ liệu từ máy chủ đồng bộ', error);
    return false;
  }
}

async function fetchRemoteState() {
  const config = state.sync;
  const response = await fetch(config.remoteUrl, {
    method: 'GET',
    headers: buildSyncHeaders(),
    cache: 'no-store'
 main
  });
  if (!response.ok) {
    throw new Error(`Máy chủ trả về mã ${response.status}`);
  }
  const payload = await response.json();
  const remoteState = payload?.data ?? payload?.state ?? payload;
  if (!remoteState || typeof remoteState !== 'object') {
    throw new Error('Dữ liệu phản hồi không hợp lệ');
  }
  return remoteState;
}

function startRemotePolling() {
  clearInterval(remotePullTimer);
  if (!isRemoteSyncEnabled()) return;
  const interval = Math.max(1, Number(state.sync?.autoPullMinutes) || 5) * 60000;
  remotePullTimer = setInterval(() => {
    pullRemoteState({ silent: true });
  }, interval);
}

function stopRemotePolling() {
  clearInterval(remotePullTimer);
  remotePullTimer = null;
}

function prepareStateForTransport() {
  const cleaned = ensureStateIntegrity(state);
  const clone = JSON.parse(JSON.stringify(cleaned));
  if (!clone.sync) {
    clone.sync = { ...defaultState().sync };
  }
  delete clone.sync.lastError;
  delete clone.sync.lastPull;
  delete clone.sync.lastPush;
  return clone;
}

function normalizeIncomingState(nextState) {
  const parsed = parseStoredState(JSON.stringify(nextState));
  const localSync = state?.sync ?? defaultState().sync;
  const incomingSync = parsed.sync ?? {};
  return {
    ...parsed,
    sync: {
      ...localSync,
      ...incomingSync,
      enabled: incomingSync.enabled ?? localSync.enabled,
      remoteUrl: incomingSync.remoteUrl ?? localSync.remoteUrl,
      apiKey: incomingSync.apiKey ?? localSync.apiKey,
      method: (incomingSync.method ?? localSync.method ?? 'PUT').toUpperCase()
    }
  };
}

function mergeStateSnapshots(primarySnapshot, secondarySnapshot) {
  const primary = ensureStateIntegrity(primarySnapshot);
  const secondary = ensureStateIntegrity(secondarySnapshot);
  const merged = {
    ...primary,
    ...secondary,
    users: normalizeUsers(
      [...primary.users, ...secondary.users],
      defaultState().users
    ),
    customers: mergeCollections(primary.customers, secondary.customers),
    care: mergeCollections(primary.care, secondary.care),
    warranties: mergeCollections(primary.warranties, secondary.warranties),
    maintenances: mergeCollections(primary.maintenances, secondary.maintenances),
    inventory: mergeCollections(primary.inventory, secondary.inventory),
    finance: mergeCollections(primary.finance, secondary.finance),
    approvals: mergeCollections(primary.approvals, secondary.approvals),
    tasks: {
      templates: mergeTaskTemplates(primary.tasks.templates, secondary.tasks.templates),
      reports: mergeTaskReports(primary.tasks.reports, secondary.tasks.reports)
    },
    sync: mergeSyncConfig(primary.sync, secondary.sync)
  };
  return ensureStateIntegrity(merged);
}

function mergeCollections(primary = [], secondary = []) {
  return normalizeCollection([...primary, ...secondary], []);
}

function mergeTaskTemplates(primary = [], secondary = []) {
  return mergeCollections(primary, secondary).map(template => ({
    ...template,
    steps: ensureArray(template?.steps),
    tasks: ensureArray(template?.tasks),
    checklist: ensureArray(template?.checklist)
  }));
}

function mergeTaskReports(primary = [], secondary = []) {
  return mergeCollections(primary, secondary).map(report => ({
    ...report,
    items: ensureArray(report?.items),
    results: ensureArray(report?.results),
    tasks: ensureArray(report?.tasks)
  }));
}

function mergeSyncConfig(primary = {}, secondary = {}) {
  const base = defaultState().sync;
  const normalizedPrimary = { ...base, ...primary };
  const normalizedSecondary = { ...base, ...secondary };
  const resolvedEnabled =
    typeof primary?.enabled === 'boolean'
      ? primary.enabled
      : (typeof secondary?.enabled === 'boolean' ? secondary.enabled : base.enabled);
  return {
    ...base,
    ...normalizedSecondary,
    ...normalizedPrimary,
    enabled: resolvedEnabled,
    remoteUrl: normalizedPrimary.remoteUrl || normalizedSecondary.remoteUrl || base.remoteUrl,
    apiKey: normalizedPrimary.apiKey || normalizedSecondary.apiKey || base.apiKey,
    method: (normalizedPrimary.method || normalizedSecondary.method || base.method || 'PUT').toUpperCase(),
    autoPullMinutes:
      Number(normalizedPrimary.autoPullMinutes) ||
      Number(normalizedSecondary.autoPullMinutes) ||
      base.autoPullMinutes,
    lastPush: maxTimestamp(normalizedPrimary.lastPush, normalizedSecondary.lastPush),
    lastPull: maxTimestamp(normalizedPrimary.lastPull, normalizedSecondary.lastPull),
    lastError: normalizedPrimary.lastError || normalizedSecondary.lastError || null
  };
}

function maxTimestamp(a, b) {
  const aTime = Number.isNaN(Date.parse(a ?? '')) ? null : Date.parse(a);
  const bTime = Number.isNaN(Date.parse(b ?? '')) ? null : Date.parse(b);
  if (aTime === null && bTime === null) return null;
  if (aTime !== null && bTime !== null) {
    return aTime >= bTime ? a : b;
  }
  return aTime !== null ? a : b;
}

function ensureStateIntegrity(snapshot) {
  const base = defaultState();
  const source = snapshot && typeof snapshot === 'object' ? snapshot : {};
  const normalized = {
    ...base,
    ...source
  };

  normalized.users = normalizeUsers(source.users, base.users);
  normalized.customers = normalizeCollection(source.customers, base.customers);
  normalized.care = normalizeCollection(source.care, base.care);
  normalized.warranties = normalizeCollection(source.warranties, base.warranties);
  normalized.maintenances = normalizeCollection(source.maintenances, base.maintenances);
  normalized.inventory = normalizeCollection(source.inventory, base.inventory);
  normalized.finance = normalizeCollection(source.finance, base.finance);
  normalized.approvals = normalizeCollection(source.approvals, base.approvals);
  normalized.tasks = {
    templates: normalizeCollection(source?.tasks?.templates, base.tasks.templates).map(template => ({
      ...template,
      steps: ensureArray(template?.steps),
      tasks: ensureArray(template?.tasks),
      checklist: ensureArray(template?.checklist)
    })),
    reports: normalizeCollection(source?.tasks?.reports, base.tasks.reports).map(report => ({
      ...report,
      items: ensureArray(report?.items),
      results: ensureArray(report?.results),
      tasks: ensureArray(report?.tasks)
    }))
  };
  normalized.sync = {
    ...base.sync,
    ...(source.sync ?? {})
  };
  return normalized;
}

codex/fix-issues-in-checklist-page-tqo0oa
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

function ensureArray(value, fallback = []) {
  if (!Array.isArray(value)) return [...fallback];
  return value.filter(item => item !== undefined && item !== null).map(item =>
    typeof item === 'object' ? { ...item } : item
  );
}

function normalizeCollection(value, fallback = []) {
  const items = ensureArray(value, fallback);
  const map = new Map();
  items.forEach(item => {
    if (!item || typeof item !== 'object') return;
    const record = { ...item };
    const key = record.id ?? record.username ?? JSON.stringify(record);
    if (!map.has(key)) {
      map.set(key, record);
      return;
    }
    const existing = map.get(key);
    const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
    const incomingTime = new Date(record.updatedAt || record.createdAt || 0).getTime();
    if (incomingTime >= existingTime) {
      map.set(key, { ...existing, ...record });
    }
  });
  return [...map.values()];
}

function normalizeUsers(value, fallback = []) {
  const defaults = ensureArray(fallback);
  const provided = ensureArray(value);
  const map = new Map();
  provided.forEach(user => {
    if (!user || typeof user !== 'object') return;
    const username = String(user.username || '').trim();
    if (!username) return;
    const sanitized = {
      username,
      password: String(user.password ?? ''),
      role: user.role === 'admin' ? 'admin' : 'employee',
      fullName: user.fullName || username,
      createdAt: user.createdAt || user.updatedAt || new Date().toISOString(),
      updatedAt: user.updatedAt || user.createdAt || new Date().toISOString()
    };
    const existing = map.get(username);
    if (!existing) {
      map.set(username, sanitized);
      return;
    }
    const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
    const incomingTime = new Date(sanitized.updatedAt || sanitized.createdAt || 0).getTime();
    if (incomingTime >= existingTime) {
      const mergedUser = { ...existing, ...sanitized };
      if (!sanitized.password) {
        mergedUser.password = existing.password;
      }
      if (!sanitized.createdAt) {
        mergedUser.createdAt = existing.createdAt;
      }
      map.set(username, mergedUser);
    }
  });
  defaults.forEach(user => {
    const username = String(user.username || '').trim();
    if (!username) return;
    const existing = map.get(username);
    if (!existing) {
      map.set(username, { ...user });
      return;
    }
    if (!existing.password) existing.password = user.password;
    if (!existing.role) existing.role = user.role;
    if (!existing.fullName) existing.fullName = user.fullName;
  });
  return [...map.values()].filter(user => user.password);
}

function stateFingerprint(target) {
  const snapshot = JSON.parse(JSON.stringify(target ?? {}));
  if (snapshot.sync) {
    delete snapshot.sync.lastPull;
    delete snapshot.sync.lastPush;
    delete snapshot.sync.lastError;
  }
  return JSON.stringify(snapshot);
}

function buildSyncHeaders({ includeJson = false } = {}) {
  const headers = {};
  if (includeJson) headers['Content-Type'] = 'application/json';
  if (state.sync?.apiKey) {
    headers.Authorization = `Bearer ${state.sync.apiKey}`;
  }
  return headers;
}

function handleSyncConfigSubmit(evt) {
  evt.preventDefault();
  const form = evt.target;
  const enabledInput = form.querySelector('[name="enabled"]');
  const urlInput = form.querySelector('[name="remoteUrl"]');
  const keyInput = form.querySelector('[name="apiKey"]');
  const methodSelect = form.querySelector('[name="method"]');
  const intervalInput = form.querySelector('[name="interval"]');
  const enabled = enabledInput?.checked ?? false;
  const remoteUrl = urlInput?.value.trim() ?? '';
  const apiKey = keyInput?.value.trim() ?? '';
  const method = (methodSelect?.value ?? 'PUT').toUpperCase();
  const autoPullMinutes = Math.max(1, Number(intervalInput?.value) || 5);
  if (enabled && !remoteUrl) {
    showToast('Vui lòng nhập địa chỉ máy chủ trước khi bật đồng bộ', true);
    enabledInput.checked = false;
    handleSyncToggle({ target: enabledInput });
    return;
  }
  state.sync = {
    ...state.sync,
    enabled: enabled && !!remoteUrl,
    remoteUrl,
    apiKey,
    method,
    autoPullMinutes
  };
  if (!state.sync.enabled) {
    stopRemotePolling();
  }
  saveState({ skipRemote: true });
  updateSyncForm();
  renderSyncStatus();
  if (state.sync.enabled) {
    startRemotePolling();
    pullRemoteState({ silent: true });
    scheduleRemoteSync({ immediate: true, reason: 'config-change' });
    showToast('Đã lưu cấu hình và kích hoạt đồng bộ');
  } else {
    showToast('Đã lưu cấu hình đồng bộ');
  }
}

function handleSyncToggle(evt) {
  const form = document.getElementById('sync-config-form');
  if (!form) return;
  const enabled = evt.target.checked;
  const urlInput = form.querySelector('[name="remoteUrl"]');
  const keyInput = form.querySelector('[name="apiKey"]');
  const methodSelect = form.querySelector('[name="method"]');
  const intervalInput = form.querySelector('[name="interval"]');
  [urlInput, keyInput, methodSelect, intervalInput].forEach(input => {
    if (input) input.disabled = !enabled;
  });
  const testButton = document.getElementById('sync-test');
  if (testButton) testButton.disabled = !enabled;
  document.querySelectorAll('[data-sync-action]').forEach(button => {
    const action = button.dataset.syncAction;
    const requiresRemote = !['export', 'import'].includes(action);
    button.disabled = requiresRemote ? !enabled : false;
  });
  if (!enabled) {
    state.sync.enabled = false;
    saveState({ skipRemote: true });
    renderSyncStatus();
    stopRemotePolling();
  }
}

function handleSyncTest() {
  if (!isRemoteSyncEnabled()) {
    showToast('Vui lòng cấu hình địa chỉ máy chủ trước', true);
    return;
  }
  withLoading('Đang kiểm tra kết nối...', async () => {
    const success = await pullRemoteState({ silent: true });
    if (success) {
      showToast('Kết nối đồng bộ hoạt động bình thường');
    } else if (!state.sync.lastError) {
      showToast('Máy chủ phản hồi nhưng không có dữ liệu mới');
    } else {
      showToast('Không kiểm tra được máy chủ, vui lòng xem lại cấu hình', true);
    }
  });
}

function handleSyncAction(evt) {
  const action = evt.target.dataset.syncAction;
  if (!action) return;
  if (action === 'export') {
    exportBackup();
    return;
  }
  if (action === 'import') {
    document.getElementById('sync-import-input')?.click();
    return;
  }
  if (!isRemoteSyncEnabled()) {
    showToast('Đồng bộ máy chủ chưa được bật', true);
    return;
  }
  if (action === 'pull') {
    withLoading('Đang tải dữ liệu từ máy chủ...', async () => {
      await pullRemoteState({ silent: false });
    });
  } else if (action === 'push') {
    withLoading('Đang gửi dữ liệu lên máy chủ...', async () => {
      const success = await pushRemoteState({ reason: 'manual' });
      if (success) {
        showToast('Đã đồng bộ dữ liệu lên máy chủ');
      } else {
        showToast('Không thể gửi dữ liệu lên máy chủ', true);
      }
    });
  }
}

function exportBackup() {
  const payload = {
    exportedAt: new Date().toISOString(),
    data: prepareStateForTransport()
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `klc-backup-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast('Đã xuất file sao lưu dữ liệu');
}

function handleImportFile(evt) {
  const file = evt.target.files?.[0];
  evt.target.value = '';
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const raw = JSON.parse(reader.result);
      const incoming = raw?.data ?? raw;
      const normalized = normalizeIncomingState(incoming);
      state = normalized;
      state.sync.lastError = null;
      saveState({ skipRemote: true });
      applyBranding();
      if (currentUser) {
        refreshAll();
      }
      renderSyncStatus();
      updateSyncForm();
      showToast('Đã khôi phục dữ liệu từ tập tin sao lưu');
      if (state.sync.enabled) {
        startRemotePolling();
      }
    } catch (error) {
      console.error('Không thể nhập dữ liệu sao lưu', error);
      showToast('File sao lưu không hợp lệ', true);
    }
  };
  reader.readAsText(file);
}

function toggleLayoutEdit() {
  if (currentUser.role !== 'admin') {
    showToast('Chỉ quản trị viên mới chỉnh sửa bố cục', true);
    return;

main
  }
  wrapper.innerHTML = lines.join('');
  if (badge) {
    badge.textContent = enabled ? 'Đã bật' : 'Đang tắt';
    badge.classList.toggle('online', enabled);
    badge.classList.toggle('offline', !enabled);
  }
}

function updateSyncForm() {
  const form = document.getElementById('sync-config-form');
  if (!form) return;
  const config = state.sync ?? defaultState().sync;
  const enabledInput = form.querySelector('[name="enabled"]');
  const urlInput = form.querySelector('[name="remoteUrl"]');
  const keyInput = form.querySelector('[name="apiKey"]');
  const methodSelect = form.querySelector('[name="method"]');
  const intervalInput = form.querySelector('[name="interval"]');
  const enabled = Boolean(config.enabled);
  if (enabledInput) enabledInput.checked = enabled;
  if (urlInput) {
    urlInput.value = config.remoteUrl ?? '';
    urlInput.disabled = !enabled;
  }
 codex/fix-issues-in-checklist-page-tahi62
  draggedWidget = null;
}

function refreshAll() {
  renderCustomers();
  renderCare();
  renderWarranties();
  renderMaintenances();
  renderTaskTemplates();
  renderTaskSchedule();
  renderTaskReports();
  renderInventory();
  renderFinance();
  renderStaff();
  renderApprovals();
  populateCustomerHints();
  populateStaffSelectors();
  populateShiftSelectors();
  populateTaskReportTemplates();
  updateDashboard();
  renderSyncStatus();
  updateSyncForm();
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

  if (keyInput) {
    keyInput.value = config.apiKey ?? '';
    keyInput.disabled = !enabled;
  }
  if (methodSelect) {
    methodSelect.value = (config.method ?? 'PUT').toUpperCase();
    methodSelect.disabled = !enabled;
  }
  if (intervalInput) {
    intervalInput.value = config.autoPullMinutes ?? 5;
    intervalInput.disabled = !enabled;
  }
  const testButton = document.getElementById('sync-test');
  if (testButton) testButton.disabled = !enabled;
  document.querySelectorAll('[data-sync-action]').forEach(button => {
    const action = button.dataset.syncAction;
    const requiresRemote = !['export', 'import'].includes(action);
    button.disabled = requiresRemote ? !enabled : false;
main
  });
  populateScheduleStaffFilter(staffOptions);
}

function populateScheduleStaffFilter(staffOptions) {
  const select = document.getElementById('task-schedule-staff');
  if (!select) return;
  const previous = select.value;
  const options = ['<option value="all">Tất cả</option>', ...staffOptions.map(u => `<option value="${u.fullName}">${u.fullName}</option>`)];
  select.innerHTML = options.join('');
  if (previous && [...select.options].some(opt => opt.value === previous)) {
    select.value = previous;
  } else {
    select.value = 'all';
  }
}

function scheduleRemoteSync(options = {}) {
  if (!isRemoteSyncEnabled()) return;
  const { immediate = false, reason = 'auto' } = options;
  if (immediate) {
    pushRemoteState({ reason }).catch(() => {});
    return;
  }
  clearTimeout(remotePushTimer);
  remotePushTimer = setTimeout(() => {
    pushRemoteState({ reason }).catch(() => {});
  }, REMOTE_PUSH_DEBOUNCE);
}

function isRemoteSyncEnabled() {
  const config = state.sync ?? defaultState().sync;
  return Boolean(config.enabled && config.remoteUrl);
}

async function pushRemoteState({ reason = 'auto' } = {}) {
  if (!isRemoteSyncEnabled()) return false;
  if (remoteSyncInFlight) {
    pendingRemotePush = true;
    return false;
  }
 codex/fix-issues-in-checklist-page-tahi62
  const id = selected.dataset.id;
  const customer = state.customers.find(c => c.id === id);
  if (!customer) return;
  showPage('care');
  if (location.hash !== '#care') {
    location.hash = 'care';
  }
  fillCareForm(customer);
}

function openCustomerHistory() {
  const selected = getSelectedRow('customer-table');
  if (!selected) {
    showToast('Chọn khách hàng để xem lịch sử', true);
    return;
main
  }
}

 codex/fix-issues-in-checklist-page-tqo0oa
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

  remoteSyncInFlight = true;
  const config = state.sync;
  try {
    const payload = prepareStateForTransport();
    const response = await fetch(config.remoteUrl, {
      method: (config.method ?? 'PUT').toUpperCase(),
      headers: buildSyncHeaders({ includeJson: true }),
      body: JSON.stringify({
        reason,
        updatedAt: new Date().toISOString(),
        data: payload
      })
    });
    if (!response.ok) {
      throw new Error(`Máy chủ trả về mã ${response.status}`);
 main
    }
    const pushedAt = new Date().toISOString();
    state.sync.lastPush = pushedAt;
    state.sync.lastError = null;
    saveState({ skipRemote: true });
    renderSyncStatus();
    return true;
  } catch (error) {
    state.sync.lastError = error.message;
    saveState({ skipRemote: true });
    renderSyncStatus();
    console.error('Đẩy dữ liệu lên máy chủ thất bại', error);
    return false;
  } finally {
    remoteSyncInFlight = false;
    if (pendingRemotePush) {
      pendingRemotePush = false;
      scheduleRemoteSync({ immediate: true, reason: 'retry' });
    }
  }
}

async function pullRemoteState({ silent = false } = {}) {
  if (!isRemoteSyncEnabled()) return false;
  const config = state.sync;
  try {
    const response = await fetch(config.remoteUrl, {
      method: 'GET',
      headers: buildSyncHeaders(),
      cache: 'no-store'
    });
    if (!response.ok) {
      throw new Error(`Máy chủ trả về mã ${response.status}`);
    }
    const payload = await response.json();
    const remoteState = payload?.data ?? payload?.state ?? payload;
    if (!remoteState || typeof remoteState !== 'object') {
      throw new Error('Dữ liệu phản hồi không hợp lệ');
    }
    const normalizedRemote = normalizeIncomingState(remoteState);
    const hasChanged = stateFingerprint(normalizedRemote) !== stateFingerprint(state);
    state = normalizedRemote;
    state.sync.lastPull = new Date().toISOString();
    state.sync.lastError = null;
    saveState({ skipRemote: true });
    renderSyncStatus();
    applyBranding();
    if (currentUser) {
      refreshAll();
      if (!silent && hasChanged) {
        showToast('Đã cập nhật dữ liệu từ máy chủ');
      }
    }
    startRemotePolling();
    return hasChanged;
  } catch (error) {
    state.sync.lastError = error.message;
    saveState({ skipRemote: true });
    renderSyncStatus();
    if (!silent) {
      showToast('Không thể tải dữ liệu từ máy chủ đồng bộ', true);
    }
    console.error('Không thể lấy dữ liệu từ máy chủ đồng bộ', error);
    return false;
  }
}

 codex/fix-issues-in-checklist-page-tahi62
function updateHashSilently(value) {
  if (!value) return;
  if (typeof history !== 'undefined' && typeof history.replaceState === 'function') {
    history.replaceState(null, '', `#${value}`);
  } else if (location.hash !== `#${value}`) {
    location.hash = value;
  }
}

function showPageFromHash({ silent = false } = {}) {
  if (!currentUser) return false;
  const hash = location.hash.replace('#', '');
  if (!hash) return false;
  return showPage(hash, { silent });
}

window.addEventListener('hashchange', () => {
  if (!currentUser) return;
  if (!showPageFromHash()) {
    const fallback = getInitialPage({ preferHash: false });
    if (fallback) {
      showPage(fallback, { silent: true });
      updateHashSilently(fallback);
    }
  }
});
 main

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

 codex/fix-issues-in-checklist-page-tqo0oa
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

function startRemotePolling() {
  clearInterval(remotePullTimer);
  if (!isRemoteSyncEnabled()) return;
  const interval = Math.max(1, Number(state.sync?.autoPull
 main
 main
