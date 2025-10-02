import { mountFrame, toast, showLoading, hideLoading, formatDate, formatCurrency, toggleFormDisabled } from '../core/ui.js';
import { getState, updateSection, generateId } from '../core/storage.js';
import { getCurrentUser } from '../core/auth.js';

const user = getCurrentUser();
const isStaff = user?.role !== 'admin';

const form = document.getElementById('finance-form');
const summaryWrap = document.getElementById('finance-summary');
const tableBody = document.querySelector('#fin-table tbody');
const searchInput = document.getElementById('fin-search');
const filterType = document.getElementById('fin-filter-type');
const filterMethod = document.getElementById('fin-filter-method');
const reportYearSelect = document.getElementById('fin-report-year');
let chartInstance = null;

mountFrame('finance');
if(form && isStaff){
  toggleFormDisabled(form, true);
}

bindEvents();
render();

function bindEvents(){
  document.getElementById('btn-fin-save').addEventListener('click', handleSave);
  document.getElementById('btn-fin-reset').addEventListener('click', ()=> form.reset());
  searchInput.addEventListener('input', renderTable);
  filterType.addEventListener('change', renderTable);
  filterMethod.addEventListener('change', renderTable);
  reportYearSelect.addEventListener('change', renderChart);
}

function handleSave(){
  if(isStaff){
    toast('Bạn không có quyền thêm dữ liệu mới.', 'error');
    return;
  }
  const date = document.getElementById('fin-date').value;
  const type = document.getElementById('fin-type').value;
  const amount = Number(document.getElementById('fin-amount').value || 0);
  if(!date || amount <= 0){
    toast('Vui lòng nhập ngày và số tiền hợp lệ.', 'error');
    return;
  }
  const payload = {
    id: generateId('fin'),
    date,
    type,
    category: document.getElementById('fin-category').value.trim(),
    amount,
    method: document.getElementById('fin-method').value,
    partner: document.getElementById('fin-partner').value.trim(),
    note: document.getElementById('fin-note').value.trim(),
    createdAt: new Date().toISOString()
  };
  showLoading('Đang lưu giao dịch…');
  setTimeout(()=>{
    updateSection('finance', data => {
      const next = { ...data };
      const arr = Array.isArray(next.transactions) ? [...next.transactions] : [];
      arr.push(payload);
      next.transactions = arr;
      return next;
    });
    hideLoading();
    toast('Đã lưu giao dịch.', 'success');
    form.reset();
    render();
  }, 400);
}

function render(){
  renderSummary();
  renderTable();
  renderReportYears();
  renderChart();
}

function getTransactions(){
  const state = getState();
  return state.finance?.transactions || [];
}

function renderSummary(){
  const transactions = getTransactions();
  const income = transactions.filter(t => t.type === 'thu').reduce((sum, t)=> sum + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'chi').reduce((sum, t)=> sum + t.amount, 0);
  const balance = income - expense;
  summaryWrap.innerHTML = `
    <div class="card p-4">
      <div class="text-gray-500 text-sm">Tổng thu</div>
      <div class="text-2xl font-semibold text-brand-blue">${formatCurrency(income)}</div>
    </div>
    <div class="card p-4">
      <div class="text-gray-500 text-sm">Tổng chi</div>
      <div class="text-2xl font-semibold text-brand-blue">${formatCurrency(expense)}</div>
    </div>
    <div class="card p-4">
      <div class="text-gray-500 text-sm">Chênh lệch</div>
      <div class="text-2xl font-semibold ${balance >=0 ? 'text-green-600' : 'text-red-600'}">${formatCurrency(balance)}</div>
    </div>
  `;
}

function renderTable(){
  const search = searchInput.value.trim().toLowerCase();
  const typeFilter = filterType.value;
  const methodFilter = filterMethod.value;
  const transactions = getTransactions().filter(item => {
    const matchSearch = !search || [item.category, item.partner, item.note].some(v => v?.toLowerCase().includes(search));
    const matchType = typeFilter === 'all' || item.type === typeFilter;
    const matchMethod = methodFilter === 'all' || item.method === methodFilter;
    return matchSearch && matchType && matchMethod;
  }).sort((a,b)=> new Date(b.date) - new Date(a.date));

  if(transactions.length === 0){
    tableBody.innerHTML = '<tr><td colspan="7" class="px-3 py-6 text-center text-sm text-gray-500">Chưa có dữ liệu.</td></tr>';
    return;
  }

  tableBody.innerHTML = transactions.map(item => `
    <tr class="border-b border-gray-100">
      <td class="px-3 py-2">${formatDate(item.date)}</td>
      <td class="px-3 py-2">${item.type === 'thu' ? '<span class="badge bg-green-100 text-green-600">Thu</span>' : '<span class="badge bg-red-100 text-red-600">Chi</span>'}</td>
      <td class="px-3 py-2">${item.category || '—'}</td>
      <td class="px-3 py-2 font-semibold ${item.type === 'thu' ? 'text-green-600' : 'text-red-600'}">${formatCurrency(item.amount)}</td>
      <td class="px-3 py-2">${item.method}</td>
      <td class="px-3 py-2">${item.partner || '—'}</td>
      <td class="px-3 py-2">${item.note || '—'}</td>
    </tr>
  `).join('');
}

function renderReportYears(){
  const transactions = getTransactions();
  const years = Array.from(new Set(transactions.map(t => t.date?.slice(0,4)).filter(Boolean)));
  const currentYear = new Date().getFullYear().toString();
  if(years.length === 0){
    years.push(currentYear);
  }
  reportYearSelect.innerHTML = years.sort().map(y => `<option value="${y}" ${y===currentYear?'selected':''}>${y}</option>`).join('');
}

function renderChart(){
  const ctx = document.getElementById('fin-chart');
  if(!ctx || typeof Chart === 'undefined') return;
  const year = reportYearSelect.value || new Date().getFullYear().toString();
  const transactions = getTransactions().filter(t => t.date?.startsWith(year));
  const months = Array.from({length:12}, (_,i)=> i+1);
  const income = months.map(m => sumByMonth(transactions, m, 'thu'));
  const expense = months.map(m => sumByMonth(transactions, m, 'chi'));

  if(chartInstance){ chartInstance.destroy(); }

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months.map(m => `Th${m}`),
      datasets: [
        {
          label: 'Thu',
          data: income,
          backgroundColor: '#14b8a6'
        },
        {
          label: 'Chi',
          data: expense,
          backgroundColor: '#ef4444'
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

function sumByMonth(transactions, month, type){
  return transactions.filter(t => t.type === type && Number(t.date?.slice(5,7)) === month).reduce((sum, t)=> sum + t.amount, 0);
}
