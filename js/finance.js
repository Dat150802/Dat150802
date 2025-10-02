import { initApp } from './core/app.js';
import { appendItem, readCollection, generateId } from './core/storage.js';
import { showLoading, hideLoading, toast, bindSearch } from './core/ui.js';
import { ensurePermission } from './core/auth.js';

const user=initApp('finance');
let records=readCollection('finance');

const form=document.getElementById('finance-form');
const staffHint=document.getElementById('finance-staff-view');
const tableBody=document.getElementById('finance-table-body');
const summaryBody=document.getElementById('finance-summary-body');
const monthSelect=document.getElementById('finance-month');
const searchInput=document.getElementById('finance-search');

applyRolePermissions();
renderTable(records);
ensureDefaultMonth();
renderSummary();
setupEvents();

function applyRolePermissions(){
  if(user.role==='staff'){
    Array.from(form.elements).forEach(el=>el.disabled=true);
    document.getElementById('finance-actions').classList.add('hidden');
    staffHint.classList.remove('hidden');
  }
}

function setupEvents(){
  form.addEventListener('submit',evt=>{
    evt.preventDefault();
    if(!ensurePermission(user,'write')) return;
    const formData=new FormData(form);
    const payload={
      id:generateId('finance'),
      date:formData.get('date'),
      type:formData.get('type'),
      title:formData.get('title'),
      amount:Number(formData.get('amount')||0),
      category:formData.get('category'),
      note:formData.get('note')
    };
    showLoading('Đang cập nhật thu chi…');
    setTimeout(()=>{
      appendItem('finance',payload);
      records=readCollection('finance');
      renderTable(records);
      renderSummary();
      form.reset();
      hideLoading();
      toast('Đã lưu giao dịch.','success');
    },400);
  });
  const resetBtn=document.getElementById('finance-reset');
  if(resetBtn){
    resetBtn.addEventListener('click',()=>{
      if(!ensurePermission(user,'write')) return;
      form.reset();
    });
  }
  if(monthSelect){
    monthSelect.addEventListener('change',renderSummary);
  }
  if(searchInput){
    bindSearch(searchInput,value=>{
      const keyword=value.toLowerCase();
      const filtered=records.filter(item=>
        item.title.toLowerCase().includes(keyword)||
        item.category.toLowerCase().includes(keyword)
      );
      renderTable(filtered);
    });
  }
}

function ensureDefaultMonth(){
  if(!monthSelect) return;
  if(!monthSelect.value){
    const now=new Date();
    monthSelect.value=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  }
}

function renderTable(data){
  tableBody.innerHTML=data.map(item=>`<tr class="border-b last:border-b-0">
      <td class="px-3 py-2">${formatDate(item.date)}</td>
      <td class="px-3 py-2 font-semibold">${item.title}</td>
      <td class="px-3 py-2">${item.category}</td>
      <td class="px-3 py-2">${item.type==='income'?'<span class="badge badge-success">Thu</span>':'<span class="badge badge-danger">Chi</span>'}</td>
      <td class="px-3 py-2 text-right font-semibold">${formatCurrency(item.amount)}</td>
      <td class="px-3 py-2">${item.note||'-'}</td>
    </tr>`).join('');
}

function renderSummary(){
  ensureDefaultMonth();
  const monthValue=monthSelect.value;
  if(!monthValue){
    summaryBody.innerHTML='<tr><td class="px-3 py-2 text-slate-500">Chưa chọn tháng báo cáo</td></tr>';
    return;
  }
  const [year,month]=monthValue.split('-').map(Number);
  const filtered=records.filter(item=>{
    const date=new Date(item.date);
    return date.getFullYear()===year && date.getMonth()+1===month;
  });
  const totalIncome=filtered.filter(item=>item.type==='income').reduce((sum,item)=>sum+Number(item.amount||0),0);
  const totalExpense=filtered.filter(item=>item.type==='expense').reduce((sum,item)=>sum+Number(item.amount||0),0);
  const balance=totalIncome-totalExpense;
  summaryBody.innerHTML=`<tr>
      <td class="px-3 py-2 font-semibold">Tổng thu</td>
      <td class="px-3 py-2 text-right text-brand-blue font-semibold">${formatCurrency(totalIncome)}</td>
    </tr>
    <tr>
      <td class="px-3 py-2 font-semibold">Tổng chi</td>
      <td class="px-3 py-2 text-right text-rose-600 font-semibold">${formatCurrency(totalExpense)}</td>
    </tr>
    <tr>
      <td class="px-3 py-2 font-semibold">Cân đối</td>
      <td class="px-3 py-2 text-right font-semibold">${formatCurrency(balance)}</td>
    </tr>`;
}

function formatDate(value){
  if(!value) return '';
  const d=new Date(value);
  if(Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('vi-VN');
}

function formatCurrency(value){
  return new Intl.NumberFormat('vi-VN',{ style:'currency', currency:'VND' }).format(Number(value)||0);
}
