import { initApp } from './core/app.js';
import { appendItem, readCollection, generateId } from './core/storage.js';
import { showLoading, hideLoading, toast, bindSearch } from './core/ui.js';
import { ensurePermission } from './core/auth.js';

const user=initApp('checklist');
let checklists=readCollection('checklists');

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
    Array.from(form.elements).forEach(el=>el.disabled=true);
    document.getElementById('checklist-actions').classList.add('hidden');
    staffHint.classList.remove('hidden');
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
  tableBody.innerHTML=data.map(item=>`<tr class="border-b last:border-b-0">
      <td class="px-3 py-2">${formatDate(item.date)}</td>
      <td class="px-3 py-2 font-semibold">${item.staff}</td>
      <td class="px-3 py-2">${item.shiftLabel}</td>
      <td class="px-3 py-2">${item.summary||'-'}</td>
      <td class="px-3 py-2 text-right"><button class="text-brand-blue" data-id="${item.id}">Xem</button></td>
    </tr>`).join('');
  tableBody.querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>showDetail(btn.dataset.id)));
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
