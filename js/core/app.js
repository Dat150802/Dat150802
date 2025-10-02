import { requireAuth, logout } from './auth.js';
import { getUsers, saveUsers } from './storage.js';

const navItems=[
  { id:'dashboard', label:'Tổng quan', href:'dashboard.html', icon:'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0h6', roles:['admin','staff'] },
  { id:'customers', label:'Khách hàng', href:'customers.html', icon:'M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z', roles:['admin','staff'] },
  { id:'care', label:'Chăm sóc khách', href:'care.html', icon:'M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z', roles:['admin','staff'] },
  { id:'service', label:'Bảo hành & bảo dưỡng', href:'service.html', icon:'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', roles:['admin','staff'] },
  { id:'checklist', label:'CheckList công việc', href:'checklist.html', icon:'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', roles:['admin','staff'] },
  { id:'inventory', label:'Tồn kho', href:'inventory.html', icon:'M3 3h18v4H3zM3 9h18v12H3z', roles:['admin','staff'] },
  { id:'finance', label:'Thu & Chi', href:'finance.html', icon:'M12 8c-1.657 0-3 1.343-3 3h6c0-1.657-1.343-3-3-3zm0 9c1.657 0 3-1.343 3-3H9c0 1.657 1.343 3 3 3zm0-13c4.97 0 9 4.03 9 9s-4.03 9-9 9-9-4.03-9-9 4.03-9 9-9z', roles:['admin','staff'] },
  { id:'system', label:'Thiết lập hệ thống', href:'system.html', icon:'M10.325 4.317l.177-.616A1 1 0 0111.463 3h1.074a1 1 0 01.961.701l.177.616a1.724 1.724 0 002.573 1.066l.543-.314a1 1 0 011.366.366l.537.93a1 1 0 01-.21 1.3l-.492.401a1.724 1.724 0 000 2.666l.492.401a1 1 0 01.21 1.3l-.537.93a1 1 0 01-1.366.366l-.543-.314a1.724 1.724 0 00-2.573 1.066l-.177.616a1 1 0 01-.961.701h-1.074a1 1 0 01-.961-.701l-.177-.616a1.724 1.724 0 00-2.573-1.066l-.543.314a1 1 0 01-1.366-.366l-.537-.93a1 1 0 01.21-1.3l.492-.401a1.724 1.724 0 000-2.666l-.492-.401a1 1 0 01-.21-1.3l.537-.93a1 1 0 011.366-.366l.543.314a1.724 1.724 0 002.573-1.066z', roles:['admin'] }
];

export function initApp(currentId){
  const user=requireAuth();
  buildSidebar(currentId,user);
  buildTopbar(user);
  buildMobileNav(currentId,user);
  return user;
}

function buildSidebar(currentId,user){
  const sidebar=document.getElementById('app-sidebar');
  if(!sidebar) return;
  sidebar.innerHTML=`<div class="px-6 py-6 flex items-center gap-3 border-b border-white/10">
      <img src="assets/img/logo.svg" class="h-10" alt="KLC"/>
      <div>
        <div class="text-lg font-semibold">KLC Bến Lức</div>
        <div class="text-sm text-slate-300">Nội bộ</div>
      </div>
    </div>
    <nav class="px-4 py-6 space-y-1">
      ${navItems.filter(item=>item.roles.includes(user.role)).map(item=>`
        <a href="${item.href}" class="nav-link ${item.id===currentId?'active':''}">
          <svg fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="${item.icon}"/></svg>
          <span>${item.label}</span>
        </a>
      `).join('')}
    </nav>`;
}

function buildTopbar(user){
  const topbar=document.getElementById('app-topbar');
  if(!topbar) return;
  topbar.innerHTML=`<div class="flex flex-col">
      <span class="text-sm text-slate-500">Chào mừng trở lại,</span>
      <span class="font-semibold text-brand-blue text-lg">${user.name}</span>
    </div>
    <div class="flex items-center gap-3">
      <span class="badge ${user.role==='admin'?'badge-info':'badge-warning'}">${user.role==='admin'?'Quản trị viên':'Nhân viên'}</span>
      <button id="btn-logout" class="px-4 py-2 rounded-xl bg-white text-brand-blue border border-brand-blue">Đăng xuất</button>
    </div>`;
  document.getElementById('btn-logout').addEventListener('click',()=>logout());
}

function buildMobileNav(currentId,user){
  const nav=document.getElementById('app-mobile-nav');
  if(!nav) return;
  nav.innerHTML=navItems.filter(item=>item.roles.includes(user.role)).map(item=>
    `<a class="mobile-nav-item ${item.id===currentId?'active':''}" href="${item.href}">${item.label}</a>`
  ).join('');
}

export function ensureAdminUserList(){
  const table=document.getElementById('system-user-table');
  if(!table) return;
  const users=getUsers();
  table.innerHTML=users.map(user=>`<tr>
      <td class="px-3 py-2 font-semibold">${user.username}</td>
      <td class="px-3 py-2">${user.name}</td>
      <td class="px-3 py-2">${user.role==='admin'?'Quản trị viên':'Nhân viên'}</td>
    </tr>`).join('');
}

export function addUser(account){
  const users=getUsers();
  users.push(account);
  saveUsers(users);
  ensureAdminUserList();
}
