import { initApp } from './core/app.js';
import {
  appendItem,
  readCollection,
  generateId,
  removeItem,
  updateItem,
  subscribeCollection
} from './core/storage.js';
import { showLoading, hideLoading, toast, bindSearch, confirmAction } from './core/ui.js';
import { ensurePermission } from './core/auth.js';
import { getPendingDeletionIds, submitDeletionRequest, resolvePendingByRecord } from './core/deletion.js';

const user=initApp('customers');
let customers=readCollection('customers');
let careRecords=readCollection('care');
const processedMeta=new Set();
let currentFilter='';

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
const activityContainer=document.getElementById('customer-activity');
const detailModal=document.getElementById('customer-detail');
const timelineContainer=document.getElementById('customer-timeline');
const statusContainer=document.getElementById('detail-status-flags');
const careForm=document.getElementById('detail-care-form');
const appointmentForm=document.getElementById('detail-appointment-form');
const declineForm=document.getElementById('detail-decline-form');
const elsewhereForm=document.getElementById('detail-elsewhere-form');

applyRolePermissions();
customers.forEach(ensureMetaExists);
renderFormDefaults();
applyFilter();
setupEvents();
renderActivity(filterCustomers(currentFilter));

subscribeCollection('customers',data=>{
  customers=data;
  customers.forEach(ensureMetaExists);
  applyFilter();
  refreshDetailModal();
});

subscribeCollection('care',data=>{
  careRecords=data;
  applyFilter();
  refreshDetailModal();
});

function applyRolePermissions(){
  if(user.role==='staff' && staffHint){
    staffHint.classList.remove('hidden');
  }
}

function renderFormDefaults(){
  if(!consultedContainer) return;
  consultedContainer.innerHTML='';
  addConsultedField();
  updateSourceDetailVisibility();
  purchasedFields?.classList.add('hidden');
  pendingFields?.classList.remove('hidden');
}

function setupEvents(){
  if(form){
    form.addEventListener('submit',evt=>{
      evt.preventDefault();
      if(!ensurePermission(user,'write')) return;
      const payload=collectFormData();
      showLoading('Đang lưu khách hàng…');
      setTimeout(()=>{
        appendItem(COLLECTION,payload);
        form.reset();
        renderFormDefaults();
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
      renderFormDefaults();
    });
  }
  if(sourceSelect){
    sourceSelect.addEventListener('change',updateSourceDetailVisibility);
  }
  if(purchasedCheckbox){
    purchasedCheckbox.addEventListener('change',()=>{
      const purchased=purchasedCheckbox.checked;
      purchasedFields?.classList.toggle('hidden',!purchased);
      pendingFields?.classList.toggle('hidden',purchased);
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
      currentFilter=value.trim();
      applyFilter();
    });
  }
  const closeModal=document.getElementById('close-detail');
  if(closeModal){
    closeModal.addEventListener('click',()=>{
      detailModal?.classList.add('hidden');
      if(detailModal) detailModal.dataset.id='';
      hideQuickForms();
    });
  }
  if(detailModal){
    detailModal.querySelectorAll('[data-dismiss]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const target=btn.dataset.dismiss;
        toggleQuickForm(target,false);
      });
    });
  }
  document.getElementById('detail-action-care')?.addEventListener('click',()=>toggleQuickForm('care',true));
  document.getElementById('detail-action-appointment')?.addEventListener('click',()=>toggleQuickForm('appointment',true));
  document.getElementById('detail-action-decline')?.addEventListener('click',()=>toggleQuickForm('decline',true));
  document.getElementById('detail-action-elsewhere')?.addEventListener('click',()=>toggleQuickForm('elsewhere',true));
  document.getElementById('detail-care-save')?.addEventListener('click',handleQuickCareSave);
  document.getElementById('detail-appointment-save')?.addEventListener('click',handleAppointmentSave);
  document.getElementById('detail-decline-save')?.addEventListener('click',()=>handleStatusNoteSave('decline','Khách từ chối mua',document.getElementById('detail-decline-note')?.value));
  document.getElementById('detail-elsewhere-save')?.addEventListener('click',()=>handleStatusNoteSave('elsewhere','Khách đã mua nơi khác',document.getElementById('detail-elsewhere-note')?.value));
}

