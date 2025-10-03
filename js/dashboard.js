import { initApp } from './core/app.js';
import { readCollection, getLayoutConfig } from './core/storage.js';
import { showLoading, hideLoading } from './core/ui.js';

initApp('dashboard');

const financeData=readCollection('finance');
const customers=readCollection('customers');
const careRecords=readCollection('care');
const services=readCollection('services');

const layoutConfig=getLayoutConfig();
buildLayout(layoutConfig);
hydrateDashboard();

function buildLayout(layout){
  const container=document.getElementById('page-content');
  if(!container) return;
  container.innerHTML='';
  layout.forEach(block=>{
    switch(block.type){
      case 'summary':
        container.appendChild(createSummaryBlock(block));
        break;
      case 'range':
        container.appendChild(createRangeBlock(block));
        break;
      case 'chart':
        container.appendChild(createChartBlock(block));
        break;
      case 'shortcuts':
        container.appendChild(createShortcutsBlock(block));
        break;
      case 'media':
        container.appendChild(createMediaBlock(block));
        break;
      case 'html':
        container.appendChild(createHtmlBlock(block));
        break;
      case 'activities':
        container.appendChild(createActivityBlock(block));
        break;
      case 'note':
        container.appendChild(createNoteBlock(block));
        break;
      default:
        break;
    }
  });
}

function hydrateDashboard(){
  renderSummary();
  renderRangeSummary();
  renderCharts();
  renderActivity();
  bindRangeFilter();
}

function createSummaryBlock(block){
  const section=document.createElement('section');
  section.className='space-y-4';
  if(block.title){
    const heading=document.createElement('div');
    heading.className='section-title';
    heading.textContent=block.title;
    section.appendChild(heading);
  }
  const grid=document.createElement('div');
  grid.className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4';
  grid.innerHTML=`<div class="card p-5">
      <div class="text-sm text-slate-500">Tổng số khách hàng</div>
      <div id="card-total-customers" class="text-3xl font-bold text-brand-blue mt-2">0</div>
    </div>
    <div class="card p-5">
      <div class="text-sm text-slate-500">CSKH trong ngày</div>
      <div id="card-today-care" class="text-3xl font-bold text-brand-blue mt-2">0</div>
    </div>
    <div class="card p-5">
      <div class="text-sm text-slate-500">Doanh thu cộng dồn</div>
      <div id="card-revenue" class="text-3xl font-bold text-emerald-600 mt-2">0</div>
    </div>
    <div class="card p-5">
      <div class="text-sm text-slate-500">Chi phí cộng dồn</div>
      <div id="card-expense" class="text-3xl font-bold text-rose-600 mt-2">0</div>
    </div>`;
  section.appendChild(grid);
  return section;
}

function createRangeBlock(block){
  const card=document.createElement('section');
  card.className='card p-5';
  card.innerHTML=`<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
      <div class="section-title">${block.title||'Báo cáo thu chi theo khoảng ngày'}</div>
      <form id="filter-range" class="flex flex-wrap items-end gap-3">
        <label class="flex flex-col">
          <span class="text-xs text-slate-500">Từ ngày</span>
          <input type="date" name="from" class="input-brand" />
        </label>
        <label class="flex flex-col">
          <span class="text-xs text-slate-500">Đến ngày</span>
          <input type="date" name="to" class="input-brand" />
        </label>
        <button class="btn-brand px-5 py-2" type="submit">Lọc dữ liệu</button>
      </form>
    </div>
    <div id="range-summary" class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-600"></div>`;
  return card;
}

function createChartBlock(block){
  const wrapper=document.createElement('section');
  wrapper.className='card p-5';
  wrapper.innerHTML=`<div class="flex items-center justify-between mb-4">
      <div class="section-title">${block.title||'Hiệu suất thu chi theo tháng'}</div>
      <span class="text-sm text-slate-500">12 tháng gần nhất</span>
    </div>
    <canvas id="finance-chart" class="max-h-[320px]"></canvas>`;
  return wrapper;
}

function createActivityBlock(block){
  const wrapper=document.createElement('section');
  wrapper.className='card p-5';
  wrapper.innerHTML=`<div class="section-title mb-3">${block.title||'Hoạt động mới nhất'}</div>
    <ul id="recent-activities" class="divide-y divide-slate-200"></ul>`;
  return wrapper;
}

function createShortcutsBlock(block){
  const section=document.createElement('section');
  section.className='card p-5 space-y-4';
  if(block.title){
    const heading=document.createElement('div');
    heading.className='section-title';
    heading.textContent=block.title;
    section.appendChild(heading);
  }
  const links=(Array.isArray(block.links)?block.links:[])
    .filter(link=>(link?.label||'').trim())
    .map(link=>({
      label:link.label.trim(),
      href:(link.href||'').trim()
    }));
  if(!links.length){
    const empty=document.createElement('div');
    empty.className='text-sm text-slate-500';
    empty.textContent='Chưa có lối tắt – vào mục Thiết lập hệ thống để bổ sung.';
    section.appendChild(empty);
    return section;
  }
  const grid=document.createElement('div');
  grid.className='shortcut-grid';
  links.forEach(link=>{
    const anchor=document.createElement('a');
    anchor.className='shortcut-tile';
    anchor.textContent=link.label;
    anchor.href=link.href||'#';
    if(/^https?:/i.test(link.href||'')){
      anchor.target='_blank';
      anchor.rel='noopener noreferrer';
    }
    grid.appendChild(anchor);
  });
  section.appendChild(grid);
  return section;
}

