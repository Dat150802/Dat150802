import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics, isSupported as isAnalyticsSupported } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDkqaX1fCdO0xa9v4YUwd0VN3ZjnhyJhvI",
  authDomain: "klc-ben-luc-crm.firebaseapp.com",
  projectId: "klc-ben-luc-crm",
  storageBucket: "klc-ben-luc-crm.firebasestorage.app",
  messagingSenderId: "499089227125",
  appId: "1:499089227125:web:a1854adad0026d82c0273c",
  measurementId: "G-6GTP0HTMWY"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

isAnalyticsSupported().then((supported) => {
  if (supported) {
    getAnalytics(app);
  }
});

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => parent.querySelectorAll(selector);

const loader = {
  overlay: $("#loading-overlay"),
  show() {
    this.overlay.classList.remove("hidden");
  },
  hide() {
    this.overlay.classList.add("hidden");
  }
};

const state = {
  user: null,
  remember: false,
  collections: {
    customers: [],
    care: [],
    warranty: [],
    maintenance: [],
    checklist: [],
    inventory: [],
    finance: [],
    team: []
  },
  config: {
    themeColor: localStorage.getItem("themeColor") || "#0f6f78",
    accentColor: localStorage.getItem("accentColor") || "#f3b63f",
    driveFolder: localStorage.getItem("driveFolder") || "",
    driveWebhook: localStorage.getItem("driveWebhook") || "",
    lastBackup: localStorage.getItem("lastBackup") || "Chưa thực hiện"
  },
  listeners: [],
  charts: {
    customers: null,
    finance: null
  }
};

applyTheme();

const loginForm = $("#login-form");
const loginScreen = $("#login-screen");
const appShell = $("#app-shell");
const pageTitle = $("#page-title");
const menuButtons = $$(".menu-item");
const pages = $$(".page");
const settingsLinks = $$(".settings-link");
const settingsPanels = $$(".settings-panel");
const sidebar = $(".sidebar");
const menuToggle = $("#menu-toggle");
const logoutButton = $("#logout-button");
const backupButton = $("#backup-button");
const downloadBackup = $("#download-backup");
const driveBackup = $("#drive-backup");
const backupStatus = $("#backup-status");
const driveFolderInput = $("#drive-folder");
const driveWebhookInput = $("#drive-webhook");
const firebaseStatus = $("#firebase-status");
const userName = $("#user-name");
const userRole = $("#user-role");

firebaseStatus.textContent = "Đã kết nối";
firebaseStatus.classList.add("success");

const forms = {
  customer: $("#customer-form"),
  care: $("#care-form"),
  support: $("#support-form"),
  checklist: $("#checklist-form"),
  inventory: $("#inventory-form"),
  finance: $("#finance-form"),
  appearance: $("#appearance-form"),
  team: $("#team-form"),
  integrations: $("#integrations-form")
};

const tables = {
  customers: $("#customer-table tbody"),
  care: $("#care-table tbody"),
  warranty: $("#warranty-table tbody"),
  maintenance: $("#maintenance-table tbody"),
  checklist: $("#checklist-table tbody"),
  inventory: $("#inventory-table tbody"),
  inventorySummary: $("#inventory-summary tbody"),
  finance: $("#finance-table tbody"),
  team: $("#team-table tbody")
};

const inputs = {
  customerSource: $("#customer-source"),
  customerSourceDetail: $("#customer-source-detail"),
  customerStatusPurchased: $("input[name='customer-status'][value='purchased']"),
  customerStatusPending: $("input[name='customer-status'][value='pending']"),
  purchaseDetails: $("#purchase-details"),
  consultDetails: $("#consult-details"),
  careLostReason: $("#care-lost-reason"),
  careRatingRadios: $$("input[name='care-rating']"),
  supportType: $$("input[name='support-type']"),
  supportStatusRow: $("#support-status-row"),
  checklistShift: $("#checklist-shift"),
  checklistTasks: $("#checklist-tasks"),
  staffSelects: [$("#care-staff"), $("#checklist-staff")],
  driveFolder: driveFolderInput,
  driveWebhook: driveWebhookInput,
  themeColor: $("#theme-color"),
  accentColor: $("#accent-color"),
  logoUpload: $("#logo-upload"),
  globalSearch: $("#global-search"),
  customerSearch: $("#customer-search"),
  careSearch: $("#care-search"),
  supportSearch: $("#support-search"),
  supportFilter: $("#support-filter"),
  inventorySearch: $("#inventory-search"),
  financeMonth: $("#finance-month")
};

const dashboards = {
  newCustomers: $("#stat-new-customers"),
  careForms: $("#stat-care-forms"),
  supportForms: $("#stat-support"),
  netIncome: $("#stat-net-income"),
  activityFeed: $("#activity-feed"),
  dashboardPeriod: $("#dashboard-period")
};

const activityTemplate = $("#activity-template").content.firstElementChild;
const careDetail = $("#care-detail");
const careUpdateCustomer = $("#care-update-customer");

init();

