import { initApp } from './core/app.js';
import { appendItem, readCollection, generateId, removeItem } from './core/storage.js';
import { showLoading, hideLoading, toast, bindSearch, confirmAction } from './core/ui.js';
import { ensurePermission } from './core/auth.js';
import { getPendingDeletionIds, submitDeletionRequest, resolvePendingByRecord } from './core/deletion.js';

const user=initApp('checklist');
let checklists=readCollection('checklists');
const COLLECTION='checklists';

const form=document.getElementById('checklist-form');
const staffHint=document.getElementById('checklist-staff-view');
const shiftSelect=document.getElementById('checklist-shift');
const slotContainer=document.getElementById('task-slots');
const tableBody=document.getElementById('checklist-table-body');
const searchInput=document.getElementById('checklist-search');

applyRolePermissions();
renderTable(checklists);
setupEvents();
updateSlots();

function applyRolePermissions(){
  if(user.role==='staff'){
    staffHint?.classList.remove('hidden');
  }
}

function setupEvents(){
  shiftSelect.addEventListener('change',updateSlots);
  form.addEventListener('submit',evt=>{
    evt.preventDefault();
    if(!ensurePermission(user,'write')) return;
    const payload=collectFormData();
    showLoading('Đang lưu checklist công việc…');
    setTimeout(()=>{
      appendItem('checklists',payload);
      checklists=readCollection('checklists');
      renderTable(checklists);
      form.reset();
      updateSlots();
      hideLoading();
      toast('Đã lưu checklist.','success');
    },400);
  });
  const resetBtn=document.getElementById('checklist-reset');
  if(resetBtn){
    resetBtn.addEventListener('click',()=>{
      if(!ensurePermission(user,'write')) return;
      form.reset();
      updateSlots();
    });
  }
  if(searchInput){
    bindSearch(searchInput,value=>{
      const keyword=value.toLowerCase();
      const filtered=checklists.filter(item=>
        item.staff.toLowerCase().includes(keyword)||
        item.shiftLabel.toLowerCase().includes(keyword)||
        item.date.includes(value)
      );
      renderTable(filtered);
    });
  }
}

function collectFormData(){
  const formData=new FormData(form);
  const tasks=Array.from(slotContainer.querySelectorAll('input[data-time]')).map(input=>({
    time:input.dataset.time,
    job:input.value
  }));
  return {
    id:generateId('checklist'),
    date:formData.get('date'),
    staff:formData.get('staff'),
    shift:formData.get('shift'),
    shiftLabel:shiftSelect.options[shiftSelect.selectedIndex]?.text||'',
    tasks,
    summary:formData.get('summary'),
    pendingReason:formData.get('pendingReason'),
    schedule:formData.get('schedule'),
    managerNote:formData.get('managerNote')
  };
}

function renderTable(data){
  const pendingIds=getPendingDeletionIds(COLLECTION);
  tableBody.innerHTML=data.map(item=>`<tr class="border-b last:border-b-0">
      <td class="px-3 py-2">${formatDate(item.date)}</td>
      <td class="px-3 py-2 font-semibold">${item.staff}</td>
      <td class="px-3 py-2">${item.shiftLabel}</td>
      <td class="px-3 py-2">${item.summary||'-'}</td>
      <td class="px-3 py-2 text-right">
        <div class="flex flex-wrap items-center justify-end gap-2">
          ${pendingIds.has(item.id)?'<span class="badge badge-warning">Chờ duyệt xóa</span>':''}
          <button class="text-brand-blue" data-action="view" data-id="${item.id}">Xem</button>
          <button class="text-rose-600" data-action="delete" data-id="${item.id}">${user.role==='admin'?'Xóa':'Xóa (gửi duyệt)'}</button>
        </div>
      </td>
    </tr>`).join('');
  tableBody.querySelectorAll('button[data-action="view"]').forEach(btn=>btn.addEventListener('click',()=>showDetail(btn.dataset.id)));
  tableBody.querySelectorAll('button[data-action="delete"]').forEach(btn=>btn.addEventListener('click',()=>handleDelete(btn.dataset.id)));
}

function showDetail(id){
  const record=checklists.find(item=>item.id===id);
  const modal=document.getElementById('checklist-detail');
  if(!record||!modal) return;
  modal.querySelector('[data-field="date"]').innerText=formatDate(record.date);
  modal.querySelector('[data-field="staff"]').innerText=record.staff;
  modal.querySelector('[data-field="shift"]').innerText=record.shiftLabel;
  modal.querySelector('[data-field="summary"]').innerText=record.summary||'-';
  modal.querySelector('[data-field="pendingReason"]').innerText=record.pendingReason||'-';
  modal.querySelector('[data-field="schedule"]').innerText=record.schedule||'-';
  modal.querySelector('[data-field="managerNote"]').innerText=record.managerNote||'-';
  modal.querySelector('[data-field="tasks"]').innerHTML=`<ul class="list-disc pl-5 space-y-1">${record.tasks.map(task=>`<li><b>${task.time}:</b> ${task.job||'-'}</li>`).join('')}</ul>`;
  modal.classList.remove('hidden');
}

const closeModal=document.getElementById('checklist-detail-close');
if(closeModal){
  closeModal.addEventListener('click',()=>document.getElementById('checklist-detail').classList.add('hidden'));
}

function updateSlots(){
  const shift=shiftSelect.value;
  const slotMap={
    morning:{ start:8, end:16 },
    afternoon:{ start:13, end:21 },
    full:{ start:8, end:21 }
  };
  const config=slotMap[shift]||slotMap.morning;
  const slots=[];
  for(let h=config.start; h<config.end; h++){
    slots.push(`${String(h).padStart(2,'0')}:00`);
  }
  slotContainer.innerHTML=slots.map(time=>`<div class="flex items-center gap-3">
      <label class="w-24 text-sm text-slate-500">${time}</label>
      <input class="input-brand flex-1" data-time="${time}" placeholder="Công việc cần làm">
    </div>`).join('');
}

function formatDate(value){
  if(!value) return '';
  const d=new Date(value);
  if(Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('vi-VN');
}

async function handleDelete(id){
  const record=checklists.find(item=>item.id===id);
  if(!record) return;
  if(user.role==='admin'){
    if(!await confirmAction('Bạn chắc chắn muốn xóa checklist này?')) return;
    showLoading('Đang xóa checklist…');
    setTimeout(()=>{
      removeItem(COLLECTION,id);
      resolvePendingByRecord(COLLECTION,id,'approved','Quản trị viên xóa trực tiếp checklist.');
      checklists=readCollection(COLLECTION);
      renderTable(checklists);
      hideLoading();
      toast('Đã xóa checklist.','success');
    },300);
    return;
  }
  const pendingIds=getPendingDeletionIds(COLLECTION);
  if(pendingIds.has(id)){
    toast('Đã có yêu cầu xóa chờ duyệt cho checklist này.','info');
    return;
  }
  const reason=prompt('Nhập lý do xóa checklist (gửi quản trị viên duyệt):','');
  if(!reason || !reason.trim()){
    toast('Vui lòng ghi rõ lý do xóa để gửi duyệt.','error');
    return;
  }
  try{
    submitDeletionRequest(COLLECTION,record,user,reason.trim());
    toast('Đã gửi yêu cầu xóa checklist đến quản trị viên.','success');
    renderTable(checklists);
  }catch(err){
    toast(err.message||'Không thể gửi yêu cầu xóa.','error');
  }
}
