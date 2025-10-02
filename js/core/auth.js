import { toast } from './ui.js';

const SESSION_KEY='klc_session';
const SESSION_EXP_KEY='klc_session_exp';
const SESSION_DURATION=1000*60*60*24*30; // 30 days
const USERS_KEY='klc_users';

export function login(username,password,remember){
  return new Promise((resolve,reject)=>{
    setTimeout(()=>{
      const users=JSON.parse(localStorage.getItem(USERS_KEY)||'[]');
      const user=users.find(u=>u.username===username);
      if(!user || user.password!==password){
        reject(new Error('Sai tài khoản hoặc mật khẩu.'));
        return;
      }
      const payload={ username:user.username, role:user.role, name:user.name, loginAt:Date.now() };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
      if(remember){
        localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
        localStorage.setItem(SESSION_EXP_KEY, String(Date.now()+SESSION_DURATION));
      }else{
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(SESSION_EXP_KEY);
      }
      resolve(payload);
    },400);
  });
}

export function getCurrentUser(){
  const session=sessionStorage.getItem(SESSION_KEY);
  if(session){
    return JSON.parse(session);
  }
  const exp=localStorage.getItem(SESSION_EXP_KEY);
  if(exp && Date.now()>Number(exp)){
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_EXP_KEY);
    return null;
  }
  const stored=localStorage.getItem(SESSION_KEY);
  return stored?JSON.parse(stored):null;
}

export function requireAuth(){
  const user=getCurrentUser();
  if(!user){
    toast('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.','error');
    setTimeout(()=>location.href='index.html',600);
    throw new Error('Unauthenticated');
  }
  return user;
}

export function logout(){
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_EXP_KEY);
  toast('Bạn đã đăng xuất khỏi hệ thống.','info');
  setTimeout(()=>location.href='index.html',300);
}

export function ensurePermission(user, action){
  if(user.role==='admin') return true;
  if(action==='read') return true;
  toast('Bạn không có quyền thực hiện thao tác này.','error');
  return false;
}