async function init() {
  driveFolderInput.value = state.config.driveFolder;
  backupStatus.textContent = state.config.lastBackup;
  inputs.themeColor.value = state.config.themeColor;
  inputs.accentColor.value = state.config.accentColor;
  driveWebhookInput.value = state.config.driveWebhook;
  setupEventListeners();
  updatePurchaseVisibility();
  updateCareLostVisibility();
  updateSupportForm();
  await seedDefaultUsers();
  autoLogin();
  startAutoBackup();
}

function setupEventListeners() {
  loginForm.addEventListener("submit", handleLogin);
  $("#toggle-password").addEventListener("click", togglePassword);
  logoutButton.addEventListener("click", handleLogout);
  backupButton.addEventListener("click", () => triggerBackup("manual"));
  downloadBackup.addEventListener("click", downloadBackupFile);
  driveBackup.addEventListener("click", () => triggerDriveBackup(true));
  forms.integrations.addEventListener("submit", saveIntegrationsConfig);
  forms.appearance.addEventListener("submit", saveAppearance);
  $("#appearance-reset").addEventListener("click", resetAppearance);
  forms.team.addEventListener("submit", handleAddTeamMember);
  menuToggle.addEventListener("click", () => sidebar.classList.toggle("open"));
  inputs.customerSource.addEventListener("change", handleSourceChange);
  inputs.customerStatusPurchased.addEventListener("change", updatePurchaseVisibility);
  inputs.customerStatusPending.addEventListener("change", updatePurchaseVisibility);
  inputs.careRatingRadios.forEach((radio) => radio.addEventListener("change", updateCareLostVisibility));
  inputs.supportType.forEach((radio) => radio.addEventListener("change", updateSupportForm));
  inputs.checklistShift.addEventListener("change", () => renderShiftTasks(inputs.checklistShift.value));
  careUpdateCustomer.addEventListener("click", syncCareToCustomer);
  dashboards.dashboardPeriod.addEventListener("change", renderDashboardStats);
  inputs.financeMonth.addEventListener("change", renderFinanceSummary);

  [
    [inputs.globalSearch, filterGlobal],
    [inputs.customerSearch, filterCustomers],
    [inputs.careSearch, filterCare],
    [inputs.supportSearch, filterSupport],
    [inputs.inventorySearch, filterInventory]
  ].forEach(([input, handler]) => input && input.addEventListener("input", handler));

  inputs.supportFilter.addEventListener("change", filterSupport);

  menuButtons.forEach((button) => {
    button.addEventListener("click", () => switchPage(button.dataset.target));
  });

  settingsLinks.forEach((link) => {
    link.addEventListener("click", () => switchSettings(link.dataset.settings));
  });

  forms.customer.addEventListener("submit", handleCustomerSubmit);
  forms.care.addEventListener("submit", handleCareSubmit);
  forms.support.addEventListener("submit", handleSupportSubmit);
  forms.checklist.addEventListener("submit", handleChecklistSubmit);
  forms.inventory.addEventListener("submit", handleInventorySubmit);
  forms.finance.addEventListener("submit", handleFinanceSubmit);

  forms.customer.addEventListener("reset", () => setTimeout(updatePurchaseVisibility));
  forms.care.addEventListener("reset", () => setTimeout(updateCareLostVisibility));
  forms.support.addEventListener("reset", () => setTimeout(updateSupportForm));
  forms.checklist.addEventListener("reset", () => setTimeout(() => renderShiftTasks(inputs.checklistShift.value)));

  inputs.logoUpload.addEventListener("change", handleLogoUpload);

  document.addEventListener("click", (evt) => {
    if (!sidebar.contains(evt.target) && !menuToggle.contains(evt.target)) {
      sidebar.classList.remove("open");
    }
  });
}

async function seedDefaultUsers() {
  const defaults = [
    { username: "admin", password: "123456", role: "admin", displayName: "Quản trị viên" },
    { username: "nhanvien", password: "1234", role: "staff", displayName: "Nhân viên" }
  ];

  await Promise.all(
    defaults.map(async (user) => {
      const userDoc = doc(db, "users", user.username);
      const snapshot = await getDoc(userDoc);
      if (!snapshot.exists()) {
        await setDoc(userDoc, {
          displayName: user.displayName,
          role: user.role,
          password: await hashPassword(user.password),
          active: true,
          createdAt: serverTimestamp()
        });
      }
    })
  );
}

