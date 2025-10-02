import { initApp } from './core/app.js';
import { appendItem, readCollection, generateId } from './core/storage.js';
import { showLoading, hideLoading, toast, bindSearch } from './core/ui.js';
import { ensurePermission } from './core/auth.js';

const user=initApp('inventory');
let records=readCollection('inventory');

const form=document.getElementById('inventory-form');
const staffHint=document.getElementById('inventory-staff-view');
const tableBody=document.getElementById('inventory-table-body');
const summaryBody=document.getElementById('inventory-summary-body');
const searchInput=document.getElementById('inventory-search');

applyRolePermissions();
renderTables(records);
setupEvents();

function applyRolePermissions(){
  if(user.role==='staff'){
    Array.from(form.elements).forEach(el=>el.disabled=true);
    document.getElementById('inventory-actions').classList.add('hidden');
    staffHint.classList.remove('hidden');
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
    bindSearch(searchInput,value=>{
      const keyword=value.toLowerCase();
      const filtered=records.filter(item=>
        item.product.toLowerCase().includes(keyword)||
        (item.sku||'').toLowerCase().includes(keyword)
      );
      renderTables(filtered);
    });
  }
}

function renderTables(data){
  tableBody.innerHTML=data.map(item=>`<tr class="border-b last:border-b-0">
      <td class="px-3 py-2">${formatDate(item.date)}</td>
      <td class="px-3 py-2 font-semibold">${item.product}</td>
      <td class="px-3 py-2">${item.sku||'-'}</td>
      <td class="px-3 py-2">${item.type==='import'?'<span class="badge badge-success">Nhập</span>':'<span class="badge badge-danger">Xuất</span>'}</td>
      <td class="px-3 py-2">${item.quantity} ${item.unit||''}</td>
      <td class="px-3 py-2">${item.note||'-'}</td>
    </tr>`).join('');
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
