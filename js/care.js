import { initApp } from './core/app.js';
import {
  appendItem,
  readCollection,
  generateId,
  removeItem,
  updateItem,
  subscribeCollection,
  getStaff
} from './core/storage.js';
import { showLoading, hideLoading, toast, bindSearch, confirmAction } from './core/ui.js';
import { ensurePermission } from './core/auth.js';
import { getPendingDeletionIds, submitDeletionRequest, resolvePendingByRecord } from './core/deletion.js';

const user = initApp('care');
let careRecords = readCollection('care');
let customers = readCollection('customers');
let staffList = getStaff();
const COLLECTION = 'care';

const form = document.getElementById('care-form');
const staffHint = document.getElementById('care-staff-view');
const tableBody = document.getElementById('care-table-body');
const searchInput = document.getElementById('care-search');
const ratingRadios = document.querySelectorAll('input[name="careRating"]');
const ratingReason = document.getElementById('rating-reason-row');
const timelineContainer = document.getElementById('care-activity');

applyRolePermissions();
renderCareTable(careRecords);
setupFormOptions();
setupEvents();
renderUnifiedTimeline();

subscribeCollection('care', data => {
  careRecords = data;
  renderCareTable(careRecords);
  renderUnifiedTimeline();
});

subscribeCollection('customers', data => {
  customers = data;
  setupFormOptions();
  renderUnifiedTimeline();
});

window.addEventListener('klc:staff-updated', evt => {
  staffList = evt.detail.staff;
  setupFormOptions();
});

function applyRolePermissions(){
  if (user.role === 'staff') {
    staffHint?.classList.remove('hidden');
  }
}

function setupFormOptions(){
  const customerNames = document.getElementById('customers-name-list');
  const customerPhones = document.getElementById('customers-phone-list');
  if (customerNames) {
    customerNames.innerHTML = customers.map(c => `<option value="${c.name}"></option>`).join('');
  }
  if (customerPhones) {
    customerPhones.innerHTML = customers.map(c => `<option value="${c.phone}"></option>`).join('');
  }
  const staffSelect = form?.elements?.staff;
  if (staffSelect) {
    const currentValue = staffSelect.value;
    staffSelect.innerHTML = staffList.map(name => `<option value="${name}">${name}</option>`).join('');
    if (currentValue) {
      staffSelect.value = currentValue;
    }
  }
}

function setupEvents(){
  if (form) {
    form.addEventListener('submit', evt => {
      evt.preventDefault();
      if (!ensurePermission(user, 'write')) return;
      const payload = collectFormData();
      showLoading('Đang lưu chăm sóc khách hàng…');
      setTimeout(()=>{
        appendItem('care', payload);
        linkCareToCustomer(payload);
        careRecords = readCollection('care');
        renderCareTable(careRecords);
        form.reset();
        toggleRatingReason();
        hideLoading();
        toast('Đã lưu lịch sử CSKH.', 'success');
      }, 400);
    });
  }
  const resetBtn = document.getElementById('care-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', ()=>{
      if (!ensurePermission(user,'write')) return;
      form.reset();
      toggleRatingReason();
    });
  }
  ratingRadios.forEach(radio => radio.addEventListener('change', toggleRatingReason));

  if (searchInput) {
    bindSearch(searchInput, value => {
      const keyword = value.toLowerCase();
      const filtered = careRecords.filter(item =>
        item.name.toLowerCase().includes(keyword) ||
        item.phone.includes(value) ||
        item.staff.toLowerCase().includes(keyword) ||
        item.ratingLabel.toLowerCase().includes(keyword)
      );
      renderCareTable(filtered);
      renderUnifiedTimeline();
    });
  }
}

function toggleRatingReason(){
  const selected = document.querySelector('input[name="careRating"]:checked');
  ratingReason.classList.toggle('hidden', !(selected && selected.value === 'lost'));
}

toggleRatingReason();

function collectFormData(){
  const formData = new FormData(form);
  const rating = formData.get('careRating');
  const ratingLabel = {
    potential:'Khách còn tiềm năng',
    nurturing:'Đang nuôi khách',
    appointment:'Đang hẹn lên',
    lost:'Hết tiềm năng'
  }[rating] || '';
  const match = findCustomerMatch(formData.get('phone'), formData.get('name'));
  return {
    id: generateId('care'),
    date: formData.get('date'),
    name: formData.get('name'),
    phone: formData.get('phone'),
    address: formData.get('address'),
    staff: formData.get('staff'),
    channel: formData.get('channel'),
    content: formData.get('content'),
    feedback: formData.get('feedback'),
    note: formData.get('note'),
    rating,
    ratingLabel,
    ratingReason: formData.get('ratingReason') || '',
    customerId: match?.id || '',
    loggedAt: new Date().toISOString()
  };
}