function autoLogin() {
  const stored = localStorage.getItem("klcUser");
  const sessionStored = sessionStorage.getItem("klcUser");
  const userData = stored ? JSON.parse(stored) : sessionStored ? JSON.parse(sessionStored) : null;
  if (userData) {
    state.user = userData;
    loginScreen.classList.add("hidden");
    appShell.classList.remove("hidden");
    setupAfterLogin();
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const username = formData.get("username").trim();
  const password = formData.get("password").trim();
  const remember = $("#remember-me").checked;
  const keepSession = $("#keep-session").checked;

  toggleButtonLoading(loginForm.querySelector("button[type='submit']"), true);
  loader.show();

  try {
    const userDoc = await getDoc(doc(db, "users", username));
    if (!userDoc.exists()) throw new Error("Tài khoản không tồn tại");
    const data = userDoc.data();
    const hashed = await hashPassword(password);
    if (hashed !== data.password) throw new Error("Sai mật khẩu");
    if (data.active === false) throw new Error("Tài khoản đã bị vô hiệu hóa");

    state.user = {
      username,
      displayName: data.displayName,
      role: data.role
    };

    if (remember) {
      localStorage.setItem("klcUser", JSON.stringify(state.user));
    } else {
      localStorage.removeItem("klcUser");
    }

    if (keepSession) {
      sessionStorage.setItem("klcUser", JSON.stringify(state.user));
    } else {
      sessionStorage.removeItem("klcUser");
    }

    loginScreen.classList.add("hidden");
    appShell.classList.remove("hidden");
    setupAfterLogin();
  } catch (error) {
    alert(error.message);
  } finally {
    loader.hide();
    toggleButtonLoading(loginForm.querySelector("button[type='submit']"), false);
  }
}

function setupAfterLogin() {
  userName.textContent = state.user.displayName;
  userRole.textContent = state.user.role === "admin" ? "Quản trị viên" : "Nhân viên";
  sidebar.classList.remove("open");
  switchPage("dashboard");
  renderShiftTasks(inputs.checklistShift.value);
  subscribeCollections();
  applyPermissions();
}

function applyPermissions() {
  const isAdmin = state.user.role === "admin";
  const adminOnlyButtons = [backupButton, downloadBackup, driveBackup, forms.appearance.querySelector("button[type='submit']"), forms.team.querySelector("button[type='submit']"), forms.integrations.querySelector("button[type='submit']")];

  adminOnlyButtons.forEach((btn) => {
    if (!btn) return;
    btn.disabled = !isAdmin;
    btn.classList.toggle("disabled", !isAdmin);
  });

  const adminOnlyForms = [forms.customer, forms.care, forms.support, forms.checklist, forms.inventory, forms.finance];
  adminOnlyForms.forEach((form) => toggleFormEditable(form, isAdmin));

  if (!isAdmin) {
    $(".menu-item[data-target='settings']").classList.add("hidden");
  } else {
    $(".menu-item[data-target='settings']").classList.remove("hidden");
  }
}

function toggleFormEditable(form, enabled) {
  if (!form) return;
  form.querySelectorAll("input, select, textarea, button[type='submit']").forEach((element) => {
    if (element.dataset.allowStaff === "true") return;
    element.disabled = !enabled;
  });
}

function handleLogout() {
  state.user = null;
  localStorage.removeItem("klcUser");
  sessionStorage.removeItem("klcUser");
  unsubscribeCollections();
  appShell.classList.add("hidden");
  loginScreen.classList.remove("hidden");
  loginForm.reset();
}

function togglePassword() {
  const field = $("#password");
  const isPassword = field.type === "password";
  field.type = isPassword ? "text" : "password";
  this.innerHTML = `<i class="fa-solid ${isPassword ? "fa-eye-slash" : "fa-eye"}"></i>`;
}

function switchPage(target) {
  pages.forEach((page) => page.classList.toggle("active", page.id === target));
  menuButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.target === target));
  const page = pages.find((p) => p.id === target);
  pageTitle.textContent = page?.dataset.pageTitle || "KLC";
  sidebar.classList.remove("open");
}

function switchSettings(target) {
  settingsLinks.forEach((link) => link.classList.toggle("active", link.dataset.settings === target));
  settingsPanels.forEach((panel) => panel.classList.toggle("active", panel.dataset.settingsPanel === target));
}

function handleSourceChange() {
  const value = inputs.customerSource.value;
  const placeholderMap = {
    online: "Từ bài viết nào?",
    "referral-new": "Được giới thiệu bởi khách nào?",
    "referral-repeat": "Khách cũ nào quay lại?",
    staff: "Nhân viên nào giới thiệu?",
    other: "Nguồn khác?"
  };
  const detail = placeholderMap[value];
  if (detail) {
    inputs.customerSourceDetail.placeholder = detail;
    inputs.customerSourceDetail.classList.remove("hidden");
  } else {
    inputs.customerSourceDetail.classList.add("hidden");
    inputs.customerSourceDetail.value = "";
  }
}

function updatePurchaseVisibility() {
  const purchased = inputs.customerStatusPurchased.checked;
  inputs.purchaseDetails.classList.toggle("hidden", !purchased);
  inputs.consultDetails.classList.toggle("hidden", purchased);
}

function updateCareLostVisibility() {
  const lost = Array.from(inputs.careRatingRadios).find((radio) => radio.checked)?.value === "lost";
  inputs.careLostReason.classList.toggle("hidden", !lost);
}

function updateSupportForm() {
  const value = Array.from(inputs.supportType).find((radio) => radio.checked)?.value;
  inputs.supportStatusRow.classList.toggle("hidden", value === "maintenance");
}

