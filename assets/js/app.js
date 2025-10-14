import ApiClient from './apiClient.js';

const SHEETS = {
  customers: 'Customers',
  care: 'CustomerCare',
  warranty: 'Warranty',
  maintenance: 'Maintenance',
  checklist: 'Checklist',
  inventory: 'Inventory',
  inventoryLog: 'InventoryLog',
  finance: 'Finance',
  settings: 'Settings',
};

const STAFF_DEFAULT = ['Đạt', 'Huỳnh'];
const STORAGE_KEYS = {
  session: 'klc_session',
  rememberedUser: 'klc_remembered_user',
  theme: 'klc_theme',
  featureToggle: 'klc_features',
  staffList: 'klc_staff_list',
  customerSources: 'klc_customer_sources',
  checklistTemplate: 'klc_checklist_template',
  financeCategories: 'klc_finance_categories',
};

const state = {
  user: null,
  staySignedIn: false,
  data: {
    customers: [],
    care: [],
    warranty: [],
    maintenance: [],
    checklist: [],
    inventory: [],
    inventoryLog: [],
    finance: [],
  },
  settings: {
    staff: [...STAFF_DEFAULT],
    sources: [],
    checklistTemplate: [],
    financeCategories: [],
    features: {
      dashboard: true,
      customers: true,
      customerCare: true,
      warranty: true,
      checklist: true,
      inventory: true,
      finance: true,
    },
    theme: {
      primary: '#00796b',
      secondary: '#ffb300',
      logoUrl: 'assets/img/logo.svg',
    },
  },
  charts: {},
};

const elements = {};

function cacheElements() {
  elements.loginSection = document.getElementById('loginSection');
  elements.appShell = document.getElementById('appShell');
  elements.loginForm = document.getElementById('loginForm');
  elements.username = document.getElementById('username');
  elements.password = document.getElementById('password');
  elements.rememberMe = document.getElementById('rememberMe');
  elements.staySignedIn = document.getElementById('staySignedIn');
  elements.loginError = document.getElementById('loginError');
  elements.currentRole = document.getElementById('currentRole');
  elements.pageTitle = document.getElementById('pageTitle');
  elements.navLinks = document.querySelectorAll('.nav-link');
  elements.pages = document.querySelectorAll('.page');
  elements.logoutButton = document.getElementById('logoutButton');
  elements.refreshButton = document.getElementById('refreshButton');
  elements.loadingOverlay = document.getElementById('loadingOverlay');
  elements.dashboardSummary = document.getElementById('dashboardSummary');
  elements.staffPerformance = document.getElementById('staffPerformance');
  elements.customerFunnel = document.getElementById('customerFunnel');
  elements.salesChart = document.getElementById('salesChart');
  elements.customerForm = document.getElementById('customerForm');
  elements.customerName = document.getElementById('customerName');
  elements.customerPhone = document.getElementById('customerPhone');
  elements.customerAddress = document.getElementById('customerAddress');
  elements.customerNote = document.getElementById('customerNote');
  elements.customerTableBody = document.querySelector('#customerTable tbody');
  elements.customerSearch = document.getElementById('customerSearch');
  elements.customerSource = document.getElementById('customerSource');
  elements.customerFormReset = document.getElementById('customerFormReset');
  elements.advisedProducts = document.getElementById('advisedProducts');
  elements.addAdvisedProduct = document.getElementById('addAdvisedProduct');
  elements.advisedProductInput = document.getElementById('advisedProductInput');
  elements.careForm = document.getElementById('careForm');
  elements.careTableBody = document.querySelector('#careTable tbody');
  elements.careSearch = document.getElementById('careSearch');
  elements.careStaff = document.getElementById('careStaff');
  elements.careDetail = document.getElementById('careDetail');
  elements.careDetailContent = elements.careDetail?.querySelector('.detail-content');
  elements.closeCareDetail = document.getElementById('closeCareDetail');
  elements.updateCustomerFromCare = document.getElementById('updateCustomerFromCare');
  elements.careStaffList = document.getElementById('careStaffList');
  elements.customerNameList = document.getElementById('customerNameList');
  elements.customerPhoneList = document.getElementById('customerPhoneList');
  elements.lostReason = document.getElementById('lostReason');
  elements.warrantyForm = document.getElementById('warrantyForm');
  elements.maintenanceForm = document.getElementById('maintenanceForm');
  elements.supportFilter = document.getElementById('supportFilter');
  elements.supportSearch = document.getElementById('supportSearch');
  elements.warrantyTableBody = document.querySelector('#warrantyTable tbody');
  elements.maintenanceTableBody = document.querySelector('#maintenanceTable tbody');
  elements.checklistForm = document.getElementById('checklistForm');
  elements.checklistStaff = document.getElementById('checklistStaff');
  elements.checklistShift = document.getElementById('checklistShift');
  elements.scheduleSlots = document.getElementById('scheduleSlots');
  elements.checklistTableBody = document.querySelector('#checklistTable tbody');
  elements.checklistSearch = document.getElementById('checklistSearch');
  elements.inventoryStats = document.getElementById('inventoryStats');
  elements.inventoryTableBody = document.querySelector('#inventoryTable tbody');
  elements.inventoryLogBody = document.querySelector('#inventoryLog tbody');
  elements.inventorySearch = document.getElementById('inventorySearch');
  elements.inventoryForms = document.querySelectorAll('#inventory .tab-content form');
  elements.financeForm = document.getElementById('financeForm');
  elements.financeStats = document.getElementById('financeStats');
  elements.incomeTableBody = document.querySelector('#incomeTable tbody');
  elements.expenseTableBody = document.querySelector('#expenseTable tbody');
  elements.incomeSearch = document.getElementById('incomeSearch');
  elements.expenseSearch = document.getElementById('expenseSearch');
  elements.financeRange = document.getElementById('financeRange');
  elements.financeDownload = document.getElementById('financeDownload');
  elements.settingsLinks = document.querySelectorAll('.settings-link');
  elements.settingsPanels = document.querySelectorAll('.settings-panel');
  elements.featureToggleForm = document.getElementById('featureToggleForm');
  elements.settingsCustomerForm = document.getElementById('settingsCustomerForm');
  elements.settingsCareForm = document.getElementById('settingsCareForm');
  elements.settingsChecklistForm = document.getElementById('settingsChecklistForm');
  elements.settingsInventoryForm = document.getElementById('settingsInventoryForm');
  elements.settingsFinanceForm = document.getElementById('settingsFinanceForm');
  elements.themeForm = document.getElementById('themeForm');
  elements.primaryColor = document.getElementById('primaryColor');
  elements.secondaryColor = document.getElementById('secondaryColor');
  elements.logoUpload = document.getElementById('logoUpload');
  elements.resetTheme = document.getElementById('resetTheme');
  elements.brandLogo = document.getElementById('brandLogo');
  elements.exportCustomers = document.getElementById('exportCustomers');
  elements.updateCustomerFromCare = document.getElementById('updateCustomerFromCare');
}

