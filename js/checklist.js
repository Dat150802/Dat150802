import { initApp } from './core/app.js';
import {
  appendItem,
  readCollection,
  generateId,
  removeItem,
  subscribeCollection,
  getStaff
} from './core/storage.js';
import { showLoading, hideLoading, toast, bindSearch, confirmAction } from './core/ui.js';
import { ensurePermission } from './core/auth.js';
import { getPendingDeletionIds, submitDeletionRequest, resolvePendingByRecord } from './core/deletion.js';
import { applyPageModules, watchPageModules } from './core/modules.js';

const user = initApp('checklist');
codex/fix-errors-and-complete-code
applyPageModules('checklist');
watchPageModules('checklist');
let checklists = readCollection('checklists');
let staffList = getStaff();
const COLLECTION = 'checklists';


 codex/fix-errors-and-complete-code-sy3thi
applyPageModules('checklist');
watchPageModules('checklist');

 codex/build-internal-website-for-klc-ben-luc-b5jncf
let checklists = readCollection('checklists');
let staffList = getStaff();
const COLLECTION = 'checklists';

codex/build-internal-website-for-klc-ben-luc-b5jncf
const form = document.getElementById('checklist-form');
const staffHint = document.getElementById('checklist-staff-view');
const shiftSelect = document.getElementById('checklist-shift');
const slotContainer = document.getElementById('task-slots');
const tableBody = document.getElementById('checklist-table-body');
const searchInput = document.getElementById('checklist-search');
const modeSelect = document.getElementById('checklist-mode');
const schedulePanel = document.getElementById('schedule-panel');
const reportPanel = document.getElementById('report-panel');
const reportSummary = document.getElementById('checklist-report-summary');
const reportBody = document.getElementById('checklist-report-body');

applyRolePermissions();
renderTable(checklists);
renderReport(checklists);
setupEvents();
populateStaffOptions();
updateSlots();

subscribeCollection(COLLECTION, data => {
  checklists = data;
  applySearchFilter();
});

window.addEventListener('klc:staff-updated', evt => {
  const nextStaff = evt?.detail?.staff;
  if (Array.isArray(nextStaff) && nextStaff.length) {
    staffList = nextStaff;
    populateStaffOptions();
  }
});

function applyRolePermissions() {
  if (user.role === 'staff') {
    staffHint?.classList.remove('hidden');
  }
}

function setupEvents() {
  shiftSelect?.addEventListener('change', updateSlots);
  form?.addEventListener('submit', evt => {
    evt.preventDefault();
    if (!ensurePermission(user, 'write')) return;
    const payload = collectFormData();
    showLoading('Đang lưu checklist công việc…');
    setTimeout(() => {
      appendItem(COLLECTION, payload);
      checklists = readCollection(COLLECTION);
      renderTable(checklists);
      renderReport(checklists);
      form.reset();
      updateSlots();
      hideLoading();
      toast('Đã lưu checklist.', 'success');
    }, 400);
  });

  const resetBtn = document.getElementById('checklist-reset');
  resetBtn?.addEventListener('click', () => {
    if (!ensurePermission(user, 'write')) return;
    form?.reset();
    updateSlots();
  });

  if (searchInput) {
    bindSearch(searchInput, value => applySearchFilter(value));
  }

  if (modeSelect) {
    modeSelect.addEventListener('change', () => toggleMode(modeSelect.value));
    toggleMode(modeSelect.value);
  }

  reportBody?.addEventListener('click', evt => {
    const target = evt.target.closest('button[data-report]');
    if (!target) return;
    const action = target.dataset.report;
    const id = target.dataset.id;
    if (action === 'view') {
      showDetail(id);
      return;
    }
    if (action === 'assign') {
      assignChecklist(id);
    }
  });
}

function applySearchFilter(rawKeyword) {
  const keyword = (rawKeyword ?? searchInput?.value ?? '').trim().toLowerCase();
  if (keyword) {
    const filtered = checklists.filter(item => {
      const staff = (item.staff || '').toLowerCase();
      const shift = (item.shiftLabel || '').toLowerCase();
      const date = item.date || '';
      const summary = (item.summary || '').toLowerCase();
      return (
        staff.includes(keyword) ||
        shift.includes(keyword) ||
        date.includes(keyword) ||
        summary.includes(keyword)
      );
    });
    renderTable(filtered);
    renderReport(filtered);
  } else {
    renderTable(checklists);
    renderReport(checklists);
  }
}