function renderShiftTasks(shift) {
  const slots = {
    morning: [
      "08:00",
      "09:00",
      "10:00",
      "11:00",
      "12:00",
      "13:00",
      "14:00",
      "15:00"
    ],
    afternoon: [
      "13:00",
      "14:00",
      "15:00",
      "16:00",
      "17:00",
      "18:00",
      "19:00",
      "20:00"
    ],
    full: [
      "08:00",
      "09:00",
      "10:00",
      "11:00",
      "12:00",
      "13:00",
      "14:00",
      "15:00",
      "16:00",
      "17:00",
      "18:00",
      "19:00",
      "20:00"
    ]
  };
  inputs.checklistTasks.innerHTML = "";
  slots[shift].forEach((time) => {
    const row = document.createElement("div");
    row.className = "task-row";
    row.innerHTML = `
      <label>${time}</label>
      <input type="text" name="task-${time.replace(":", "")}" placeholder="Công việc" />
    `;
    inputs.checklistTasks.appendChild(row);
  });
}

async function handleCustomerSubmit(event) {
  event.preventDefault();
  const data = collectFormData(forms.customer);
  data.status = forms.customer.querySelector("input[name='customer-status']:checked").value;
  data.source = inputs.customerSource.value;
  data.sourceDetail = inputs.customerSourceDetail.value;
  data.purchased = data.status === "purchased";
  data.price = Number(forms.customer.querySelector("#customer-price").value || 0);
  data.consulted = forms.customer.querySelector("#customer-consult").value;
  data.consultPricing = forms.customer.querySelector("#customer-consult-price").value;

  await submitWithLoader(async () => {
    await addDoc(collection(db, "customers"), {
      ...data,
      createdAt: serverTimestamp()
    });
  });
  forms.customer.reset();
  updatePurchaseVisibility();
}

async function handleCareSubmit(event) {
  event.preventDefault();
  const data = collectFormData(forms.care);
  data.rating = forms.care.querySelector("input[name='care-rating']:checked").value;
  data.lostReason = inputs.careLostReason.value;

  await submitWithLoader(async () => {
    await addDoc(collection(db, "care"), {
      ...data,
      createdAt: serverTimestamp()
    });
  });
  forms.care.reset();
  updateCareLostVisibility();
}

async function handleSupportSubmit(event) {
  event.preventDefault();
  const type = Array.from(inputs.supportType).find((radio) => radio.checked)?.value;
  const data = collectFormData(forms.support);
  data.type = type;
  data.supported = false;
  data.partsSent = false;
  data.partsInfo = "";

  await submitWithLoader(async () => {
    await addDoc(collection(db, "support"), {
      ...data,
      createdAt: serverTimestamp()
    });
  });
  forms.support.reset();
  updateSupportForm();
}

async function handleChecklistSubmit(event) {
  event.preventDefault();
  const data = collectFormData(forms.checklist);
  const tasks = {};
  inputs.checklistTasks.querySelectorAll("input").forEach((input) => {
    if (input.value.trim()) tasks[input.previousElementSibling.textContent] = input.value.trim();
  });
  data.tasks = tasks;

  await submitWithLoader(async () => {
    await addDoc(collection(db, "checklists"), {
      ...data,
      createdAt: serverTimestamp()
    });
  });
  forms.checklist.reset();
  renderShiftTasks(inputs.checklistShift.value);
}

async function handleInventorySubmit(event) {
  event.preventDefault();
  const data = collectFormData(forms.inventory);
  data.quantity = Number(data.quantity);

  await submitWithLoader(async () => {
    await addDoc(collection(db, "inventory"), {
      ...data,
      createdAt: serverTimestamp()
    });
  });
  forms.inventory.reset();
}

async function handleFinanceSubmit(event) {
  event.preventDefault();
  const data = collectFormData(forms.finance);
  data.amount = Number(data.amount);

  await submitWithLoader(async () => {
    await addDoc(collection(db, "finance"), {
      ...data,
      createdAt: serverTimestamp()
    });
  });
  forms.finance.reset();
}

async function handleAddTeamMember(event) {
  event.preventDefault();
  if (state.user.role !== "admin") return;
  const data = collectFormData(forms.team);
  const username = data.username;
  const userDoc = doc(db, "users", username);
  const snapshot = await getDoc(userDoc);
  if (snapshot.exists()) {
    alert("Tài khoản đã tồn tại");
    return;
  }

  await submitWithLoader(async () => {
    await setDoc(userDoc, {
      displayName: data.name,
      role: data.role,
      password: await hashPassword(data.password),
      active: true,
      createdAt: serverTimestamp()
    });
  });
  forms.team.reset();
}

async function saveIntegrationsConfig(event) {
  event.preventDefault();
  state.config.driveFolder = inputs.driveFolder.value.trim();
  state.config.driveWebhook = inputs.driveWebhook.value.trim();
  localStorage.setItem("driveFolder", state.config.driveFolder);
  localStorage.setItem("driveWebhook", state.config.driveWebhook);
  alert("Đã lưu cấu hình kết nối.");
}

async function saveAppearance(event) {
  event.preventDefault();
  state.config.themeColor = inputs.themeColor.value;
  state.config.accentColor = inputs.accentColor.value;
  localStorage.setItem("themeColor", state.config.themeColor);
  localStorage.setItem("accentColor", state.config.accentColor);
  applyTheme();
  alert("Đã cập nhật giao diện");
}

function resetAppearance() {
  inputs.themeColor.value = "#0f6f78";
  inputs.accentColor.value = "#f3b63f";
  saveAppearance(new Event("submit"));
}

