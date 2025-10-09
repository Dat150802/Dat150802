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
import { applyPageModules, watchPageModules } from './core/modules.js';

const user = initApp('care');
applyPageModules('care');
watchPageModules('care');
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
const detailModal = document.getElementById('care-detail');
const customerUpdateSection = document.getElementById('care-customer-update');
const customerUpdateEmpty = document.getElementById('care-update-empty');
const customerUpdateForm = document.getElementById('care-update-form');
const customerUpdateName = document.getElementById('care-update-name');
const customerUpdateAddress = document.getElementById('care-update-address');
const customerUpdateInstallment = document.getElementById('care-update-installment');
const customerUpdatePurchased = document.getElementById('care-update-purchased');
const customerUpdatePurchasedFields = document.getElementById('care-update-purchased-fields');
const customerUpdateModel = document.getElementById('care-update-model');
const customerUpdatePrice = document.getElementById('care-update-price');
const customerUpdateNotes = document.getElementById('care-update-notes');
const customerUpdateSave = document.getElementById('care-update-save');
const customerUpdateCancel = document.getElementById('care-update-cancel');

let activeDetailId = '';

applyRolePermissions();
renderCareTable(careRecords);
setupFormOptions();
setupEvents();
renderUnifiedTimeline();

subscribeCollection('care', data => {
  careRecords = data;
  renderCareTable(careRecords);
  renderUnifiedTimeline();
  if(activeDetailId){
    const record = careRecords.find(item => item.id === activeDetailId);
    if(record){
      populateCustomerUpdate(record);
    }
  }
});

