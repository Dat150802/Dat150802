import { initApp } from './core/app.js';
import {
  appendItem,
  readCollection,
  updateItem,
  generateId,
  removeItem,
  subscribeCollection
} from './core/storage.js';
import { showLoading, hideLoading, toast, bindSearch, confirmAction } from './core/ui.js';
import { ensurePermission } from './core/auth.js';
import { getPendingDeletionIds, submitDeletionRequest, resolvePendingByRecord } from './core/deletion.js';
import { applyPageModules, watchPageModules } from './core/modules.js';

const user = initApp('service');
applyPageModules('service');
watchPageModules('service');
let services = readCollection('services');
const COLLECTION = 'services';

const typeRadios = document.querySelectorAll('input[name="serviceType"]');
const warrantyForm = document.getElementById('warranty-form');
const maintenanceForm = document.getElementById('maintenance-form');
const warrantyList = document.getElementById('warranty-list');
const maintenanceList = document.getElementById('maintenance-list');
const searchInput = document.getElementById('service-search');
const filterSelect = document.getElementById('service-filter');
const staffHint = document.getElementById('service-staff-view');
const saveButton = document.getElementById('service-save');
const resetButton = document.getElementById('service-reset');

applyRolePermissions();
renderLists(services);
setupEvents();

// Realtime sync
subscribeCollection('services', data => {
  services = data;
  applyFilter();
});

function applyRolePermissions(){
  if (user.role === 'staff'){
    staffHint?.classList.remove('hidden');
  }
}

function setupEvents(){
  typeRadios.forEach(radio => radio.addEventListener('change', toggleForms));
  toggleForms();

  // Nút lưu dùng chung
  saveButton?.addEventListener('click', handleSave);

  // Nút xóa form theo form đang hiển thị
  resetButton?.addEventListener('click', () => {
    const { form } = getActiveForm();
    form?.reset();
  });

  if (searchInput){
    bindSearch(searchInput, () => applyFilter());
  }
  if (filterSelect){
    filterSelect.addEventListener('change', () => applyFilter());
  }
}

function toggleForms(){
  const selected = document.querySelector('input[name="serviceType"]:checked');
  const isWarranty = selected?.value === 'warranty';
  warrantyForm.classList.toggle('hidden', !isWarranty);
  maintenanceForm.classList.toggle('hidden', isWarranty);
  if (saveButton){
    saveButton.textContent = isWarranty ? 'Lưu phiếu bảo hành' : 'Lưu phiếu bảo dưỡng';
  }
}

function getActiveForm(){
  const selected = document.querySelector('input[name="serviceType"]:checked');
  const isWarranty = selected?.value === 'warranty';
  return {
    form: isWarranty ? warrantyForm : maintenanceForm,
    type: isWarranty ? 'warranty' : 'maintenance'
  };
}

function handleSave(){
  if (!ensurePermission(user,'write')) return;
  const { form, type } = getActiveForm();
  if (!form) return;
  if (!form.reportValidity()) return;

  const payload = collectFormData(form, type);
  const loadingMessage = type === 'warranty' ? 'Đang lưu phiếu bảo hành…' : 'Đang lưu phiếu bảo dưỡng…';
  const successMessage = type === 'warranty' ? 'Đã lưu thông tin bảo hành.' : 'Đã lưu thông tin bảo dưỡng.';

  showLoading(loadingMessage);
  setTimeout(() => {
    appendItem('services', payload);
    // subscribeCollection sẽ tự refresh bảng
    form.reset();
    hideLoading();
    toast(successMessage, 'success');
  }, 400);
}

function collectFormData(form, type){
  const formData = new FormData(form);
  return {
    id: generateId('service'),
    type,
    date: formData.get('date'),
    name: formData.get('name'),
    phone: formData.get('phone'),
    address: formData.get('address'),
    product: formData.get('product'),
    status: formData.get('status') || '',
    extra: formData.get('extra'),
    support: false,
    partSent: false,
    partDate: '',
    partInfo: ''
  };
}

function renderLists(data){
  const pendingIds = getPendingDeletionIds(COLLECTION);
  const warrantyData = data.filter(item => item.type === 'warranty');
  const maintenanceData = data.filter(item => item.type === 'maintenance');
  warrantyList.innerHTML = warrantyData.map(item => renderRow(item, pendingIds)).join('');
  maintenanceList.innerHTML = maintenanceData.map(item => renderRow(item, pendingIds)).join('');
  bindRowEvents();
}

function renderRow(item, pendingIds){
  return `<tr class="border-b last:border-b-0">
    <td class="px-3 py-2">${formatDate(item.date)}</td>
    <td class="px-3 py-2 font-semibold">${item.name}</td>
    <td class="px-3 py-2">${item.phone}</td>
    <td class="px-3 py-2">${item.product || '-'}</td>
    <td class="px-3 py-2">${item.status || item.extra || '-'}</td>
    <td class="px-3 py-2 space-x-2">
      <label class="inline-flex items-center gap-1 text-sm"><input type="checkbox" data-action="support" data-id="${item.id}" ${item.support?'checked':''}> Đã hỗ trợ</label>
      <label class="inline-flex items-center gap-1 text-sm"><input type="checkbox" data-action="part" data-id="${item.id}" ${item.partSent?'checked':''}> Gửi linh kiện</label>
    </td>
    <td class="px-3 py-2 text-right">
      <div class="flex flex-wrap items-center justify-end gap-2">
        ${pendingIds.has(item.id) ? '<span class="badge badge-warning">Chờ duyệt xóa</span>' : ''}
        <button class="text-brand-blue" data-action="detail" data-id="${item.id}">Chi tiết</button>
        <button class="text-rose-600" data-action="delete" data-id="${item.id}">${user.role==='admin'?'Xóa':'Xóa (gửi duyệt)'}</button>
      </div>
    </td>
  </tr>`;
}

