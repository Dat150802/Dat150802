import { initApp, ensureAdminUserList, addUser } from './core/app.js';
import { toast } from './core/ui.js';
import { getUsers } from './core/storage.js';

const user=initApp('system');
ensureAdminUserList();

const form=document.getElementById('user-form');
const resetBtn=document.getElementById('user-reset');

if(user.role!=='admin'){
  document.getElementById('system-form-wrapper').classList.add('hidden');
  document.getElementById('system-warning').classList.remove('hidden');
}else{
  form.addEventListener('submit',evt=>{
    evt.preventDefault();
    const formData=new FormData(form);
    const payload={
      username:formData.get('username'),
      name:formData.get('name'),
      password:formData.get('password'),
      role:formData.get('role')
    };
    if(!payload.username || !payload.password){
      toast('Vui lòng nhập đầy đủ tài khoản và mật khẩu.','error');
      return;
    }
    const users=getUsers();
    if(users.some(item=>item.username===payload.username)){
      toast('Tài khoản đã tồn tại.','error');
      return;
    }
    addUser(payload);
    form.reset();
    toast('Đã thêm người dùng mới.','success');
  });
  if(resetBtn){
    resetBtn.addEventListener('click',()=>form.reset());
  }
}
