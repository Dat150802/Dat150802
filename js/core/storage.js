const map={
  customers:'klc_customers',
  care:'klc_care',
  services:'klc_services',
  checklists:'klc_checklists',
  inventory:'klc_inventory',
  finance:'klc_finance'
};
const USERS_KEY='klc_users';

export function readCollection(name){
  const key=map[name];
  if(!key) throw new Error('Unknown collection');
  return JSON.parse(localStorage.getItem(key)||'[]');
}

export function saveCollection(name,data){
  const key=map[name];
  if(!key) throw new Error('Unknown collection');
  localStorage.setItem(key, JSON.stringify(data));
}

export function appendItem(name,item){
  const data=readCollection(name);
  data.unshift(item);
  saveCollection(name,data);
  return item;
}

export function updateItem(name,id,updater){
  const data=readCollection(name);
  const index=data.findIndex(item=>item.id===id);
  if(index===-1) return null;
  data[index]=updater(data[index]);
  saveCollection(name,data);
  return data[index];
}

export function removeItem(name,id){
  const data=readCollection(name);
  const filtered=data.filter(item=>item.id!==id);
  saveCollection(name,filtered);
  return filtered.length!==data.length;
}

export function seedIfEmpty(){
  if(!localStorage.getItem(USERS_KEY)){
    const users=[
      { username:'admin', password:'klcbenluc@2025', name:'Quản trị viên', role:'admin' },
      { username:'nhanvien', password:'123456', name:'Nhân viên CSKH', role:'staff' }
    ];
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
  Object.values(map).forEach(key=>{
    if(!localStorage.getItem(key)){
      localStorage.setItem(key, JSON.stringify([]));
    }
  });
}

export function generateId(prefix='item'){
  return `${prefix}_${Date.now()}_${Math.floor(Math.random()*1000)}`;
}

export function getUsers(){
  return JSON.parse(localStorage.getItem(USERS_KEY)||'[]');
}

export function saveUsers(users){
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}
