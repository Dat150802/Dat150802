import { requireAuth, logout, getCurrentUser } from './auth.js';
import { getAnnouncements, seedIfEmpty } from './storage.js';

let loadingCount = 0;

export function showLoading(message='Đang xử lý…'){
  loadingCount += 1;
  const container = document.getElementById('app-loading');
  if(!container) return;
  container.innerHTML = `<div class="backdrop"><div class="bg-white/90 rounded-2xl px-6 py-5 flex flex-col items-center gap-3"><div class="loading-spinner"></div><p class="text-sm font-medium text-brand-blue">${message}</p></div></div>`;
}

export function hideLoading(){
  loadingCount = Math.max(loadingCount-1, 0);
  if(loadingCount === 0){
    const container = document.getElementById('app-loading');
    if(container) container.innerHTML = '';
  }
}

export function toast(message, type='info', timeout=3500){
  const stack = document.getElementById('toast-stack');
  if(!stack) return;
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span>${message}</span><button class="text-white/80 text-sm">Đóng</button>`;
  const remove = ()=>{
    el.classList.add('opacity-0','translate-y-2');
    setTimeout(()=>{ el.remove(); }, 200);
  };
  el.querySelector('button').addEventListener('click', remove);
  stack.appendChild(el);
  setTimeout(remove, timeout);
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Trang chủ', href: 'dashboard.html', roles: ['admin','staff'], icon: '📊' },
  { id: 'customers', label: 'Khách hàng', href: 'customers.html', roles: ['admin','staff'], icon: '🧾' },
  { id: 'care', label: 'CSKH', href: 'care.html', roles: ['admin','staff'], icon: '🤝' },
  { id: 'service', label: 'Bảo hành & Bảo dưỡng', href: 'service.html', roles: ['admin','staff'], icon: '🛠️' },
  { id: 'checklist', label: 'CheckList Công việc', href: 'checklist.html', roles: ['admin','staff'], icon: '🗓️' },
  { id: 'inventory', label: 'Tồn kho', href: 'inventory.html', roles: ['admin','staff'], icon: '📦' },
  { id: 'finance', label: 'Thu & Chi', href: 'finance.html', roles: ['admin','staff'], icon: '💰' },
  { id: 'system', label: 'Thông báo / Hệ thống', href: 'system.html', roles: ['admin','staff'], icon: '📣' }
];

export function mountFrame(activeId){
  seedIfEmpty();
  const user = requireAuth();
  if(!user) return;

  const header = document.getElementById('app-header');
  if(header){
    header.innerHTML = `
      <div class="flex items-center gap-3">
        <img src="assets/img/logo.svg" class="h-10" alt="KLC logo"/>
        <div>
          <p class="font-semibold text-white">KLC Bến Lức</p>
          <p class="text-xs text-white/80">Nền tảng quản trị nội bộ</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <div class="text-sm text-white/80 text-right">
          <p>${user.name}</p>
          <p class="text-xs uppercase">${user.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}</p>
        </div>
        <button id="btn-logout" class="px-3 py-1.5 rounded-lg bg-white/10 text-sm">Đăng xuất</button>
      </div>
    `;
    header.querySelector('#btn-logout').addEventListener('click', ()=>{
      logout();
    });
  }

  const sidebar = document.getElementById('app-sidebar');
  const mobile = document.getElementById('app-mobile-nav');
  const items = NAV_ITEMS.filter(item => item.roles.includes(user.role));

  const renderNav = (container, variant='sidebar') => {
    if(!container) return;
    container.innerHTML = items.map(item => {
      const active = item.id === activeId;
      if(variant === 'sidebar'){
        return `<a href="${item.href}" class="nav-item ${active?'bg-white/10 text-white font-semibold':''}">${item.icon} ${item.label}</a>`;
      }
      return `<a href="${item.href}" class="flex-1 text-center text-sm py-2 rounded-xl ${active?'bg-white text-brand-blue font-semibold':'text-white/80'}">${item.icon}</a>`;
    }).join('');
  };

  renderNav(sidebar, 'sidebar');
  renderNav(mobile, 'mobile');

  if(user.role === 'staff'){
    const banner = document.createElement('div');
    banner.className = 'mb-4 px-4 py-3 bg-white border border-yellow-200 text-sm rounded-2xl shadow-sm';
    banner.innerHTML = '<b>Chế độ nhân viên:</b> Bạn đang xem dữ liệu, mọi form sẽ ở chế độ chỉ đọc.';
    const main = document.querySelector('main');
    if(main){
      main.prepend(banner);
    }
  }

  mountAnnouncements();
}

function mountAnnouncements(){
  const target = document.querySelector('[data-announcements]');
  if(!target) return;
  const announcements = getAnnouncements().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  target.innerHTML = announcements.map(item => `
    <div class="p-3 rounded-xl bg-white shadow-sm border border-gray-200">
      <div class="flex items-center justify-between mb-1">
        <span class="font-semibold text-brand-blue">${item.title}</span>
        <span class="text-xs text-gray-500">${formatDate(item.createdAt)}</span>
      </div>
      <p class="text-sm text-gray-600 whitespace-pre-line">${item.content}</p>
    </div>
  `).join('');
}

export function formatDate(date){
  if(!date) return '';
  const d = new Date(date);
  if(Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString('vi-VN');
}

export function formatDateTime(date){
  if(!date) return '';
  const d = new Date(date);
  if(Number.isNaN(d.getTime())) return date;
  return d.toLocaleString('vi-VN');
}

export function formatCurrency(value){
  if(!value && value !== 0) return '';
  return Number(value).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
}

export function openModal(title, content){
  closeModal();
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal-panel">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-brand-blue">${title}</h3>
        <button class="text-sm text-gray-500" data-close>&times;</button>
      </div>
      <div class="space-y-3 text-sm">${content}</div>
    </div>
  `;
  backdrop.addEventListener('click', e => {
    if(e.target === backdrop || e.target.hasAttribute('data-close')){
      closeModal();
    }
  });
  document.body.appendChild(backdrop);
}

export function closeModal(){
  document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
}

export function debounce(fn, wait=300){
  let t;
  return (...args)=>{
    clearTimeout(t);
    t = setTimeout(()=>fn(...args), wait);
  };
}

export function toggleFormDisabled(form, disabled){
  if(!form) return;
  [...form.querySelectorAll('input,select,textarea,button')].forEach(el => {
    if(el.dataset.ignoreDisable === 'true') return;
    if(disabled && el.tagName.toLowerCase() === 'button' && el.type !== 'button'){
      el.disabled = true;
    }
    if(el.type === 'button'){
      if(disabled && !el.classList.contains('allow-staff')){
        el.disabled = true;
        el.classList.add('opacity-70');
      }else{
        el.disabled = false;
        el.classList.remove('opacity-70');
      }
    }else{
      el.disabled = disabled;
    }
  });
}