function showLoading(message = 'Đang tải dữ liệu...') {
  if (!elements.loadingOverlay) return;
  elements.loadingOverlay.querySelector('p').textContent = message;
  elements.loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
  elements.loadingOverlay?.classList.add('hidden');
}

function loadPersistentSettings() {
  const theme = localStorage.getItem(STORAGE_KEYS.theme);
  if (theme) {
    try {
      state.settings.theme = { ...state.settings.theme, ...JSON.parse(theme) };
      applyTheme(state.settings.theme);
    } catch (error) {
      console.warn('Không thể đọc theme đã lưu', error);
    }
  }

  const staff = localStorage.getItem(STORAGE_KEYS.staffList);
  if (staff) {
    try {
      state.settings.staff = JSON.parse(staff);
    } catch (error) {
      console.warn('Không thể đọc danh sách nhân viên đã lưu', error);
    }
  }

  const sources = localStorage.getItem(STORAGE_KEYS.customerSources);
  if (sources) {
    try {
      state.settings.sources = JSON.parse(sources);
      populateCustomerSources();
    } catch (error) {
      console.warn('Không thể đọc nguồn khách đã lưu', error);
    }
  }

  const checklistTemplate = localStorage.getItem(STORAGE_KEYS.checklistTemplate);
  if (checklistTemplate) {
    try {
      state.settings.checklistTemplate = JSON.parse(checklistTemplate);
    } catch (error) {
      console.warn('Không thể đọc checklist template', error);
    }
  }

  const financeCategories = localStorage.getItem(STORAGE_KEYS.financeCategories);
  if (financeCategories) {
    try {
      state.settings.financeCategories = JSON.parse(financeCategories);
    } catch (error) {
      console.warn('Không thể đọc danh mục thu chi', error);
    }
  }

  const features = localStorage.getItem(STORAGE_KEYS.featureToggle);
  if (features) {
    try {
      state.settings.features = { ...state.settings.features, ...JSON.parse(features) };
      applyFeatureVisibility();
    } catch (error) {
      console.warn('Không thể đọc cấu hình chức năng', error);
    }
  }
}

function populateCustomerSources() {
  if (!elements.customerSource) return;
  const select = elements.customerSource;
  select.innerHTML = '';
  const baseOptions =
    state.settings.sources.length > 0
      ? state.settings.sources
      : [
          'Khách ghé cửa hàng',
          'Khách online',
          'Khách cũ giới thiệu',
          'Khách cũ mua lại',
          'Người quen nhân viên',
          'Khác',
        ];
  baseOptions.forEach((label) => {
    const option = document.createElement('option');
    option.value = label;
    option.textContent = label;
    select.appendChild(option);
  });
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme.primary) {
    root.style.setProperty('--color-primary', theme.primary);
  }
  if (theme.secondary) {
    root.style.setProperty('--color-secondary', theme.secondary);
  }
  if (elements.primaryColor) elements.primaryColor.value = theme.primary;
  if (elements.secondaryColor) elements.secondaryColor.value = theme.secondary;
  if (elements.brandLogo && theme.logoUrl) {
    elements.brandLogo.src = theme.logoUrl;
  }
}

function saveTheme(theme) {
  localStorage.setItem(STORAGE_KEYS.theme, JSON.stringify(theme));
}

function applyFeatureVisibility() {
  Object.entries(state.settings.features).forEach(([key, enabled]) => {
    const navButton = document.querySelector(`.nav-link[data-target="${key}"]`);
    const page = document.getElementById(key);
    if (navButton) navButton.classList.toggle('hidden', !enabled);
    if (page) page.classList.toggle('hidden', !enabled);
  });
}

function restoreSession() {
  const storedSession = localStorage.getItem(STORAGE_KEYS.session);
  if (!storedSession) return;
  try {
    const session = JSON.parse(storedSession);
    if (session?.username && session?.role) {
      state.user = session;
      state.staySignedIn = true;
      showAppShell();
      loadAllData();
    }
  } catch (error) {
    console.warn('Không thể đọc session', error);
  }
}

function handleLogin(event) {
  event.preventDefault();
  const username = elements.username.value.trim();
  const password = elements.password.value.trim();

  const credentials = {
    admin: '123456',
    nhanvien: '1234',
  };

  if (!credentials[username] || credentials[username] !== password) {
    elements.loginError.textContent = 'Tài khoản hoặc mật khẩu không đúng';
    return;
  }

  const role = username === 'admin' ? 'Quản trị viên' : 'Nhân viên';
  state.user = { username, role, permissions: role === 'Quản trị viên' ? 'admin' : 'staff' };
  elements.loginError.textContent = '';

  if (elements.rememberMe.checked) {
    localStorage.setItem(
      STORAGE_KEYS.rememberedUser,
      JSON.stringify({ username, password })
    );
  } else {
    localStorage.removeItem(STORAGE_KEYS.rememberedUser);
  }

  state.staySignedIn = elements.staySignedIn.checked;
  if (state.staySignedIn) {
    localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(state.user));
  } else {
    localStorage.removeItem(STORAGE_KEYS.session);
  }

  showAppShell();
  loadAllData();
}

function showAppShell() {
  elements.loginSection.classList.add('hidden');
  elements.appShell.classList.remove('hidden');
  elements.currentRole.textContent = state.user.role;
  applyPermissions();
}

