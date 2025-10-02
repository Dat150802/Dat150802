import { mountFrame } from '../core/ui.js';
import { getState } from '../core/storage.js';

mountFrame('dashboard');
render();

function render(){
  const state = getState();
  const customers = state.customers || [];
  const finance = state.finance?.transactions || [];
  const today = new Date().toISOString().slice(0,10);
  const thisMonth = new Date().toISOString().slice(0,7);

  const todayCustomers = customers.filter(c => c.date === today);
  const monthCustomers = customers.filter(c => c.date?.startsWith(thisMonth));
  const purchased = customers.filter(c => c.purchased === true);
  const rate = customers.length ? Math.round((purchased.length / customers.length) * 100) : 0;

  document.getElementById('card-today').textContent = todayCustomers.length;
  document.getElementById('card-month').textContent = monthCustomers.length;
  document.getElementById('card-rate').textContent = rate + '%';

  drawCustomersDaily(customers);
  drawSourceChart(customers);
  drawFinanceChart(finance);
}

function drawCustomersDaily(customers){
  if(typeof Chart === 'undefined') return;
  const ctx = document.getElementById('chartCustomersDay');
  if(!ctx) return;
  const days = Array.from({length: 7}).map((_,i)=>{
    const d = new Date();
    d.setDate(d.getDate()- (6-i));
    return d;
  });
  const data = days.map(d => {
    const key = d.toISOString().slice(0,10);
    return customers.filter(c => c.date === key).length;
  });
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: days.map(d => d.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric' })),
      datasets: [{
        data,
        borderColor: '#0b265a',
        backgroundColor: 'rgba(11,38,90,.15)',
        fill: true,
        tension: .3
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { precision:0 } }
      }
    }
  });
}

function drawSourceChart(customers){
  if(typeof Chart === 'undefined') return;
  const ctx = document.getElementById('chartSource');
  if(!ctx) return;
  const groups = customers.reduce((acc, cur)=>{
    const key = cur.source || 'Khác';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const labels = Object.keys(groups);
  const data = Object.values(groups);
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: ['#0b265a','#f6c15b','#14b8a6','#3b82f6','#ef4444','#6366f1']
      }]
    },
    options: {
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

function drawFinanceChart(transactions){
  if(typeof Chart === 'undefined') return;
  const ctx = document.getElementById('chartFinance');
  if(!ctx) return;
  const now = new Date();
  const months = Array.from({length: 6}).map((_,i)=>{
    const d = new Date(now.getFullYear(), now.getMonth()- (5-i), 1);
    return d;
  });
  const monthly = months.map(d => {
    const key = d.toISOString().slice(0,7);
    const total = transactions.filter(t => t.date?.startsWith(key)).reduce((sum, t)=>{
      return sum + (t.type === 'thu' ? Number(t.amount||0) : -Number(t.amount||0));
    }, 0);
    return total;
  });
  let cumulative = 0;
  const dataset = monthly.map(val => { cumulative += val; return cumulative; });
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months.map(d => d.toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' })),
      datasets: [{
        data: dataset,
        backgroundColor: '#0b265a'
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}