function applyTheme() {
  document.documentElement.style.setProperty("--color-primary", state.config.themeColor || "#0f6f78");
  document.documentElement.style.setProperty("--color-accent", state.config.accentColor || "#f3b63f");
}

function collectFormData(form) {
  const formData = new FormData(form);
  const data = {};
  formData.forEach((value, key) => {
    data[key.replace(/-/g, "")] = typeof value === "string" ? value.trim() : value;
  });
  return data;
}

async function submitWithLoader(fn) {
  loader.show();
  try {
    await fn();
  } catch (error) {
    console.error(error);
    alert("Không thể lưu dữ liệu. Vui lòng kiểm tra kết nối và thử lại.");
  } finally {
    loader.hide();
  }
}

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function subscribeCollections() {
  unsubscribeCollections();

  state.listeners.push(
    onSnapshot(query(collection(db, "customers"), orderBy("createdAt", "desc")), (snapshot) => {
      state.collections.customers = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      renderCustomers();
      renderDashboardStats();
      populateCustomerSuggestions();
      logActivity("Khách hàng", "Cập nhật danh sách khách hàng");
    })
  );

  state.listeners.push(
    onSnapshot(query(collection(db, "care"), orderBy("createdAt", "desc")), (snapshot) => {
      state.collections.care = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      renderCare();
      renderDashboardStats();
      logActivity("CSKH", "Cập nhật phiếu chăm sóc khách");
    })
  );

  state.listeners.push(
    onSnapshot(query(collection(db, "support"), orderBy("createdAt", "desc")), (snapshot) => {
      const all = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      state.collections.warranty = all.filter((item) => item.type === "warranty");
      state.collections.maintenance = all.filter((item) => item.type === "maintenance");
      renderSupportTables();
      renderDashboardStats();
      logActivity("Bảo hành", "Cập nhật phiếu hỗ trợ");
    })
  );

  state.listeners.push(
    onSnapshot(query(collection(db, "checklists"), orderBy("createdAt", "desc")), (snapshot) => {
      state.collections.checklist = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      renderChecklist();
      logActivity("CheckList", "Cập nhật công việc nhân viên");
    })
  );

  state.listeners.push(
    onSnapshot(query(collection(db, "inventory"), orderBy("createdAt", "desc")), (snapshot) => {
      state.collections.inventory = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      renderInventory();
      logActivity("Tồn kho", "Cập nhật giao dịch kho");
    })
  );

  state.listeners.push(
    onSnapshot(query(collection(db, "finance"), orderBy("createdAt", "desc")), (snapshot) => {
      state.collections.finance = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      renderFinance();
      renderDashboardStats();
      logActivity("Thu & Chi", "Cập nhật giao dịch tài chính");
    })
  );

  state.listeners.push(
    onSnapshot(query(collection(db, "users"), orderBy("createdAt", "desc")), (snapshot) => {
      state.collections.team = snapshot.docs.map((doc) => ({ username: doc.id, ...doc.data() }));
      renderTeam();
      populateStaffSelects();
    })
  );
}

function unsubscribeCollections() {
  state.listeners.forEach((unsub) => unsub && unsub());
  state.listeners = [];
}

function renderCustomers() {
  tables.customers.innerHTML = state.collections.customers
    .map((customer) => {
      const statusLabel = customer.status === "purchased" ? "Đã mua" : "Chưa mua";
      return `
        <tr data-id="${customer.id}" data-status="${customer.status}" data-name="${customer.name}" data-phone="${customer.phone}">
          <td>${formatDate(customer.date)}</td>
          <td>${customer.name || ""}</td>
          <td>${customer.phone || ""}</td>
          <td>${formatSource(customer.source, customer.sourceDetail)}</td>
          <td><span class="badge badge-${customer.status}">${statusLabel}</span></td>
          <td><button class="btn ghost btn-xs" data-link="care" data-id="${customer.id}">CSKH</button></td>
          <td><button class="btn ghost btn-xs" data-link="history" data-id="${customer.id}">Xem</button></td>
        </tr>
      `;
    })
    .join("");
}

function renderCare() {
  tables.care.innerHTML = state.collections.care
    .map((care) => {
      return `
        <tr data-id="${care.id}" data-name="${care.name}" data-phone="${care.phone}" data-staff="${care.staff}">
          <td>${formatDate(care.date)}</td>
          <td>${care.name}</td>
          <td>${care.staff}</td>
          <td>${formatCareMethod(care.method)}</td>
          <td>${formatCareRating(care.rating)}</td>
          <td><button class="btn ghost btn-xs" data-detail="${care.id}">Chi tiết</button></td>
        </tr>
      `;
    })
    .join("");

  tables.care.querySelectorAll("button[data-detail]").forEach((button) => {
    button.addEventListener("click", () => showCareDetail(button.dataset.detail));
  });
}

