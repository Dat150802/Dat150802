import { mountFrame, toast, showLoading, hideLoading, formatDate, toggleFormDisabled } from '../core/ui.js';
import { getState, updateSection, generateId } from '../core/storage.js';
import { getCurrentUser } from '../core/auth.js';

const SHIFT_TEMPLATES = {
  morning: ['08:00 - 09:00','09:00 - 10:00','10:00 - 11:00','11:00 - 12:00','13:00 - 14:00','14:00 - 15:00','15:00 - 16:00'],
  afternoon: ['13:00 - 14:00','14:00 - 15:00','15:00 - 16:00','16:00 - 17:00','17:00 - 18:00','18:00 - 19:00','19:00 - 20:00','20:00 - 21:00'],
  full: ['08:00 - 09:00','09:00 - 10:00','10:00 - 11:00','11:00 - 12:00','13:00 - 14:00','14:00 - 15:00','15:00 - 16:00','16:00 - 17:00','17:00 - 18:00','18:00 - 19:00','19:00 - 20:00','20:00 - 21:00']
};

const state = getState();
const employees = state.employees || [];
const user = getCurrentUser();
const isStaff = user?.role !== 'admin';

const form = document.getElementById('checklist-form');
const staffSelect = document.getElementById('cl-staff');
const shiftSelect = document.getElementById('cl-shift');
const scheduleInfo = document.getElementById('cl-schedule');
const slotsWrap = document.getElementById('cl-slots');
const listEl = document.getElementById('cl-list');
const searchInput = document.getElementById('cl-search');
const filterShift = document.getElementById('cl-filter-shift');
const filterStaff = document.getElementById('cl-filter-staff');

mountFrame('checklist');
if(form && isStaff){
  toggleFormDisabled(form, true);
}

populateEmployees();
shiftSelect.addEventListener('change', ()=>{
  updateSchedule();
  resetSlots();
});
updateSchedule();
resetSlots();

bindEvents();
renderList();

function populateEmployees(){
  staffSelect.innerHTML = employees.map(name => `<option value="${name}">${name}</option>`).join('');
  filterStaff.innerHTML = '<option value="all">Mọi nhân viên</option>' + employees.map(name => `<option value="${name}">${name}</option>`).join('');
}

function updateSchedule(){
  const shift = shiftSelect.value;
  const ranges = SHIFT_TEMPLATES[shift] || [];
  scheduleInfo.textContent = ranges.join(' · ');
}

function resetSlots(){
  slotsWrap.innerHTML = '';
  const shift = shiftSelect.value;
  (SHIFT_TEMPLATES[shift] || []).forEach(time => createSlot({ time }));
}

