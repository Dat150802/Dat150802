import { mountFrame, toast, showLoading, hideLoading, formatDate, openModal, debounce, toggleFormDisabled } from '../core/ui.js';
import { getState, updateSection, generateId } from '../core/storage.js';
import { getCurrentUser } from '../core/auth.js';

const state = getState();
const customers = state.customers || [];
const employees = state.employees || [];
const user = getCurrentUser();
const isStaff = user?.role !== 'admin';

const form = document.getElementById('care-form');
const nameInput = document.getElementById('care-name');
const phoneInput = document.getElementById('care-phone');
const addressInput = document.getElementById('care-address');
const staffSelect = document.getElementById('care-staff');
const methodSelect = document.getElementById('care-method');
const ratingRadios = document.querySelectorAll('input[name="care-rating"]');
const ratingWrap = document.getElementById('care-rating-wrap');
const reasonWrap = document.getElementById('care-reason-wrap');
const listEl = document.getElementById('care-list');
const searchInput = document.getElementById('care-search');
const filterRating = document.getElementById('filter-rating');
const filterStaff = document.getElementById('filter-staff');

mountFrame('care');
if(form && isStaff){
  toggleFormDisabled(form, true);
}

populateOptions();
attachEvents();
renderList();
prefillFromSelection();

function populateOptions(){
  const dataList = document.getElementById('customer-names');
  const phoneList = document.getElementById('customer-phones');
  dataList.innerHTML = customers.map(c => `<option value="${c.name}" data-id="${c.id}"></option>`).join('');
  phoneList.innerHTML = customers.map(c => `<option value="${c.phone}"></option>`).join('');
  staffSelect.innerHTML = employees.map(name => `<option value="${name}">${name}</option>`).join('');
  filterStaff.innerHTML = '<option value="all">Mọi nhân viên</option>' + employees.map(name => `<option value="${name}">${name}</option>`).join('');
}

function attachEvents(){
  nameInput.addEventListener('change', syncCustomerByName);
  phoneInput.addEventListener('change', syncCustomerByPhone);
  ratingRadios.forEach(radio => radio.addEventListener('change', handleRatingChange));
  document.getElementById('btn-care-save').addEventListener('click', handleSave);
  document.getElementById('btn-care-reset').addEventListener('click', resetForm);
  searchInput.addEventListener('input', debounce(renderList, 200));
  filterRating.addEventListener('change', renderList);
  filterStaff.addEventListener('change', renderList);
}

function prefillFromSelection(){
  const selected = localStorage.getItem('klc-selected-customer');
  if(!selected) return;
  const customer = customers.find(c => c.id === selected);
  if(customer){
    document.getElementById('care-date').value = new Date().toISOString().slice(0,10);
    nameInput.value = customer.name;
    phoneInput.value = customer.phone;
    addressInput.value = customer.address || '';
    document.getElementById('care-customer-id').value = customer.id;
  }
  localStorage.removeItem('klc-selected-customer');
}

function syncCustomerByName(){
  const found = customers.find(c => c.name === nameInput.value.trim());
  if(found){
    phoneInput.value = found.phone;
    addressInput.value = found.address || '';
    document.getElementById('care-customer-id').value = found.id;
  }
}

function syncCustomerByPhone(){
  const found = customers.find(c => c.phone === phoneInput.value.trim());
  if(found){
    nameInput.value = found.name;
    addressInput.value = found.address || '';
    document.getElementById('care-customer-id').value = found.id;
  }
}

function handleRatingChange(){
  const value = document.querySelector('input[name="care-rating"]:checked')?.value;
  if(value === 'lost'){
    reasonWrap.classList.remove('hidden');
  }else{
    reasonWrap.classList.add('hidden');
    document.getElementById('care-reason').value = '';
  }
}

function handleSave(){
  if(isStaff){
    toast('Bạn không có quyền thêm dữ liệu mới.', 'error');
    return;
  }
  const date = document.getElementById('care-date').value;
  const name = nameInput.value.trim();
  const phone = phoneInput.value.trim();
  if(!date || !name || !phone){
    toast('Vui lòng nhập ngày, tên và số điện thoại.', 'error');
    return;
  }
  const rating = document.querySelector('input[name="care-rating"]:checked')?.value || '';
  const payload = {
    id: generateId('care'),
    customerId: document.getElementById('care-customer-id').value || null,
    date,
    name,
    phone,
    address: addressInput.value.trim(),
    staff: staffSelect.value,
    method: methodSelect.value,
    content: document.getElementById('care-content').value.trim(),
    feedback: document.getElementById('care-feedback').value.trim(),
    note: document.getElementById('care-note').value.trim(),
    rating,
    reason: document.getElementById('care-reason').value.trim(),
    createdAt: new Date().toISOString()
  };
  showLoading('Đang lưu CSKH…');
  setTimeout(()=>{
    updateSection('careLogs', list => {
      const arr = Array.isArray(list) ? [...list] : [];
      arr.push(payload);
      return arr;
    });
    hideLoading();
    toast('Đã lưu lịch sử CSKH.', 'success');
    resetForm();
    renderList();
  }, 400);
}