function applyPermissions() {
  const isAdmin = state.user.permissions === 'admin';
  const restrictedForms = [
    elements.customerForm,
    elements.careForm,
    elements.warrantyForm,
    elements.maintenanceForm,
    elements.checklistForm,
    elements.financeForm,
    ...Array.from(elements.inventoryForms || []),
  ];

  restrictedForms.forEach((form) => {
    if (!form) return;
    form.querySelectorAll('input, select, textarea, button').forEach((field) => {
      if (field.type === 'reset') return;
      field.disabled = !isAdmin && field.type !== 'search';
    });
  });

  const settingsNav = document.querySelector('.nav-link[data-target="settings"]');
  if (settingsNav) settingsNav.classList.toggle('hidden', !isAdmin);
  const settingsPage = document.getElementById('settings');
  if (settingsPage) settingsPage.classList.toggle('hidden', !isAdmin);
}

function handleLogout() {
  state.user = null;
  localStorage.removeItem(STORAGE_KEYS.session);
  elements.appShell.classList.add('hidden');
  elements.loginSection.classList.remove('hidden');
  elements.loginForm.reset();
}

function setupNavigation() {
  elements.navLinks.forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.target;
      switchPage(target, button.textContent.trim());
    });
  });
}

function switchPage(targetId, title) {
  elements.navLinks.forEach((btn) => btn.classList.toggle('active', btn.dataset.target === targetId));
  elements.pages.forEach((page) => page.classList.toggle('active', page.id === targetId));
  elements.pageTitle.textContent = title;
}

async function loadAllData() {
  showLoading('Đang đồng bộ dữ liệu...');
  try {
    await Promise.all([
      loadCustomers(),
      loadCareRecords(),
      loadWarrantyRecords(),
      loadChecklist(),
      loadInventory(),
      loadFinance(),
      loadSettings(),
    ]);
    renderDashboard();
  } catch (error) {
    console.warn('Không thể tải đầy đủ dữ liệu, sử dụng dữ liệu tạm thời', error);
  } finally {
    hideLoading();
  }
}

async function loadCustomers() {
  try {
    const records = await ApiClient.fetchRecords(SHEETS.customers);
    state.data.customers = Array.isArray(records) ? records : [];
  } catch (error) {
    state.data.customers = JSON.parse(localStorage.getItem('customers_backup') || '[]');
  }
  renderCustomers();
}

async function loadCareRecords() {
  try {
    const records = await ApiClient.fetchRecords(SHEETS.care);
    state.data.care = Array.isArray(records) ? records : [];
  } catch (error) {
    state.data.care = JSON.parse(localStorage.getItem('care_backup') || '[]');
  }
  renderCare();
}

async function loadWarrantyRecords() {
  try {
    const warranty = await ApiClient.fetchRecords(SHEETS.warranty);
    const maintenance = await ApiClient.fetchRecords(SHEETS.maintenance);
    state.data.warranty = Array.isArray(warranty) ? warranty : [];
    state.data.maintenance = Array.isArray(maintenance) ? maintenance : [];
  } catch (error) {
    state.data.warranty = JSON.parse(localStorage.getItem('warranty_backup') || '[]');
    state.data.maintenance = JSON.parse(localStorage.getItem('maintenance_backup') || '[]');
  }
  renderWarranty();
}

async function loadChecklist() {
  try {
    const records = await ApiClient.fetchRecords(SHEETS.checklist);
    state.data.checklist = Array.isArray(records) ? records : [];
  } catch (error) {
    state.data.checklist = JSON.parse(localStorage.getItem('checklist_backup') || '[]');
  }
  renderChecklist();
}

async function loadInventory() {
  try {
    const inventory = await ApiClient.fetchRecords(SHEETS.inventory);
    const log = await ApiClient.fetchRecords(SHEETS.inventoryLog);
    state.data.inventory = Array.isArray(inventory) ? inventory : [];
    state.data.inventoryLog = Array.isArray(log) ? log : [];
  } catch (error) {
    state.data.inventory = JSON.parse(localStorage.getItem('inventory_backup') || '[]');
    state.data.inventoryLog = JSON.parse(localStorage.getItem('inventory_log_backup') || '[]');
  }
  renderInventory();
}

async function loadFinance() {
  try {
    const records = await ApiClient.fetchRecords(SHEETS.finance);
    state.data.finance = Array.isArray(records) ? records : [];
  } catch (error) {
    state.data.finance = JSON.parse(localStorage.getItem('finance_backup') || '[]');
  }
  renderFinance();
}

async function loadSettings() {
  try {
    const response = await ApiClient.request('getSettings');
    if (response?.settings) {
      Object.assign(state.settings, response.settings);
    }
  } catch (error) {
    console.warn('Không thể tải settings từ API, dùng localStorage');
  }
  loadPersistentSettings();
  populateStaffSelectors();
  populateCustomerSources();
  hydrateSettingsForms();
}

function hydrateSettingsForms() {
  if (elements.careStaffList) {
    elements.careStaffList.value = state.settings.staff.join(', ');
  }
  const sourcesArea = document.getElementById('customerSourceOptions');
  if (sourcesArea) {
    sourcesArea.value = state.settings.sources.join('\n');
  }
  const checklistArea = document.getElementById('checklistTemplate');
  if (checklistArea) {
    checklistArea.value = state.settings.checklistTemplate.join('\n');
  }
  const financeArea = document.getElementById('financeCategories');
  if (financeArea) {
    financeArea.value = state.settings.financeCategories.join('\n');
  }
  const thresholdInput = document.getElementById('inventoryThreshold');
  if (thresholdInput && state.settings.inventoryThreshold) {
    thresholdInput.value = state.settings.inventoryThreshold;
  }
}

function renderDashboard() {
  renderDashboardSummary();
  renderStaffPerformance();
  renderCustomerFunnel();
  renderSalesChart();
}