function createSlot(data={}){
  const slot = document.createElement('div');
  slot.className = 'border rounded-xl p-3 bg-gray-50 relative';
  slot.dataset.slot = 'true';
  slot.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-2">
      <label class="text-xs text-gray-500">Khung giờ
        <input data-slot-time class="mt-1 px-3 py-2 border rounded w-full" value="${data.time||''}" ${isStaff?'disabled':''}>
      </label>
      <label class="text-xs text-gray-500">Công việc
        <textarea data-slot-task class="mt-1 px-3 py-2 border rounded w-full" rows="2" ${isStaff?'disabled':''}>${data.task||''}</textarea>
      </label>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
      <label class="text-xs text-gray-500">Kết quả/Ghi chú
        <textarea data-slot-result class="mt-1 px-3 py-2 border rounded w-full" rows="2" ${isStaff?'disabled':''}>${data.result||''}</textarea>
      </label>
      <label class="flex items-center gap-2 text-sm mt-2 md:mt-6">
        <input type="checkbox" data-slot-done ${data.done?'checked':''} ${isStaff?'disabled':''}> Hoàn thành
      </label>
    </div>
    ${isStaff ? '' : '<button type="button" data-slot-remove class="absolute -top-3 -right-3 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center">&times;</button>'}
  `;
  if(!isStaff){
    slot.querySelector('[data-slot-remove]').addEventListener('click', ()=> slot.remove());
  }
  slotsWrap.appendChild(slot);
}

function bindEvents(){
  document.getElementById('cl-add-slot').addEventListener('click', ()=>{
    if(isStaff){
      toast('Bạn không có quyền chỉnh sửa.', 'error');
      return;
    }
    createSlot({ time: '' });
  });
  document.getElementById('btn-cl-save').addEventListener('click', handleSave);
  document.getElementById('btn-cl-reset').addEventListener('click', ()=>{
    form.reset();
    updateSchedule();
    resetSlots();
  });
  searchInput.addEventListener('input', renderList);
  filterShift.addEventListener('change', renderList);
  filterStaff.addEventListener('change', renderList);
}

function handleSave(){
  if(isStaff){
    toast('Bạn không có quyền thêm dữ liệu mới.', 'error');
    return;
  }
  const date = document.getElementById('cl-date').value;
  const staff = staffSelect.value;
  if(!date || !staff){
    toast('Vui lòng chọn ngày và nhân viên.', 'error');
    return;
  }
  const payload = {
    id: generateId('cl'),
    date,
    staff,
    shift: shiftSelect.value,
    summary: document.getElementById('cl-summary').value.trim(),
    pending: document.getElementById('cl-pending').value.trim(),
    expected: document.getElementById('cl-expected').value.trim(),
    managerNote: document.getElementById('cl-manager-note').value.trim(),
    slots: [...slotsWrap.querySelectorAll('[data-slot="true"]')].map(slot => ({
      time: slot.querySelector('[data-slot-time]').value,
      task: slot.querySelector('[data-slot-task]').value,
      result: slot.querySelector('[data-slot-result]').value,
      done: slot.querySelector('[data-slot-done]').checked
    })),
    createdAt: new Date().toISOString()
  };
  showLoading('Đang lưu checklist…');
  setTimeout(()=>{
    updateSection('checklist', list => {
      const arr = Array.isArray(list) ? [...list] : [];
      arr.push(payload);
      return arr;
    });
    hideLoading();
    toast('Đã lưu checklist.', 'success');
    form.reset();
    updateSchedule();
    resetSlots();
    renderList();
  }, 400);
}

function renderList(){
  const state = getState();
  const search = searchInput.value.trim().toLowerCase();
  const shift = filterShift.value;
  const staff = filterStaff.value;
  const data = (state.checklist || []).filter(item => {
    const matchSearch = !search || [item.staff, item.summary, item.pending, item.managerNote].some(v => v?.toLowerCase().includes(search)) || item.date?.includes(search);
    const matchShift = shift === 'all' || item.shift === shift;
    const matchStaff = staff === 'all' || item.staff === staff;
    return matchSearch && matchShift && matchStaff;
  }).sort((a,b)=> new Date(b.date) - new Date(a.date));

  if(data.length === 0){
    listEl.innerHTML = '<p class="text-sm text-gray-500">Chưa có dữ liệu.</p>';
    return;
  }

  listEl.innerHTML = data.map(item => `
    <div class="card p-4 space-y-3">
      <div class="flex items-start justify-between">
        <div>
          <div class="font-semibold text-brand-blue">${item.staff}</div>
          <div class="text-sm text-gray-500">${formatDate(item.date)} · ${translateShift(item.shift)}</div>
        </div>
        <span class="badge">${item.slots.filter(s => s.done).length}/${item.slots.length} hoàn thành</span>
      </div>
      <div class="space-y-1 text-sm text-gray-600">
        <div><b>Tổng kết:</b> ${item.summary || '—'}</div>
        <div><b>Chưa hoàn thành:</b> ${item.pending || '—'}</div>
        <div><b>Dự kiến hoàn thành:</b> ${item.expected || '—'}</div>
        <div><b>Ghi chú quản lý:</b> ${item.managerNote || '—'}</div>
      </div>
      <div class="bg-gray-50 border rounded-xl p-3 text-xs text-gray-600 space-y-2">
        ${item.slots.map(slot => `<div><span class="font-semibold text-brand-blue">${slot.time || 'Khung giờ'}</span>: ${slot.task || '—'}<br><span class="text-[11px] text-gray-500">${slot.result || ''} ${slot.done ? '· Hoàn thành' : ''}</span></div>`).join('')}
      </div>
    </div>
  `).join('');
}

function translateShift(shift){
  switch(shift){
    case 'morning': return 'Ca sáng';
    case 'afternoon': return 'Ca chiều';
    case 'full': return 'Ca full';
    default: return shift;
  }
}