function renderCareTable(data){
  const pendingIds = getPendingDeletionIds(COLLECTION);
  tableBody.innerHTML = data.map(item => `<tr class="border-b last:border-b-0">
      <td class="px-3 py-2">${formatDate(item.date)}</td>
      <td class="px-3 py-2 font-semibold">${item.name}</td>
      <td class="px-3 py-2">${item.phone}</td>
      <td class="px-3 py-2">${item.staff}</td>
      <td class="px-3 py-2">${item.channel}</td>
      <td class="px-3 py-2">${item.ratingLabel}</td>
      <td class="px-3 py-2">
        <div class="flex flex-wrap items-center justify-end gap-2">
          ${pendingIds.has(item.id) ? '<span class="badge badge-warning">Chờ duyệt xóa</span>' : ''}
          <button class="text-brand-blue" data-id="${item.id}" data-action="view">Chi tiết</button>
          <button class="text-rose-600" data-id="${item.id}" data-action="delete">${user.role==='admin'?'Xóa':'Xóa (gửi duyệt)'}</button>
        </div>
      </td>
    </tr>`).join('');
  tableBody.querySelectorAll('button[data-action="view"]').forEach(btn=>{
    btn.addEventListener('click', ()=>showCareDetail(btn.dataset.id));
  });
  tableBody.querySelectorAll('button[data-action="delete"]').forEach(btn=>{
    btn.addEventListener('click', ()=>handleDelete(btn.dataset.id));
  });
}

/* ===== Khớp khách hàng, cập nhật lịch sử & timeline ===== */
function findCustomerMatch(phone, name){
  const normalizedPhone = phone?.replace(/\D/g,'');
  if (!customers?.length) return null;
  let match = null;
  if (normalizedPhone) {
    match = customers.find(c => c.phone?.replace(/\D/g,'') === normalizedPhone);
  }
  if (!match && name) {
    const key = name.toLowerCase();
    match = customers.find(c => c.name?.toLowerCase() === key);
  }
  return match || null;
}

function linkCareToCustomer(entry){
  const match = entry.customerId ? customers.find(c => c.id === entry.customerId)
                                 : findCustomerMatch(entry.phone, entry.name);
  if (!match) return;
  updateItem('customers', match.id, record => {
    const meta = record.meta && typeof record.meta === 'object' ? record.meta : {};
    const history = Array.isArray(meta.history) ? meta.history.slice() : [];
    history.unshift({
      id: generateId('history'),
      type: 'note',
      title: `CSKH – ${entry.ratingLabel || 'Cập nhật'}`,
      description: entry.content || entry.feedback || '',
      detail: entry.staff ? `Nhân viên: ${entry.staff}` : '',
      at: entry.loggedAt || new Date().toISOString()
    });
    return {
      ...record,
      meta: {
        createdAt: meta.createdAt || new Date().toISOString(),
        statuses: { ...(meta.statuses || {}) },
        history
      }
    };
  });
}

function formatDateTime(value){
  if (!value) return formatDate(value);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return formatDate(value);
  return `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN',{ hour:'2-digit', minute:'2-digit' })}`;
}

function renderUnifiedTimeline(){
  if (!timelineContainer) return;
  const keyword = searchInput?.value.trim().toLowerCase();
  const events = [];

  customers.forEach(customer => {
    const meta = customer.meta && typeof customer.meta === 'object' ? customer.meta : {};
    const history = Array.isArray(meta.history) ? meta.history : [];
    if (history.length) {
      history.forEach(entry => {
        events.push({
          at: entry.at || meta.createdAt || customer.date,
          customer: customer.name,
          badge: getHistoryBadge(entry),
          title: entry.title || 'Cập nhật khách hàng',
          description: entry.description || '',
          detail: entry.detail || ''
        });
      });
    } else {
      events.push({
        at: meta.createdAt || customer.date,
        customer: customer.name,
        badge: '<span class="badge badge-info">Khách hàng</span>',
        title: 'Tạo khách hàng',
        description: 'Khởi tạo hồ sơ khách hàng.',
        detail: ''
      });
    }
  });

  careRecords.forEach(record => {
    events.push({
      at: record.loggedAt || record.date,
      customer: record.name,
      badge: '<span class="badge badge-info">CSKH</span>',
      title: `CSKH – ${record.ratingLabel || 'Cập nhật'}`,
      description: record.content || record.feedback || record.note || '',
      detail: record.staff ? `Nhân viên: ${record.staff}` : ''
    });
  });

  events.sort((a,b) => new Date(b.at) - new Date(a.at));

  const filteredEvents = keyword
    ? events.filter(event =>
        event.customer?.toLowerCase().includes(keyword) ||
        event.title?.toLowerCase().includes(keyword) ||
        event.description?.toLowerCase().includes(keyword)
      )
    : events;

  if (!filteredEvents.length) {
    timelineContainer.innerHTML = '<div class="text-sm text-slate-500">Chưa có hoạt động nào.</div>';
    return;
  }

  timelineContainer.innerHTML = filteredEvents.slice(0,80).map(event => `
    <div class="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
      <div class="flex items-center justify-between text-xs text-slate-500">
        <span>${formatDateTime(event.at)}</span>
        <span>${event.badge || ''}</span>
      </div>
      <div class="font-semibold text-brand-blue mt-1">${event.customer}</div>
      <div class="text-sm text-slate-600">${event.title}</div>
      ${event.description ? `<div class="text-xs text-slate-500 mt-1">${event.description}</div>` : ''}
      ${event.detail ? `<div class="text-xs text-slate-500 mt-1">${event.detail}</div>` : ''}
    </div>
  `).join('');
}

