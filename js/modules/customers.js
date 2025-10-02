import { mountFrame, showLoading, hideLoading, toast, formatDate, formatCurrency, openModal, debounce, toggleFormDisabled } from '../core/ui.js';
import { getState, updateSection, generateId } from '../core/storage.js';
import { getCurrentUser } from '../core/auth.js';

const user = getCurrentUser();
const isStaff = user?.role !== 'admin';

const form = document.getElementById('customer-form');
const selectSource = document.getElementById('f-source');
const sourceDetailWrap = document.getElementById('f-source-detail-wrap');
const purchasedCheckbox = document.getElementById('f-purchased');
const modelWrap = document.getElementById('f-model-wrap');
const consultWrap = document.getElementById('f-consults-wrap');
const consultList = document.getElementById('consults-list');
const searchInput = document.getElementById('search');
const filterStatus = document.getElementById('filter-status');
const filterSource = document.getElementById('filter-source');
const listEl = document.getElementById('list');

mountFrame('customers');
if(form && isStaff){
  toggleFormDisabled(form, true);
}

bindEvents();
renderList();

function bindEvents(){
  if(!form) return;
  selectSource.addEventListener('change', handleSourceChange);
  purchasedCheckbox.addEventListener('change', handlePurchasedChange);
  document.getElementById('add-consult').addEventListener('click', ()=> createConsultRow());
  document.getElementById('btn-save').addEventListener('click', handleSave);
  document.getElementById('btn-reset').addEventListener('click', resetForm);
  searchInput.addEventListener('input', debounce(renderList, 200));
  filterStatus.addEventListener('change', renderList);
  filterSource.addEventListener('change', renderList);
  createConsultRow();
}

function handleSourceChange(){
  const val = selectSource.value;
  if(['Khách online','Khách cũ giới thiệu','Khách cũ mua lại','Người quen nhân viên','Khác'].includes(val)){
    sourceDetailWrap.classList.remove('hidden');
  }else{
    sourceDetailWrap.classList.add('hidden');
    document.getElementById('f-source-detail').value = '';
  }
}

function handlePurchasedChange(){
  const checked = purchasedCheckbox.checked;
  if(checked){
    modelWrap.classList.remove('hidden');
    consultWrap.classList.add('hidden');
  }else{
    modelWrap.classList.add('hidden');
    consultWrap.classList.remove('hidden');
  }
}

function createConsultRow(data={}){
  const row = document.createElement('div');
  row.className = 'grid grid-cols-1 md:grid-cols-3 gap-2 relative bg-gray-50 rounded-xl p-3';
  row.dataset.row = 'consult';
  row.innerHTML = `
    <label class="block text-sm">
      <span class="text-xs text-gray-500">Mẫu ghế tư vấn</span>
      <input data-field="model" value="${data.model||''}" class="mt-1 px-3 py-2 border rounded w-full" placeholder="VD: KY02">
    </label>
    <label class="block text-sm">
      <span class="text-xs text-gray-500">Giá tham khảo</span>
      <input data-field="price" value="${data.price||''}" type="number" class="mt-1 px-3 py-2 border rounded w-full" placeholder="Giá (VNĐ)">
    </label>
    <label class="block text-sm">
      <span class="text-xs text-gray-500">Ghi chú / Trả góp</span>
      <input data-field="note" value="${data.note||''}" class="mt-1 px-3 py-2 border rounded w-full" placeholder="Thông tin thêm">
    </label>
    <button type="button" class="absolute -top-3 -right-3 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center" data-remove>&times;</button>
  `;
  row.querySelector('[data-remove]').addEventListener('click', ()=>{
    row.remove();
  });
  consultList.appendChild(row);
}

function handleSave(){
  if(isStaff){
    toast('Bạn không có quyền thêm dữ liệu mới.', 'error');
    return;
  }
  const date = document.getElementById('f-date').value;
  const name = document.getElementById('f-name').value.trim();
  const phone = document.getElementById('f-phone').value.trim();
  if(!date || !name || !phone){
    toast('Vui lòng nhập đầy đủ ngày, tên và số điện thoại.', 'error');
    return;
  }
  const payload = {
    id: generateId('cust'),
    date,
    name,
    phone,
    address: document.getElementById('f-address').value.trim(),
    source: selectSource.value,
    sourceDetail: document.getElementById('f-source-detail').value.trim(),
    purchased: purchasedCheckbox.checked,
    model: document.getElementById('f-model').value.trim(),
    price: Number(document.getElementById('f-price').value || 0),
    consults: [...consultList.querySelectorAll('[data-row="consult"]')].map(row => ({
      model: row.querySelector('[data-field="model"]').value.trim(),
      price: Number(row.querySelector('[data-field="price"]').value || 0),
      note: row.querySelector('[data-field="note"]').value.trim()
    })).filter(item => item.model || item.price || item.note),
    note: document.getElementById('f-note').value.trim(),
    createdAt: new Date().toISOString()
  };
  showLoading('Đang lưu khách hàng…');
  setTimeout(()=>{
    updateSection('customers', list => {
      const arr = Array.isArray(list) ? [...list] : [];
      arr.push(payload);
      return arr;
    });
    hideLoading();
    toast('Đã lưu khách hàng mới.', 'success');
    resetForm();
    renderList();
  }, 400);
}