function renderDashboardSummary() {
  const totals = {
    customers: state.data.customers.length,
    care: state.data.care.length,
    warranty: state.data.warranty.length + state.data.maintenance.length,
    finance: state.data.finance.reduce((sum, item) => sum + Number(item.amount || 0), 0),
  };

  elements.dashboardSummary.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <h4>Khách hàng mới</h4>
        <strong>${totals.customers}</strong>
      </div>
      <div class="stat-card">
        <h4>CSKH đã thực hiện</h4>
        <strong>${totals.care}</strong>
      </div>
      <div class="stat-card">
        <h4>Hồ sơ bảo hành</h4>
        <strong>${totals.warranty}</strong>
      </div>
      <div class="stat-card">
        <h4>Doanh thu (VNĐ)</h4>
        <strong>${totals.finance.toLocaleString('vi-VN')}</strong>
      </div>
    </div>`;
}

function renderStaffPerformance() {
  if (!elements.staffPerformance) return;
  const staffMap = {};
  state.data.care.forEach((record) => {
    const staff = record.staff || record.careStaff || 'Không xác định';
    if (!staffMap[staff]) staffMap[staff] = { care: 0, checklist: 0 };
    staffMap[staff].care += 1;
  });
  state.data.checklist.forEach((record) => {
    const staff = record.staff || record.employee || 'Không xác định';
    if (!staffMap[staff]) staffMap[staff] = { care: 0, checklist: 0 };
    staffMap[staff].checklist += 1;
  });

  const cards = Object.entries(staffMap).map(
    ([name, stats]) => `
      <div class="stat-card">
        <h4>${name}</h4>
        <p>CSKH: <strong>${stats.care}</strong></p>
        <p>Checklist: <strong>${stats.checklist}</strong></p>
      </div>`
  );
  elements.staffPerformance.innerHTML = cards.join('') || '<p>Chưa có dữ liệu.</p>';
}

function renderCustomerFunnel() {
  if (!elements.customerFunnel) return;
  const summary = { potential: 0, nurturing: 0, scheduled: 0, lost: 0 };
  state.data.care.forEach((record) => {
    const rating = record.careRating || record.rating;
    if (rating && summary[rating] !== undefined) {
      summary[rating] += 1;
    }
  });
  elements.customerFunnel.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><h4>Còn tiềm năng</h4><strong>${summary.potential}</strong></div>
      <div class="stat-card"><h4>Đang nuôi dưỡng</h4><strong>${summary.nurturing}</strong></div>
      <div class="stat-card"><h4>Đang hẹn</h4><strong>${summary.scheduled}</strong></div>
      <div class="stat-card"><h4>Hết tiềm năng</h4><strong>${summary.lost}</strong></div>
    </div>`;
}

function renderSalesChart() {
  if (!elements.salesChart) return;
  const ctx = elements.salesChart.getContext('2d');
  const labels = [];
  const data = [];
  const grouped = {};
  state.data.finance.forEach((entry) => {
    if (entry.type === 'income') {
      const month = entry.date?.slice(0, 7) || 'Không xác định';
      grouped[month] = (grouped[month] || 0) + Number(entry.amount || 0);
    }
  });
  Object.keys(grouped)
    .sort()
    .forEach((month) => {
      labels.push(month);
      data.push(grouped[month]);
    });

  if (state.charts.sales) {
    state.charts.sales.data.labels = labels;
    state.charts.sales.data.datasets[0].data = data;
    state.charts.sales.update();
  } else {
    state.charts.sales = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Doanh thu',
            data,
            borderColor: getComputedStyle(document.documentElement).getPropertyValue(
              '--color-primary'
            ),
            backgroundColor: 'rgba(0, 121, 107, 0.2)',
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: {
            ticks: {
              callback: (value) => Number(value).toLocaleString('vi-VN'),
            },
          },
        },
      },
    });
  }
}

function renderCustomers() {
  if (!elements.customerTableBody) return;
  const rows = state.data.customers.map((item) => `
      <tr>
        <td>${item.date || ''}</td>
        <td>${item.name || ''}</td>
        <td>${item.phone || ''}</td>
        <td>${item.source || item.customerSource || ''}</td>
        <td>${item.purchaseStatus || ''}</td>
        <td><button class="btn ghost btn-small" data-action="cskh" data-id="${item.id || ''}">CSKH</button></td>
        <td><button class="btn ghost btn-small" data-action="history" data-id="${item.id || ''}">Xem</button></td>
      </tr>`);
  elements.customerTableBody.innerHTML = rows.join('') || '<tr><td colspan="7">Chưa có dữ liệu.</td></tr>';
  populateCustomerSuggestions();
}

function populateCustomerSuggestions() {
  if (!elements.customerNameList || !elements.customerPhoneList) return;
  elements.customerNameList.innerHTML = '';
  elements.customerPhoneList.innerHTML = '';
  state.data.customers.forEach((customer) => {
    const nameOption = document.createElement('option');
    nameOption.value = customer.name || '';
    elements.customerNameList.appendChild(nameOption);
    const phoneOption = document.createElement('option');
    phoneOption.value = customer.phone || '';
    elements.customerPhoneList.appendChild(phoneOption);
  });
}

function renderCare() {
  if (!elements.careTableBody) return;
  const rows = state.data.care.map((item, index) => `
      <tr data-index="${index}">
        <td>${item.date || ''}</td>
        <td>${item.name || ''}</td>
        <td>${item.staff || ''}</td>
        <td>${item.method || ''}</td>
        <td>${item.careRating || ''}</td>
        <td><button class="btn ghost btn-small" data-action="detail">Chi tiết</button></td>
      </tr>`);
  elements.careTableBody.innerHTML = rows.join('') || '<tr><td colspan="6">Chưa có dữ liệu.</td></tr>';
}

function renderWarranty() {
  const warrantyRows = state.data.warranty.map((item) => renderSupportRow(item, 'warranty'));
  const maintenanceRows = state.data.maintenance.map((item) => renderSupportRow(item, 'maintenance'));
  elements.warrantyTableBody.innerHTML =
    warrantyRows.join('') || '<tr><td colspan="4">Chưa có dữ liệu.</td></tr>';
  elements.maintenanceTableBody.innerHTML =
    maintenanceRows.join('') || '<tr><td colspan="4">Chưa có dữ liệu.</td></tr>';
}