function showCareDetail(id) {
  const record = state.collections.care.find((item) => item.id === id);
  if (!record) return;
  careDetail.innerHTML = `
    <h4>${record.name}</h4>
    <p><strong>Ngày:</strong> ${formatDate(record.date)}</p>
    <p><strong>Nhân viên:</strong> ${record.staff}</p>
    <p><strong>Hình thức:</strong> ${formatCareMethod(record.method)}</p>
    <p><strong>Nội dung:</strong><br />${record.content || "-"}</p>
    <p><strong>Phản hồi:</strong><br />${record.feedback || "-"}</p>
    <p><strong>Đánh giá:</strong> ${formatCareRating(record.rating)}</p>
    ${record.rating === "lost" ? `<p><strong>Lý do:</strong> ${record.lostReason || "-"}</p>` : ""}
    <p><strong>Ghi chú:</strong><br />${record.notes || "-"}</p>
  `;
  careDetail.dataset.customer = record.name;
  careDetail.dataset.phone = record.phone;
}

function syncCareToCustomer() {
  if (!careDetail.dataset.customer) {
    alert("Vui lòng chọn một phiếu CSKH trước");
    return;
  }
  const name = careDetail.dataset.customer;
  const phone = careDetail.dataset.phone;
  const customer = state.collections.customers.find((item) => item.name === name || item.phone === phone);
  if (!customer) {
    alert("Chưa có khách hàng tương ứng");
    return;
  }
  alert(`Đã đồng bộ thông tin chăm sóc cho khách ${name}. Vui lòng mở trang khách hàng để cập nhật chi tiết.`);
}

function renderSupportTables() {
  const buildRow = (item) => {
    return `
      <tr data-id="${item.id}" data-supported="${item.supported}" data-parts="${item.partsSent}">
        <td>${formatDate(item.date)}</td>
        <td>${item.name}</td>
        <td>${item.phone}</td>
        <td>${item.product || ""}</td>
        <td>
          <label class="toggle">
            <input type="checkbox" ${item.supported ? "checked" : ""} data-action="supported" data-id="${item.id}">
            <span>Đã hỗ trợ</span>
          </label>
        </td>
        <td>
          <label class="toggle">
            <input type="checkbox" ${item.partsSent ? "checked" : ""} data-action="parts" data-id="${item.id}">
            <span>Gửi linh kiện</span>
          </label>
        </td>
        <td><button class="btn ghost btn-xs" data-support-detail="${item.id}">Chi tiết</button></td>
      </tr>
    `;
  };

  tables.warranty.innerHTML = state.collections.warranty.map(buildRow).join("");
  tables.maintenance.innerHTML = state.collections.maintenance.map(buildRow).join("");

  $$("input[data-action='supported']").forEach((checkbox) => {
    checkbox.disabled = state.user.role !== "admin";
    checkbox.addEventListener("change", () => updateSupportStatus(checkbox.dataset.id, "supported", checkbox.checked));
  });
  $$("input[data-action='parts']").forEach((checkbox) => {
    checkbox.disabled = state.user.role !== "admin";
    checkbox.addEventListener("change", () => updateSupportStatus(checkbox.dataset.id, "partsSent", checkbox.checked));
  });

  filterSupport();
}

async function updateSupportStatus(id, field, value) {
  if (state.user.role !== "admin") {
    alert("Chỉ quản trị viên mới có quyền cập nhật trạng thái.");
    return;
  }
  loader.show();
  try {
    await updateDoc(doc(db, "support", id), {
      [field]: value,
      ...(field === "partsSent" && value
        ? {
            partsInfo: `${new Date().toLocaleString("vi-VN")}`
          }
        : {})
    });
  } catch (error) {
    alert("Không thể cập nhật trạng thái");
  } finally {
    loader.hide();
  }
}

function renderChecklist() {
  tables.checklist.innerHTML = state.collections.checklist
    .map((item) => {
      return `
        <tr>
          <td>${formatDate(item.date)}</td>
          <td>${item.staff}</td>
          <td>${formatShift(item.shift)}</td>
          <td>${item.summary || "-"}</td>
          <td><button class="btn ghost btn-xs" data-checklist="${item.id}">Chi tiết</button></td>
        </tr>
      `;
    })
    .join("");
}

function renderInventory() {
  tables.inventory.innerHTML = state.collections.inventory
    .map((item) => `
      <tr>
        <td>${formatDate(item.date)}</td>
        <td>${item.item}</td>
        <td>${item.type === "in" ? "Nhập" : "Xuất"}</td>
        <td>${item.quantity}</td>
        <td>${item.notes || ""}</td>
      </tr>
    `)
    .join("");

  const summary = {};
  state.collections.inventory.forEach((item) => {
    if (!summary[item.item]) summary[item.item] = 0;
    summary[item.item] += item.type === "in" ? Number(item.quantity) : -Number(item.quantity);
  });

  tables.inventorySummary.innerHTML = Object.entries(summary)
    .map(([name, quantity]) => `
      <tr>
        <td>${name}</td>
        <td>${quantity}</td>
      </tr>
    `)
    .join("");
}

function renderFinance() {
  tables.finance.innerHTML = state.collections.finance
    .map((item) => `
      <tr>
        <td>${formatDate(item.date)}</td>
        <td>${item.type === "income" ? "Thu" : "Chi"}</td>
        <td>${item.category}</td>
        <td>${formatCurrency(item.amount)}</td>
        <td>${item.notes || ""}</td>
      </tr>
    `)
    .join("");
  renderFinanceSummary();
  renderFinanceChart();
}