function collectFormData(){
  const formData=new FormData(form);
  const purchased=purchasedCheckbox.checked;
  const consulted=Array.from(consultedContainer.querySelectorAll('input')).map(input=>input.value).filter(Boolean);
  const now=new Date().toISOString();
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
    notes:formData.get('notes')||'',
    meta:{
      createdAt:now,
      statuses:{},
      history:[{
        id:generateId('history'),
        type:'create',
        title:'Tạo khách hàng',
        description:'Khởi tạo hồ sơ khách hàng.',
        at:now
      }]
    }
  };
}

function applyFilter(){
  const filtered=filterCustomers(currentFilter);
  renderList(filtered);
  renderActivity(filtered);
}

function filterCustomers(keyword){
  if(!keyword) return customers.slice();
  const key=keyword.toLowerCase();
  return customers.filter(item=>{
    return (
      item.name?.toLowerCase().includes(key) ||
      item.phone?.toLowerCase().includes(key) ||
      item.sourceLabel?.toLowerCase().includes(key) ||
      item.sourceDetail?.toLowerCase().includes(key)
    );
  });
}

function renderList(data){
  const pendingIds=getPendingDeletionIds(COLLECTION);
  listContainer.innerHTML=data.map(item=>{
    const statusInfo=getStatusInfo(item);
    return `<tr class="border-b last:border-b-0">
      <td class="px-3 py-2 font-semibold">${item.name}</td>
      <td class="px-3 py-2">${item.phone}</td>
      <td class="px-3 py-2">${formatDate(item.date)}</td>
      <td class="px-3 py-2">${item.sourceLabel}</td>
      <td class="px-3 py-2">
        <div class="flex flex-col items-start gap-1">
          ${statusInfo.badge}
          ${statusInfo.note?`<span class="text-xs text-slate-500">${statusInfo.note}</span>`:''}
        </div>
      </td>
      <td class="px-3 py-2">
        <div class="flex flex-wrap items-center justify-end gap-2">
          ${pendingIds.has(item.id)?'<span class="badge badge-warning">Chờ duyệt xóa</span>':''}
          <button class="text-brand-blue font-semibold" data-action="view" data-id="${item.id}">Chi tiết</button>
          <button class="text-rose-600 font-semibold" data-action="delete" data-id="${item.id}">${user.role==='admin'?'Xóa':'Xóa (gửi duyệt)'}</button>
        </div>
      </td>
    </tr>`;
  }).join('');
  listContainer.querySelectorAll('button[data-action="view"]').forEach(btn=>btn.addEventListener('click',()=>showCustomerDetail(btn.dataset.id)));
  listContainer.querySelectorAll('button[data-action="delete"]').forEach(btn=>btn.addEventListener('click',()=>handleDelete(btn.dataset.id)));
}

function showCustomerDetail(id){
  const record=customers.find(item=>item.id===id);
  if(!record) return;
  ensureMetaExists(record);
  renderCustomerDetail(record);
  detailModal.dataset.id=id;
  detailModal.classList.remove('hidden');
}