function resetForm(){
  form.reset();
  document.getElementById('care-customer-id').value = '';
  handleRatingChange();
}

function renderList(){
  const state = getState();
  const search = searchInput.value.trim().toLowerCase();
  const rating = filterRating.value;
  const staff = filterStaff.value;
  const logs = (state.careLogs || []).filter(item => {
    const matchSearch = !search || [item.name, item.phone, item.content, item.feedback].some(v => v?.toLowerCase().includes(search));
    const matchRating = rating === 'all' || item.rating === rating;
    const matchStaff = staff === 'all' || item.staff === staff;
    return matchSearch && matchRating && matchStaff;
  }).sort((a,b)=> new Date(b.date) - new Date(a.date));

  if(logs.length === 0){
    listEl.innerHTML = '<p class="text-sm text-gray-500">Chưa có dữ liệu CSKH.</p>';
    return;
  }

  listEl.innerHTML = logs.map(item => {
    const badgeMap = {
      potential: '<span class="badge bg-green-100 text-green-600">Khách còn tiềm năng</span>',
      nurturing: '<span class="badge bg-blue-100 text-blue-600">Đang nuôi khách</span>',
      appointment: '<span class="badge bg-brand-gold text-black">Đang hẹn lên</span>',
      lost: '<span class="badge bg-red-100 text-red-600">Hết tiềm năng</span>'
    };
    return `
      <div class="card p-4 space-y-2">
        <div class="flex items-start justify-between">
          <div>
            <div class="font-semibold text-brand-blue">${item.name}</div>
            <div class="text-sm text-gray-500">${formatDate(item.date)} · ${item.phone}</div>
          </div>
          ${badgeMap[item.rating] || ''}
        </div>
        <div class="text-sm text-gray-600 space-y-1">
          <div><b>NV phụ trách:</b> ${item.staff || '—'}</div>
          <div><b>Hình thức:</b> ${item.method}</div>
          <div><b>Nội dung:</b> ${item.content || '—'}</div>
          <div><b>Phản hồi:</b> ${item.feedback || '—'}</div>
          <div><b>Ghi chú:</b> ${item.note || '—'}</div>
          ${item.reason ? `<div><b>Lý do:</b> ${item.reason}</div>` : ''}
        </div>
        <div><button data-detail="${item.id}" class="px-3 py-1.5 text-sm rounded-xl bg-gray-100">Xem chi tiết</button></div>
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('[data-detail]').forEach(btn => btn.addEventListener('click', ()=> showDetail(btn.dataset.detail)));
}

function showDetail(id){
  const state = getState();
  const log = (state.careLogs || []).find(item => item.id === id);
  if(!log) return;
  const content = `
    <p><b>Thời gian:</b> ${formatDate(log.date)}</p>
    <p><b>Khách hàng:</b> ${log.name} (${log.phone})</p>
    <p><b>Địa chỉ:</b> ${log.address || '—'}</p>
    <p><b>Nhân viên:</b> ${log.staff || '—'}</p>
    <p><b>Hình thức:</b> ${log.method}</p>
    <p><b>Nội dung:</b><br>${log.content || '—'}</p>
    <p><b>Phản hồi:</b><br>${log.feedback || '—'}</p>
    <p><b>Đánh giá:</b> ${translateRating(log.rating)}</p>
    ${log.reason ? `<p><b>Lý do:</b> ${log.reason}</p>` : ''}
    <p><b>Ghi chú:</b><br>${log.note || '—'}</p>
  `;
  openModal('Chi tiết chăm sóc khách hàng', content);
}

function translateRating(value){
  switch(value){
    case 'potential': return 'Khách còn tiềm năng';
    case 'nurturing': return 'Đang nuôi khách';
    case 'appointment': return 'Đang hẹn lên';
    case 'lost': return 'Hết tiềm năng';
    default: return 'Chưa đánh giá';
  }
}