function renderFinanceSummary() {
  const month = inputs.financeMonth.value;
  const summaryElement = $("#finance-summary");
  const data = month
    ? state.collections.finance.filter((item) => item.date?.startsWith(month))
    : state.collections.finance;
  const income = data.filter((item) => item.type === "income").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const expense = data.filter((item) => item.type === "expense").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const net = income - expense;
  summaryElement.innerHTML = `
    <div class="summary-item"><span>Tổng thu</span><strong>${formatCurrency(income)}</strong></div>
    <div class="summary-item"><span>Tổng chi</span><strong>${formatCurrency(expense)}</strong></div>
    <div class="summary-item"><span>Lợi nhuận</span><strong>${formatCurrency(net)}</strong></div>
  `;
}

function renderTeam() {
  tables.team.innerHTML = state.collections.team
    .map((member) => `
      <tr>
        <td>${member.displayName}</td>
        <td>${member.username}</td>
        <td>${member.role === "admin" ? "Quản trị viên" : "Nhân viên"}</td>
        <td>${member.active ? "Đang hoạt động" : "Ngưng"}</td>
      </tr>
    `)
    .join("");
}

function populateCustomerSuggestions() {
  const nameList = $("#customer-name-suggestions");
  const phoneList = $("#customer-phone-suggestions");
  nameList.innerHTML = state.collections.customers.map((customer) => `<option value="${customer.name}"></option>`).join("");
  phoneList.innerHTML = state.collections.customers.map((customer) => `<option value="${customer.phone}"></option>`).join("");
}

function populateStaffSelects() {
  const options = state.collections.team
    .filter((member) => member.active !== false)
    .map((member) => `<option value="${member.displayName}">${member.displayName}</option>`)
    .join("");
  inputs.staffSelects.forEach((select) => {
    if (!select) return;
    select.innerHTML = options;
  });
}

function renderDashboardStats() {
  const days = Number(dashboards.dashboardPeriod.value);
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);

  const filterByDate = (items) =>
    items.filter((item) => {
      if (!item.date) return false;
      const itemDate = new Date(item.date);
      return !isNaN(itemDate) && itemDate >= fromDate;
    });

  const customers = filterByDate(state.collections.customers);
  const care = filterByDate(state.collections.care);
  const support = filterByDate([...state.collections.warranty, ...state.collections.maintenance]);
  const finance = filterByDate(state.collections.finance);

  dashboards.newCustomers.textContent = customers.length;
  dashboards.careForms.textContent = care.length;
  dashboards.supportForms.textContent = support.length;

  const net = finance.reduce((sum, item) => sum + (item.type === "income" ? Number(item.amount) : -Number(item.amount)), 0);
  dashboards.netIncome.textContent = `${formatCurrency(net)}`;

  renderCustomersChart();
  renderFinanceChart();
}

function renderCustomersChart() {
  const ctx = $("#customers-chart");
  const grouped = groupByMonth(state.collections.customers, "date");
  const labels = Object.keys(grouped);
  const data = Object.values(grouped);

  if (state.charts.customers) state.charts.customers.destroy();

  state.charts.customers = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Khách hàng mới",
          data,
          borderColor: getComputedStyle(document.documentElement).getPropertyValue("--color-primary"),
          backgroundColor: "rgba(15, 111, 120, 0.2)",
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

function renderFinanceChart() {
  const ctx = $("#finance-chart");
  const income = groupByMonth(state.collections.finance.filter((item) => item.type === "income"), "date");
  const expense = groupByMonth(state.collections.finance.filter((item) => item.type === "expense"), "date");
  const labels = Array.from(new Set([...Object.keys(income), ...Object.keys(expense)])).sort();
  const incomeData = labels.map((label) => income[label] || 0);
  const expenseData = labels.map((label) => expense[label] || 0);

  if (state.charts.finance) state.charts.finance.destroy();

  state.charts.finance = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Thu",
          data: incomeData,
          backgroundColor: "rgba(15, 111, 120, 0.7)"
        },
        {
          label: "Chi",
          data: expenseData,
          backgroundColor: "rgba(243, 182, 63, 0.7)"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          ticks: {
            callback: (value) => `${Number(value).toLocaleString("vi-VN")}`
          }
        }
      }
    }
  });
}

function filterGlobal(event) {
  const query = event.target.value.toLowerCase();
  [tables.customers, tables.care, tables.warranty, tables.maintenance, tables.inventory, tables.finance].forEach((tbody) => {
    Array.from(tbody?.rows || []).forEach((row) => {
      row.style.display = row.textContent.toLowerCase().includes(query) ? "" : "none";
    });
  });
}

function filterCustomers(event) {
  filterTable(tables.customers, event.target.value);
}

function filterCare(event) {
  filterTable(tables.care, event.target.value);
}

function filterSupport() {
  const query = inputs.supportSearch.value.toLowerCase();
  const filter = inputs.supportFilter.value;

  [tables.warranty, tables.maintenance].forEach((tbody) => {
    Array.from(tbody.rows).forEach((row) => {
      const matchesQuery = row.textContent.toLowerCase().includes(query);
      const supported = row.dataset.supported === "true";
      const parts = row.dataset.parts === "true";
      let matchesFilter = true;
      if (filter === "pending") matchesFilter = !supported;
      if (filter === "done") matchesFilter = supported;
      if (filter === "parts") matchesFilter = parts;
      row.style.display = matchesQuery && matchesFilter ? "" : "none";
    });
  });
}

