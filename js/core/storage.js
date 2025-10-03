const DB_KEY='klc_database_v2';
const VERSION_KEY='klc_database_version';
const LEGACY_KEYS={
  customers:'klc_customers',
  care:'klc_care',
  services:'klc_services',
  checklists:'klc_checklists',
  inventory:'klc_inventory',
  finance:'klc_finance',
  deletionRequests:'klc_deletion_requests',
  layout:'klc_layout_config'
};
const LEGACY_USERS_KEY='klc_users';
const LEGACY_BRANDING_KEY='klc_branding';

const DEFAULT_BRANDING={
  title:'KLC Bến Lức',
  tagline:'Cổng nội bộ',
  logo:'assets/img/logo-klc.svg',
  accent:'#0b7c82'
};

const DEFAULT_STAFF=['Đạt','Huỳnh'];

const DEFAULT_LAYOUT=[
  { id:'block_summary', type:'summary', title:'Chỉ số kinh doanh chủ đạo' },
  {
    id:'block_shortcuts',
    type:'shortcuts',
    title:'Lối tắt nhanh',
    links:[
      { label:'Khách hàng', href:'customers.html' },
      { label:'Chăm sóc khách', href:'care.html' },
      { label:'Bảo hành/Bảo dưỡng', href:'service.html' },
      { label:'Thu & Chi', href:'finance.html' }
    ]
  },
  { id:'block_range', type:'range', title:'Báo cáo thu chi theo khoảng ngày' },
  { id:'block_chart', type:'chart', title:'Biểu đồ thu chi 12 tháng' },
  {
    id:'block_media',
    type:'media',
    title:'Logo thương hiệu',
    image:'assets/img/logo-klc.svg',
    caption:'KLC Bến Lức – Đồng hành cùng trải nghiệm chuẩn 5 sao.'
  },
  { id:'block_activity', type:'activities', title:'Hoạt động mới nhất' },
  {
    id:'block_note',
    type:'note',
    title:'Ghi chú điều hành',
    content:'Cập nhật nhanh thông báo nội bộ, phân công và lưu ý quan trọng cho đội ngũ.'
  }
];

let stateCache=null;
let lastVersion=0;
const subscribers=new Map();
let watchersReady=false;
const syncChannel=(typeof window!=='undefined' && 'BroadcastChannel' in window)
  ? new BroadcastChannel('klc-database-sync')
  : null;

function buildDefaultState(){
  return {
    version:Date.now(),
    collections:{
      customers:[],
      care:[],
      services:[],
      checklists:[],
      inventory:[],
      finance:[],
      deletionRequests:[],
      layout:cloneLayout(DEFAULT_LAYOUT)
    },
    users:[
      { username:'admin', password:'klcbenluc@2025', name:'Quản trị viên', role:'admin' },
      { username:'nhanvien', password:'123456', name:'Nhân viên CSKH', role:'staff' }
    ],
    branding:{ ...DEFAULT_BRANDING },
    staff:[...DEFAULT_STAFF]
  };
}

function cloneLayout(layout){
  return layout.map(item=>({
    ...item,
    links:Array.isArray(item.links)?item.links.map(link=>({ ...link })):undefined
  }));
}

function clone(value){
  return value?JSON.parse(JSON.stringify(value)):value;
}

function ensureWatchers(){
  if(watchersReady || typeof window==='undefined') return;
  watchersReady=true;
  try{
    lastVersion=Number(localStorage.getItem(VERSION_KEY)||'0')||0;
  }catch(err){
    lastVersion=0;
  }
  if(syncChannel){
    syncChannel.addEventListener('message',evt=>{
      if(evt?.data?.type==='sync'){
        handleExternalChange(evt.data.version);
      }
    });
  }
  window.addEventListener('storage',evt=>{
    if(evt.key===DB_KEY || evt.key===VERSION_KEY){
      handleExternalChange(evt.newValue);
    }
  });
  const poll=()=>{
    try{
      const stored=Number(localStorage.getItem(VERSION_KEY)||'0');
      if(stored && stored!==lastVersion){
        handleExternalChange(stored);
      }
    }catch(err){
      // ignore polling errors (private mode, etc.)
    }
  };
  poll();
  setInterval(poll,2500);
}

function loadState(){
  if(stateCache) return stateCache;
  ensureWatchers();
  const raw=localStorage.getItem(DB_KEY);
  if(raw){
    try{
      stateCache=JSON.parse(raw);
      lastVersion=Number(stateCache?.version)||Number(localStorage.getItem(VERSION_KEY)||'0')||0;
      return stateCache;
    }catch(err){
      console.error('Invalid state payload, rebuilding', err);
    }
  }
  const state=buildDefaultState();
  migrateLegacyData(state);
  persistState(state,{silent:true});
  stateCache=state;
  lastVersion=Number(state.version)||Date.now();
  return state;
}

function persistState(state,{silent=false}={}){
  state.version=Date.now();
  localStorage.setItem(DB_KEY, JSON.stringify(state));
  localStorage.setItem(VERSION_KEY, String(state.version));
  stateCache=state;
  lastVersion=state.version;
  if(!silent){
    notifyAll();
    broadcastSync(state.version);
  }
}