function renderCustomerDetail(record){
  const meta=getMeta(record);
  detailModal.querySelector('[data-field="name"]').innerText=record.name;
  detailModal.querySelector('[data-field="phone"]').innerText=record.phone;
  detailModal.querySelector('[data-field="address"]').innerText=record.address||'-';
  detailModal.querySelector('[data-field="source"]').innerText=`${record.sourceLabel}${record.sourceDetail?` – ${record.sourceDetail}`:''}`;
  detailModal.querySelector('[data-field="status"]').innerHTML=getStatusInfo(record).badge;
  detailModal.querySelector('[data-field="notes"]').innerText=record.notes||'-';
  const purchasedArea=detailModal.querySelector('[data-field="purchasedArea"]');
  purchasedArea.innerHTML=record.purchased?`<div>Mẫu ghế: <b>${record.purchasedModel||'-'}</b></div><div>Giá tiền: <b>${record.purchasedPrice||'-'}</b></div>`:'-';
  detailModal.querySelector('[data-field="consulted"]').innerHTML=record.consultedList?.length?`<ul class="list-disc pl-5">${record.consultedList.map(item=>`<li>${item}</li>`).join('')}</ul>`:'-';
  detailModal.querySelector('[data-field="installment"]').innerText=record.installment||'-';
  renderStatusFlags(meta,record);
  renderCustomerTimeline(record);
  hideQuickForms();
}

function renderStatusFlags(meta,record){
  if(!statusContainer) return;
  const statuses=meta.statuses||{};
  const items=[];
  if(statuses.appointment){
    items.push(`<div class="px-3 py-2 rounded-xl bg-blue-50 border border-blue-200">
      <div class="text-xs text-slate-500">Đang hẹn khách lên</div>
      <div class="font-semibold text-brand-blue">${formatDateTime(statuses.appointment.dateTime)}</div>
      ${statuses.appointment.note?`<div class="text-xs text-slate-500 mt-1">${statuses.appointment.note}</div>`:''}
    </div>`);
  }
  if(statuses.decline){
    items.push(`<div class="px-3 py-2 rounded-xl bg-rose-50 border border-rose-200">
      <div class="text-xs text-slate-500">Khách từ chối mua</div>
      <div class="font-semibold text-rose-600">${formatDate(statuses.decline.at)}</div>
      ${statuses.decline.note?`<div class="text-xs text-slate-500 mt-1">${statuses.decline.note}</div>`:''}
    </div>`);
  }
  if(statuses.elsewhere){
    items.push(`<div class="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">
      <div class="text-xs text-slate-500">Khách đã mua nơi khác</div>
      <div class="font-semibold text-slate-600">${formatDate(statuses.elsewhere.at)}</div>
      ${statuses.elsewhere.note?`<div class="text-xs text-slate-500 mt-1">${statuses.elsewhere.note}</div>`:''}
    </div>`);
  }
  if(!items.length){
    items.push('<div class="text-sm text-slate-500">Chưa có cập nhật trạng thái đặc biệt.</div>');
  }
  statusContainer.innerHTML=items.join('');
}

function renderCustomerTimeline(record){
  if(!timelineContainer) return;
  const events=buildCustomerEvents(record);
  if(!events.length){
    timelineContainer.innerHTML='<div class="text-sm text-slate-500">Chưa có hoạt động nào.</div>';
    return;
  }
  timelineContainer.innerHTML=events.map(event=>`
    <div class="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
      <div class="flex items-center justify-between text-xs text-slate-500">
        <span>${formatDateTime(event.at)}</span>
        <span>${event.badge||''}</span>
      </div>
      <div class="font-semibold text-brand-blue mt-1">${event.title}</div>
      ${event.description?`<div class="text-sm text-slate-600 mt-1">${event.description}</div>`:''}
      ${event.meta?`<div class="text-xs text-slate-500 mt-2">${event.meta}</div>`:''}
    </div>
  `).join('');
}