function bindRowEvents(){
  document.querySelectorAll('input[data-action="support"]').forEach(input=>{
    input.addEventListener('change', ()=>{
      if (!ensurePermission(user,'write')){ input.checked = !input.checked; return; }
      updateItem('services', input.dataset.id, item => ({ ...item, support: input.checked }));
      services = readCollection('services');
      applyFilter();
    });
  });
  document.querySelectorAll('input[data-action="part"]').forEach(input=>{
    input.addEventListener('change', ()=>{
      if (!ensurePermission(user,'write')){ input.checked = !input.checked; return; }
      if (input.checked){
        const partDate = prompt('Ngày gửi linh kiện (YYYY-MM-DD)?','');
        const partInfo = prompt('Chi tiết linh kiện đã gửi?','');
        updateItem('services', input.dataset.id, item => ({ ...item, partSent: true, partDate: partDate || '', partInfo: partInfo || '' }));
      }else{
        updateItem('services', input.dataset.id, item => ({ ...item, partSent: false, partDate: '', partInfo: '' }));
      }
      services = readCollection('services');
      applyFilter();
    });
  });
  document.querySelectorAll('button[data-action="detail"]').forEach(btn=>{
    btn.addEventListener('click', ()=>showServiceDetail(btn.dataset.id));
  });
  document.querySelectorAll('button[data-action="delete"]').forEach(btn=>{
    btn.addEventListener('click', ()=>handleDelete(btn.dataset.id));
  });
}

function showServiceDetail(id){
  const record = services.find(item => item.id === id);
  const modal = document.getElementById('service-detail');
  if (!record || !modal) return;
  modal.querySelector('[data-field="type"]').innerText = record.type === 'warranty' ? 'Bảo hành' : 'Bảo dưỡng';
  modal.querySelector('[data-field="name"]').innerText = record.name;
  modal.querySelector('[data-field="phone"]').innerText = record.phone;
  modal.querySelector('[data-field="address"]').innerText = record.address || '-';
  modal.querySelector('[data-field="product"]').innerText = record.product || '-';
  modal.querySelector('[data-field="status"]').innerText = record.status || '-';
  modal.querySelector('[data-field="extra"]').innerText = record.extra || '-';
  modal.querySelector('[data-field="support"]').innerText = record.support ? 'Đã hỗ trợ' : 'Chưa hỗ trợ';
  modal.querySelector('[data-field="part"]').innerText = record.partSent ? `Đã gửi (${formatDate(record.partDate)} – ${record.partInfo || '-'})` : 'Chưa gửi';
  modal.classList.remove('hidden');
}

const closeModal = document.getElementById('service-detail-close');
if (closeModal){
  closeModal.addEventListener('click', ()=>document.getElementById('service-detail').classList.add('hidden'));
}

function formatDate(value){
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('vi-VN');
}

function applyFilter(){
  const filter = filterSelect?.value || 'all';
  const keyword = searchInput?.value.trim().toLowerCase() || '';
  let filtered = services;

  if (keyword){
    filtered = filtered.filter(item =>
      item.name.toLowerCase().includes(keyword) ||
      item.phone.includes(keyword) ||
      (item.product || '').toLowerCase().includes(keyword)
    );
  }

  if (filter === 'pending'){
    filtered = filtered.filter(item => !item.support);
  }else if (filter === 'supported'){
    filtered = filtered.filter(item => item.support);
  }else if (filter === 'parts'){
    filtered = filtered.filter(item => item.partSent);
  }

  renderLists(filtered);
  return filtered;
}

async function handleDelete(id){
  const record = services.find(item => item.id === id);
  if (!record) return;

  if (user.role === 'admin'){
    if (!await confirmAction('Bạn chắc chắn muốn xóa phiếu dịch vụ này?')) return;
    showLoading('Đang xóa phiếu dịch vụ…');
    setTimeout(() => {
      removeItem(COLLECTION, id);
      resolvePendingByRecord(COLLECTION, id, 'approved', 'Quản trị viên xóa trực tiếp phiếu dịch vụ.');
      services = readCollection(COLLECTION);
      applyFilter();
      hideLoading();
      toast('Đã xóa phiếu dịch vụ.', 'success');
    }, 300);
    return;
  }

  const pendingIds = getPendingDeletionIds(COLLECTION);
  if (pendingIds.has(id)){
    toast('Đã có yêu cầu xóa chờ duyệt cho phiếu này.', 'info');
    return;
  }
  const reason = prompt('Nhập lý do xóa phiếu dịch vụ (gửi quản trị viên duyệt):','');
  if (!reason || !reason.trim()){
    toast('Vui lòng ghi rõ lý do xóa để gửi duyệt.', 'error');
    return;
  }
  try{
    submitDeletionRequest(COLLECTION, record, user, reason.trim());
    toast('Đã gửi yêu cầu xóa phiếu dịch vụ đến quản trị viên.', 'success');
    applyFilter();
  }catch(err){
    toast(err.message || 'Không thể gửi yêu cầu xóa.', 'error');
  }
}