subscribeCollection('customers', data => {
  customers = data;
  setupFormOptions();
  renderUnifiedTimeline();
  if(activeDetailId){
    const record = careRecords.find(item => item.id === activeDetailId);
    if(record){
      populateCustomerUpdate(record);
    }
  }
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

  customerUpdatePurchased?.addEventListener('change', toggleCustomerUpdatePurchasedFields);
  customerUpdateForm?.addEventListener('submit', evt => {
    evt.preventDefault();
    handleCustomerUpdateSave();
  });
  customerUpdateCancel?.addEventListener('click', evt => {
    evt.preventDefault();
    resetCustomerUpdateForm();
  });
}

function toggleRatingReason(){
  const selected = document.querySelector('input[name="careRating"]:checked');
  ratingReason.classList.toggle('hidden', !(selected && selected.value === 'lost'));
}

toggleRatingReason();

function toggleCustomerUpdatePurchasedFields(){
  if(!customerUpdatePurchasedFields) return;
  const visible = customerUpdatePurchased?.checked;
  customerUpdatePurchasedFields.classList.toggle('hidden', !visible);
}

function resetCustomerUpdateForm(){
  if(!customerUpdateForm) return;
  const careId = customerUpdateForm.dataset.careId || activeDetailId;
  if(!careId) return;
  const record = careRecords.find(item => item.id === careId);
  if(record){
    populateCustomerUpdate(record);
  }
}

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
  if (!entry.customerId || entry.customerId !== match.id) {
    updateItem('care', entry.id, record => ({ ...record, customerId: match.id }));
  }
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

function populateCustomerUpdate(record){
  if(!customerUpdateSection || !customerUpdateForm) return;
  activeDetailId = record.id;
  customerUpdateForm.dataset.careId = record.id;
  const match = record.customerId ? customers.find(c => c.id === record.customerId)
    : findCustomerMatch(record.phone, record.name);
  if(match){
    customerUpdateForm.dataset.customerId = match.id;
    customerUpdateForm.classList.remove('hidden');
    customerUpdateEmpty?.classList.add('hidden');
    if(customerUpdateName){
      const phoneLabel = match.phone ? ` – ${match.phone}` : '';
      customerUpdateName.textContent = `${match.name || 'Khách hàng'}${phoneLabel}`;
    }
    if(customerUpdateAddress) customerUpdateAddress.value = match.address || '';
    if(customerUpdateInstallment) customerUpdateInstallment.value = match.installment || '';
    if(customerUpdatePurchased) customerUpdatePurchased.checked = !!match.purchased;
    if(customerUpdateModel) customerUpdateModel.value = match.purchasedModel || '';
    if(customerUpdatePrice) customerUpdatePrice.value = match.purchasedPrice || '';
    if(customerUpdateNotes) customerUpdateNotes.value = match.notes || '';
    toggleCustomerUpdatePurchasedFields();
  }else{
    customerUpdateForm.dataset.customerId = '';
    customerUpdateForm.classList.add('hidden');
    customerUpdateEmpty?.classList.remove('hidden');
  }
}

function handleCustomerUpdateSave(){
  if(!customerUpdateForm) return;
  if(!ensurePermission(user,'write')) return;
  const customerId = customerUpdateForm.dataset.customerId;
  if(!customerId){
    toast('Không tìm thấy khách hàng để cập nhật.','error');
    return;
  }
  const address = customerUpdateAddress?.value.trim() || '';
  const installment = customerUpdateInstallment?.value.trim() || '';
  const purchased = !!customerUpdatePurchased?.checked;
  const purchasedModel = customerUpdateModel?.value.trim() || '';
  const purchasedPrice = customerUpdatePrice?.value.trim() || '';
  const noteInput = customerUpdateNotes?.value.trim() || '';
  const now = new Date().toISOString();

  showLoading('Đang cập nhật hồ sơ khách hàng…');
  setTimeout(() => {
    updateItem('customers', customerId, record => {
      const next = { ...record };
      next.address = address;
      next.installment = installment;
      next.purchased = purchased;
      next.purchasedModel = purchased ? purchasedModel : '';
      next.purchasedPrice = purchased ? purchasedPrice : '';
      if(noteInput){
        next.notes = noteInput;
      }else if(record.notes){
        next.notes = record.notes;
      }

      const meta = record.meta && typeof record.meta === 'object' ? { ...record.meta } : {};
      const history = Array.isArray(meta.history) ? meta.history.slice() : [];
      const detailParts = [];
      const staffLabel = user.name || user.username || 'CSKH';
      detailParts.push(`Nhân viên: ${staffLabel}`);
      if(address !== record.address){
        detailParts.push(`Địa chỉ: ${address || 'chưa cập nhật'}`);
      }
      if(installment !== (record.installment || '')){
        detailParts.push('Điều chỉnh thông tin trả góp/hẹn.');
      }
      if(purchased !== !!record.purchased){
        detailParts.push(purchased ? 'Đánh dấu khách đã mua.' : 'Hủy đánh dấu khách đã mua.');
      }
      if(purchased && (purchasedModel || purchasedPrice)){
        detailParts.push(`Sản phẩm: ${purchasedModel || 'Không rõ'}${purchasedPrice ? ` – ${purchasedPrice}` : ''}`);
      }
      if(noteInput){
        detailParts.push(`Ghi chú: ${noteInput}`);
      }
      if(purchased && !record.purchased){
        history.unshift({
          id: generateId('history'),
          type: 'status',
          status: 'purchased',
          title: 'Khách đã mua',
          description: noteInput || 'Đánh dấu khách đã hoàn tất mua hàng.',
          at: now
        });
      }
      history.unshift({
        id: generateId('history'),
        type: 'note',
        title: 'Cập nhật từ CSKH',
        description: noteInput || 'Điều chỉnh hồ sơ khách từ màn hình CSKH.',
        detail: detailParts.join(' '),
        at: now
      });
      meta.history = history;
      const statuses = meta.statuses && typeof meta.statuses === 'object' ? { ...meta.statuses } : {};
      if(purchased){
        statuses.purchased = {
          at: now,
          note: noteInput || 'Đánh dấu khách đã mua từ CSKH.',
          staff: user.name || user.username,
          model: purchasedModel,
          price: purchasedPrice
        };
      }else{
        delete statuses.purchased;
      }
      meta.statuses = statuses;
      next.meta = meta;
      return next;
    });

    hideLoading();
    toast('Đã cập nhật hồ sơ khách hàng.','success');
    customers = readCollection('customers');
    const careId = customerUpdateForm.dataset.careId || activeDetailId;
    const refreshed = careRecords.find(item => item.id === careId);
    if(refreshed){
      populateCustomerUpdate(refreshed);
    }
    renderUnifiedTimeline();
  }, 350);
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
    const label = { appointment:'Hẹn', decline:'Từ chối', elsewhere:'Mua nơi khác', purchased:'Đã mua' }[entry.status] || 'Trạng thái';
    const variant = entry.status === 'decline' || entry.status === 'elsewhere'
      ? 'badge-danger'
      : (entry.status === 'purchased' ? 'badge-success' : 'badge-info');
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
  if (!record || !detailModal) return;
  detailModal.querySelector('[data-field="name"]').innerText = record.name;
  detailModal.querySelector('[data-field="phone"]').innerText = record.phone;
  detailModal.querySelector('[data-field="date"]').innerText = formatDate(record.date);
  detailModal.querySelector('[data-field="staff"]').innerText = record.staff;
  detailModal.querySelector('[data-field="channel"]').innerText = record.channel;
  detailModal.querySelector('[data-field="content"]').innerText = record.content || '-';
  detailModal.querySelector('[data-field="feedback"]').innerText = record.feedback || '-';
  detailModal.querySelector('[data-field="note"]').innerText = record.note || '-';
  detailModal.querySelector('[data-field="rating"]').innerText = record.ratingLabel;
  detailModal.querySelector('[data-field="reason"]').innerText = record.rating === 'lost' ? (record.ratingReason || '-') : '-';
  populateCustomerUpdate(record);
  detailModal.classList.remove('hidden');
}

const closeModal = document.getElementById('care-detail-close');
if (closeModal){
  closeModal.addEventListener('click',()=>{
    detailModal?.classList.add('hidden');
    activeDetailId = '';
  });
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
