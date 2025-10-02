import { initApp } from './core/app.js';
import { appendItem, readCollection, generateId } from './core/storage.js';
import { showLoading, hideLoading, toast, bindSearch } from './core/ui.js';
import { ensurePermission } from './core/auth.js';

const user=initApp('care');
let careRecords=readCollection('care');
const customers=readCollection('customers');

const form=document.getElementById('care-form');
const staffHint=document.getElementById('care-staff-view');
const tableBody=document.getElementById('care-table-body');
const searchInput=document.getElementById('care-search');
const ratingRadios=document.querySelectorAll('input[name="careRating"]');
const ratingReason=document.getElementById('rating-reason-row');

applyRolePermissions();
renderCareTable(careRecords);
setupFormOptions();
setupEvents();

function applyRolePermissions(){
  if(user.role==='staff'){
    Array.from(form.elements).forEach(el=>el.disabled=true);
    document.getElementById('care-form-actions').classList.add('hidden');
    staffHint.classList.remove('hidden');
  }
}

function setupFormOptions(){
  const customerNames=document.getElementById('customers-name-list');
  const customerPhones=document.getElementById('customers-phone-list');
  if(customerNames){
    customerNames.innerHTML=customers.map(c=>`<option value="${c.name}"></option>`).join('');
  }
  if(customerPhones){
    customerPhones.innerHTML=customers.map(c=>`<option value="${c.phone}"></option>`).join('');
  }
}

function setupEvents(){
  if(form){
    form.addEventListener('submit',evt=>{
      evt.preventDefault();
      if(!ensurePermission(user,'write')) return;
      const payload=collectFormData();
      showLoading('Đang lưu chăm sóc khách hàng…');
      setTimeout(()=>{
        appendItem('care',payload);
        careRecords=readCollection('care');
        renderCareTable(careRecords);
        form.reset();
        toggleRatingReason();
        hideLoading();
        toast('Đã lưu lịch sử CSKH.','success');
      },400);
    });
  }
  const resetBtn=document.getElementById('care-reset');
  if(resetBtn){
    resetBtn.addEventListener('click',()=>{
      if(!ensurePermission(user,'write')) return;
      form.reset();
      toggleRatingReason();
    });
  }
  ratingRadios.forEach(radio=>radio.addEventListener('change',toggleRatingReason));
  if(searchInput){
    bindSearch(searchInput,value=>{
      const keyword=value.toLowerCase();
      const filtered=careRecords.filter(item=>
        item.name.toLowerCase().includes(keyword) ||
        item.phone.includes(value) ||
        item.staff.toLowerCase().includes(keyword) ||
        item.ratingLabel.toLowerCase().includes(keyword)
      );
      renderCareTable(filtered);
    });
  }
}

function toggleRatingReason(){
  const selected=document.querySelector('input[name="careRating"]:checked');
  ratingReason.classList.toggle('hidden',!(selected && selected.value==='lost'));
}

toggleRatingReason();

function collectFormData(){
  const formData=new FormData(form);
  const rating=formData.get('careRating');
  const ratingLabel={ potential:'Khách còn tiềm năng', nurturing:'Đang nuôi khách', appointment:'Đang hẹn lên', lost:'Hết tiềm năng' }[rating]||'';
  return {
    id:generateId('care'),
    date:formData.get('date'),
    name:formData.get('name'),
    phone:formData.get('phone'),
    address:formData.get('address'),
    staff:formData.get('staff'),
    channel:formData.get('channel'),
    content:formData.get('content'),
    feedback:formData.get('feedback'),
    note:formData.get('note'),
    rating,
    ratingLabel,
    ratingReason:formData.get('ratingReason')||''
  };
}

function renderCareTable(data){
  tableBody.innerHTML=data.map(item=>`<tr class="border-b last:border-b-0">
      <td class="px-3 py-2">${formatDate(item.date)}</td>
      <td class="px-3 py-2 font-semibold">${item.name}</td>
      <td class="px-3 py-2">${item.phone}</td>
      <td class="px-3 py-2">${item.staff}</td>
      <td class="px-3 py-2">${item.channel}</td>
      <td class="px-3 py-2">${item.ratingLabel}</td>
      <td class="px-3 py-2 text-right"><button class="text-brand-blue" data-id="${item.id}" data-action="view">Chi tiết</button></td>
    </tr>`).join('');
  tableBody.querySelectorAll('button[data-action="view"]').forEach(btn=>{
    btn.addEventListener('click',()=>showCareDetail(btn.dataset.id));
  });
}

function showCareDetail(id){
  const record=careRecords.find(item=>item.id===id);
  const modal=document.getElementById('care-detail');
  if(!record||!modal) return;
  modal.querySelector('[data-field="name"]').innerText=record.name;
  modal.querySelector('[data-field="phone"]').innerText=record.phone;
  modal.querySelector('[data-field="date"]').innerText=formatDate(record.date);
  modal.querySelector('[data-field="staff"]').innerText=record.staff;
  modal.querySelector('[data-field="channel"]').innerText=record.channel;
  modal.querySelector('[data-field="content"]').innerText=record.content||'-';
  modal.querySelector('[data-field="feedback"]').innerText=record.feedback||'-';
  modal.querySelector('[data-field="note"]').innerText=record.note||'-';
  modal.querySelector('[data-field="rating"]').innerText=record.ratingLabel;
  modal.querySelector('[data-field="reason"]').innerText=record.rating==='lost'?(record.ratingReason||'-'):'-';
  modal.classList.remove('hidden');
}

const closeModal=document.getElementById('care-detail-close');
if(closeModal){
  closeModal.addEventListener('click',()=>document.getElementById('care-detail').classList.add('hidden'));
}

function formatDate(value){
  if(!value) return '';
  const d=new Date(value);
  if(Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('vi-VN');
}
