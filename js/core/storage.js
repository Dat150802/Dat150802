const map={
  customers:'klc_customers',
  care:'klc_care',
  services:'klc_services',
  checklists:'klc_checklists',
  inventory:'klc_inventory',
  finance:'klc_finance',
  deletionRequests:'klc_deletion_requests',
  layout:'klc_layout_config'
};
const USERS_KEY='klc_users';
const BRANDING_KEY='klc_branding';

const DEFAULT_BRANDING={
  title:'KLC Bến Lức',
  tagline:'Cổng nội bộ',
  logo:'assets/img/logo-klc.svg',
  accent:'#0b7c82'
};

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
      if(key===map.layout){
        localStorage.setItem(key, JSON.stringify(DEFAULT_LAYOUT));
      }else{
        localStorage.setItem(key, JSON.stringify([]));
      }
    }
  });
  if(!localStorage.getItem(BRANDING_KEY)){
    localStorage.setItem(BRANDING_KEY, JSON.stringify(DEFAULT_BRANDING));
  }
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

export function getBranding(){
  const stored=localStorage.getItem(BRANDING_KEY);
  if(!stored) return { ...DEFAULT_BRANDING };
  try{
    return { ...DEFAULT_BRANDING, ...JSON.parse(stored) };
  }catch(e){
    console.error('Invalid branding config', e);
    return { ...DEFAULT_BRANDING };
  }
}

export function saveBranding(config){
  const payload={ ...DEFAULT_BRANDING, ...config };
  localStorage.setItem(BRANDING_KEY, JSON.stringify(payload));
}

export function applyBrandingTheme(){
  const branding=getBranding();
  if(typeof document!=='undefined'){
    document.documentElement.style.setProperty('--brand-blue', branding.accent||DEFAULT_BRANDING.accent);
  }
  return branding;
}

export function getDefaultLayout(){
  return cloneLayout(DEFAULT_LAYOUT);
}

export function getLayoutConfig(){
  const stored=readCollection('layout');
  const source=Array.isArray(stored)&&stored.length?stored:DEFAULT_LAYOUT;
  return cloneLayout(source);
}

export function saveLayoutConfig(layout){
  const normalized=normalizeLayout(layout);
  saveCollection('layout', normalized);
}

function cloneLayout(layout){
  return layout.map(item=>({
    ...item,
    links:Array.isArray(item.links)?item.links.map(link=>({ ...link })):undefined
  }));
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