function filterInventory(event) {
  filterTable(tables.inventory, event.target.value);
}

function filterTable(tbody, keyword) {
  if (!tbody) return;
  const query = keyword.toLowerCase();
  Array.from(tbody.rows).forEach((row) => {
    row.style.display = row.textContent.toLowerCase().includes(query) ? "" : "none";
  });
}

function logActivity(module, message) {
  const li = activityTemplate.cloneNode(true);
  li.querySelector(".timeline-title").textContent = `${module}: ${message}`;
  li.querySelector(".timeline-time").textContent = new Date().toLocaleString("vi-VN");
  dashboards.activityFeed.prepend(li);
  while (dashboards.activityFeed.children.length > 10) {
    dashboards.activityFeed.removeChild(dashboards.activityFeed.lastElementChild);
  }
}

function groupByMonth(items, field) {
  return items.reduce((acc, item) => {
    if (!item[field]) return acc;
    const date = new Date(item[field]);
    if (isNaN(date)) return acc;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    acc[key] = (acc[key] || 0) + (item.amount ? Number(item.amount) : 1);
    return acc;
  }, {});
}

function formatDate(date) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("vi-VN");
}

function formatSource(source, detail) {
  const labels = {
    store: "Ghé cửa hàng",
    online: "Online",
    "referral-new": "Khách cũ giới thiệu",
    "referral-repeat": "Khách cũ mua lại",
    staff: "Người quen nhân viên",
    other: "Khác"
  };
  const label = labels[source] || "-";
  return detail ? `${label} (${detail})` : label;
}

function formatCareMethod(method) {
  return {
    call: "Gọi điện",
    message: "Nhắn tin",
    broadcast: "Gửi tin hàng loạt",
    "call-message": "Gọi + nhắn"
  }[method] || "-";
}

function formatCareRating(rating) {
  return {
    potential: "Còn tiềm năng",
    nurturing: "Đang nuôi",
    appointment: "Đang hẹn",
    lost: "Hết tiềm năng"
  }[rating] || "-";
}

function formatShift(shift) {
  return {
    morning: "Ca sáng",
    afternoon: "Ca chiều",
    full: "Ca full"
  }[shift] || shift;
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("vi-VN") + " ₫";
}

function toggleButtonLoading(button, loading) {
  if (!button) return;
  button.dataset.loading = loading ? "true" : "false";
}

async function downloadBackupFile() {
  const data = await exportData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `klc-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  updateBackupStatus();
}

async function triggerBackup(mode = "auto") {
  const data = await exportData();
  console.info(`Backup ${mode}`, data);
  updateBackupStatus();
  if (mode === "manual") {
    alert("Đã sao lưu dữ liệu nội bộ. Để đồng bộ với Google Drive, vui lòng nhấn \"Sao lưu lên Drive\" hoặc thiết lập Apps Script.");
  }
}

async function triggerDriveBackup(showAlert = false) {
  if (!state.config.driveFolder) {
    alert("Vui lòng nhập ID thư mục Google Drive trong phần Kết nối.");
    return;
  }
  const data = await exportData();
  try {
    await uploadToDrive(data);
    updateBackupStatus();
    if (showAlert) alert("Đã gửi dữ liệu lên Google Drive.");
  } catch (error) {
    console.error(error);
    alert("Không thể sao lưu lên Google Drive. Kiểm tra Apps Script/Drive API.");
  }
}

async function uploadToDrive(data) {
  const endpoint = state.config.driveWebhook;
  if (!endpoint) throw new Error("Chưa cấu hình webhook Drive");
  await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      folderId: state.config.driveFolder,
      payload: data,
      timestamp: new Date().toISOString()
    })
  });
}

async function exportData() {
  const collections = ["customers", "care", "support", "checklists", "inventory", "finance", "users"];
  const result = {};
  for (const name of collections) {
    const snapshot = await getDocs(collection(db, name));
    result[name] = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }
  return result;
}

function updateBackupStatus() {
  const status = `Lần cuối: ${new Date().toLocaleString("vi-VN")}`;
  backupStatus.textContent = status;
  state.config.lastBackup = status;
  localStorage.setItem("lastBackup", status);
}

function startAutoBackup() {
  setInterval(() => {
    if (!state.user || state.user.role !== "admin") return;
    triggerBackup("auto");
  }, 15 * 60 * 1000);
}

async function handleLogoUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const base64 = reader.result;
    localStorage.setItem("klcLogo", base64);
    $("#sidebar-logo").src = base64;
  };
  reader.readAsDataURL(file);
}

function autoLoadLogo() {
  const logo = localStorage.getItem("klcLogo");
  if (logo) {
    $("#sidebar-logo").src = logo;
  }
}

autoLoadLogo();

function formatCareDetail(record) {
  return record;
}

function filterCareByName(name) {
  return state.collections.care.filter((item) => item.name?.toLowerCase().includes(name.toLowerCase()));
}
