const KEY = 'klc-data-v1';

const DEFAULT_STATE = {
  users: [
    { username: 'admin', password: 'klcbenluc@2025', name: 'Quản trị viên', role: 'admin', active: true },
    { username: 'nhanvien', password: '123456', name: 'Nhân viên Demo', role: 'staff', active: true }
  ],
  employees: ['Đạt', 'Huỳnh'],
  customers: [],
  careLogs: [],
  service: {
    warranty: [],
    maintenance: []
  },
  checklist: [],
  inventory: {
    movements: []
  },
  finance: {
    transactions: []
  },
  announcements: [
    {
      id: 'announce-1',
      title: 'Chào mừng đến với KLC Bến Lức',
      content: 'Đây là hệ thống quản trị nội bộ chính thức. Vui lòng cập nhật thông tin khách hàng đầy đủ.',
      createdAt: new Date().toISOString()
    }
  ]
};

export function seedIfEmpty(){
  if(!localStorage.getItem(KEY)){
    localStorage.setItem(KEY, JSON.stringify(DEFAULT_STATE));
  }
}

export function getState(){
  const raw = localStorage.getItem(KEY);
  if(!raw){
    seedIfEmpty();
    return structuredClone(DEFAULT_STATE);
  }
  try{
    return JSON.parse(raw);
  }catch(err){
    console.error('Parse state error', err);
    localStorage.setItem(KEY, JSON.stringify(DEFAULT_STATE));
    return structuredClone(DEFAULT_STATE);
  }
}

export function setState(next){
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function updateSection(section, updater){
  const state = getState();
  const current = state[section];
  state[section] = typeof updater === 'function' ? updater(current) : updater;
  setState(state);
  return state[section];
}

export function pushItem(section, item){
  return updateSection(section, list => {
    const arr = Array.isArray(list) ? [...list] : [];
    arr.push(item);
    return arr;
  });
}

export function getUsers(){
  return getState().users || [];
}

export function saveUsers(users){
  const state = getState();
  state.users = users;
  setState(state);
}

export function getEmployees(){
  return getState().employees || [];
}

export function saveEmployees(employees){
  const state = getState();
  state.employees = employees;
  setState(state);
}

export function getAnnouncements(){
  return getState().announcements || [];
}

export function saveAnnouncements(list){
  const state = getState();
  state.announcements = list;
  setState(state);
}

export function downloadState(){
  const blob = new Blob([JSON.stringify(getState(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `klc-ben-luc-backup-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, 0);
}

export function importState(file){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = () => {
      try{
        const parsed = JSON.parse(reader.result);
        setState({ ...DEFAULT_STATE, ...parsed });
        resolve();
      }catch(err){
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export function resetState(){
  localStorage.removeItem(KEY);
  seedIfEmpty();
}

export function generateId(prefix='id'){
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
}

export function saveCollection(path, data){
  const state = getState();
  state[path] = data;
  setState(state);
}

export function upsertArray(section, item, predicate){
  return updateSection(section, list => {
    const arr = Array.isArray(list) ? [...list] : [];
    const index = arr.findIndex(predicate);
    if(index >= 0){
      arr[index] = item;
    }else{
      arr.push(item);
    }
    return arr;
  });
}

