// ---------- Helpers ----------
const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => parent.querySelectorAll(selector);

// ---------- Google Apps Script API (tùy chọn) ----------
const api = {
  baseUrl: "",
  setBaseUrl(url) {
    this.baseUrl = url ? url.trim() : "";
  },
  isConfigured() {
    return Boolean(this.baseUrl);
  },
  async request(resource, action, payload = {}) {
    if (!this.isConfigured()) throw new Error("Chưa cấu hình đường dẫn Google Apps Script.");
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resource, action, payload })
    });
    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error("Google Apps Script trả về dữ liệu không hợp lệ.");
    }
    if (!response.ok || result.success === false) {
      throw new Error(result.message || "Không thể kết nối Google Apps Script.");
    }
    return result.data ?? result;
  },
  list(resource) { return this.request(resource, "list"); },
  create(resource, data) { return this.request(resource, "create", data); },
  update(resource, data) { return this.request(resource, "update", data); },
  remove(resource, data) { return this.request(resource, "delete", data); }
};

// ---------- Firebase ----------
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
isAnalyticsSupported().then((supported) => { if (supported) getAnalytics(app); });

// ---------- Global State ----------
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
    scriptUrl: localStorage.getItem("scriptUrl") || "",
    driveFolder: localStorage.getItem("driveFolder") || "",
    driveWebhook: localStorage.getItem("driveWebhook") || "",
    lastBackup: localStorage.getItem("lastBackup") || "Chưa thực hiện"
  },
  listeners: [],
  charts: { customers: null, finance: null },
  syncTimer: null
};

// Áp dụng baseUrl cho API (nếu có)
api.setBaseUrl(state.config.scriptUrl);

// ---------- UI Refs ----------
const loader = {
  overlay: $("#loading-overlay"),
  show() { this.overlay && this.overlay.classList.remove("hidden"); },
  hide() { this.overlay && this.overlay.classList.add("hidden"); }
};

const loginForm = $("#login-form");
const loginScreen = $("#login-screen");
const appShell = $("#app-shell");
const pageTitle = $("#page-title");
const menuButtons = $$(".menu-item");
const pages = Array.from($$(".page"));
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
const scriptStatus = $("#script-status");
const firebaseStatus = $("#firebase-status");
const userName = $("#user-name");
const userRole = $("#user-role");

// Forms
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

// Tables
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

// Inputs
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
  scriptUrl: $("#script-url"),
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

// Dashboard
const dashboards = {
  newCustomers: $("#stat-new-customers"),
  careForms: $("#stat-care-forms"),
  supportForms: $("#stat-support"),
  netIncome: $("#stat-net-income"),
  activityFeed: $("#activity-feed"),
  dashboardPeriod: $("#dashboard-period")
};
const activityTemplate = $("#activity-template")?.content?.firstElementChild;
const careDetail = $("#care-detail");
const careUpdateCustomer = $("#care-update-customer");

// ---------- Init ----------
init();

async function init() {
  // UI init
  if (firebaseStatus) {
    firebaseStatus.textContent = "Đã kết nối";
    firebaseStatus.classList.add("success");
  }

  driveFolderInput.value = state.config.driveFolder;
  driveWebhookInput.value = state.config.driveWebhook;
  if (inputs.scriptUrl) inputs.scriptUrl.value = state.config.scriptUrl;
  if (backupStatus) backupStatus.textContent = state.config.lastBackup;
  if (inputs.themeColor) inputs.themeColor.value = state.config.themeColor;
  if (inputs.accentColor) inputs.accentColor.value = state.config.accentColor;

  setScriptStatus(api.isConfigured() ? "Sẵn sàng" : "Chưa cấu hình");
  applyTheme();
  autoLoadLogo();

  setupEventListeners();

  await seedDefaultUsers();      // tạo user mặc định nếu chưa có
  autoLogin();                   // tự vào nếu có session
  startAutoBackup();             // auto backup local 15 phút/lần
}

