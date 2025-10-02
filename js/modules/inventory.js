import { mountFrame, toast, showLoading, hideLoading, formatDate, formatCurrency, toggleFormDisabled } from '../core/ui.js';
import { getState, updateSection, generateId } from '../core/storage.js';
import { getCurrentUser } from '../core/auth.js';

const user = getCurrentUser();
const isStaff = user?.role !== 'admin';

const form = document.getElementById('inventory-form');
const listTable = document.querySelector('#inv-movements tbody');
const summaryWrap = document.getElementById('inventory-summary');
const stockBox = document.getElementById('inv-stock');
const searchInput = document.getElementById('inv-search');
const filterType = document.getElementById('inv-filter-type');
const filterCategory = document.getElementById('inv-filter-category');
mountFrame('inventory');
if(form && isStaff){
  toggleFormDisabled(form, true);
}

bindEvents();
render();

function bindEvents(){
  document.getElementById('btn-inv-save').addEventListener('click', handleSave);
  document.getElementById('btn-inv-reset').addEventListener('click', ()=> form.reset());
  searchInput.addEventListener('input', renderMovements);
  filterType.addEventListener('change', renderMovements);
  filterCategory.addEventListener('change', renderMovements);
}

function handleSave(){
  if(isStaff){
    toast('Bạn không có quyền thêm dữ liệu mới.', 'error');
    return;
  }
  const type = document.querySelector('input[name="inv-type"]:checked')?.value || 'in';
  const date = document.getElementById('inv-date').value;
  const product = document.getElementById('inv-product').value.trim();
  const qty = Number(document.getElementById('inv-qty').value || 0);
  if(!date || !product || qty <= 0){
    toast('Vui lòng nhập ngày, sản phẩm và số lượng hợp lệ.', 'error');
    return;
  }
  const payload = {
    id: generateId('inv'),
    type,
    date,
    product,
    sku: document.getElementById('inv-sku').value.trim(),
    category: document.getElementById('inv-category').value.trim(),
    quantity: qty,
    unit: document.getElementById('inv-unit').value.trim(),
    unitPrice: Number(document.getElementById('inv-unit-price').value || 0),
    partner: document.getElementById('inv-partner').value.trim(),
    note: document.getElementById('inv-note').value.trim(),
    createdAt: new Date().toISOString()
  };
  showLoading('Đang lưu phiếu kho…');
  setTimeout(()=>{
    updateSection('inventory', data => {
      const next = { ...data };
      const arr = Array.isArray(next.movements) ? [...next.movements] : [];
      arr.push(payload);
      next.movements = arr;
      return next;
    });
    hideLoading();
    toast('Đã lưu phiếu kho.', 'success');
    form.reset();
    render();
  }, 400);
}

function render(){
  renderSummary();
  renderMovements();
  renderStock();
  renderCategories();
}

function getMovements(){
  const state = getState();
  return state.inventory?.movements || [];
}

function renderSummary(){
  const movements = getMovements();
  const totalImport = movements.filter(m => m.type === 'in').reduce((sum, m)=> sum + m.quantity, 0);
  const totalExport = movements.filter(m => m.type === 'out').reduce((sum, m)=> sum + m.quantity, 0);
  const totalValue = movements.reduce((sum, m)=>{
    const value = (m.unitPrice || 0) * (m.quantity || 0);
    return sum + (m.type === 'in' ? value : -value);
  }, 0);
  summaryWrap.innerHTML = `
    <div class="card p-4">
      <div class="text-gray-500 text-sm">Tổng nhập</div>
      <div class="text-2xl font-semibold text-brand-blue">${totalImport}</div>
    </div>
    <div class="card p-4">
      <div class="text-gray-500 text-sm">Tổng xuất</div>
      <div class="text-2xl font-semibold text-brand-blue">${totalExport}</div>
    </div>
    <div class="card p-4">
      <div class="text-gray-500 text-sm">Giá trị tồn (ước tính)</div>
      <div class="text-2xl font-semibold text-brand-blue">${formatCurrency(totalValue)}</div>
    </div>
  `;
}

function renderMovements(){
  const search = searchInput.value.trim().toLowerCase();
  const typeFilter = filterType.value;
  const categoryFilter = filterCategory.value;
  const movements = getMovements().filter(item => {
    const matchSearch = !search || [item.product, item.sku, item.partner, item.note].some(v => v?.toLowerCase().includes(search));
    const matchType = typeFilter === 'all' || item.type === typeFilter;
    const matchCategory = categoryFilter === 'all' || (item.category || '') === categoryFilter;
    return matchSearch && matchType && matchCategory;
  }).sort((a,b)=> new Date(b.date) - new Date(a.date));

  if(movements.length === 0){
    listTable.innerHTML = '<tr><td colspan="9" class="px-3 py-6 text-center text-sm text-gray-500">Chưa có dữ liệu.</td></tr>';
    return;
  }

  listTable.innerHTML = movements.map(item => {
    const amount = (item.unitPrice || 0) * (item.quantity || 0);
    return `
      <tr class="border-b border-gray-100">
        <td class="px-3 py-2">${formatDate(item.date)}</td>
        <td class="px-3 py-2">
          <div class="font-medium text-brand-blue">${item.product}</div>
          <div class="text-xs text-gray-500">${item.sku || ''}</div>
        </td>
        <td class="px-3 py-2">${item.type === 'in' ? '<span class="badge bg-green-100 text-green-600">Nhập</span>' : '<span class="badge bg-red-100 text-red-600">Xuất</span>'}</td>
        <td class="px-3 py-2">${item.quantity}</td>
        <td class="px-3 py-2">${item.unit || ''}</td>
        <td class="px-3 py-2">${item.unitPrice ? formatCurrency(item.unitPrice) : '—'}</td>
        <td class="px-3 py-2">${amount ? formatCurrency(amount) : '—'}</td>
        <td class="px-3 py-2">${item.partner || '—'}</td>
        <td class="px-3 py-2">${item.note || '—'}</td>
      </tr>
    `;
  }).join('');
}

function renderStock(){
  const movements = getMovements();
  const stock = movements.reduce((acc, item)=>{
    const key = item.sku || item.product;
    if(!acc[key]){
      acc[key] = {
        product: item.product,
        sku: item.sku,
        category: item.category,
        unit: item.unit,
        quantity: 0
      };
    }
    acc[key].quantity += item.type === 'in' ? item.quantity : -item.quantity;
    return acc;
  }, {});
  const rows = Object.values(stock).sort((a,b)=> (b.quantity||0) - (a.quantity||0));
  if(rows.length === 0){
    stockBox.innerHTML = '<p class="text-xs text-gray-500">Chưa có dữ liệu tồn kho.</p>';
    return;
  }
  stockBox.innerHTML = rows.map(item => `
    <div class="border border-gray-200 rounded-xl px-3 py-2">
      <div class="font-semibold text-brand-blue text-sm">${item.product}</div>
      <div class="text-xs text-gray-500">${item.sku || ''} · ${item.category || 'Chưa phân loại'}</div>
      <div class="text-xs">Tồn: <b>${item.quantity}</b> ${item.unit || ''}</div>
    </div>
  `).join('');
}

function renderCategories(){
  const movements = getMovements();
  const categories = Array.from(new Set(movements.map(item => item.category).filter(Boolean)));
  filterCategory.innerHTML = '<option value="all">Mọi danh mục</option>' + categories.map(c => `<option value="${c}">${c}</option>`).join('');
}