function renderActivity(filteredCustomers){
  if(!activityContainer) return;
  const events=[];
  filteredCustomers.forEach(customer=>{
    buildCustomerEvents(customer).forEach(evt=>{
      events.push({ ...evt, customerName:customer.name, phone:customer.phone });
    });
  });
  events.sort((a,b)=>new Date(b.at)-new Date(a.at));
  if(!events.length){
    activityContainer.innerHTML='<div class="text-sm text-slate-500">Chưa có hoạt động nào trong bộ lọc hiện tại.</div>';
    return;
  }
  activityContainer.innerHTML=events.slice(0,80).map(event=>`
    <div class="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
      <div class="flex items-center justify-between text-xs text-slate-500">
        <span>${formatDateTime(event.at)}</span>
        <span>${event.badge||''}</span>
      </div>
      <div class="font-semibold text-brand-blue mt-1">${event.customerName}</div>
      <div class="text-sm text-slate-600">${event.title}</div>
      ${event.description?`<div class="text-xs text-slate-500 mt-1">${event.description}</div>`:''}
      ${event.meta?`<div class="text-xs text-slate-500 mt-1">${event.meta}</div>`:''}
    </div>
  `).join('');
}

function buildCustomerEvents(customer){
  const meta=getMeta(customer);
  const events=[];
  meta.history.forEach(entry=>{
    events.push({
      id:entry.id,
      at:entry.at||meta.createdAt,
      title:entry.title||'Cập nhật',
      description:entry.description||'',
      badge:getHistoryBadge(entry),
      meta:entry.detail||''
    });
  });
  const relatedCare=getRelatedCare(customer);
  relatedCare.forEach(care=>{
    events.push({
      id:care.id,
      at:care.loggedAt||composeDateTime(care.date),
      title:`CSKH – ${care.ratingLabel||'Cập nhật'}`,
      description:care.content||care.note||'',
      badge:`<span class="badge badge-info">${care.staff||'CSKH'}</span>`,
      meta:care.channel?`Hình thức: ${care.channel}`:''
    });
  });
  events.sort((a,b)=>new Date(b.at)-new Date(a.at));
  return events;
}

function getHistoryBadge(entry){
  if(entry.type==='create') return '<span class="badge badge-info">Khởi tạo</span>';
  if(entry.type==='status' && entry.status){
    const map={
      appointment:'badge-info',
      decline:'badge-danger',
      elsewhere:'badge-warning'
    };
    const label={
      appointment:'Hẹn khách',
      decline:'Từ chối',
      elsewhere:'Mua nơi khác'
    };
    const variant=map[entry.status]||'badge-info';
    return `<span class="badge ${variant}">${label[entry.status]||'Trạng thái'}</span>`;
  }
  if(entry.type==='note') return '<span class="badge badge-warning">Ghi chú</span>';
  return '';
}

function getRelatedCare(customer){
  const keyPhone=customer.phone?.replace(/\D/g,'');
  return careRecords.filter(item=>{
    if(item.customerId && item.customerId===customer.id) return true;
    if(!keyPhone) return false;
    return item.phone?.replace(/\D/g,'')===keyPhone;
  }).map(item=>({ ...item }));
}

function handleQuickCareSave(){
  if(!ensurePermission(user,'write')) return;
  const note=document.getElementById('detail-care-note')?.value.trim();
  if(!note){
    toast('Vui lòng ghi nội dung CSKH nhanh.','error');
    return;
  }
  const id=detailModal.dataset.id;
  const record=customers.find(item=>item.id===id);
  if(!record) return;
  const now=new Date().toISOString();
  const payload={
    id:generateId('care'),
    date:new Date().toISOString().slice(0,10),
    name:record.name,
    phone:record.phone,
    address:record.address,
    staff:user.name,
    channel:'Ghi chú nhanh',
    content:note,
    feedback:'',
    note:'',
    rating:'nurturing',
    ratingLabel:'Đang nuôi khách',
    ratingReason:'',
    customerId:record.id,
    loggedAt:now
  };
  appendItem('care',payload);
  addHistoryEntry(record.id,{
    type:'note',
    title:'Bổ sung CSKH',
    description:note,
    at:now,
    detail:`Người cập nhật: ${user.name}`
  });
  document.getElementById('detail-care-note').value='';
  toggleQuickForm('care',false);
  toast('Đã ghi nhận CSKH nhanh.','success');
}