function migrateLegacyData(target){
  let migrated=false;
  Object.entries(LEGACY_KEYS).forEach(([name,key])=>{
    const raw=localStorage.getItem(key);
    if(raw){
      try{
        const data=JSON.parse(raw);
        if(Array.isArray(data)){
          target.collections[name]=data;
          migrated=true;
        }else if(name==='layout' && Array.isArray(data)){
          target.collections.layout=data;
          migrated=true;
        }
      }catch(err){
        console.warn('Không thể migrate bộ sưu tập', name, err);
      }
    }
  });
  const rawUsers=localStorage.getItem(LEGACY_USERS_KEY);
  if(rawUsers){
    try{
      const users=JSON.parse(rawUsers);
      if(Array.isArray(users) && users.length){
        target.users=users;
        migrated=true;
      }
    }catch(err){
      console.warn('Không thể migrate người dùng', err);
    }
  }
  const rawBranding=localStorage.getItem(LEGACY_BRANDING_KEY);
  if(rawBranding){
    try{
      const branding=JSON.parse(rawBranding);
      target.branding={ ...DEFAULT_BRANDING, ...branding };
      migrated=true;
    }catch(err){
      console.warn('Không thể migrate branding', err);
    }
  }
  if(migrated){
    Object.values(LEGACY_KEYS).forEach(key=>localStorage.removeItem(key));
    localStorage.removeItem(LEGACY_USERS_KEY);
    localStorage.removeItem(LEGACY_BRANDING_KEY);
  }
}

function notifyAll(){
  loadState();
  subscribers.forEach((handlers,name)=>{
    const data=readCollection(name);
    handlers.forEach(fn=>fn(data));
  });
}

function handleExternalChange(versionCandidate){
  let numeric=Number(versionCandidate||0);
  if(!numeric){
    try{
      numeric=Number(localStorage.getItem(VERSION_KEY)||'0');
    }catch(err){
      numeric=0;
    }
  }
  if(!numeric || numeric===lastVersion) return;
  lastVersion=numeric;
  stateCache=null;
  notifyAll();
  if(typeof window!=='undefined'){
    window.dispatchEvent(new CustomEvent('klc:userlist-updated',{ detail:{ users:getUsers() }}));
  }
}

function broadcastSync(version){
  try{
    syncChannel?.postMessage({ type:'sync', version });
  }catch(err){
    console.warn('Không thể phát thông điệp đồng bộ', err);
  }
}

export function subscribeCollection(name,handler){
  if(!subscribers.has(name)){
    subscribers.set(name,new Set());
  }
  subscribers.get(name).add(handler);
  return ()=>subscribers.get(name)?.delete(handler);
}

export function seedIfEmpty(){
  loadState();
}

export function readCollection(name){
  const state=loadState();
  const collection=state.collections?.[name];
  if(collection===undefined) throw new Error('Unknown collection');
  return clone(collection) || [];
}

export function saveCollection(name,data){
  const state=loadState();
  if(!state.collections[name]){
    state.collections[name]=[];
  }
  state.collections[name]=clone(data)||[];
  persistState(state);
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
  data[index]=updater({ ...data[index] });
  saveCollection(name,data);
  return data[index];
}

export function removeItem(name,id){
  const data=readCollection(name);
  const filtered=data.filter(item=>item.id!==id);
  saveCollection(name,filtered);
  return filtered.length!==data.length;
}

export function generateId(prefix='item'){
  return `${prefix}_${Date.now()}_${Math.floor(Math.random()*1000)}`;
}

export function getUsers(){
  const state=loadState();
  return clone(state.users)||[];
}

export function saveUsers(users){
  const state=loadState();
  state.users=clone(users)||[];
  persistState(state);
  if(typeof window!=='undefined'){
    window.dispatchEvent(new CustomEvent('klc:userlist-updated',{ detail:{ users:getUsers() }}));
  }
}

export function removeUser(username){
  const users=getUsers().filter(user=>user.username!==username);
  saveUsers(users);
}

export function getBranding(){
  const state=loadState();
  return { ...DEFAULT_BRANDING, ...clone(state.branding) };
}

export function saveBranding(config){
  const state=loadState();
  state.branding={ ...DEFAULT_BRANDING, ...clone(config) };
  persistState(state);
}

export function applyBrandingTheme(){
  const branding=getBranding();
  if(typeof document!=='undefined'){
    document.documentElement.style.setProperty('--brand-blue', branding.accent||DEFAULT_BRANDING.accent);
  }
  return branding;
}

export function getStaff(){
  const state=loadState();
  return Array.from(new Set([...(state.staff||[]), ...DEFAULT_STAFF])).filter(Boolean);
}

export function saveStaff(list){
  const state=loadState();
  state.staff=Array.from(new Set(list.filter(Boolean)));
  persistState(state);
  if(typeof window!=='undefined'){
    window.dispatchEvent(new CustomEvent('klc:staff-updated',{ detail:{ staff:getStaff() }}));
  }
}

export function getDefaultLayout(){
  return cloneLayout(DEFAULT_LAYOUT);
}

export function getLayoutConfig(){
  const state=loadState();
  const stored=state.collections.layout;
  const source=Array.isArray(stored)&&stored.length?stored:DEFAULT_LAYOUT;
  return cloneLayout(source);
}

export function saveLayoutConfig(layout){
  const state=loadState();
  state.collections.layout=normalizeLayout(layout);
  persistState(state);
}

function normalizeLayout(layout){
  return layout
    .filter(item=>item && item.type)
    .map(item=>{
      const normalized={
        id:item.id||generateId('layout'),
        type:item.type,
        title:item.title||''
      };
      if(item.content){
        normalized.content=item.content;
      }
      if(Array.isArray(item.links)){
        const links=item.links
          .filter(link=>link && (link.label||link.href))
          .map(link=>({
            label:(link.label||'').trim(),
            href:(link.href||'').trim()
          }));
        if(links.length){
          normalized.links=links;
        }
      }
      if(item.image){
        normalized.image=item.image;
      }
      if(item.caption){
        normalized.caption=item.caption;
      }
      if(item.html){
        normalized.html=item.html;
      }
      return normalized;
    });
}
