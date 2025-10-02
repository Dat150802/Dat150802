import { mountFrame, toast, showLoading, hideLoading, formatDate, toggleFormDisabled } from '../core/ui.js';
import { getState, updateSection, generateId } from '../core/storage.js';
import { getCurrentUser } from '../core/auth.js';

const user = getCurrentUser();
const isStaff = user?.role !== 'admin';

const form = document.getElementById('service-form');
const radios = document.querySelectorAll('input[name="service-type"]');
const typeInput = document.getElementById('service-type');
const conditionWrap = document.getElementById('service-condition-wrap');
const extraWrap = document.getElementById('service-extra-wrap');
const maintainWrap = document.getElementById('service-maintain-wrap');
const listEl = document.getElementById('service-list');
const searchInput = document.getElementById('service-search');
const filterType = document.getElementById('service-filter-type');
const filterStatus = document.getElementById('service-filter-status');

mountFrame('service');
if(form && isStaff){
  toggleFormDisabled(form, true);
}

typeInput.value = 'warranty';
radios.forEach(radio => radio.addEventListener('change', handleTypeChange));
handleTypeChange();

bindEvents();
renderList();

function bindEvents(){
  document.getElementById('btn-service-save').addEventListener('click', handleSave);
  document.getElementById('btn-service-reset').addEventListener('click', resetForm);
  searchInput.addEventListener('input', ()=> renderList());
  filterType.addEventListener('change', renderList);
  filterStatus.addEventListener('change', renderList);
}

function handleTypeChange(){
  const type = document.querySelector('input[name="service-type"]:checked')?.value || 'warranty';
  typeInput.value = type;
  if(type === 'warranty'){
    conditionWrap.classList.remove('hidden');
    extraWrap.classList.remove('hidden');
    maintainWrap.classList.add('hidden');
  }else{
    conditionWrap.classList.add('hidden');
    extraWrap.classList.add('hidden');
    maintainWrap.classList.remove('hidden');
  }
}

function handleSave(){
  if(isStaff){
    toast('Bạn không có quyền thêm dữ liệu mới.', 'error');
    return;
  }
  const type = typeInput.value;
  const date = document.getElementById('service-date').value;
  const name = document.getElementById('service-name').value.trim();
  const phone = document.getElementById('service-phone').value.trim();
  if(!date || !name || !phone){
    toast('Vui lòng nhập ngày, tên và số điện thoại.', 'error');
    return;
  }
  const state = getState();
  const customer = (state.customers || []).find(c => c.phone === phone || c.name === name);
  const payload = {
    id: generateId('svc'),
    customerId: customer?.id || null,
    type,
    date,
    name,
    phone,
    address: document.getElementById('service-address').value.trim(),
    model: document.getElementById('service-model').value.trim(),
    condition: document.getElementById('service-condition').value.trim(),
    extra: document.getElementById('service-extra').value.trim(),
    maintain: document.getElementById('service-maintain').value.trim(),
    supported: false,
    sentParts: false,
    partsDate: '',
    partsItems: '',
    createdAt: new Date().toISOString()
  };
  showLoading('Đang lưu phiếu dịch vụ…');
  setTimeout(()=>{
    updateSection('service', service => {
      const next = { ...service };
      const arr = Array.isArray(next[type]) ? [...next[type]] : [];
      arr.push(payload);
      next[type] = arr;
      return next;
    });
    hideLoading();
    toast('Đã lưu thông tin dịch vụ.', 'success');
    resetForm();
    renderList();
  }, 400);
}

function resetForm(){
  form.reset();
  document.querySelector('input[name="service-type"][value="warranty"]').checked = true;
  handleTypeChange();
}