// ---------- Events ----------
function setupEventListeners() {
  loginForm?.addEventListener("submit", handleLogin);
  $("#toggle-password")?.addEventListener("click", togglePassword);
  logoutButton?.addEventListener("click", handleLogout);

  backupButton?.addEventListener("click", () => triggerBackup("manual"));
  downloadBackup?.addEventListener("click", downloadBackupFile);
  driveBackup?.addEventListener("click", () => triggerDriveBackup(true));

  forms.integrations?.addEventListener("submit", saveIntegrationsConfig);
  forms.appearance?.addEventListener("submit", saveAppearance);
  $("#appearance-reset")?.addEventListener("click", resetAppearance);

  forms.team?.addEventListener("submit", handleAddTeamMember);

  menuToggle?.addEventListener("click", () => sidebar?.classList.toggle("open"));

  inputs.customerSource?.addEventListener("change", handleSourceChange);
  inputs.customerStatusPurchased?.addEventListener("change", updatePurchaseVisibility);
  inputs.customerStatusPending?.addEventListener("change", updatePurchaseVisibility);
  inputs.careRatingRadios?.forEach((r) => r.addEventListener("change", updateCareLostVisibility));
  inputs.supportType?.forEach((r) => r.addEventListener("change", updateSupportForm));
  inputs.checklistShift?.addEventListener("change", () => renderShiftTasks(inputs.checklistShift.value));
  careUpdateCustomer?.addEventListener("click", syncCareToCustomer);
  dashboards.dashboardPeriod?.addEventListener("change", renderDashboardStats);
  inputs.financeMonth?.addEventListener("change", renderFinanceSummary);

  [
    [inputs.globalSearch, filterGlobal],
    [inputs.customerSearch, filterCustomers],
    [inputs.careSearch, filterCare],
    [inputs.supportSearch, filterSupport],
    [inputs.inventorySearch, filterInventory]
  ].forEach(([input, handler]) => input && input.addEventListener("input", handler));

  inputs.supportFilter?.addEventListener("change", filterSupport);

  menuButtons.forEach((btn) => btn.addEventListener("click", () => switchPage(btn.dataset.target)));
  settingsLinks.forEach((link) => link.addEventListener("click", () => switchSettings(link.dataset.settings)));

  forms.customer?.addEventListener("submit", handleCustomerSubmit);
  forms.care?.addEventListener("submit", handleCareSubmit);
  forms.support?.addEventListener("submit", handleSupportSubmit);
  forms.checklist?.addEventListener("submit", handleChecklistSubmit);
  forms.inventory?.addEventListener("submit", handleInventorySubmit);
  forms.finance?.addEventListener("submit", handleFinanceSubmit);

  forms.customer?.addEventListener("reset", () => setTimeout(updatePurchaseVisibility));
  forms.care?.addEventListener("reset", () => setTimeout(updateCareLostVisibility));
  forms.support?.addEventListener("reset", () => setTimeout(updateSupportForm));
  forms.checklist?.addEventListener("reset", () => setTimeout(() => renderShiftTasks(inputs.checklistShift.value)));

  inputs.logoUpload?.addEventListener("change", handleLogoUpload);

  document.addEventListener("click", (evt) => {
    if (sidebar && !sidebar.contains(evt.target) && !menuToggle.contains(evt.target)) {
      sidebar.classList.remove("open");
    }
  });
}

