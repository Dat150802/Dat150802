import { getUsers, saveUsers, getState, setState } from './storage.js';

const SESSION_KEY = 'klc-session';
const SESSION_TEMP = 'klc-session-temp';
const REMEMBER_DAYS = 30;

function persistSession(data, remember){
  const payload = { ...data, remember, issuedAt: Date.now(), expiresAt: remember ? Date.now() + REMEMBER_DAYS*24*60*60*1000 : null };
  sessionStorage.setItem(SESSION_TEMP, JSON.stringify(payload));
  if(remember){
    localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  }else{
    localStorage.removeItem(SESSION_KEY);
  }
  return payload;
}

function readSession(){
  const rawTemp = sessionStorage.getItem(SESSION_TEMP);
  if(rawTemp){
    try{
      const parsed = JSON.parse(rawTemp);
      if(parsed.expiresAt && parsed.expiresAt < Date.now()){
        clearSession();
        return null;
      }
      return parsed;
    }catch(e){
      sessionStorage.removeItem(SESSION_TEMP);
    }
  }
  const raw = localStorage.getItem(SESSION_KEY);
  if(!raw) return null;
  try{
    const parsed = JSON.parse(raw);
    if(parsed.expiresAt && parsed.expiresAt < Date.now()){
      clearSession();
      return null;
    }
    sessionStorage.setItem(SESSION_TEMP, raw);
    return parsed;
  }catch(e){
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function getCurrentUser(){
  const session = readSession();
  if(!session) return null;
  const users = getUsers();
  const user = users.find(u => u.username === session.username);
  if(!user || user.active === false){
    clearSession();
    return null;
  }
  return { username: user.username, name: user.name, role: user.role, remember: session.remember };
}

export async function login(username, password, remember=false){
  const users = getUsers();
  const found = users.find(u => u.username === username && u.password === password);
  if(!found){
    throw new Error('Sai tài khoản hoặc mật khẩu');
  }
  if(found.active === false){
    throw new Error('Tài khoản đã bị vô hiệu hoá');
  }
  persistSession({ username: found.username, name: found.name, role: found.role }, remember);
  return { username: found.username, name: found.name, role: found.role };
}

export function requireAuth(){
  const user = getCurrentUser();
  if(!user){
    window.location.href = 'index.html';
    return null;
  }
  return user;
}

export function clearSession(){
  sessionStorage.removeItem(SESSION_TEMP);
  localStorage.removeItem(SESSION_KEY);
}

export function logout(){
  clearSession();
  window.location.href = 'index.html';
}

export function ensureAdmin(){
  const user = requireAuth();
  if(user && user.role !== 'admin'){
    return false;
  }
  return true;
}

export function updateUserStatus(username, data){
  const users = getUsers();
  const next = users.map(u => u.username === username ? { ...u, ...data } : u);
  saveUsers(next);
}

export function updateUserPassword(username, password){
  const users = getUsers();
  const next = users.map(u => u.username === username ? { ...u, password } : u);
  saveUsers(next);
}