function collectFormData() {
  const formData = new FormData(form);
  const tasks = Array.from(slotContainer.querySelectorAll('input[data-time]')).map(input => ({
    time: input.dataset.time,
    job: input.value
  }));
  return {
    id: generateId('checklist'),
    date: formData.get('date'),
    staff: formData.get('staff'),
    shift: formData.get('shift'),
    shiftLabel: shiftSelect.options[shiftSelect.selectedIndex]?.text || '',
    tasks,
    summary: formData.get('summary'),
    pendingReason: formData.get('pendingReason'),
    schedule: formData.get('schedule'),
    managerNote: formData.get('managerNote'),
    resultStatus: formData.get('resultStatus') || 'done'
  };
}

function renderTable(data) {
  const pendingIds = getPendingDeletionIds(COLLECTION);
  tableBody.innerHTML = data.map(item => `
    <tr class="border-b last:border-b-0">
      <td class="px-3 py-2">${formatDate(item.date)}</td>
      <td class="px-3 py-2 font-semibold">${item.staff}</td>
      <td class="px-3 py-2">${item.shiftLabel}</td>
      <td class="px-3 py-2">
        <div class="flex flex-col gap-1">
          ${getResultBadge(item)}
          <span>${item.summary || '-'}</span>
        </div>
      </td>
      <td class="px-3 py-2 text-right">
        <div class="flex flex-wrap items-center justify-end gap-2">
          ${pendingIds.has(item.id) ? '<span class="badge badge-warning">Chờ duyệt xóa</span>' : ''}
          <button class="text-brand-blue" data-action="view" data-id="${item.id}">Xem</button>
          <button class="text-rose-600" data-action="delete" data-id="${item.id}">${user.role === 'admin' ? 'Xóa' : 'Xóa (gửi duyệt)'}</button>
        </div>
      </td>
    </tr>
  `).join('');

  tableBody.querySelectorAll('button[data-action="view"]').forEach(btn =>
    btn.addEventListener('click', () => showDetail(btn.dataset.id))
  );
  tableBody.querySelectorAll('button[data-action="delete"]').forEach(btn =>
    btn.addEventListener('click', () => handleDelete(btn.dataset.id))
  );
}

function showDetail(id) {
  const record = checklists.find(item => item.id === id);
  const modal = document.getElementById('checklist-detail');
  if (!record || !modal) return;
  modal.querySelector('[data-field="date"]').innerText = formatDate(record.date);
  modal.querySelector('[data-field="staff"]').innerText = record.staff;
  modal.querySelector('[data-field="shift"]').innerText = record.shiftLabel;
  modal.querySelector('[data-field="summary"]').innerText = record.summary || '-';
  modal.querySelector('[data-field="pendingReason"]').innerText = record.pendingReason || '-';
  modal.querySelector('[data-field="schedule"]').innerText = record.schedule || '-';
  modal.querySelector('[data-field="managerNote"]').innerText = record.managerNote || '-';
  modal.querySelector('[data-field="tasks"]').innerHTML = `<ul class="list-disc pl-5 space-y-1">${record.tasks.map(task => `<li><b>${task.time}:</b> ${task.job || '-'}</li>`).join('')}</ul>`;
  modal.classList.remove('hidden');
}

function renderReport(data) {
  if (!reportPanel) return;
  const total = data.length;
  const done = data.filter(item => (item.resultStatus || 'done') === 'done').length;
  const pending = total - done;

  if (reportSummary) {
    if (!total) {
      reportSummary.innerHTML = '<div class="text-sm text-slate-500">Chưa có checklist nào.</div>';
    } else {
      reportSummary.innerHTML = `
        <div class="p-4 rounded-xl bg-blue-50 border border-blue-100">
          <div class="text-xs text-slate-500">Tổng số checklist</div>
          <div class="text-2xl font-semibold text-brand-blue">${total}</div>
        </div>
        <div class="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
          <div class="text-xs text-slate-500">Đã hoàn thành</div>
          <div class="text-2xl font-semibold text-emerald-600">${done}</div>
        </div>
        <div class="p-4 rounded-xl bg-amber-50 border border-amber-100">
          <div class="text-xs text-slate-500">Chưa hoàn thành</div>
          <div class="text-2xl font-semibold text-amber-600">${pending}</div>
        </div>`;
    }
  }

  if (reportBody) {
    if (!total) {
      reportBody.innerHTML = '<div class="text-sm text-slate-500">Chưa có dữ liệu để báo cáo.</div>';
      return;
    }
    const sorted = [...data].sort((a, b) => new Date(b.date) - new Date(a.date));
    reportBody.innerHTML = sorted.map(item => `
      <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div class="flex items-center justify-between text-xs text-slate-500">
          <span>${formatDate(item.date)}</span>
          <span>${item.shiftLabel}</span>
        </div>
        <div class="font-semibold text-brand-blue mt-1">${item.staff}</div>
        <div class="text-sm text-slate-600 mt-1">${item.summary || 'Chưa có tổng kết.'}</div>
        <div class="mt-2">${getResultBadge(item)}</div>
        ${item.resultStatus === 'pending' ? `<div class="text-xs text-rose-600 mt-2">Lý do: ${item.pendingReason || '-'}</div><div class="text-xs text-slate-500">Gia hạn: ${item.schedule || '-'}</div>` : ''}
        <div class="flex items-center justify-between mt-3">
          <button class="text-brand-blue" data-report="view" data-id="${item.id}">Xem chi tiết</button>
          ${user.role === 'admin' ? `<button class="text-slate-600" data-report="assign" data-id="${item.id}">Giao thêm việc</button>` : ''}
        </div>
      </div>
    `).join('');
  }
}