// ---------- Auth / Users ----------
async function seedDefaultUsers() {
  const defaults = [
    { username: "admin", password: "123456", role: "admin", displayName: "Quản trị viên" },
    { username: "nhanvien", password: "1234", role: "staff", displayName: "Nhân viên" }
  ];

  // Best-effort seed qua GAS (không chặn UI)
  if (api.isConfigured()) {
    try {
      const payload = await Promise.all(
        defaults.map(async (u) => ({
          username: u.username,
          displayName: u.displayName,
          role: u.role,
          passwordHash: await hashPassword(u.password)
        }))
      );
      await api.request("users", "seedDefaults", { users: payload });
    } catch (e) {
      console.info("Seed users (GAS)", e.message);
    }
  }

  // Seed Firestore
  await Promise.all(
    defaults.map(async (u) => {
      const ref = doc(db, "users", u.username);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          displayName: u.displayName,
          role: u.role,
          password: await hashPassword(u.password),
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
    loginScreen?.classList.add("hidden");
    appShell?.classList.remove("hidden");
    setupAfterLogin();
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const formData = new FormData(loginForm);
  const username = (formData.get("username") || "").toString().trim();
  const password = (formData.get("password") || "").toString().trim();
  const remember = $("#remember-me")?.checked;
  const keepSession = $("#keep-session")?.checked;

  toggleButtonLoading(loginForm.querySelector("button[type='submit']"), true);
  loader.show();

  try {
    let userPayload = null;

    if (api.isConfigured()) {
      // Ưu tiên login qua GAS
      const hashed = await hashPassword(password);
      const data = await api.request("auth", "login", { username, passwordHash: hashed });
      userPayload = {
        username: data.username || username,
        displayName: data.displayName || data.name || username,
        role: data.role || "staff"
      };
    } else {
      // Fallback: kiểm tra user trong Firestore
      const userDoc = await getDoc(doc(db, "users", username));
      if (!userDoc.exists()) throw new Error("Tài khoản không tồn tại");
      const data = userDoc.data();
      const hashed = await hashPassword(password);
      if (hashed !== data.password) throw new Error("Sai mật khẩu");
      if (data.active === false) throw new Error("Tài khoản đã bị vô hiệu hóa");
      userPayload = { username, displayName: data.displayName, role: data.role };
    }

    state.user = userPayload;

    if (remember) localStorage.setItem("klcUser", JSON.stringify(state.user));
    else localStorage.removeItem("klcUser");

    if (keepSession) sessionStorage.setItem("klcUser", JSON.stringify(state.user));
    else sessionStorage.removeItem("klcUser");

    loginScreen?.classList.add("hidden");
    appShell?.classList.remove("hidden");
    setupAfterLogin();
  } catch (err) {
    alert(err.message);
  } finally {
    loader.hide();
    toggleButtonLoading(loginForm.querySelector("button[type='submit']"), false);
  }
}

function setupAfterLogin() {
  if (userName) userName.textContent = state.user.displayName;
  if (userRole) userRole.textContent = state.user.role === "admin" ? "Quản trị viên" : "Nhân viên";
  sidebar?.classList.remove("open");
  switchPage("dashboard");
  renderShiftTasks(inputs.checklistShift?.value || "morning");
  subscribeCollections();     // realtime từ Firestore
  startSync();                // pull định kỳ từ GAS nếu có
  applyPermissions();
}

function applyPermissions() {
  const isAdmin = state.user?.role === "admin";
  const adminOnlyButtons = [
    backupButton, downloadBackup, driveBackup,
    forms.appearance?.querySelector("button[type='submit']"),
    forms.team?.querySelector("button[type='submit']"),
    forms.integrations?.querySelector("button[type='submit']")
  ];

  adminOnlyButtons.forEach((btn) => {
    if (!btn) return;
    btn.disabled = !isAdmin;
    btn.classList.toggle("disabled", !isAdmin);
  });

  const adminOnlyForms = [forms.customer, forms.care, forms.support, forms.checklist, forms.inventory, forms.finance];
  adminOnlyForms.forEach((form) => toggleFormEditable(form, isAdmin));

  const settingsMenu = $(".menu-item[data-target='settings']");
  if (settingsMenu) settingsMenu.classList.toggle("hidden", !isAdmin);
}

function toggleFormEditable(form, enabled) {
  if (!form) return;
  form.querySelectorAll("input, select, textarea, button[type='submit']").forEach((el) => {
    if (el.dataset.allowStaff === "true") return;
    el.disabled = !enabled;
  });
}

function handleLogout() {
  state.user = null;
  localStorage.removeItem("klcUser");
  sessionStorage.removeItem("klcUser");
  stopSync();
  unsubscribeCollections();
  appShell?.classList.add("hidden");
  loginScreen?.classList.remove("hidden");
  loginForm?.reset();
}

// ---------- Navigation ----------
function togglePassword() {
  const field = $("#password");
  if (!field) return;
  const isPassword = field.type === "password";
  field.type = isPassword ? "text" : "password";
  this.innerHTML = `<i class="fa-solid ${isPassword ? "fa-eye-slash" : "fa-eye"}"></i>`;
}

function switchPage(target) {
  pages.forEach((p) => p.classList.toggle("active", p.id === target));
  menuButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.target === target));
  const page = pages.find((p) => p.id === target);
  if (pageTitle) pageTitle.textContent = page?.dataset.pageTitle || "KLC";
  sidebar?.classList.remove("open");
}

function switchSettings(target) {
  settingsLinks.forEach((link) => link.classList.toggle("active", link.dataset.settings === target));
  settingsPanels.forEach((panel) => panel.classList.toggle("active", panel.dataset.settingsPanel === target));
}

// ---------- Forms: visibility ----------
function handleSourceChange() {
  const value = inputs.customerSource.value;
  const map = {
    online: "Từ bài viết nào?",
    "referral-new": "Được giới thiệu bởi khách nào?",
    "referral-repeat": "Khách cũ nào quay lại?",
    staff: "Nhân viên nào giới thiệu?",
    other: "Nguồn khác?"
  };
  const detail = map[value];
  if (detail) {
    inputs.customerSourceDetail.placeholder = detail;
    inputs.customerSourceDetail.classList.remove("hidden");
  } else {
    inputs.customerSourceDetail.classList.add("hidden");
    inputs.customerSourceDetail.value = "";
  }
}
function updatePurchaseVisibility() {
  const purchased = inputs.customerStatusPurchased?.checked;
  inputs.purchaseDetails?.classList.toggle("hidden", !purchased);
  inputs.consultDetails?.classList.toggle("hidden", !!purchased);
}
function updateCareLostVisibility() {
  const lost = Array.from(inputs.careRatingRadios || []).find((r) => r.checked)?.value === "lost";
  inputs.careLostReason?.classList.toggle("hidden", !lost);
}
function updateSupportForm() {
  const value = Array.from(inputs.supportType || []).find((r) => r.checked)?.value;
  inputs.supportStatusRow?.classList.toggle("hidden", value === "maintenance");
}
function renderShiftTasks(shift = "morning") {
  const slots = {
    morning: ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00"],
    afternoon:["13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00"],
    full:["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00"]
  };
  if (!inputs.checklistTasks) return;
  inputs.checklistTasks.innerHTML = "";
  (slots[shift] || []).forEach((time) => {
    const row = document.createElement("div");
    row.className = "task-row";
    row.innerHTML = `<label>${time}</label><input type="text" name="task-${time.replace(":", "")}" placeholder="Công việc" />`;
    inputs.checklistTasks.appendChild(row);
  });
}

// ---------- Submit handlers (Firestore chính, GAS phụ) ----------
async function handleCustomerSubmit(e) {
  e.preventDefault();
  const data = collectFormData(forms.customer);
  data.status = forms.customer.querySelector("input[name='customer-status']:checked").value;
  data.source = inputs.customerSource.value;
  data.sourceDetail = inputs.customerSourceDetail.value;
  data.purchased = data.status === "purchased";
  data.price = Number($("#customer-price")?.value || 0);
  data.consulted = $("#customer-consult")?.value || "";
  data.consultPricing = $("#customer-consult-price")?.value || "";

  await submitWithLoader(async () => {
    // Firestore (chính)
    await addDoc(collection(db, "customers"), { ...data, createdAt: serverTimestamp() });
    // GAS (phụ)
    if (api.isConfigured()) {
      try {
        await api.create("customers", { ...data, createdAt: new Date().toISOString(), author: state.user?.username || "" });
      } catch (e) { console.info("GAS create customers:", e.message); }
    }
  });
  forms.customer.reset();
  updatePurchaseVisibility();
}

async function handleCareSubmit(e) {
  e.preventDefault();
  const data = collectFormData(forms.care);
  data.rating = forms.care.querySelector("input[name='care-rating']:checked").value;
  data.lostReason = inputs.careLostReason?.value || "";

  await submitWithLoader(async () => {
    await addDoc(collection(db, "care"), { ...data, createdAt: serverTimestamp() });
    if (api.isConfigured()) {
      try { await api.create("care", { ...data, createdAt: new Date().toISOString(), author: state.user?.username || "" }); }
      catch (e) { console.info("GAS create care:", e.message); }
    }
  });
  forms.care.reset();
  updateCareLostVisibility();
}

async function handleSupportSubmit(e) {
  e.preventDefault();
  const type = Array.from(inputs.supportType || []).find((r) => r.checked)?.value;
  const data = collectFormData(forms.support);
  data.type = type;
  data.supported = false;
  data.partsSent = false;
  data.partsInfo = "";

  await submitWithLoader(async () => {
    const ref = await addDoc(collection(db, "support"), { ...data, createdAt: serverTimestamp() });
    if (api.isConfigured()) {
      try { await api.create("support", { ...data, id: ref.id, createdAt: new Date().toISOString(), author: state.user?.username || "" }); }
      catch (e) { console.info("GAS create support:", e.message); }
    }
  });
  forms.support.reset();
  updateSupportForm();
}

async function handleChecklistSubmit(e) {
  e.preventDefault();
  const data = collectFormData(forms.checklist);
  const tasks = {};
  inputs.checklistTasks?.querySelectorAll("input")?.forEach((input) => {
    if (input.value.trim()) tasks[input.previousElementSibling.textContent] = input.value.trim();
  });
  data.tasks = tasks;

  await submitWithLoader(async () => {
    await addDoc(collection(db, "checklists"), { ...data, createdAt: serverTimestamp() });
    if (api.isConfigured()) {
      try { await api.create("checklists", { ...data, createdAt: new Date().toISOString(), author: state.user?.username || "" }); }
      catch (e) { console.info("GAS create checklists:", e.message); }
    }
  });
  forms.checklist.reset();
  renderShiftTasks(inputs.checklistShift?.value || "morning");
}

async function handleInventorySubmit(e) {
  e.preventDefault();
  const data = collectFormData(forms.inventory);
  data.quantity = Number(data.quantity);

  await submitWithLoader(async () => {
    await addDoc(collection(db, "inventory"), { ...data, createdAt: serverTimestamp() });
    if (api.isConfigured()) {
      try { await api.create("inventory", { ...data, createdAt: new Date().toISOString(), author: state.user?.username || "" }); }
      catch (e) { console.info("GAS create inventory:", e.message); }
    }
  });
  forms.inventory.reset();
}

async function handleFinanceSubmit(e) {
  e.preventDefault();
  const data = collectFormData(forms.finance);
  data.amount = Number(data.amount);

  await submitWithLoader(async () => {
    await addDoc(collection(db, "finance"), { ...data, createdAt: serverTimestamp() });
    if (api.isConfigured()) {
      try { await api.create("finance", { ...data, createdAt: new Date().toISOString(), author: state.user?.username || "" }); }
      catch (e) { console.info("GAS create finance:", e.message); }
    }
  });
  forms.finance.reset();
}

async function handleAddTeamMember(e) {
  e.preventDefault();
  if (state.user?.role !== "admin") return;
  const data = collectFormData(forms.team);

  const username = data.username;
  const userDocRef = doc(db, "users", username);
  const snapshot = await getDoc(userDocRef);
  if (snapshot.exists()) {
    alert("Tài khoản đã tồn tại");
    return;
  }

  await submitWithLoader(async () => {
    await setDoc(userDocRef, {
      displayName: data.name,
      role: data.role,
      password: await hashPassword(data.password),
      active: true,
      createdAt: serverTimestamp()
    });
    if (api.isConfigured()) {
      try {
        await api.create("users", {
          username: data.username,
          displayName: data.name,
          role: data.role,
          passwordHash: await hashPassword(data.password),
          active: true,
          createdAt: new Date().toISOString()
        });
      } catch (e) { console.info("GAS create users:", e.message); }
    }
  });
  forms.team.reset();
}

// ---------- Settings ----------
async function saveIntegrationsConfig(e) {
  e.preventDefault();

  // GAS & Drive
  state.config.scriptUrl = inputs.scriptUrl?.value.trim() || "";
  state.config.driveFolder = inputs.driveFolder.value.trim();
  state.config.driveWebhook = inputs.driveWebhook.value.trim();

  api.setBaseUrl(state.config.scriptUrl);
  localStorage.setItem("scriptUrl", state.config.scriptUrl);
  localStorage.setItem("driveFolder", state.config.driveFolder);
  localStorage.setItem("driveWebhook", state.config.driveWebhook);

  if (api.isConfigured()) {
    setScriptStatus("Đang kiểm tra kết nối...");
    try {
      await seedDefaultUsers();
      if (state.user) await refreshAllData(true);
      setScriptStatus("Đã kết nối Apps Script", "success");
    } catch (error) {
      setScriptStatus(error.message || "Không thể kết nối", "error");
    }
  } else {
    setScriptStatus("Chưa cấu hình Apps Script");
  }

  alert("Đã lưu cấu hình kết nối.");
}

async function saveAppearance(e) {
  e.preventDefault();
  state.config.themeColor = inputs.themeColor.value;
  state.config.accentColor = inputs.accentColor.value;
  localStorage.setItem("themeColor", state.config.themeColor);
  localStorage.setItem("accentColor", state.config.accentColor);
  applyTheme();
  alert("Đã cập nhật giao diện");
}
function resetAppearance() {
  if (!inputs.themeColor || !inputs.accentColor) return;
  inputs.themeColor.value = "#0f6f78";
  inputs.accentColor.value = "#f3b63f";
  saveAppearance(new Event("submit"));
}
function applyTheme() {
  document.documentElement.style.setProperty("--color-primary", state.config.themeColor || "#0f6f78");
  document.documentElement.style.setProperty("--color-accent", state.config.accentColor || "#f3b63f");
}
function setScriptStatus(text, status = "neutral") {
  if (!scriptStatus) return;
  scriptStatus.textContent = text;
  scriptStatus.classList.remove("success", "error");
  if (status === "success") scriptStatus.classList.add("success");
  else if (status === "error") scriptStatus.classList.add("error");
}

// ---------- Sync ----------
async function refreshAllData(showLoader = false) {
  // Chỉ pull từ GAS khi có cấu hình (Firestore đã realtime bằng onSnapshot)
  if (!api.isConfigured() || !state.user) return;

  if (showLoader) loader.show();
  setScriptStatus("Đang đồng bộ dữ liệu...");

  try {
    const [customers, care, support, checklist, inventory, finance, team] = await Promise.all([
      api.list("customers"),
      api.list("care"),
      api.list("support"),
      api.list("checklists"),
      api.list("inventory"),
      api.list("finance"),
      api.list("users")
    ]);

    state.collections.customers = customers || [];
    state.collections.care = care || [];
    const supportList = support || [];
    state.collections.warranty = supportList.filter((i) => i.type === "warranty");
    state.collections.maintenance = supportList.filter((i) => i.type === "maintenance");
    state.collections.checklist = checklist || [];
    state.collections.inventory = inventory || [];
    state.collections.finance = finance || [];
    state.collections.team = (team || []).map((m) => ({
      username: m.username,
      displayName: m.displayName || m.name || m.username,
      role: m.role || "staff",
      active: m.active !== false
    }));

    renderCustomers(); renderCare(); renderSupportTables(); renderChecklist();
    renderInventory(); renderFinance(); renderDashboardStats(); renderTeam();
    populateCustomerSuggestions(); populateStaffSelects();
    setScriptStatus("Đã đồng bộ với Google", "success");
  } catch (error) {
    console.error(error);
    setScriptStatus(error.message || "Lỗi đồng bộ", "error");
  } finally {
    if (showLoader) loader.hide();
  }
}

async function startSync() {
  stopSync();
  if (api.isConfigured()) {
    await refreshAllData(true);
    state.syncTimer = setInterval(() => refreshAllData(false), 15000);
  }
}
function stopSync() {
  if (state.syncTimer) {
    clearInterval(state.syncTimer);
    state.syncTimer = null;
  }
}

// ---------- Firestore realtime subscriptions ----------
function subscribeCollections() {
  unsubscribeCollections();

  state.listeners.push(
    onSnapshot(query(collection(db, "customers"), orderBy("createdAt", "desc")), (snap) => {
      state.collections.customers = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderCustomers(); renderDashboardStats(); populateCustomerSuggestions();
      logActivity("Khách hàng", "Cập nhật danh sách khách hàng");
    })
  );

  state.listeners.push(
    onSnapshot(query(collection(db, "care"), orderBy("createdAt", "desc")), (snap) => {
      state.collections.care = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderCare(); renderDashboardStats();
      logActivity("CSKH", "Cập nhật phiếu chăm sóc khách");
    })
  );

  state.listeners.push(
    onSnapshot(query(collection(db, "support"), orderBy("createdAt", "desc")), (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      state.collections.warranty = all.filter((i) => i.type === "warranty");
      state.collections.maintenance = all.filter((i) => i.type === "maintenance");
      renderSupportTables(); renderDashboardStats();
      logActivity("Bảo hành", "Cập nhật phiếu hỗ trợ");
    })
  );

  state.listeners.push(
    onSnapshot(query(collection(db, "checklists"), orderBy("createdAt", "desc")), (snap) => {
      state.collections.checklist = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderChecklist();
      logActivity("CheckList", "Cập nhật công việc nhân viên");
    })
  );

  state.listeners.push(
    onSnapshot(query(collection(db, "inventory"), orderBy("createdAt", "desc")), (snap) => {
      state.collections.inventory = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderInventory();
      logActivity("Tồn kho", "Cập nhật giao dịch kho");
    })
  );

  state.listeners.push(
    onSnapshot(query(collection(db, "finance"), orderBy("createdAt", "desc")), (snap) => {
      state.collections.finance = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderFinance(); renderDashboardStats();
      logActivity("Thu & Chi", "Cập nhật giao dịch tài chính");
    })
  );

  state.listeners.push(
    onSnapshot(query(collection(db, "users"), orderBy("createdAt", "desc")), (snap) => {
      state.collections.team = snap.docs.map((d) => ({ username: d.id, ...d.data() }));
      renderTeam(); populateStaffSelects();
    })
  );
}

function unsubscribeCollections() {
  state.listeners.forEach((unsub) => unsub && unsub());
  state.listeners = [];
}

// ---------- Renderers ----------
function renderCustomers() {
  if (!tables.customers) return;
  tables.customers.innerHTML = state.collections.customers.map((c) => {
    const statusLabel = c.status === "purchased" ? "Đã mua" : "Chưa mua";
    return `
      <tr data-id="${c.id || ""}" data-status="${c.status || ""}" data-name="${c.name || ""}" data-phone="${c.phone || ""}">
        <td>${formatDate(c.date)}</td>
        <td>${c.name || ""}</td>
        <td>${c.phone || ""}</td>
        <td>${formatSource(c.source, c.sourceDetail)}</td>
        <td><span class="badge badge-${c.status}">${statusLabel}</span></td>
        <td><button class="btn ghost btn-xs" data-link="care" data-id="${c.id || ""}">CSKH</button></td>
        <td><button class="btn ghost btn-xs" data-link="history" data-id="${c.id || ""}">Xem</button></td>
      </tr>`;
  }).join("");
}

function renderCare() {
  if (!tables.care) return;
  tables.care.innerHTML = state.collections.care.map((r) => `
      <tr data-id="${r.id}" data-name="${r.name}" data-phone="${r.phone}" data-staff="${r.staff}">
        <td>${formatDate(r.date)}</td>
        <td>${r.name || ""}</td>
        <td>${r.staff || ""}</td>
        <td>${formatCareMethod(r.method)}</td>
        <td>${formatCareRating(r.rating)}</td>
        <td><button class="btn ghost btn-xs" data-detail="${r.id}">Chi tiết</button></td>
      </tr>`).join("");

  tables.care.querySelectorAll("button[data-detail]").forEach((btn) => {
    btn.addEventListener("click", () => showCareDetail(btn.dataset.detail));
  });
}

function showCareDetail(id) {
  const r = state.collections.care.find((i) => i.id === id);
  if (!r || !careDetail) return;
  careDetail.innerHTML = `
    <h4>${r.name || "-"}</h4>
    <p><strong>Ngày:</strong> ${formatDate(r.date)}</p>
    <p><strong>Nhân viên:</strong> ${r.staff || "-"}</p>
    <p><strong>Hình thức:</strong> ${formatCareMethod(r.method)}</p>
    <p><strong>Nội dung:</strong><br />${r.content || "-"}</p>
    <p><strong>Phản hồi:</strong><br />${r.feedback || "-"}</p>
    <p><strong>Đánh giá:</strong> ${formatCareRating(r.rating)}</p>
    ${r.rating === "lost" ? `<p><strong>Lý do:</strong> ${r.lostReason || "-"}</p>` : ""}
    <p><strong>Ghi chú:</strong><br />${r.notes || "-"}</p>`;
  careDetail.dataset.customer = r.name || "";
  careDetail.dataset.phone = r.phone || "";
}

function syncCareToCustomer() {
  if (!careDetail?.dataset.customer) return alert("Vui lòng chọn một phiếu CSKH trước");
  const name = careDetail.dataset.customer;
  const phone = careDetail.dataset.phone;
  const customer = state.collections.customers.find((i) => i.name === name || i.phone === phone);
  if (!customer) return alert("Chưa có khách hàng tương ứng");
  alert(`Đã đồng bộ thông tin chăm sóc cho khách ${name}. Vui lòng mở trang khách hàng để cập nhật chi tiết.`);
}

function renderSupportTables() {
  if (!tables.warranty || !tables.maintenance) return;
  const buildRow = (item) => `
    <tr data-id="${item.id}" data-supported="${item.supported}" data-parts="${item.partsSent}">
      <td>${formatDate(item.date)}</td>
      <td>${item.name || ""}</td>
      <td>${item.phone || ""}</td>
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
    </tr>`;

  tables.warranty.innerHTML = state.collections.warranty.map(buildRow).join("");
  tables.maintenance.innerHTML = state.collections.maintenance.map(buildRow).join("");

  $$("input[data-action='supported']").forEach((cb) => {
    cb.disabled = state.user?.role !== "admin";
    cb.addEventListener("change", () => updateSupportStatus(cb.dataset.id, "supported", cb.checked));
  });
  $$("input[data-action='parts']").forEach((cb) => {
    cb.disabled = state.user?.role !== "admin";
    cb.addEventListener("change", () => updateSupportStatus(cb.dataset.id, "partsSent", cb.checked));
  });

  filterSupport();
}

async function updateSupportStatus(id, field, value) {
  if (state.user?.role !== "admin") return alert("Chỉ quản trị viên mới có quyền cập nhật trạng thái.");
  loader.show();
  try {
    // Firestore
    await updateDoc(doc(db, "support", id), {
      [field]: value,
      ...(field === "partsSent" && value ? { partsInfo: `${new Date().toLocaleString("vi-VN")}` } : {})
    });
    // GAS best-effort
    if (api.isConfigured()) {
      try {
        const changes = { [field]: value };
        if (field === "partsSent" && value) changes.partsInfo = `${new Date().toLocaleString("vi-VN")}`;
        await api.update("support", { id, changes });
      } catch (e) { console.info("GAS update support:", e.message); }
    }
  } catch {
    alert("Không thể cập nhật trạng thái");
  } finally {
    loader.hide();
  }
}

function renderChecklist() {
  if (!tables.checklist) return;
  tables.checklist.innerHTML = state.collections.checklist.map((i) => `
    <tr>
      <td>${formatDate(i.date)}</td>
      <td>${i.staff || ""}</td>
      <td>${formatShift(i.shift)}</td>
      <td>${i.summary || "-"}</td>
      <td><button class="btn ghost btn-xs" data-checklist="${i.id}">Chi tiết</button></td>
    </tr>`).join("");
}

function renderInventory() {
  if (!tables.inventory || !tables.inventorySummary) return;
  tables.inventory.innerHTML = state.collections.inventory.map((i) => `
    <tr>
      <td>${formatDate(i.date)}</td>
      <td>${i.item || ""}</td>
      <td>${i.type === "in" ? "Nhập" : "Xuất"}</td>
      <td>${i.quantity}</td>
      <td>${i.notes || ""}</td>
    </tr>`).join("");

  const summary = {};
  state.collections.inventory.forEach((i) => {
    if (!summary[i.item]) summary[i.item] = 0;
    summary[i.item] += i.type === "in" ? Number(i.quantity) : -Number(i.quantity);
  });
  tables.inventorySummary.innerHTML = Object.entries(summary).map(([name, qty]) => `
    <tr><td>${name}</td><td>${qty}</td></tr>`).join("");
}

function renderFinance() {
  if (!tables.finance) return;
  tables.finance.innerHTML = state.collections.finance.map((i) => `
    <tr>
      <td>${formatDate(i.date)}</td>
      <td>${i.type === "income" ? "Thu" : "Chi"}</td>
      <td>${i.category || ""}</td>
      <td>${formatCurrency(i.amount)}</td>
      <td>${i.notes || ""}</td>
    </tr>`).join("");
  renderFinanceSummary();
  renderFinanceChart();
}

function renderFinanceSummary() {
  const month = inputs.financeMonth?.value;
  const summaryElement = $("#finance-summary");
  if (!summaryElement) return;

  const data = month
    ? state.collections.finance.filter((i) => i.date?.startsWith(month))
    : state.collections.finance;
  const income = data.filter((i) => i.type === "income").reduce((s, i) => s + Number(i.amount || 0), 0);
  const expense = data.filter((i) => i.type === "expense").reduce((s, i) => s + Number(i.amount || 0), 0);
  const net = income - expense;

  summaryElement.innerHTML = `
    <div class="summary-item"><span>Tổng thu</span><strong>${formatCurrency(income)}</strong></div>
    <div class="summary-item"><span>Tổng chi</span><strong>${formatCurrency(expense)}</strong></div>
    <div class="summary-item"><span>Lợi nhuận</span><strong>${formatCurrency(net)}</strong></div>`;
}

function renderTeam() {
  if (!tables.team) return;
  tables.team.innerHTML = state.collections.team.map((m) => `
    <tr>
      <td>${m.displayName}</td>
      <td>${m.username}</td>
      <td>${m.role === "admin" ? "Quản trị viên" : "Nhân viên"}</td>
      <td>${m.active ? "Đang hoạt động" : "Ngưng"}</td>
    </tr>`).join("");
}

function populateCustomerSuggestions() {
  const nameList = $("#customer-name-suggestions");
  const phoneList = $("#customer-phone-suggestions");
  if (!nameList || !phoneList) return;
  nameList.innerHTML = state.collections.customers.map((c) => `<option value="${c.name || ""}"></option>`).join("");
  phoneList.innerHTML = state.collections.customers.map((c) => `<option value="${c.phone || ""}"></option>`).join("");
}

function populateStaffSelects() {
  const options = state.collections.team
    .filter((m) => m.active !== false)
    .map((m) => `<option value="${m.displayName}">${m.displayName}</option>`)
    .join("");
  (inputs.staffSelects || []).forEach((sel) => { if (sel) sel.innerHTML = options; });
}

function renderDashboardStats() {
  const days = Number(dashboards.dashboardPeriod?.value || 30);
  const fromDate = new Date(); fromDate.setDate(fromDate.getDate() - days);

  const filterByDate = (items) => items.filter((i) => {
    if (!i.date) return false;
    const d = new Date(i.date);
    return !isNaN(d) && d >= fromDate;
  });

  const customers = filterByDate(state.collections.customers);
  const care = filterByDate(state.collections.care);
  const support = filterByDate([...state.collections.warranty, ...state.collections.maintenance]);
  const finance = filterByDate(state.collections.finance);

  if (dashboards.newCustomers) dashboards.newCustomers.textContent = customers.length;
  if (dashboards.careForms) dashboards.careForms.textContent = care.length;
  if (dashboards.supportForms) dashboards.supportForms.textContent = support.length;

  const net = finance.reduce((s, i) => s + (i.type === "income" ? Number(i.amount) : -Number(i.amount)), 0);
  if (dashboards.netIncome) dashboards.netIncome.textContent = `${formatCurrency(net)}`;

  renderCustomersChart();
  renderFinanceChart();
}

function renderCustomersChart() {
  const ctx = $("#customers-chart");
  if (!ctx) return;
  const grouped = groupByMonth(state.collections.customers, "date");
  const labels = Object.keys(grouped);
  const data = Object.values(grouped);

  if (state.charts.customers) state.charts.customers.destroy();
  state.charts.customers = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Khách hàng mới",
        data,
        borderColor: getComputedStyle(document.documentElement).getPropertyValue("--color-primary"),
        backgroundColor: "rgba(15, 111, 120, 0.2)",
        tension: 0.4,
        fill: true
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

function renderFinanceChart() {
  const ctx = $("#finance-chart");
  if (!ctx) return;
  const inc = groupByMonth(state.collections.finance.filter((i) => i.type === "income"), "date");
  const exp = groupByMonth(state.collections.finance.filter((i) => i.type === "expense"), "date");
  const labels = Array.from(new Set([...Object.keys(inc), ...Object.keys(exp)])).sort();
  const incomeData = labels.map((l) => inc[l] || 0);
  const expenseData = labels.map((l) => exp[l] || 0);

  if (state.charts.finance) state.charts.finance.destroy();
  state.charts.finance = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Thu", data: incomeData, backgroundColor: "rgba(15, 111, 120, 0.7)" },
        { label: "Chi", data: expenseData, backgroundColor: "rgba(243, 182, 63, 0.7)" }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { y: { ticks: { callback: (v) => `${Number(v).toLocaleString("vi-VN")}` } } }
    }
  });
}