function renderSupportRow(item, type) {
  const supportStatus = item.supportStatus || 'pending';
  const supported = supportStatus === 'supported';
  const parts = supportStatus === 'parts';
  const classes = ['btn', 'ghost', 'btn-small'];
  return `
    <tr data-id="${item.id || ''}" data-type="${type}" data-status="${supportStatus}">
      <td>${item.date || ''}</td>
      <td>${item.name || ''}</td>
      <td>${type === 'warranty' ? item.status || '' : item.request || ''}</td>
      <td>
        <div class="support-actions">
          <label class="checkbox"><input type="checkbox" data-action="supported" ${
            supported ? 'checked' : ''
          } /> Đã hỗ trợ</label>
          <label class="checkbox"><input type="checkbox" data-action="parts" ${
            parts ? 'checked' : ''
          } /> Gửi linh kiện</label>
        </div>
      </td>
    </tr>`;
}

function renderChecklist() {
  if (!elements.checklistTableBody) return;
  const rows = state.data.checklist.map((item) => `
      <tr>
        <td>${item.date || ''}</td>
        <td>${item.staff || ''}</td>
        <td>${formatShift(item.shift)}</td>
        <td>${item.summary || ''}</td>
        <td>${item.pending || ''}</td>
      </tr>`);
  elements.checklistTableBody.innerHTML = rows.join('') || '<tr><td colspan="5">Chưa có dữ liệu.</td></tr>';
}

function renderInventory() {
  const stats = calculateInventoryStats();
  elements.inventoryStats.innerHTML = `
    <div class="stat-card"><h4>Tổng mặt hàng</h4><strong>${stats.totalItems}</strong></div>
    <div class="stat-card"><h4>Tồn cuối</h4><strong>${stats.totalStock}</strong></div>
    <div class="stat-card"><h4>Giá trị tồn (ước tính)</h4><strong>${stats.totalValue.toLocaleString(
      'vi-VN'
    )}</strong></div>`;

  const rows = state.data.inventory.map((item) => `
      <tr>
        <td>${item.code || ''}</td>
        <td>${item.name || ''}</td>
        <td>${item.opening || 0}</td>
        <td>${item.import || 0}</td>
        <td>${item.export || 0}</td>
        <td>${item.closing || 0}</td>
      </tr>`);
  elements.inventoryTableBody.innerHTML = rows.join('') || '<tr><td colspan="6">Chưa có dữ liệu.</td></tr>';

  const logRows = state.data.inventoryLog.map((item) => `
      <tr>
        <td>${item.date || ''}</td>
        <td>${item.type || ''}</td>
        <td>${item.code || ''}</td>
        <td>${item.name || ''}</td>
        <td>${item.quantity || ''}</td>
        <td>${item.note || ''}</td>
      </tr>`);
  elements.inventoryLogBody.innerHTML = logRows.join('') || '<tr><td colspan="6">Chưa có dữ liệu.</td></tr>';
}

function renderFinance() {
  const totals = state.data.finance.reduce(
    (acc, item) => {
      const amount = Number(item.amount || 0);
      if (item.type === 'income') acc.income += amount;
      if (item.type === 'expense') acc.expense += amount;
      return acc;
    },
    { income: 0, expense: 0 }
  );
  const profit = totals.income - totals.expense;
  elements.financeStats.innerHTML = `
    <div class="stat-card"><h4>Tổng thu</h4><strong>${totals.income.toLocaleString(
      'vi-VN'
    )}</strong></div>
    <div class="stat-card"><h4>Tổng chi</h4><strong>${totals.expense.toLocaleString(
      'vi-VN'
    )}</strong></div>
    <div class="stat-card"><h4>Lợi nhuận</h4><strong>${profit.toLocaleString('vi-VN')}</strong></div>`;

  const incomeRows = state.data.finance
    .filter((item) => item.type === 'income')
    .map((item) => `
        <tr>
          <td>${item.date || ''}</td>
          <td>${item.title || ''}</td>
          <td>${Number(item.amount || 0).toLocaleString('vi-VN')}</td>
        </tr>`);
  elements.incomeTableBody.innerHTML =
    incomeRows.join('') || '<tr><td colspan="3">Chưa có dữ liệu thu.</td></tr>';

  const expenseRows = state.data.finance
    .filter((item) => item.type === 'expense')
    .map((item) => `
        <tr>
          <td>${item.date || ''}</td>
          <td>${item.title || ''}</td>
          <td>${Number(item.amount || 0).toLocaleString('vi-VN')}</td>
        </tr>`);
  elements.expenseTableBody.innerHTML =
    expenseRows.join('') || '<tr><td colspan="3">Chưa có dữ liệu chi.</td></tr>';
}

function calculateInventoryStats() {
  let totalStock = 0;
  let totalValue = 0;
  state.data.inventory.forEach((item) => {
    const closing = Number(item.closing || item.stock || 0);
    totalStock += closing;
    totalValue += closing * Number(item.cost || item.price || 0);
  });
  return {
    totalItems: state.data.inventory.length,
    totalStock,
    totalValue,
  };
}

function formatShift(value) {
  switch (value) {
    case 'morning':
      return 'Ca sáng (08:00 - 16:00)';
    case 'afternoon':
      return 'Ca chiều (13:00 - 21:00)';
    case 'full':
      return 'Ca full (08:00 - 21:00)';
    default:
      return value || '';
  }
}