function toggleMode(mode) {
  if (schedulePanel) {
    schedulePanel.classList.toggle('hidden', mode !== 'schedule');
  }
  if (reportPanel) {
    reportPanel.classList.toggle('hidden', mode !== 'report');
  }
}

function getResultBadge(item) {
  const status = item.resultStatus || 'done';
  if (status === 'pending') {
    return '<span class="badge badge-warning">Chưa hoàn thành</span>';
  }
  return '<span class="badge badge-success">Đã hoàn thành</span>';
}

function assignChecklist(id) {
  const record = checklists.find(item => item.id === id);
  if (!record) return;
  if (modeSelect) {
    modeSelect.value = 'schedule';
    toggleMode('schedule');
  }
  if (form) {
    if (!staffList.includes(record.staff)) {
      staffList = [record.staff, ...staffList];
      populateStaffOptions();
    }
    form.elements.date.value = record.date;
    form.elements.staff.value = record.staff;
    shiftSelect.value = record.shift;
    updateSlots();
    window.scrollTo({ top: form.getBoundingClientRect().top + window.scrollY - 120, behavior: 'smooth' });
    toast('Đã điền sẵn ngày và nhân viên. Hãy bổ sung nhiệm vụ mới cho hôm nay.', 'info');
  }
}

function populateStaffOptions() {
  const select = form?.elements?.staff;
  if (!select) return;
  const uniqueStaff = Array.from(new Set(staffList.filter(Boolean)));
  const current = select.value;
  select.innerHTML = uniqueStaff.map(name => `<option value="${name}">${name}</option>`).join('');
  if (current && uniqueStaff.includes(current)) {
    select.value = current;
  }
}

const closeModal = document.getElementById('checklist-detail-close');
closeModal?.addEventListener('click', () => document.getElementById('checklist-detail').classList.add('hidden'));

function updateSlots() {
  const shift = shiftSelect?.value;
  const slotMap = {
    morning: { start: 8, end: 16 },
    afternoon: { start: 13, end: 21 },
    full: { start: 8, end: 21 }
  };
  const config = slotMap[shift] || slotMap.morning;
  const slots = [];
  for (let h = config.start; h < config.end; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
  }
  slotContainer.innerHTML = slots.map(time => `
    <div class="flex items-center gap-3">
      <label class="w-24 text-sm text-slate-500">${time}</label>
      <input class="input-brand flex-1" data-time="${time}" placeholder="Công việc cần làm">
    </div>
  `).join('');
}

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('vi-VN');
}

async function handleDelete(id) {
  const record = checklists.find(item => item.id === id);
  if (!record) return;
  if (user.role === 'admin') {
    if (!await confirmAction('Bạn chắc chắn muốn xóa checklist này?')) return;
    showLoading('Đang xóa checklist…');
    setTimeout(() => {
      removeItem(COLLECTION, id);
      resolvePendingByRecord(COLLECTION, id, 'approved', 'Quản trị viên xóa trực tiếp checklist.');
      checklists = readCollection(COLLECTION);
      renderTable(checklists);
      renderReport(checklists);
      hideLoading();
      toast('Đã xóa checklist.', 'success');
    }, 300);
    return;
  }

  const pendingIds = getPendingDeletionIds(COLLECTION);
  if (pendingIds.has(id)) {
    toast('Đã có yêu cầu xóa chờ duyệt cho checklist này.', 'info');
    return;
  }

  const reason = prompt('Nhập lý do xóa checklist (gửi quản trị viên duyệt):', '');
  if (!reason || !reason.trim()) {
    toast('Vui lòng ghi rõ lý do xóa để gửi duyệt.', 'error');
    return;
  }
  try {
    submitDeletionRequest(COLLECTION, record, user, reason.trim());
    toast('Đã gửi yêu cầu xóa checklist đến quản trị viên.', 'success');
    renderTable(checklists);
    renderReport(checklists);
  } catch (err) {
    toast(err.message || 'Không thể gửi yêu cầu xóa.', 'error');
  }
}
