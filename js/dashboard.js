import { initApp } from './core/app.js';
import { readCollection } from './core/storage.js';
import { showLoading, hideLoading } from './core/ui.js';

const user=initApp('dashboard');

const financeData=readCollection('finance');
const customers=readCollection('customers');
const careRecords=readCollection('care');
const services=readCollection('services');

renderSummary();
renderCharts();
renderActivity();

function renderSummary(){
  document.getElementById('card-total-customers').innerText=customers.length;
  document.getElementById('card-today-care').innerText=careRecords.filter(item=>sameDate(item.date,new Date())).length;
  const revenue=financeData.filter(x=>x.type==='income').reduce((sum,x)=>sum+Number(x.amount||0),0);
  const expense=financeData.filter(x=>x.type==='expense').reduce((sum,x)=>sum+Number(x.amount||0),0);
  document.getElementById('card-revenue').innerText=numberFormat(revenue);
  document.getElementById('card-expense').innerText=numberFormat(expense);
}

function renderCharts(){
  const ctx=document.getElementById('finance-chart');
  if(!ctx) return;
  const months=Array.from({length:12},(_,i)=>i+1);
  const incomePerMonth=months.map(month=>sumFinance(month,'income'));
  const expensePerMonth=months.map(month=>sumFinance(month,'expense'));
  // ensure Chart.js loaded
  if(window.Chart){
    new window.Chart(ctx,{ type:'line', data:{ labels:months.map(m=>`Th ${m}`), datasets:[
      { label:'Thu', data:incomePerMonth, borderColor:'#2563eb', backgroundColor:'rgba(37,99,235,.15)', tension:.4, fill:true },
      { label:'Chi', data:expensePerMonth, borderColor:'#dc2626', backgroundColor:'rgba(220,38,38,.15)', tension:.4, fill:true }
    ]}, options:{ plugins:{legend:{display:true}}, scales:{ y:{ beginAtZero:true, ticks:{ callback:value=>numberFormat(value) }} } }});
  }
}

function renderActivity(){
  const list=document.getElementById('recent-activities');
  const items=[
    ...financeData.slice(0,5).map(f=>({ date:f.date, title:`${f.type==='income'?'Thu':'Chi'}: ${f.title}`, subtitle:numberFormat(f.amount||0) })),
    ...careRecords.slice(0,5).map(c=>({ date:c.date, title:`CSKH: ${c.name}`, subtitle:c.channel })),
    ...services.slice(0,5).map(s=>({ date:s.date, title:`${s.type==='warranty'?'Bảo hành':'Bảo dưỡng'}: ${s.name}`, subtitle:s.product||s.extra }))
  ].filter(item=>item.date).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,6);
  list.innerHTML=items.map(item=>`<li class="flex justify-between items-center py-2 border-b border-slate-200 last:border-b-0">
      <div>
        <div class="font-semibold text-brand-blue">${item.title}</div>
        <div class="text-sm text-slate-500">${item.subtitle||''}</div>
      </div>
      <span class="text-sm text-slate-500">${formatDate(item.date)}</span>
    </li>`).join('');
}

function sumFinance(month,type){
  return financeData.filter(item=>item.type===type && new Date(item.date).getMonth()+1===month)
    .reduce((sum,item)=>sum+Number(item.amount||0),0);
}

function numberFormat(value){
  return new Intl.NumberFormat('vi-VN').format(Number(value)||0);
}

function formatDate(value){
  if(!value) return '';
  const d=new Date(value);
  if(Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('vi-VN');
}

function sameDate(value, date){
  if(!value) return false;
  const d=new Date(value);
  return d.getDate()===date.getDate() && d.getMonth()===date.getMonth() && d.getFullYear()===date.getFullYear();
}

const rangeForm=document.getElementById('filter-range');
if(rangeForm){
  rangeForm.addEventListener('submit',evt=>{
    evt.preventDefault();
    showLoading('Đang lọc dữ liệu…');
    setTimeout(()=>{
      const from=new Date(rangeForm.querySelector('[name="from"]').value);
      const to=new Date(rangeForm.querySelector('[name="to"]').value);
      const filtered=financeData.filter(item=>{
        const d=new Date(item.date);
        return (!rangeForm.from.value || d>=from) && (!rangeForm.to.value || d<=to);
      });
      const result=document.getElementById('range-summary');
      const sumIn=filtered.filter(x=>x.type==='income').reduce((s,x)=>s+Number(x.amount||0),0);
      const sumOut=filtered.filter(x=>x.type==='expense').reduce((s,x)=>s+Number(x.amount||0),0);
      result.innerHTML=`<div class="font-semibold text-brand-blue">Tổng thu: ${numberFormat(sumIn)} đ</div>
        <div class="font-semibold text-rose-600">Tổng chi: ${numberFormat(sumOut)} đ</div>`;
      hideLoading();
    },400);
  });
}