function resetForm(){
  form.reset();
  handleSourceChange();
  handlePurchasedChange();
  consultList.innerHTML = '';
  createConsultRow();
}

function renderList(){
  const state = getState();
  const search = searchInput.value.trim().toLowerCase();
  const status = filterStatus.value;
  const sourceFilter = filterSource.value;
  const records = (state.customers || []).filter(item => {
    const matchSearch = !search || [item.name, item.phone, item.address].some(v => v?.toLowerCase().includes(search));
    const matchStatus = status === 'all' || (status === 'purchased' && item.purchased) || (status === 'not' && !item.purchased);
    const matchSource = sourceFilter === 'all' || item.source === sourceFilter;
    return matchSearch && matchStatus && matchSource;
  }).sort((a,b)=> new Date(b.date) - new Date(a.date));

  if(records.length === 0){
    listEl.innerHTML = '<p class="text-sm text-gray-500">Chưa có dữ liệu.</p>';
    return;
  }

  listEl.innerHTML = records.map(item => {
    const statusBadge = item.purchased ? '<span class="badge bg-green-100 text-green-600">Đã mua</span>' : '<span class="badge bg-yellow-100 text-yellow-600">Chưa mua</span>';
    const sourceDetail = item.sourceDetail ? `<div class="text-xs text-gray-500">Chi tiết: ${item.sourceDetail}</div>` : '';
    const consults = (item.consults||[]).map(c => `<li>${c.model ? `<b>${c.model}</b>` : 'Tư vấn'} – ${c.price ? formatCurrency(c.price) : ''} ${c.note||''}</li>`).join('');
    return `
      <div class="card p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="text-lg font-semibold text-brand-blue">${item.name}</div>
            <div class="text-sm text-gray-500">${formatDate(item.date)} · ${item.phone}</div>
          </div>
          ${statusBadge}
        </div>
        <div class="mt-3 text-sm text-gray-600 space-y-1">
          <div><b>Địa chỉ:</b> ${item.address || '—'}</div>
          <div><b>Nguồn khách:</b> ${item.source || '—'} ${sourceDetail}</div>
          ${item.purchased ? `<div><b>Mẫu/giá:</b> ${item.model || '—'} · ${item.price ? formatCurrency(item.price) : ''}</div>` : ''}
          ${!item.purchased && consults ? `<div><b>Đã tư vấn:</b><ul class="list-disc ml-5 text-xs text-gray-500">${consults}</ul></div>` : ''}
          <div><b>Ghi chú:</b> ${item.note || '—'}</div>
        </div>
        <div class="mt-4 flex flex-wrap gap-2">
          <button data-history="${item.id}" class="px-3 py-2 text-sm rounded-xl bg-gray-100">Xem lịch sử</button>
          <button data-cskh="${item.id}" class="px-3 py-2 text-sm rounded-xl bg-brand-blue text-white">CSKH</button>
        </div>
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('[data-history]').forEach(btn => btn.addEventListener('click', ()=> showHistory(btn.dataset.history)));
  listEl.querySelectorAll('[data-cskh]').forEach(btn => btn.addEventListener('click', ()=> gotoCare(btn.dataset.cskh)));
}

function showHistory(id){
  const state = getState();
  const customer = (state.customers || []).find(c => c.id === id);
  if(!customer) return;
  const careLogs = (state.careLogs || []).filter(log => log.customerId === id || log.phone === customer.phone);
  const services = [...(state.service?.warranty||[]), ...(state.service?.maintenance||[])].filter(s => s.customerId === id || s.phone === customer.phone);
  const history = `
    <p><b>Khách hàng:</b> ${customer.name} (${customer.phone})</p>
    <p><b>Địa chỉ:</b> ${customer.address || '—'}</p>
    <p><b>Ghi chú:</b> ${customer.note || '—'}</p>
    <hr>
    <h4 class="font-semibold text-brand-blue">Lịch sử CSKH (${careLogs.length})</h4>
    ${careLogs.length ? '<ul class="space-y-2">' + careLogs.map(log => `<li class="border rounded-lg p-2">${formatDate(log.date)} – ${log.staff} – ${log.method}<br><span class="text-xs text-gray-500">${log.content}</span></li>`).join('') + '</ul>' : '<p class="text-sm text-gray-500">Chưa có lịch sử CSKH.</p>'}
    <hr>
    <h4 class="font-semibold text-brand-blue">Bảo hành/Bảo dưỡng (${services.length})</h4>
    ${services.length ? '<ul class="space-y-2">' + services.map(item => `<li class="border rounded-lg p-2">${formatDate(item.date)} – ${item.type === 'warranty' ? 'Bảo hành' : 'Bảo dưỡng'} – ${item.model || '—'}<br><span class="text-xs text-gray-500">${item.status || 'Đang xử lý'}</span></li>`).join('') + '</ul>' : '<p class="text-sm text-gray-500">Chưa có lịch sử dịch vụ.</p>'}
  `;
  openModal('Lịch sử khách hàng', history);
}

function gotoCare(id){
  localStorage.setItem('klc-selected-customer', id);
  window.location.href = 'care.html';
}