function setupEventListeners() {
  elements.loginForm?.addEventListener('submit', handleLogin);
  elements.logoutButton?.addEventListener('click', handleLogout);
  elements.refreshButton?.addEventListener('click', loadAllData);
  elements.customerSource?.addEventListener('change', handleCustomerSourceChange);
  elements.customerForm?.addEventListener('submit', handleCustomerSubmit);
  elements.customerFormReset?.addEventListener('click', resetCustomerForm);
  elements.addAdvisedProduct?.addEventListener('click', handleAddAdvisedProduct);
  elements.customerSearch?.addEventListener('input', handleCustomerSearch);
  elements.careForm?.addEventListener('submit', handleCareSubmit);
  elements.careSearch?.addEventListener('input', handleCareSearch);
  elements.careTableBody?.addEventListener('click', handleCareTableClick);
  elements.closeCareDetail?.addEventListener('click', () => elements.careDetail.classList.add('hidden'));
  elements.updateCustomerFromCare?.addEventListener('click', fillCustomerFromCareDetail);
  elements.careStaff?.addEventListener('change', () => {});
  elements.careForm?.querySelectorAll('input[name="careRating"]').forEach((radio) => {
    radio.addEventListener('change', handleCareRatingChange);
  });
  elements.warrantyForm?.addEventListener('submit', handleSupportSubmit);
  elements.maintenanceForm?.addEventListener('submit', handleSupportSubmit);
  document.querySelectorAll('#warranty .tab-link').forEach((tab) =>
    tab.addEventListener('click', (event) => handleTabSwitch(event, '#warranty'))
  );
  elements.supportFilter?.addEventListener('change', filterSupportTables);
  elements.supportSearch?.addEventListener('input', filterSupportTables);
  document
    .querySelector('#warranty .split-list')
    ?.addEventListener('change', handleSupportStatusChange);
  elements.checklistForm?.addEventListener('submit', handleChecklistSubmit);
  elements.checklistStaff?.addEventListener('change', () => {});
  elements.checklistShift?.addEventListener('change', handleShiftChange);
  elements.checklistSearch?.addEventListener('input', handleChecklistSearch);
  elements.inventoryForms?.forEach((form) => form.addEventListener('submit', handleInventorySubmit));
  document.querySelectorAll('#inventory .tab-link').forEach((tab) =>
    tab.addEventListener('click', (event) => handleTabSwitch(event, '#inventory'))
  );
  elements.inventorySearch?.addEventListener('input', handleInventorySearch);
  elements.financeForm?.addEventListener('submit', handleFinanceSubmit);
  elements.incomeSearch?.addEventListener('input', handleFinanceSearch);
  elements.expenseSearch?.addEventListener('input', handleFinanceSearch);
  elements.financeDownload?.addEventListener('click', exportFinanceReport);
  elements.featureToggleForm?.addEventListener('submit', handleFeatureToggleSubmit);
  elements.settingsCustomerForm?.addEventListener('submit', handleCustomerSettingsSubmit);
  elements.settingsCareForm?.addEventListener('submit', handleStaffSettingsSubmit);
  elements.settingsChecklistForm?.addEventListener('submit', handleChecklistSettingsSubmit);
  elements.settingsInventoryForm?.addEventListener('submit', handleInventorySettingsSubmit);
  elements.settingsFinanceForm?.addEventListener('submit', handleFinanceSettingsSubmit);
  elements.themeForm?.addEventListener('submit', handleThemeSubmit);
  elements.resetTheme?.addEventListener('click', resetTheme);
  elements.settingsLinks?.forEach((link) =>
    link.addEventListener('click', (event) => handleSettingsNav(event.currentTarget))
  );
  elements.exportCustomers?.addEventListener('click', exportCustomers);
}

function handleCustomerSourceChange() {
  const selected = elements.customerSource.value;
  document.querySelectorAll('.conditional[data-source]').forEach((field) => {
    field.classList.toggle('hidden', field.dataset.source !== selected);
  });
}

function handleCustomerSubmit(event) {
  event.preventDefault();
  if (state.user.permissions !== 'admin') return;
  const formData = new FormData(elements.customerForm);
  const advisedProducts = Array.from(elements.advisedProducts.querySelectorAll('.chip'))
    .map((chip) => chip.dataset.value)
    .join(', ');
  const record = Object.fromEntries(formData.entries());
  record.advisedProducts = advisedProducts;
  record.date = document.getElementById('customerDate').value;
  showLoading('Đang lưu khách hàng...');
  ApiClient.createRecord(SHEETS.customers, record)
    .then(() => loadCustomers())
    .catch((error) => console.error(error))
    .finally(() => hideLoading());
  elements.customerForm.reset();
  elements.advisedProducts.innerHTML = '';
}

function resetCustomerForm() {
  elements.advisedProducts.innerHTML = '';
}

function handleAddAdvisedProduct() {
  const value = elements.advisedProductInput.value.trim();
  if (!value) return;
  const chip = document.createElement('span');
  chip.className = 'chip';
  chip.dataset.value = value;
  chip.innerHTML = `${value} <button type="button" aria-label="Xoá">×</button>`;
  chip.querySelector('button').addEventListener('click', () => chip.remove());
  elements.advisedProducts.appendChild(chip);
  elements.advisedProductInput.value = '';
  elements.advisedProductInput.focus();
}

function handleCustomerSearch(event) {
  const keyword = event.target.value.toLowerCase();
  elements.customerTableBody.querySelectorAll('tr').forEach((row) => {
    const text = row.textContent.toLowerCase();
    row.classList.toggle('hidden', !text.includes(keyword));
  });
}

function handleCareSubmit(event) {
  event.preventDefault();
  if (state.user.permissions !== 'admin') return;
  const formData = new FormData(elements.careForm);
  const record = Object.fromEntries(formData.entries());
  record.date = document.getElementById('careDate').value;
  showLoading('Đang lưu chăm sóc khách...');
  ApiClient.createRecord(SHEETS.care, record)
    .then(() => loadCareRecords())
    .catch((error) => console.error(error))
    .finally(() => hideLoading());
  elements.careForm.reset();
}

function handleCareSearch(event) {
  const keyword = event.target.value.toLowerCase();
  elements.careTableBody.querySelectorAll('tr').forEach((row) => {
    const text = row.textContent.toLowerCase();
    row.classList.toggle('hidden', !text.includes(keyword));
  });
}

function handleCareTableClick(event) {
  const button = event.target.closest('button[data-action="detail"]');
  if (!button) return;
  const row = button.closest('tr');
  const index = Number(row.dataset.index);
  const record = state.data.care[index];
  if (!record) return;
  const content = `
    <p><strong>Ngày:</strong> ${record.date || ''}</p>
    <p><strong>Tên khách:</strong> ${record.name || ''}</p>
    <p><strong>Số điện thoại:</strong> ${record.phone || ''}</p>
    <p><strong>Nhân viên:</strong> ${record.staff || ''}</p>
    <p><strong>Hình thức:</strong> ${record.method || ''}</p>
    <p><strong>Nội dung:</strong> ${record.content || ''}</p>
    <p><strong>Phản hồi:</strong> ${record.feedback || ''}</p>
    <p><strong>Ghi chú:</strong> ${record.note || ''}</p>
    <p><strong>Đánh giá:</strong> ${record.careRating || ''}</p>
    ${record.lostReason ? `<p><strong>Lý do hết tiềm năng:</strong> ${record.lostReason}</p>` : ''}
  `;
  elements.careDetailContent.innerHTML = content;
  elements.careDetail.dataset.index = index;
  elements.careDetail.classList.remove('hidden');
}