function renderList(){
  const state = getState();
  const records = [...(state.service?.warranty || []).map(item => ({...item, type:'warranty'})), ...(state.service?.maintenance || []).map(item => ({...item, type:'maintenance'}))];
  const search = searchInput.value.trim().toLowerCase();
  const type = filterType.value;
  const status = filterStatus.value;
  const filtered = records.filter(item => {
    const matchSearch = !search || [item.name, item.phone, item.model, item.address].some(v => v?.toLowerCase().includes(search));
    const matchType = type === 'all' || item.type === type;
    let matchStatus = true;
    if(status === 'pending') matchStatus = !item.supported;
    if(status === 'done') matchStatus = item.supported;
    if(status === 'parts') matchStatus = item.sentParts;
    return matchSearch && matchType && matchStatus;
  }).sort((a,b)=> new Date(b.date) - new Date(a.date));

  if(filtered.length === 0){
    listEl.innerHTML = '<p class="text-sm text-gray-500">Chưa có dữ liệu.</p>';
    return;
  }

  listEl.innerHTML = filtered.map(item => `
    <div class="card p-4 space-y-3">
      <div class="flex items-start justify-between">
        <div>
          <div class="font-semibold text-brand-blue">${item.name}</div>
          <div class="text-sm text-gray-500">${formatDate(item.date)} · ${item.phone}</div>
        </div>
        <span class="badge">${item.type === 'warranty' ? 'Bảo hành' : 'Bảo dưỡng'}</span>
      </div>
      <div class="text-sm text-gray-600 space-y-1">
        <div><b>Mẫu ghế:</b> ${item.model || '—'}</div>
        <div><b>Địa chỉ:</b> ${item.address || '—'}</div>
        ${item.type === 'warranty' ? `<div><b>Tình trạng:</b> ${item.condition || '—'}</div>` : `<div><b>Nội dung bảo dưỡng:</b> ${item.maintain || '—'}</div>`}
        ${item.type === 'warranty' ? `<div><b>Yêu cầu thêm:</b> ${item.extra || '—'}</div>` : ''}
      </div>
      <div class="space-y-2 text-sm">
        <label class="flex items-center gap-2">
          <input type="checkbox" data-action="supported" data-id="${item.id}" data-type="${item.type}" ${item.supported?'checked':''} ${isStaff?'disabled':''}> Đã hỗ trợ khách hàng
        </label>
        <label class="flex items-center gap-2">
          <input type="checkbox" data-action="parts" data-id="${item.id}" data-type="${item.type}" ${item.sentParts?'checked':''} ${isStaff?'disabled':''}> Đã gửi linh kiện về công ty
        </label>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2 ${item.sentParts?'':'hidden'}" data-parts-wrap="${item.id}">
          <label class="text-xs text-gray-500">Ngày gửi linh kiện
            <input type="date" data-field="partsDate" data-id="${item.id}" data-type="${item.type}" class="mt-1 px-3 py-2 border rounded w-full" value="${item.partsDate||''}" ${isStaff?'disabled':''}>
          </label>
          <label class="text-xs text-gray-500">Linh kiện đã gửi
            <input type="text" data-field="partsItems" data-id="${item.id}" data-type="${item.type}" class="mt-1 px-3 py-2 border rounded w-full" value="${item.partsItems||''}" placeholder="VD: Motor, remote" ${isStaff?'disabled':''}>
          </label>
        </div>
      </div>
    </div>
  `).join('');

  if(!isStaff){
    listEl.querySelectorAll('[data-action="supported"]').forEach(el => el.addEventListener('change', handleStatusToggle));
    listEl.querySelectorAll('[data-action="parts"]').forEach(el => el.addEventListener('change', handleStatusToggle));
    listEl.querySelectorAll('[data-field]').forEach(el => el.addEventListener('change', handleFieldChange));
  }
}

function handleStatusToggle(e){
  const checkbox = e.target;
  const id = checkbox.dataset.id;
  const type = checkbox.dataset.type;
  const action = checkbox.dataset.action;
  const value = checkbox.checked;
  updateRecord(id, type, record => {
    if(action === 'supported'){
      return { ...record, supported: value };
    }
    if(action === 'parts'){
      const wrap = document.querySelector(`[data-parts-wrap="${id}"]`);
      if(wrap){
        wrap.classList.toggle('hidden', !value);
      }
      return { ...record, sentParts: value };
    }
    return record;
  });
}

function handleFieldChange(e){
  const input = e.target;
  const id = input.dataset.id;
  const type = input.dataset.type;
  const field = input.dataset.field;
  const value = input.value;
  updateRecord(id, type, record => ({ ...record, [field]: value }));
}

function updateRecord(id, type, updater){
  updateSection('service', service => {
    const next = { ...service };
    const arr = Array.isArray(next[type]) ? [...next[type]] : [];
    const idx = arr.findIndex(item => item.id === id);
    if(idx >= 0){
      const current = arr[idx];
      const updated = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
      arr[idx] = updated;
      next[type] = arr;
    }
    return next;
  });
  toast('Đã cập nhật trạng thái.', 'success', 2000);
}