function handleAppointmentSave(){
  if(!ensurePermission(user,'write')) return;
  const id=detailModal.dataset.id;
  const record=customers.find(item=>item.id===id);
  if(!record) return;
  const timeInput=document.getElementById('detail-appointment-time');
  const noteInput=document.getElementById('detail-appointment-note');
  const dateTime=timeInput?.value;
  if(!dateTime){
    toast('Vui lòng chọn thời gian hẹn.','error');
    return;
  }
  const note=noteInput?.value||'';
  const at=new Date().toISOString();
  updateCustomerStatus(record.id,'appointment',{ dateTime, note, at });
  addHistoryEntry(record.id,{
    type:'status',
    status:'appointment',
    title:'Thiết lập lịch hẹn',
    description:note?note:'Đã đặt lịch hẹn khách lên showroom.',
    at,
    detail:`Thời gian: ${formatDateTime(dateTime)}`
  });
  toggleQuickForm('appointment',false);
  toast('Đã lưu lịch hẹn cho khách hàng.','success');
}

function handleStatusNoteSave(statusKey,title,message){
  if(!ensurePermission(user,'write')) return;
  const id=detailModal.dataset.id;
  const record=customers.find(item=>item.id===id);
  if(!record) return;
  const note=message?.trim();
  const at=new Date().toISOString();
  updateCustomerStatus(record.id,statusKey,{ note, at });
  addHistoryEntry(record.id,{
    type:'status',
    status:statusKey,
    title,
    description:note||'',
    at
  });
  toggleQuickForm(statusKey,false);
  if(statusKey==='decline'){ const input=document.getElementById('detail-decline-note'); if(input) input.value=''; }
  if(statusKey==='elsewhere'){ const input=document.getElementById('detail-elsewhere-note'); if(input) input.value=''; }
  toast('Đã cập nhật trạng thái khách hàng.','success');
}

function updateCustomerStatus(customerId,statusKey,payload){
  updateItem(COLLECTION,customerId,record=>{
    const meta=ensureMetaStructure(record);
    const statuses={ ...meta.statuses };
    const next={ ...payload };
    if(statusKey==='decline'){ delete statuses.appointment; }
    if(statusKey==='elsewhere'){ delete statuses.appointment; }
    statuses[statusKey]=next;
    meta.statuses=statuses;
    return { ...record, meta };
  });
}

function addHistoryEntry(customerId,entry){
  updateItem(COLLECTION,customerId,record=>{
    const meta=ensureMetaStructure(record);
    const history=[ { ...entry, id:generateId('history'), at:entry.at||new Date().toISOString() }, ...meta.history ];
    meta.history=history;
    return { ...record, meta };
  });
}

function hideQuickForms(){
  ['care','appointment','decline','elsewhere'].forEach(type=>toggleQuickForm(type,false));
}

function toggleQuickForm(type,show){
  const map={ care:careForm, appointment:appointmentForm, decline:declineForm, elsewhere:elsewhereForm };
  Object.entries(map).forEach(([key,el])=>{
    if(!el) return;
    if(key===type){
      el.classList.toggle('hidden',!show);
    }else{
      el.classList.add('hidden');
    }
  });
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
      hideLoading();
      toast('Đã xóa khách hàng khỏi hệ thống.','success');
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
  }catch(err){
    toast(err.message||'Không thể gửi yêu cầu xóa.','error');
  }
}

function updateSourceDetailVisibility(){
  if(!sourceDetailWrapper) return;
  const needsDetail=['online','old_ref','old_repeat','staff_ref','other'];
  const showDetail=needsDetail.includes(sourceSelect.value);
  sourceDetailWrapper.classList.toggle('hidden',!showDetail);
}

