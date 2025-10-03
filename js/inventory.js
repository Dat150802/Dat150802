import { initApp } from './core/app.js';
import { appendItem, readCollection, generateId, removeItem, subscribeCollection } from './core/storage.js';
import { showLoading, hideLoading, toast, bindSearch, confirmAction } from './core/ui.js';
import { ensurePermission } from './core/auth.js';
import { getPendingDeletionIds, submitDeletionRequest, resolvePendingByRecord } from './core/deletion.js';

const user=initApp('inventory');
let records=readCollection('inventory');
const COLLECTION='inventory';

const form=document.getElementById('inventory-form');
const staffHint=document.getElementById('inventory-staff-view');
const tableBody=document.getElementById('inventory-table-body');
const summaryBody=document.getElementById('inventory-summary-body');
const searchInput=document.getElementById('inventory-search');

applyRolePermissions();
renderTables(records);
setupEvents();

subscribeCollection('inventory',data=>{
  records=data;
  applySearchFilter();
});

function applyRolePermissions(){
  if(user.role==='staff'){
    staffHint?.classList.remove('hidden');
  }
}

function setupEvents(){
  form.addEventListener('submit',evt=>{
    evt.preventDefault();
    if(!ensurePermission(user,'write')) return;
    const formData=new FormData(form);
    const payload={
      id:generateId('inventory'),
      date:formData.get('date'),
      product:formData.get('product'),
      sku:formData.get('sku'),
      type:formData.get('type'),
      quantity:Number(formData.get('quantity')||0),
      unit:formData.get('unit'),
      note:formData.get('note')
    };
    showLoading('Đang cập nhật tồn kho…');
    setTimeout(()=>{
      appendItem('inventory',payload);
      records=readCollection('inventory');
      renderTables(records);
      form.reset();
      hideLoading();
      toast('Đã cập nhật tồn kho.','success');
    },400);
  });
  const resetBtn=document.getElementById('inventory-reset');
  if(resetBtn){
    resetBtn.addEventListener('click',()=>{
      if(!ensurePermission(user,'write')) return;
      form.reset();
    });
  }
  if(searchInput){
    bindSearch(searchInput,()=>applySearchFilter());
  }
}

function applySearchFilter(){
  const keyword=searchInput?.value.trim().toLowerCase();
  if(keyword){
    const filtered=records.filter(item=>
      item.product.toLowerCase().includes(keyword)||
      (item.sku||'').toLowerCase().includes(keyword)
    );
    renderTables(filtered);
  }else{
    renderTables(records);
  }
}

function renderTables(data){
  const pendingIds=getPendingDeletionIds(COLLECTION);
  tableBody.innerHTML=data.map(item=>`<tr class="border-b last:border-b-0">
      <td class="px-3 py-2">${formatDate(item.date)}</td>
      <td class="px-3 py-2 font-semibold">${item.product}</td>
      <td class="px-3 py-2">${item.sku||'-'}</td>
      <td class="px-3 py-2">${item.type==='import'?'<span class="badge badge-success">Nhập</span>':'<span class="badge badge-danger">Xuất</span>'}</td>
      <td class="px-3 py-2">${item.quantity} ${item.unit||''}</td>
      <td class="px-3 py-2">${item.note||'-'}</td>
      <td class="px-3 py-2 text-right">
        <div class="flex flex-wrap items-center justify-end gap-2">
          ${pendingIds.has(item.id)?'<span class="badge badge-warning">Chờ duyệt xóa</span>':''}
          <button class="text-rose-600" data-action="delete" data-id="${item.id}">${user.role==='admin'?'Xóa':'Xóa (gửi duyệt)'}</button>
        </div>
      </td>
    </tr>`).join('');
  tableBody.querySelectorAll('button[data-action="delete"]').forEach(btn=>btn.addEventListener('click',()=>handleDelete(btn.dataset.id)));
  renderSummary(data);
}

function renderSummary(data){
  const totals={};
  data.forEach(item=>{
    const key=item.product||'Khác';
    totals[key]=totals[key]||{ product:item.product, sku:item.sku, quantity:0, unit:item.unit };
    totals[key].quantity+=item.type==='import'?item.quantity:-item.quantity;
  });
  summaryBody.innerHTML=Object.values(totals).map(item=>`<tr class="border-b last:border-b-0">
      <td class="px-3 py-2 font-semibold">${item.product}</td>
      <td class="px-3 py-2">${item.sku||'-'}</td>
      <td class="px-3 py-2">${item.quantity} ${item.unit||''}</td>
    </tr>`).join('');
}

function formatDate(value){
  if(!value) return '';
  const d=new Date(value);
  if(Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('vi-VN');
}

async function handleDelete(id){
  const record=records.find(item=>item.id===id);
  if(!record) return;
  if(user.role==='admin'){
    if(!await confirmAction('Bạn chắc chắn muốn xóa bản ghi tồn kho này?')) return;
    showLoading('Đang xóa bản ghi tồn kho…');
    setTimeout(()=>{
      removeItem(COLLECTION,id);
      resolvePendingByRecord(COLLECTION,id,'approved','Quản trị viên xóa trực tiếp bản ghi tồn kho.');
      records=readCollection(COLLECTION);
      renderTables(records);
      hideLoading();
      toast('Đã xóa bản ghi tồn kho.','success');
    },300);
    return;
  }
  const pendingIds=getPendingDeletionIds(COLLECTION);
  if(pendingIds.has(id)){
    toast('Đã có yêu cầu xóa chờ duyệt cho bản ghi này.','info');
    return;
  }
  const reason=prompt('Nhập lý do xóa bản ghi tồn kho (gửi quản trị viên duyệt):','');
  if(!reason || !reason.trim()){
    toast('Vui lòng ghi rõ lý do xóa để gửi duyệt.','error');
    return;
  }
  try{
    submitDeletionRequest(COLLECTION,record,user,reason.trim());
    toast('Đã gửi yêu cầu xóa bản ghi tồn kho đến quản trị viên.','success');
    renderTables(records);
  }catch(err){
    toast(err.message||'Không thể gửi yêu cầu xóa.','error');
  }
}
