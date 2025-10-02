import { mountFrame, toast, showLoading, hideLoading, formatDate } from '../core/ui.js';
import { getEmployees, saveEmployees, getUsers, saveUsers, getAnnouncements, saveAnnouncements, downloadState, importState, resetState, generateId } from '../core/storage.js';
import { getCurrentUser } from '../core/auth.js';

const user = getCurrentUser();
const isAdmin = user?.role === 'admin';

const empInput = document.getElementById('emp-input');
const empAddBtn = document.getElementById('emp-add');
const empList = document.getElementById('emp-list');
const userList = document.getElementById('user-list');
const announceList = document.getElementById('announce-list');
const announceTitle = document.getElementById('announce-title');
const announceContent = document.getElementById('announce-content');
const announceSave = document.getElementById('announce-save');
const announceForm = document.getElementById('announce-form');

mountFrame('system');

if(!isAdmin){
  empInput.disabled = true;
  empAddBtn.disabled = true;
  empAddBtn.classList.add('opacity-60');
  announceForm.classList.add('opacity-60');
  announceForm.querySelectorAll('input,textarea,button').forEach(el => el.disabled = true);
}

renderEmployees();
renderUsers();
renderAnnouncements();

bindEvents();

function bindEvents(){
  if(isAdmin){
    empAddBtn.addEventListener('click', addEmployee);
    announceSave.addEventListener('click', addAnnouncement);
  }
  document.getElementById('btn-export').addEventListener('click', ()=>{
    downloadState();
    toast('Đã xuất dữ liệu thành công.', 'success');
  });
  document.getElementById('file-import').addEventListener('change', async (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    showLoading('Đang nhập dữ liệu…');
    try{
      await importState(file);
      toast('Nhập dữ liệu thành công. Trang sẽ tải lại.', 'success');
      setTimeout(()=> location.reload(), 600);
    }catch(err){
      console.error(err);
      toast('Tập tin không hợp lệ.', 'error');
    }finally{
      hideLoading();
      e.target.value = '';
    }
  });
  document.getElementById('btn-reset').addEventListener('click', ()=>{
    if(confirm('Bạn có chắc muốn xoá toàn bộ dữ liệu LocalStorage?')){
      resetState();
      toast('Đã đặt lại dữ liệu.', 'success');
      setTimeout(()=> location.reload(), 500);
    }
  });
}

function renderEmployees(){
  const employees = getEmployees();
  if(employees.length === 0){
    empList.innerHTML = '<li class="text-xs text-gray-500">Chưa có nhân viên.</li>';
    return;
  }
  empList.innerHTML = employees.map(name => `
    <li class="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-xl border">
      <span>${name}</span>
      ${isAdmin ? `<button data-remove="${name}" class="text-xs text-red-500">Xoá</button>` : ''}
    </li>
  `).join('');
  if(isAdmin){
    empList.querySelectorAll('[data-remove]').forEach(btn => btn.addEventListener('click', ()=> removeEmployee(btn.dataset.remove)));
  }
}

function addEmployee(){
  const name = empInput.value.trim();
  if(!name){
    toast('Vui lòng nhập tên nhân viên.', 'error');
    return;
  }
  const employees = getEmployees();
  if(employees.includes(name)){
    toast('Nhân viên đã tồn tại.', 'error');
    return;
  }
  saveEmployees([...employees, name]);
  empInput.value = '';
  toast('Đã thêm nhân viên.', 'success');
  renderEmployees();
}

function removeEmployee(name){
  const next = getEmployees().filter(item => item !== name);
  saveEmployees(next);
  toast('Đã xoá nhân viên.', 'success');
  renderEmployees();
}

function renderUsers(){
  const users = getUsers();
  userList.innerHTML = users.map(u => `
    <tr class="border-b border-gray-100">
      <td class="px-3 py-2">${u.username}</td>
      <td class="px-3 py-2">${u.name}</td>
      <td class="px-3 py-2">${u.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}</td>
      <td class="px-3 py-2">
        ${isAdmin ? `<label class="inline-flex items-center gap-2 text-sm"><input type="checkbox" data-user="${u.username}" ${u.active !== false ? 'checked' : ''}> Hoạt động</label>` : (u.active !== false ? 'Đang hoạt động' : 'Đã khoá')}
      </td>
    </tr>
  `).join('');
  if(isAdmin){
    userList.querySelectorAll('[data-user]').forEach(el => el.addEventListener('change', e => toggleUser(e.target.dataset.user, e.target.checked)));
  }
}

function toggleUser(username, active){
  const users = getUsers().map(u => u.username === username ? { ...u, active } : u);
  saveUsers(users);
  toast('Đã cập nhật trạng thái người dùng.', 'success');
}

function renderAnnouncements(){
  const announcements = getAnnouncements().sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));
  if(announcements.length === 0){
    announceList.innerHTML = '<p class="text-xs text-gray-500">Chưa có thông báo.</p>';
    return;
  }
  announceList.innerHTML = announcements.map(item => `
    <div class="border border-gray-200 rounded-xl px-3 py-2">
      <div class="flex items-center justify-between">
        <span class="font-semibold text-brand-blue">${item.title}</span>
        <span class="text-xs text-gray-400">${formatDate(item.createdAt)}</span>
      </div>
      <p class="text-sm text-gray-600 whitespace-pre-line">${item.content}</p>
      ${isAdmin ? `<button data-announce="${item.id}" class="mt-2 text-xs text-red-500">Xoá</button>` : ''}
    </div>
  `).join('');
  if(isAdmin){
    announceList.querySelectorAll('[data-announce]').forEach(btn => btn.addEventListener('click', ()=> removeAnnouncement(btn.dataset.announce)));
  }
}

function addAnnouncement(){
  const title = announceTitle.value.trim();
  const content = announceContent.value.trim();
  if(!title || !content){
    toast('Vui lòng nhập tiêu đề và nội dung.', 'error');
    return;
  }
  const announcements = getAnnouncements();
  announcements.push({ id: generateId('ann'), title, content, createdAt: new Date().toISOString() });
  saveAnnouncements(announcements);
  announceTitle.value = '';
  announceContent.value = '';
  toast('Đã đăng thông báo.', 'success');
  renderAnnouncements();
}

function removeAnnouncement(id){
  const announcements = getAnnouncements().filter(item => item.id !== id);
  saveAnnouncements(announcements);
  toast('Đã xoá thông báo.', 'success');
  renderAnnouncements();
}