function createMediaBlock(block){
  const section=document.createElement('section');
  section.className='card p-5 space-y-4';
  if(block.title){
    const heading=document.createElement('div');
    heading.className='section-title text-center';
    heading.textContent=block.title;
    section.appendChild(heading);
  }
  const figure=document.createElement('figure');
  figure.className='dashboard-media';
  const img=document.createElement('img');
  img.src=block.image||'assets/img/logo-klc.svg';
  img.alt=block.title||'Hình ảnh thương hiệu';
  figure.appendChild(img);
  if(block.caption){
    const caption=document.createElement('figcaption');
    caption.textContent=block.caption;
    figure.appendChild(caption);
  }
  section.appendChild(figure);
  return section;
}

function createHtmlBlock(block){
  const section=document.createElement('section');
  section.className='card p-5 space-y-3';
  if(block.title){
    const heading=document.createElement('div');
    heading.className='section-title';
    heading.textContent=block.title;
    section.appendChild(heading);
  }
  const wrapper=document.createElement('div');
  wrapper.className='custom-html';
  wrapper.innerHTML=sanitizeHtml(block.html||'');
  section.appendChild(wrapper);
  return section;
}

function createNoteBlock(block){
  const card=document.createElement('section');
  card.className='card p-5 space-y-2';
  if(block.title){
    const heading=document.createElement('div');
    heading.className='section-title';
    heading.textContent=block.title;
    card.appendChild(heading);
  }
  const content=document.createElement('div');
  content.className='text-sm text-slate-600 whitespace-pre-wrap';
  content.textContent=block.content||'';
  card.appendChild(content);
  return card;
}

function renderSummary(){
  const totalCustomers=document.getElementById('card-total-customers');
  const todayCare=document.getElementById('card-today-care');
  const revenueEl=document.getElementById('card-revenue');
  const expenseEl=document.getElementById('card-expense');
  if(!totalCustomers) return;
  totalCustomers.textContent=customers.length;
  todayCare.textContent=careRecords.filter(item=>sameDate(item.date,new Date())).length;
  const revenue=financeData.filter(x=>x.type==='income').reduce((sum,x)=>sum+Number(x.amount||0),0);
  const expense=financeData.filter(x=>x.type==='expense').reduce((sum,x)=>sum+Number(x.amount||0),0);
  revenueEl.textContent=numberFormat(revenue);
  expenseEl.textContent=numberFormat(expense);
}

function bindRangeFilter(){
  const rangeForm=document.getElementById('filter-range');
  if(!rangeForm) return;
  rangeForm.addEventListener('submit',evt=>{
    evt.preventDefault();
    showLoading('Đang lọc dữ liệu…');
    setTimeout(()=>{
      renderRangeSummary();
      hideLoading();
    },300);
  });
}

function renderRangeSummary(){
  const summaryContainer=document.getElementById('range-summary');
  const rangeForm=document.getElementById('filter-range');
  if(!summaryContainer||!rangeForm) return;
  const fromValue=rangeForm.querySelector('[name="from"]').value;
  const toValue=rangeForm.querySelector('[name="to"]').value;
  const from=fromValue?new Date(fromValue):null;
  const to=toValue?new Date(toValue):null;
  const filtered=financeData.filter(item=>{
    const d=new Date(item.date);
    return (!from||d>=from) && (!to||d<=to);
  });
  const sumIn=filtered.filter(x=>x.type==='income').reduce((s,x)=>s+Number(x.amount||0),0);
  const sumOut=filtered.filter(x=>x.type==='expense').reduce((s,x)=>s+Number(x.amount||0),0);
  summaryContainer.innerHTML=`<div class="font-semibold text-brand-blue">Tổng thu: ${numberFormat(sumIn)} đ</div>
    <div class="font-semibold text-rose-600">Tổng chi: ${numberFormat(sumOut)} đ</div>`;
}

function renderCharts(){
  const canvas=document.getElementById('finance-chart');
  if(!canvas||!window.Chart) return;
  const months=Array.from({length:12},(_,i)=>i+1);
  const incomePerMonth=months.map(month=>sumFinance(month,'income'));
  const expensePerMonth=months.map(month=>sumFinance(month,'expense'));
  new window.Chart(canvas,{ type:'line', data:{ labels:months.map(m=>`Th ${m}`), datasets:[
    { label:'Thu', data:incomePerMonth, borderColor:'#2563eb', backgroundColor:'rgba(37,99,235,.15)', tension:.4, fill:true },
    { label:'Chi', data:expensePerMonth, borderColor:'#dc2626', backgroundColor:'rgba(220,38,38,.15)', tension:.4, fill:true }
  ]}, options:{ plugins:{legend:{display:true}}, scales:{ y:{ beginAtZero:true, ticks:{ callback:value=>numberFormat(value) }} } }});
}

function renderActivity(){
  const list=document.getElementById('recent-activities');
  if(!list) return;
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

function sanitizeHtml(html){
  if(!html) return '';
  const template=document.createElement('template');
  template.innerHTML=html;
  template.content.querySelectorAll('script').forEach(node=>node.remove());
  template.content.querySelectorAll('*').forEach(el=>{
    Array.from(el.attributes).forEach(attr=>{
      if(attr.name.toLowerCase().startsWith('on')){
        el.removeAttribute(attr.name);
      }
    });
  });
  return template.innerHTML;
}