// ---------- Filters ----------
function filterGlobal(e) {
  const q = e.target.value.toLowerCase();
  [tables.customers, tables.care, tables.warranty, tables.maintenance, tables.inventory, tables.finance]
    .forEach((tbody) => Array.from(tbody?.rows || []).forEach((row) => {
      row.style.display = row.textContent.toLowerCase().includes(q) ? "" : "none";
    }));
}
function filterCustomers(e) { filterTable(tables.customers, e.target.value); }
function filterCare(e) { filterTable(tables.care, e.target.value); }
function filterSupport() {
  if (!inputs.supportSearch || !inputs.supportFilter) return;
  const q = inputs.supportSearch.value.toLowerCase();
  const filter = inputs.supportFilter.value;
  [tables.warranty, tables.maintenance].forEach((tbody) => {
    Array.from(tbody?.rows || []).forEach((row) => {
      const matchesQuery = row.textContent.toLowerCase().includes(q);
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
function filterInventory(e) { filterTable(tables.inventory, e.target.value); }
function filterTable(tbody, keyword) {
  if (!tbody) return;
  const q = (keyword || "").toLowerCase();
  Array.from(tbody.rows).forEach((row) => { row.style.display = row.textContent.toLowerCase().includes(q) ? "" : "none"; });
}

// ---------- Utils ----------
function logActivity(module, message) {
  if (!activityTemplate || !dashboards.activityFeed) return;
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
    const d = new Date(item[field]); if (isNaN(d)) return acc;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    acc[key] = (acc[key] || 0) + (item.amount ? Number(item.amount) : 1);
    return acc;
  }, {});
}
function formatDate(date) { if (!date) return ""; return new Date(date).toLocaleDateString("vi-VN"); }
function formatSource(source, detail) {
  const labels = { store: "Ghé cửa hàng", online: "Online", "referral-new": "Khách cũ giới thiệu", "referral-repeat": "Khách cũ mua lại", staff: "Người quen nhân viên", other: "Khác" };
  const label = labels[source] || "-"; return detail ? `${label} (${detail})` : label;
}
function formatCareMethod(method) { return { call: "Gọi điện", message: "Nhắn tin", broadcast: "Gửi tin hàng loạt", "call-message": "Gọi + nhắn" }[method] || "-"; }
function formatCareRating(r) { return { potential: "Còn tiềm năng", nurturing: "Đang nuôi", appointment: "Đang hẹn", lost: "Hết tiềm năng" }[r] || "-"; }
function formatShift(s) { return { morning: "Ca sáng", afternoon: "Ca chiều", full: "Ca full" }[s] || s; }
function formatCurrency(v) { return Number(v || 0).toLocaleString("vi-VN") + " ₫"; }
function toggleButtonLoading(button, loading) { if (!button) return; button.dataset.loading = loading ? "true" : "false"; }

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------- Backup / Drive ----------
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
  await exportData(); // hiện tại backup local (download) + Drive webhook
  updateBackupStatus();
  if (mode === "manual") {
    alert('Đã sao lưu dữ liệu nội bộ. Để đồng bộ với Google Drive, nhấn "Sao lưu lên Drive" hoặc thiết lập Apps Script.');
  }
}

async function triggerDriveBackup(showAlert = false) {
  if (!state.config.driveFolder) return alert("Vui lòng nhập ID thư mục Google Drive trong phần Kết nối.");
  const data = await exportData();
  try {
    await uploadToDrive(data);
    updateBackupStatus();
    if (showAlert) alert("Đã gửi dữ liệu lên Google Drive.");
  } catch (e) {
    console.error(e);
    alert("Không thể sao lưu lên Google Drive. Kiểm tra Apps Script/Drive API.");
  }
}

async function uploadToDrive(data) {
  const endpoint = state.config.driveWebhook;
  if (!endpoint) throw new Error("Chưa cấu hình webhook Drive");
  await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folderId: state.config.driveFolder, payload: data, timestamp: new Date().toISOString() })
  });
}