function handleCareRatingChange(event) {
  const lost = event.target.value === 'lost';
  elements.lostReason.classList.toggle('hidden', !lost);
  if (!lost) elements.lostReason.value = '';
}

function fillCustomerFromCareDetail() {
  const index = Number(elements.careDetail.dataset.index);
  const record = state.data.care[index];
  if (!record) return;
  switchPage('customers', 'Khách hàng');
  elements.customerName.value = record.name || '';
  elements.customerPhone.value = record.phone || '';
  elements.customerAddress.value = record.address || '';
  elements.customerNote.value = `CSKH ${record.date || ''}: ${record.content || ''}`;
  elements.careDetail.classList.add('hidden');
}

function handleSupportSubmit(event) {
  event.preventDefault();
  if (state.user.permissions !== 'admin') return;
  const form = event.target;
  const category = form.dataset.category;
  const formData = new FormData(form);
  const record = Object.fromEntries(formData.entries());
  showLoading('Đang lưu thông tin hỗ trợ...');
  const sheet = category === 'warranty' ? SHEETS.warranty : SHEETS.maintenance;
  ApiClient.createRecord(sheet, record)
    .then(() => loadWarrantyRecords())
    .catch((error) => console.error(error))
    .finally(() => hideLoading());
  form.reset();
}

function handleTabSwitch(event, scopeSelector) {
  const target = event.currentTarget;
  const container = document.querySelector(scopeSelector);
  container.querySelectorAll('.tab-link').forEach((tab) => tab.classList.remove('active'));
  container.querySelectorAll('.tab-content').forEach((panel) => panel.classList.remove('active'));
  target.classList.add('active');
  const panel = container.querySelector(`#${target.dataset.tab}`);
  panel?.classList.add('active');
}

function filterSupportTables() {
  const keyword = elements.supportSearch.value.toLowerCase();
  const status = elements.supportFilter.value;
  document.querySelectorAll('#warranty table tbody tr').forEach((row) => {
    const matchesKeyword = row.textContent.toLowerCase().includes(keyword);
    const currentStatus = row.dataset.status || 'pending';
    const matchesStatus = status === 'all' || currentStatus === status;
    row.classList.toggle('hidden', !(matchesKeyword && matchesStatus));
  });
}

function handleSupportStatusChange(event) {
  const checkbox = event.target;
  if (!checkbox.matches('input[type="checkbox"]')) return;
  const action = checkbox.dataset.action;
  const row = checkbox.closest('tr');
  const type = row.dataset.type;
  const id = row.dataset.id;
  const sheet = type === 'warranty' ? SHEETS.warranty : SHEETS.maintenance;
  const newStatus = action === 'parts' && checkbox.checked ? 'parts' : checkbox.checked ? 'supported' : 'pending';
  showLoading('Đang cập nhật trạng thái...');
  ApiClient.updateRecord(sheet, { id, supportStatus: newStatus })
    .then(() => loadWarrantyRecords())
    .catch((error) => console.error(error))
    .finally(() => hideLoading());
}

function handleChecklistSubmit(event) {
  event.preventDefault();
  if (state.user.permissions !== 'admin') return;
  const formData = new FormData(elements.checklistForm);
  const record = Object.fromEntries(formData.entries());
  const slots = Array.from(elements.scheduleSlots.querySelectorAll('textarea'))
    .map((area) => `${area.dataset.time}: ${area.value}`)
    .join('\n');
  record.tasks = slots;
  showLoading('Đang lưu checklist...');
  ApiClient.createRecord(SHEETS.checklist, record)
    .then(() => loadChecklist())
    .catch((error) => console.error(error))
    .finally(() => hideLoading());
  elements.checklistForm.reset();
  const defaultShift = elements.checklistShift?.value || 'morning';
  renderScheduleSlots(defaultShift);
}

function handleShiftChange(event) {
  renderScheduleSlots(event.target.value);
}

function renderScheduleSlots(shift = 'morning') {
  if (!elements.scheduleSlots) return;
  const slots = getShiftSlots(shift);
  elements.scheduleSlots.innerHTML = '';
  slots.forEach((slot) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'schedule-slot';
    wrapper.innerHTML = `
      <label>${slot}</label>
      <textarea data-time="${slot}" rows="2" placeholder="Công việc"></textarea>`;
    elements.scheduleSlots.appendChild(wrapper);
  });
}

