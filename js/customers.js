import { initApp } from './core/app.js';
import { appendItem, readCollection, generateId, removeItem } from './core/storage.js';
import { showLoading, hideLoading, toast, bindSearch, confirmAction } from './core/ui.js';
import { ensurePermission } from './core/auth.js';
import { getPendingDeletionIds, submitDeletionRequest, resolvePendingByRecord } from './core/deletion.js';

const user=initApp('customers');
let customers=readCollection('customers');
const COLLECTION='customers';

const form=document.getElementById('customer-form');
const sourceSelect=document.getElementById('customer-source');
const sourceDetailWrapper=document.getElementById('source-detail-wrapper');
const purchasedCheckbox=document.getElementById('customer-purchased');
const purchasedFields=document.getElementById('purchased-fields');
const pendingFields=document.getElementById('pending-fields');
const consultedContainer=document.getElementById('consulted-container');
const listContainer=document.getElementById('customer-table-body');
const searchInput=document.getElementById('customer-search');
const staffHint=document.getElementById('staff-view-only');

applyRolePermissions();
renderList(customers);
setupEvents();

function applyRolePermissions(){
  if(user.role==='staff' && staffHint){
    staffHint.classList.remove('hidden');
  }
}

function setupEvents(){
  if(form){
    form.addEventListener('submit',evt=>{
      evt.preventDefault();
      if(!ensurePermission(user,'write')) return;
      const payload=collectFormData();
      showLoading('Đang lưu khách hàng…');
      setTimeout(()=>{
        appendItem('customers',payload);
        customers=readCollection('customers');
        renderList(customers);
        form.reset();
        consultedContainer.innerHTML='';
        addConsultedField();
        purchasedFields.classList.add('hidden');
        pendingFields.classList.remove('hidden');
        updateSourceDetailVisibility();
        hideLoading();
        toast('Đã lưu khách hàng thành công.','success');
      },400);
    });
  }
  const resetBtn=document.getElementById('btn-reset-form');
  if(resetBtn){
    resetBtn.addEventListener('click',()=>{
      if(!ensurePermission(user,'write')) return;
      form.reset();
      consultedContainer.innerHTML='';
      addConsultedField();
      purchasedFields.classList.add('hidden');
      pendingFields.classList.remove('hidden');
      updateSourceDetailVisibility();
    });
  }
  if(sourceSelect){
    sourceSelect.addEventListener('change',updateSourceDetailVisibility);
  }
  if(purchasedCheckbox){
    purchasedCheckbox.addEventListener('change',()=>{
      const purchased=purchasedCheckbox.checked;
      purchasedFields.classList.toggle('hidden',!purchased);
      pendingFields.classList.toggle('hidden',purchased);
    });
  }
  const addConsulted=document.getElementById('btn-add-consulted');
  if(addConsulted){
    addConsulted.addEventListener('click',()=>{
      if(!ensurePermission(user,'write')) return;
      addConsultedField();
    });
  }
  if(searchInput){
    bindSearch(searchInput,value=>{
      const filtered=customers.filter(item=>{
        const keyword=value.toLowerCase();
        return item.name.toLowerCase().includes(keyword)||item.phone.includes(value)||item.sourceLabel.toLowerCase().includes(keyword);
      });
      renderList(filtered);
    });
  }
}

function collectFormData(){
  const formData=new FormData(form);
  const purchased=purchasedCheckbox.checked;
  const consulted=Array.from(consultedContainer.querySelectorAll('input')).map(input=>input.value).filter(Boolean);
  return {
    id:generateId('customer'),
    date:formData.get('date'),
    name:formData.get('name'),
    phone:formData.get('phone'),
    address:formData.get('address'),
    source:formData.get('source'),
    sourceLabel:sourceSelect.options[sourceSelect.selectedIndex]?.text||'',
    sourceDetail:formData.get('sourceDetail')||'',
    purchased,
    purchasedModel:formData.get('purchasedModel')||'',
    purchasedPrice:formData.get('purchasedPrice')||'',
    consultedList:consulted,
    consultedNote:formData.get('consultedNote')||'',
    installment:formData.get('installment')||'',
    notes:formData.get('notes')||''
  };
}

function renderList(data){
  const pendingIds=getPendingDeletionIds(COLLECTION);
  listContainer.innerHTML=data.map(item=>`<tr class="border-b last:border-b-0">
      <td class="px-3 py-2 font-semibold">${item.name}</td>
      <td class="px-3 py-2">${item.phone}</td>
      <td class="px-3 py-2">${formatDate(item.date)}</td>
      <td class="px-3 py-2">${item.sourceLabel}</td>
      <td class="px-3 py-2">${item.purchased?'<span class="badge badge-success">Đã mua</span>':'<span class="badge badge-warning">Chưa mua</span>'}</td>
      <td class="px-3 py-2">
        <div class="flex flex-wrap items-center justify-end gap-2">
          ${pendingIds.has(item.id)?'<span class="badge badge-warning">Chờ duyệt xóa</span>':''}
          <button class="text-brand-blue font-semibold" data-action="view" data-id="${item.id}">Xem lịch sử</button>
          <button class="text-rose-600 font-semibold" data-action="delete" data-id="${item.id}">${user.role==='admin'?'Xóa':'Xóa (gửi duyệt)'}</button>
        </div>
      </td>
    </tr>`).join('');
  listContainer.querySelectorAll('button[data-action="view"]').forEach(btn=>{
    btn.addEventListener('click',()=>showCustomerDetail(btn.dataset.id));
  });
  listContainer.querySelectorAll('button[data-action="delete"]').forEach(btn=>{
    btn.addEventListener('click',()=>handleDelete(btn.dataset.id));
  });
}