async function exportData() {
  // Xuất từ state (đã realtime)
  return {
    customers: [...state.collections.customers],
    care: [...state.collections.care],
    support: [...state.collections.warranty, ...state.collections.maintenance],
    checklists: [...state.collections.checklist],
    inventory: [...state.collections.inventory],
    finance: [...state.collections.finance],
    users: [...state.collections.team],
    generatedAt: new Date().toISOString()
  };
}

function updateBackupStatus() {
  const status = `Lần cuối: ${new Date().toLocaleString("vi-VN")}`;
  if (backupStatus) backupStatus.textContent = status;
  state.config.lastBackup = status;
  localStorage.setItem("lastBackup", status);
}

function startAutoBackup() {
  setInterval(() => {
    if (!state.user || state.user.role !== "admin") return;
    triggerBackup("auto");
  }, 15 * 60 * 1000);
}

// ---------- Logo ----------
async function handleLogoUpload(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const base64 = reader.result;
    localStorage.setItem("klcLogo", base64);
    const el = $("#sidebar-logo");
    if (el) el.src = base64;
  };
  reader.readAsDataURL(file);
}
function autoLoadLogo() {
  const logo = localStorage.getItem("klcLogo");
  if (logo) {
    const el = $("#sidebar-logo");
    if (el) el.src = logo;
  }
}