function getShiftSlots(shift) {
  if (shift === 'morning') {
    return ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'];
  }
  if (shift === 'afternoon') {
    return ['13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
  }
  return ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
}

function handleChecklistSearch(event) {
  const keyword = event.target.value.toLowerCase();
  elements.checklistTableBody.querySelectorAll('tr').forEach((row) => {
    const text = row.textContent.toLowerCase();
    row.classList.toggle('hidden', !text.includes(keyword));
  });
}

function handleInventorySubmit(event) {
  event.preventDefault();
  if (state.user.permissions !== 'admin') return;
  const form = event.target;
  const category = form.dataset.category;
  const formData = new FormData(form);
  const record = Object.fromEntries(formData.entries());
  record.type = category === 'import' ? 'Nhập' : 'Xuất';
  showLoading('Đang cập nhật tồn kho...');
  Promise.all([
    ApiClient.createRecord(SHEETS.inventoryLog, record),
    ApiClient.request('syncInventory', { record, category }),
  ])
    .then(() => loadInventory())
    .catch((error) => console.error(error))
    .finally(() => hideLoading());
  form.reset();
}

function handleInventorySearch(event) {
  const keyword = event.target.value.toLowerCase();
  elements.inventoryTableBody.querySelectorAll('tr').forEach((row) => {
    const text = row.textContent.toLowerCase();
    row.classList.toggle('hidden', !text.includes(keyword));
  });
  elements.inventoryLogBody.querySelectorAll('tr').forEach((row) => {
    const text = row.textContent.toLowerCase();
    row.classList.toggle('hidden', !text.includes(keyword));
  });
}

function handleFinanceSubmit(event) {
  event.preventDefault();
  if (state.user.permissions !== 'admin') return;
  const formData = new FormData(elements.financeForm);
  const record = Object.fromEntries(formData.entries());
  showLoading('Đang lưu thu/chi...');
  ApiClient.createRecord(SHEETS.finance, record)
    .then(() => loadFinance())
    .catch((error) => console.error(error))
    .finally(() => hideLoading());
  elements.financeForm.reset();
}

function handleFinanceSearch(event) {
  const keyword = event.target.value.toLowerCase();
  const table = event.target.id === 'incomeSearch' ? elements.incomeTableBody : elements.expenseTableBody;
  table.querySelectorAll('tr').forEach((row) => {
    const text = row.textContent.toLowerCase();
    row.classList.toggle('hidden', !text.includes(keyword));
  });
}

function exportFinanceReport() {
  const month = elements.financeRange.value || new Date().toISOString().slice(0, 7);
  const filtered = state.data.finance.filter((item) => item.date?.startsWith(month));
  const csv = convertToCSV(filtered, ['date', 'type', 'title', 'amount', 'reason']);
  downloadFile(`bao-cao-thu-chi-${month}.csv`, csv);
}

function convertToCSV(data, columns) {
  const header = columns.join(',');
  const rows = data.map((item) =>
    columns
      .map((col) => `"${(item[col] || '').toString().replace(/"/g, '""')}"`)
      .join(',')
  );
  return [header, ...rows].join('\n');
}

function downloadFile(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function handleFeatureToggleSubmit(event) {
  event.preventDefault();
  const formData = new FormData(elements.featureToggleForm);
  const features = Object.fromEntries(
    Array.from(formData.keys()).map((key) => [key, formData.getAll(key).length > 0])
  );
  state.settings.features = { ...state.settings.features, ...features };
  applyFeatureVisibility();
  localStorage.setItem(STORAGE_KEYS.featureToggle, JSON.stringify(state.settings.features));
  persistSettings();
}

function handleCustomerSettingsSubmit(event) {
  event.preventDefault();
  const textarea = document.getElementById('customerSourceOptions');
  const values = textarea.value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
  state.settings.sources = values;
  populateCustomerSources();
  localStorage.setItem(STORAGE_KEYS.customerSources, JSON.stringify(values));
  persistSettings();
}

function handleStaffSettingsSubmit(event) {
  event.preventDefault();
  const values = elements.careStaffList.value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  state.settings.staff = values.length ? values : [...STAFF_DEFAULT];
  localStorage.setItem(STORAGE_KEYS.staffList, JSON.stringify(state.settings.staff));
  populateStaffSelectors();
  persistSettings();
}

function populateStaffSelectors() {
  const selectors = [elements.careStaff, elements.checklistStaff];
  selectors.forEach((select) => {
    if (!select) return;
    select.innerHTML = '';
    state.settings.staff.forEach((staff) => {
      const option = document.createElement('option');
      option.value = staff;
      option.textContent = staff;
      select.appendChild(option);
    });
  });
}

function handleChecklistSettingsSubmit(event) {
  event.preventDefault();
  const value = document.getElementById('checklistTemplate').value;
  state.settings.checklistTemplate = value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
  localStorage.setItem(STORAGE_KEYS.checklistTemplate, JSON.stringify(state.settings.checklistTemplate));
  persistSettings();
}

function handleInventorySettingsSubmit(event) {
  event.preventDefault();
  const threshold = Number(document.getElementById('inventoryThreshold').value || 0);
  state.settings.inventoryThreshold = threshold;
  persistSettings();
}

function handleFinanceSettingsSubmit(event) {
  event.preventDefault();
  const categories = document.getElementById('financeCategories').value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
  state.settings.financeCategories = categories;
  localStorage.setItem(STORAGE_KEYS.financeCategories, JSON.stringify(categories));
  persistSettings();
}

function handleThemeSubmit(event) {
  event.preventDefault();
  const theme = {
    primary: elements.primaryColor.value,
    secondary: elements.secondaryColor.value,
    logoUrl: state.settings.theme.logoUrl,
  };
  if (elements.logoUpload.files[0]) {
    const file = elements.logoUpload.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      theme.logoUrl = reader.result;
      state.settings.theme = theme;
      applyTheme(theme);
      saveTheme(theme);
      persistSettings();
    };
    reader.readAsDataURL(file);
  } else {
    state.settings.theme = theme;
    applyTheme(theme);
    saveTheme(theme);
    persistSettings();
  }
}

function resetTheme() {
  state.settings.theme = {
    primary: '#00796b',
    secondary: '#ffb300',
    logoUrl: 'assets/img/logo.svg',
  };
  applyTheme(state.settings.theme);
  saveTheme(state.settings.theme);
  persistSettings();
}

function persistSettings() {
  ApiClient.request('saveSettings', { settings: state.settings }).catch((error) =>
    console.warn('Không thể đồng bộ settings lên Apps Script', error)
  );
}

function handleSettingsNav(target) {
  elements.settingsLinks.forEach((link) => link.classList.remove('active'));
  elements.settingsPanels.forEach((panel) => panel.classList.remove('active'));
  target.classList.add('active');
  const panel = document.getElementById(target.dataset.target);
  panel?.classList.add('active');
}

function exportCustomers() {
  const csv = convertToCSV(state.data.customers, [
    'date',
    'name',
    'phone',
    'address',
    'source',
    'purchaseStatus',
    'advisedProducts',
    'note',
  ]);
  downloadFile('khach-hang-klc.csv', csv);
}

function populateRememberedUser() {
  const remembered = localStorage.getItem(STORAGE_KEYS.rememberedUser);
  if (!remembered) return;
  try {
    const data = JSON.parse(remembered);
    elements.username.value = data.username || '';
    elements.password.value = data.password || '';
    elements.rememberMe.checked = true;
  } catch (error) {
    console.warn('Không thể đọc thông tin ghi nhớ đăng nhập', error);
  }
}

function initialiseApp() {
  cacheElements();
  populateRememberedUser();
  setupNavigation();
  setupEventListeners();
  const defaultShift = elements.checklistShift?.value || 'morning';
  renderScheduleSlots(defaultShift);
  loadPersistentSettings();
  restoreSession();
}

document.addEventListener('DOMContentLoaded', initialiseApp);