function addConsultedField(){
  const wrapper=document.createElement('div');
  wrapper.className='flex gap-3 items-center mt-2';
  wrapper.innerHTML=`<input class="input-brand flex-1" placeholder="Mẫu ghế đã tư vấn">
    <button type="button" class="px-3 py-2 rounded-xl border border-rose-300 text-rose-600">Xóa</button>`;
  wrapper.querySelector('button').addEventListener('click',()=>wrapper.remove());
  consultedContainer.appendChild(wrapper);
}

function ensureMetaExists(customer){
  if(processedMeta.has(customer.id)) return;
  processedMeta.add(customer.id);
  if(customer.meta && customer.meta.createdAt && Array.isArray(customer.meta.history)) return;
  updateItem(COLLECTION,customer.id,record=>{
    const meta=ensureMetaStructure(record);
    if(!meta.history.length){
      meta.history=[{
        id:generateId('history'),
        type:'create',
        title:'Tạo khách hàng',
        description:'Khởi tạo hồ sơ khách hàng.',
        at:meta.createdAt
      }];
    }
    return { ...record, meta };
  });
}

function ensureMetaStructure(record){
  const meta=record.meta&&typeof record.meta==='object'?record.meta:{};
  const createdAt=meta.createdAt||composeDateTime(record.date)||new Date().toISOString();
  return {
    createdAt,
    statuses:{ ...(meta.statuses||{}) },
    history:Array.isArray(meta.history)?meta.history.slice():[]
  };
}

function getMeta(record){
  return ensureMetaStructure(record);
}

function getStatusInfo(record){
  const meta=getMeta(record);
  const statuses=meta.statuses||{};
  if(statuses.elsewhere){
    return {
      badge:'<span class="badge badge-danger">Đã mua nơi khác</span>',
      note:statuses.elsewhere.note?statuses.elsewhere.note:`${formatDate(statuses.elsewhere.at)}`
    };
  }
  if(statuses.decline){
    return {
      badge:'<span class="badge badge-danger">Khách từ chối</span>',
      note:statuses.decline.note?statuses.decline.note:`${formatDate(statuses.decline.at)}`
    };
  }
  if(statuses.appointment){
    return {
      badge:'<span class="badge badge-info">Đang hẹn khách</span>',
      note:formatDateTime(statuses.appointment.dateTime)
    };
  }
  const latestCare=getLatestCare(record);
  if(latestCare?.rating==='lost'){
    return {
      badge:'<span class="badge badge-danger">Hết tiềm năng</span>',
      note:latestCare.ratingReason||''
    };
  }
  if(record.purchased){
    return {
      badge:'<span class="badge badge-success">Đã mua</span>',
      note:record.purchasedModel?`Mẫu: ${record.purchasedModel}`:''
    };
  }
  return {
    badge:'<span class="badge badge-warning">Đang tư vấn</span>',
    note:latestCare?`CSKH gần nhất: ${formatDate(latestCare.date)}`:''
  };
}

function getLatestCare(record){
  const related=getRelatedCare(record);
  if(!related.length) return null;
  related.sort((a,b)=>new Date((b.loggedAt||composeDateTime(b.date)))-(new Date(a.loggedAt||composeDateTime(a.date))));
  return related[0];
}

function formatDate(value){
  if(!value) return '';
  const d=new Date(value);
  if(Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('vi-VN');
}

function formatDateTime(value){
  if(!value) return '';
  const d=new Date(value);
  if(Number.isNaN(d.getTime())) return formatDate(value);
  return `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN',{ hour:'2-digit', minute:'2-digit' })}`;
}

function composeDateTime(date){
  if(!date) return new Date().toISOString();
  const d=new Date(date);
  if(Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

function refreshDetailModal(){
  if(!detailModal || detailModal.classList.contains('hidden')) return;
  const id=detailModal.dataset.id;
  if(!id) return;
  const record=customers.find(item=>item.id===id);
  if(record){
    renderCustomerDetail(record);
  }
}