function getHistoryBadge(entry){
  if (entry.type === 'status' && entry.status) {
    const label = { appointment:'Hẹn', decline:'Từ chối', elsewhere:'Mua nơi khác' }[entry.status] || 'Trạng thái';
    const variant = entry.status === 'decline' || entry.status === 'elsewhere' ? 'badge-danger' : 'badge-info';
    return `<span class="badge ${variant}">${label}</span>`;
  }
  if (entry.type === 'note') {
    return '<span class="badge badge-warning">Ghi chú</span>';
  }
  return '<span class="badge badge-info">Khách hàng</span>';
}
/* ======================================================== */

function showCareDetail(id){
  const record = careRecords.find(item => item.id === id);
  const modal = document.getElementById('care-detail');
  if (!record || !modal) return;
  modal.querySelector('[data-field="name"]').innerText = record.name;
  modal.querySelector('[data-field="phone"]').innerText = record.phone;
  modal.querySelector('[data-field="date"]').innerText = formatDate(record.date);
  modal.querySelector('[data-field="staff"]').innerText = record.staff;
  modal.querySelector('[data-field="channel"]').innerText = record.channel;
  modal.querySelector('[data-field="content"]').innerText = record.content || '-';
  modal.querySelector('[data-field="feedback"]').innerText = record.feedback || '-';
  modal.querySelector('[data-field="note"]').innerText = record.note || '-';
  modal.querySelector('[data-field="rating"]').innerText = record.ratingLabel;
  modal.querySelector('[data-field="reason"]').innerText = record.rating === 'lost' ? (record.ratingReason || '-') : '-';
  modal.classList.remove('hidden');
}

const closeModal = document.getElementById('care-detail-close');
if (closeModal){
  closeModal.addEventListener('click',()=>document.getElementById('care-detail').classList.add('hidden'));
}

function formatDate(value){
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('vi-VN');
}

async function handleDelete(id){
  const record = careRecords.find(item => item.id === id);
  if (!record) return;

  if (user.role === 'admin'){
    if (!await confirmAction('Bạn chắc chắn muốn xóa lịch sử CSKH này?')) return;
    showLoading('Đang xóa lịch sử CSKH…');
    setTimeout(()=>{
      removeItem(COLLECTION, id);
      resolvePendingByRecord(COLLECTION, id, 'approved', 'Quản trị viên xóa trực tiếp trong danh sách CSKH.');
      careRecords = readCollection(COLLECTION);
      renderCareTable(careRecords);
      hideLoading();
      toast('Đã xóa lịch sử chăm sóc khách hàng.', 'success');
    }, 300);
    return;
  }

  const pendingIds = getPendingDeletionIds(COLLECTION);
  if (pendingIds.has(id)){
    toast('Đã có yêu cầu xóa chờ duyệt cho bản ghi này.', 'info');
    return;
  }

  const reason = prompt('Nhập lý do xóa lịch sử CSKH (gửi quản trị viên duyệt):','');
  if (!reason || !reason.trim()){
    toast('Vui lòng ghi rõ lý do xóa để gửi duyệt.', 'error');
    return;
  }
  try{
    submitDeletionRequest(COLLECTION, record, user, reason.trim());
    toast('Đã gửi yêu cầu xóa lịch sử CSKH đến quản trị viên.', 'success');
    renderCareTable(careRecords);
  }catch(err){
    toast(err.message || 'Không thể gửi yêu cầu xóa.', 'error');
  }
}