function showCustomerDetail(id){
  const modal=document.getElementById('customer-detail');
  const data=customers.find(item=>item.id===id);
  if(!modal||!data) return;
  modal.querySelector('[data-field="name"]').innerText=data.name;
  modal.querySelector('[data-field="phone"]').innerText=data.phone;
  modal.querySelector('[data-field="address"]').innerText=data.address||'-';
  modal.querySelector('[data-field="source"]').innerText=`${data.sourceLabel}${data.sourceDetail?` – ${data.sourceDetail}`:''}`;
  modal.querySelector('[data-field="status"]').innerHTML=data.purchased?'<span class="badge badge-success">Đã mua</span>':'<span class="badge badge-warning">Chưa mua</span>';
  modal.querySelector('[data-field="notes"]').innerText=data.notes||'-';
  const purchasedArea=modal.querySelector('[data-field="purchasedArea"]');
  purchasedArea.innerHTML=data.purchased?`<div>Mẫu ghế: <b>${data.purchasedModel||'-'}</b></div><div>Giá tiền: <b>${data.purchasedPrice||'-'}</b></div>`:'-';
  modal.querySelector('[data-field="consulted"]').innerHTML=data.consultedList?.length?`<ul class="list-disc pl-5">${data.consultedList.map(item=>`<li>${item}</li>`).join('')}</ul>`:'-';
  modal.querySelector('[data-field="installment"]').innerText=data.installment||'-';
  modal.classList.remove('hidden');
}

async function handleDelete(id){
  const record=customers.find(item=>item.id===id);
  if(!record) return;
  if(user.role==='admin'){
    if(!await confirmAction('Bạn chắc chắn muốn xóa khách hàng này?')) return;
    showLoading('Đang xóa khách hàng…');
    setTimeout(()=>{
      removeItem(COLLECTION,id);
      resolvePendingByRecord(COLLECTION,id,'approved','Quản trị viên xóa trực tiếp trong danh sách khách hàng.');
      customers=readCollection(COLLECTION);
      hideLoading();
      toast('Đã xóa khách hàng khỏi hệ thống.','success');
      renderList(customers);
    },300);
    return;
  }
  const pendingSet=getPendingDeletionIds(COLLECTION);
  if(pendingSet.has(id)){
    toast('Đã có yêu cầu xóa đang chờ duyệt cho khách hàng này.','info');
    return;
  }
  const reason=prompt('Nhập lý do xóa khách hàng (gửi quản trị viên duyệt):','');
  if(!reason || !reason.trim()){
    toast('Vui lòng ghi rõ lý do xóa để gửi duyệt.','error');
    return;
  }
  try{
    submitDeletionRequest(COLLECTION,record,user,reason.trim());
    toast('Yêu cầu xóa đã được gửi đến quản trị viên.','success');
    renderList(customers);
  }catch(err){
    toast(err.message||'Không thể gửi yêu cầu xóa.', 'error');
  }
}

const closeModal=document.getElementById('close-detail');
if(closeModal){
  closeModal.addEventListener('click',()=>{
    document.getElementById('customer-detail').classList.add('hidden');
  });
}

function updateSourceDetailVisibility(){
  const value=sourceSelect.value;
  const shouldShow=['online','old_ref','old_repeat','staff_ref','other'].includes(value);
  sourceDetailWrapper.classList.toggle('hidden',!shouldShow);
  const placeholderMap={
    online:'Nhập tên bài viết hoặc kênh',
    old_ref:'Khách cũ nào giới thiệu?',
    old_repeat:'Tên khách cũ quay lại',
    staff_ref:'Nhân viên nào giới thiệu?',
    other:'Nguồn khác cụ thể?'
  };
  const detailInput=document.getElementById('customer-source-detail');
  if(detailInput){
    detailInput.placeholder=placeholderMap[value]||'';
  }
}

function addConsultedField(){
  const wrapper=document.createElement('div');
  wrapper.className='flex gap-3 mb-2';
  wrapper.innerHTML=`<input type="text" class="input-brand flex-1" placeholder="Tên mẫu ghế đã tư vấn" form="customer-form">`;
  consultedContainer.appendChild(wrapper);
}

function formatDate(value){
  if(!value) return '';
  const d=new Date(value);
  if(Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('vi-VN');
}

addConsultedField();
updateSourceDetailVisibility();
