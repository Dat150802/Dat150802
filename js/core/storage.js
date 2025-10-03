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

const nativeLocalStorage=(typeof window!=='undefined' && window.localStorage)?window.localStorage:null;
const memoryStorage=new Map();
const hasLocalStorage=(()=>{
  if(!nativeLocalStorage) return false;
  try{
    const testKey='__klc_storage_test__';
    nativeLocalStorage.setItem(testKey,'1');
    nativeLocalStorage.removeItem(testKey);
    return true;
  }catch(err){
    console.warn('LocalStorage không khả dụng, sẽ sử dụng bộ nhớ tạm thời.', err);
    return false;
  }
})();

function storageGet(key){
  if(hasLocalStorage){
    try{
      const value=nativeLocalStorage.getItem(key);
      if(value!==null && value!==undefined) return value;
    }catch(err){
      console.warn('Không thể đọc localStorage', err);
    }
  }
  return memoryStorage.has(key)?memoryStorage.get(key):null;
}

function storageSet(key,value){
  if(hasLocalStorage){
    try{
      nativeLocalStorage.setItem(key,value);
      memoryStorage.delete(key);
      return true;
    }catch(err){
      console.warn('Không thể ghi localStorage', err);
    }
  }
  memoryStorage.set(key,value);
  return false;
}

function storageRemove(key){
  if(hasLocalStorage){
    try{
      nativeLocalStorage.removeItem(key);
    }catch(err){
      console.warn('Không thể xóa localStorage', err);
    }
  }
  memoryStorage.delete(key);
}

const DEFAULT_BRANDING={
  title:'KLC Bến Lức',
  tagline:'Cổng nội bộ',
  logo:'assets/img/logo-klc.svg',
  accent:'#0b7c82'
};

const DEFAULT_STAFF=['Đạt','Huỳnh'];

const SYNC_CONFIG_KEY='klc_sync_config_v1';
const DEFAULT_SYNC_ENDPOINT='https://jsonstorage.net/api/items/klc-ben-luc-database';
const JSONSTORAGE_CREATE_ENDPOINT='https://jsonstorage.net/api/items';
const SYNC_METADATA_KEY='klc_sync_metadata_v1';
const DEFAULT_SYNC_METADATA={ github:{ sha:'' } };
const DEFAULT_SYNC_CONFIG={
  provider:'jsonstorage',
  enabled:true,
  endpoint:DEFAULT_SYNC_ENDPOINT,
  method:'PUT',
  apiKey:'',
  authScheme:'Bearer',
  headers:[],
  pollInterval:15000,
  githubOwner:'',
  githubRepo:'',
  githubBranch:'main',
  githubPath:'data/klc-database.json',
  githubToken:''
};

let syncConfig=null;
let syncUploadTimer=null;
let syncPullTimer=null;
let syncPushInFlight=false;
let syncPullInFlight=false;
let syncPendingUpload=false;
let syncServiceStarted=false;
let provisioningPromise=null;
let placeholderResolutionInFlight=false;
let syncMetadata=null;
const syncStatus={
  enabled:false,
  lastPush:0,
  lastPull:0,
  lastError:''
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

function normalizeHeaders(headers){
  if(!headers) return [];
  if(typeof headers==='string'){
    return headers.split(/\r?\n/).map(line=>line.trim()).filter(Boolean).map(line=>{
      const [key,...rest]=line.split(':');
      if(!key || !rest.length) return null;
      return { key:key.trim(), value:rest.join(':').trim() };
    }).filter(Boolean);
  }
  if(Array.isArray(headers)){
    return headers
      .map(item=>{
        if(!item) return null;
        const key=(item.key||item.name||'').trim();
        const value=(item.value||item.headerValue||'').trim();
        if(!key || !value) return null;
        return { key, value };
      })
      .filter(Boolean);
  }
  return [];
}

function cloneHeaders(headers){
  return normalizeHeaders(headers).map(item=>({ ...item }));
}

function isJsonStorageProvider(config){
  return (config?.provider||'jsonstorage')==='jsonstorage';
}

function buildGithubRawUrlFromConfig(config){
  const owner=(config.githubOwner||'').trim();
  const repo=(config.githubRepo||'').trim();
  const branch=(config.githubBranch||'').trim();
  const path=(config.githubPath||'').trim().replace(/^\/+/, '');
  if(!owner || !repo || !branch || !path) return '';
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
}

function ensureSyncMetadata(){
  if(syncMetadata) return syncMetadata;
  try{
    const raw=storageGet(SYNC_METADATA_KEY);
    if(raw){
      const parsed=JSON.parse(raw);
      syncMetadata={ ...clone(DEFAULT_SYNC_METADATA)||{}, ...parsed };
    }else{
      syncMetadata=clone(DEFAULT_SYNC_METADATA)||{ github:{ sha:'' } };
    }
  }catch(err){
    syncMetadata=clone(DEFAULT_SYNC_METADATA)||{ github:{ sha:'' } };
  }
  if(!syncMetadata.github || typeof syncMetadata.github!=='object'){
    syncMetadata.github={ sha:'' };
  }
  if(typeof syncMetadata.github.sha!=='string'){
    syncMetadata.github.sha='';
  }
  return syncMetadata;
}

function saveSyncMetadata(){
  try{
    const meta=ensureSyncMetadata();
    storageSet(SYNC_METADATA_KEY, JSON.stringify(meta));
  }catch(err){
    console.warn('Không thể lưu metadata đồng bộ', err);
  }
}

function resetSyncMetadata(){
  syncMetadata=clone(DEFAULT_SYNC_METADATA)||{ github:{ sha:'' } };
  saveSyncMetadata();
}

function updateGithubSha(sha){
  const meta=ensureSyncMetadata();
  meta.github.sha=sha||'';
  saveSyncMetadata();
}

function getGithubSha(){
  const meta=ensureSyncMetadata();
  return meta.github.sha||'';
}

function normalizeSyncConfig(input){
  const payload=clone(input)||{};
  const normalized={
    ...clone(DEFAULT_SYNC_CONFIG),
    ...payload
  };
  normalized.provider=(normalized.provider||'jsonstorage').toLowerCase();
  normalized.headers=normalizeHeaders(payload.headers||normalized.headers);
  normalized.pollInterval=Math.max(5000, Number(normalized.pollInterval)||15000);
  if(normalized.provider==='github'){
    normalized.githubOwner=(normalized.githubOwner||'').trim();
    normalized.githubRepo=(normalized.githubRepo||'').trim();
    normalized.githubBranch=(normalized.githubBranch||'main').trim()||'main';
    normalized.githubPath=(normalized.githubPath||'data/klc-database.json').trim().replace(/^\/+/, '');
    normalized.endpoint=buildGithubRawUrlFromConfig(normalized);
  }else{
    normalized.endpoint=(normalized.endpoint||'').trim()||DEFAULT_SYNC_ENDPOINT;
  }
  return normalized;
}

function configSourceChanged(prev,next){
  const prevProvider=(prev?.provider||'jsonstorage');
  const nextProvider=(next?.provider||'jsonstorage');
  if(prevProvider!==nextProvider) return true;
  if(nextProvider==='github'){
    return (
      (prev.githubOwner||'').trim()!==(next.githubOwner||'').trim() ||
      (prev.githubRepo||'').trim()!==(next.githubRepo||'').trim() ||
      (prev.githubBranch||'').trim()!==(next.githubBranch||'').trim() ||
      (prev.githubPath||'').trim()!==(next.githubPath||'').trim()
    );
  }
  return (prev.endpoint||'').trim()!==(next.endpoint||'').trim();
}

function isPlaceholderEndpoint(endpoint){
  if(!endpoint) return true;
  const normalized=String(endpoint).trim();
  if(!normalized) return true;
  return normalized===DEFAULT_SYNC_ENDPOINT;
}

function notifyEndpointUpdate(endpoint,{ auto=false }={}){
  if(typeof window!=='undefined'){
    window.dispatchEvent(new CustomEvent('klc:sync-endpoint-updated',{ detail:{ endpoint, auto } }));
  }
}

function extractEndpointFromPointer(payload){
  if(!payload || typeof payload!=='object') return '';
  const keys=['endpoint','redirect','target','url','uri'];
  for(const key of keys){
    const value=payload[key];
    if(typeof value==='string' && value.trim()){
      return value.trim();
    }
  }
  if(payload.config && typeof payload.config==='object'){
    return extractEndpointFromPointer(payload.config);
  }
  return '';
}

async function publishPlaceholderPointer(endpoint,{ snapshot=null }={}){
  if(typeof fetch!=='function') return;
  const normalized=(endpoint||'').trim();
  if(!normalized || normalized===DEFAULT_SYNC_ENDPOINT) return;
  try{
    const pointer={
      redirect:normalized,
      endpoint:normalized,
      updated:Date.now()
    };
    if(snapshot && typeof snapshot==='object'){
      pointer.snapshot=snapshot;
    }
    await fetch(DEFAULT_SYNC_ENDPOINT,{
      method:'PUT',
      headers:{ 'Content-Type':'application/json' },
      body:JSON.stringify(pointer),
      cache:'no-store'
    });
  }catch(err){
    console.warn('Không thể cập nhật thông tin chia sẻ kho mặc định.', err);
  }
}

async function resolvePlaceholderEndpoint({ manual=false }={}){
  if(!isJsonStorageProvider(getInternalSyncConfig())) return null;
  if(placeholderResolutionInFlight || typeof fetch!=='function') return null;
  placeholderResolutionInFlight=true;
  try{
    const response=await fetch(DEFAULT_SYNC_ENDPOINT,{ method:'GET', cache:'no-store' });
    if(!response.ok){
      return null;
    }
    const text=await response.text();
    if(!text) return null;
    let payload=null;
    try{
      payload=JSON.parse(text);
    }catch(err){
      console.warn('Không thể đọc cấu trúc kho mặc định.', err);
      return null;
    }
    const endpoint=extractEndpointFromPointer(payload);
    if(endpoint && !isPlaceholderEndpoint(endpoint)){
      syncConfig={
        ...getInternalSyncConfig(),
        endpoint:endpoint.trim(),
        enabled:true
      };
      saveSyncConfigToStorage();
      updateSyncEnabledFlag();
      notifyEndpointUpdate(syncConfig.endpoint,{ auto:true });
      if(payload && typeof payload.snapshot==='object'){
        try{
          const normalized=normalizeRemoteState(payload.snapshot);
          persistState(normalized,{ silent:true, skipSync:true, preserveVersion:true });
          stateCache=normalized;
          lastVersion=Number(normalized.version)||lastVersion;
          notifyAll();
          broadcastSync(lastVersion);
        }catch(err){
          console.warn('Không thể áp dụng snapshot từ kho mặc định.', err);
        }
      }
      restartSyncTimers();
      return syncConfig.endpoint;
    }
    return null;
  }catch(err){
    if(manual) throw err;
    console.warn('Không thể truy vấn kho đồng bộ mặc định.', err);
    return null;
  }finally{
    placeholderResolutionInFlight=false;
  }
}

function loadSyncConfig(){
  if(syncConfig) return syncConfig;
  try{
    const raw=storageGet(SYNC_CONFIG_KEY);
    if(raw){
      const parsed=JSON.parse(raw);
      syncConfig=normalizeSyncConfig(parsed);
    }else{
      syncConfig=normalizeSyncConfig(DEFAULT_SYNC_CONFIG);
    }
  }catch(err){
    syncConfig=normalizeSyncConfig(DEFAULT_SYNC_CONFIG);
  }
  updateSyncEnabledFlag();
  return syncConfig;
}

function getInternalSyncConfig(){
  return syncConfig?syncConfig:loadSyncConfig();
}

function saveSyncConfigToStorage(){
  try{
    const payload={ ...getInternalSyncConfig(), headers:cloneHeaders(syncConfig.headers) };
    storageSet(SYNC_CONFIG_KEY, JSON.stringify(payload));
  }catch(err){
    console.warn('Không thể lưu cấu hình đồng bộ', err);
  }
}

function updateSyncEnabledFlag(){
  const config=getInternalSyncConfig();
  let enabled=false;
  if(typeof fetch==='function'){
    if(isJsonStorageProvider(config)){
      enabled=!!(config.enabled && config.endpoint);
    }else{
      enabled=!!(config.enabled && config.githubOwner && config.githubRepo && config.githubBranch && config.githubPath && config.githubToken);
    }
  }
  syncStatus.enabled=enabled;
  emitSyncStatus();
}

function emitSyncStatus(){
  if(typeof window!=='undefined'){
    window.dispatchEvent(new CustomEvent('klc:sync-updated',{ detail:getSyncStatus() }));
  }
}

function ensureWatchers(){
  if(watchersReady || typeof window==='undefined') return;
  watchersReady=true;
  try{
    lastVersion=Number(storageGet(VERSION_KEY)||'0')||0;
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
      const stored=Number(storageGet(VERSION_KEY)||'0');
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
  const raw=storageGet(DB_KEY);
  if(raw){
    try{
      stateCache=JSON.parse(raw);
      lastVersion=Number(stateCache?.version)||Number(storageGet(VERSION_KEY)||'0')||0;
      startSyncService();
      return stateCache;
    }catch(err){
      console.error('Invalid state payload, rebuilding', err);
    }
  }
  const state=buildDefaultState();
  migrateLegacyData(state);
  persistState(state,{silent:true, skipSync:true});
  stateCache=state;
  lastVersion=Number(state.version)||Date.now();
  startSyncService();
  return state;
}

function persistState(state,{silent=false, skipSync=false, preserveVersion=false}={}){
  if(!preserveVersion){
    state.version=Date.now();
  }else{
    state.version=Number(state.version)||Date.now();
  }
  storageSet(DB_KEY, JSON.stringify(state));
  storageSet(VERSION_KEY, String(state.version));
  stateCache=state;
  lastVersion=state.version;
  if(!skipSync){
    scheduleSyncUpload();
  }
  if(!silent){
    notifyAll();
    broadcastSync(state.version);
  }
}

function scheduleSyncUpload(delay=600){
  const config=getInternalSyncConfig();
  if(!config.enabled || typeof fetch!=='function') return;
  if(isJsonStorageProvider(config)){
    if(!config.endpoint) return;
  }else{
    if(!config.githubOwner || !config.githubRepo || !config.githubBranch || !config.githubPath || !config.githubToken) return;
  }
  if(syncUploadTimer){
    return;
  }
  syncUploadTimer=setTimeout(()=>{
    syncUploadTimer=null;
    pushToRemote().catch(()=>{});
  },Math.max(0,delay));
}

function queueRemotePull(initial=false,delay=0){
  if(syncPullTimer){
    clearTimeout(syncPullTimer);
  }
  syncPullTimer=setTimeout(async()=>{
    await pullFromRemote({ initial });
    const cfg=getInternalSyncConfig();
    if(cfg.enabled && typeof fetch==='function'){
      if(isJsonStorageProvider(cfg)){
        if(!cfg.endpoint) return;
      }else if(!cfg.githubOwner || !cfg.githubRepo || !cfg.githubBranch || !cfg.githubPath || !cfg.githubToken){
        return;
      }
      queueRemotePull(false, cfg.pollInterval||15000);
    }
  },Math.max(0,delay));
}

function restartSyncTimers(){
  if(syncPullTimer){
    clearTimeout(syncPullTimer);
    syncPullTimer=null;
  }
  if(syncUploadTimer){
    clearTimeout(syncUploadTimer);
    syncUploadTimer=null;
  }
  syncPendingUpload=false;
  const config=getInternalSyncConfig();
  if(!config.enabled || typeof fetch!=='function'){
    syncServiceStarted=false;
    return;
  }
  if(isJsonStorageProvider(config)){
    if(!config.endpoint){
      syncServiceStarted=false;
      return;
    }
  }else if(!config.githubOwner || !config.githubRepo || !config.githubBranch || !config.githubPath || !config.githubToken){
    syncServiceStarted=false;
    return;
  }
  syncServiceStarted=true;
  queueRemotePull(true,200);
}

async function pushToRemote({ manual=false }={}){
  let config=getInternalSyncConfig();
  if(!config.enabled || typeof fetch!=='function') return false;
  const useJson=isJsonStorageProvider(config);
  if(useJson){
    if(!config.endpoint) return false;
    if(isPlaceholderEndpoint(config.endpoint)){
      await resolvePlaceholderEndpoint({ manual:false });
      config=getInternalSyncConfig();
    }
  }
  if(syncPushInFlight){
    if(manual){
      throw new Error('Đang có phiên đồng bộ khác đang xử lý.');
    }
    syncPendingUpload=true;
    return false;
  }
  syncPushInFlight=true;
  syncPendingUpload=false;
  syncStatus.lastError='';
  emitSyncStatus();
  try{
    const payload=clone(loadState());
    if(!useJson){
      const success=await pushGithubPayload(config,payload,{ manual });
      if(success){
        syncStatus.lastPush=Date.now();
        syncStatus.lastError='';
        emitSyncStatus();
        return true;
      }
      return false;
    }
    if(isPlaceholderEndpoint(config.endpoint)){
      const provisioned=await provisionRemoteStore({ payload });
      if(provisioned){
        await publishPlaceholderPointer(provisioned,{ snapshot:payload });
        syncStatus.lastPush=Date.now();
        emitSyncStatus();
        return true;
      }
      throw new Error('Không thể khởi tạo kho đồng bộ mặc định.');
    }
    const response=await fetch(config.endpoint,{
      method:config.method||'PUT',
      headers:buildSyncHeaders(config,true),
      body:JSON.stringify(payload),
      cache:'no-store'
    });
    if(response.status===404){
      const provisioned=await provisionRemoteStore({ payload });
      if(provisioned){
        syncStatus.lastPush=Date.now();
        emitSyncStatus();
        return true;
      }
      throw new Error('Kho đồng bộ từ xa không tồn tại và không thể tạo mới.');
    }
    if(!response.ok){
      throw new Error(`Máy chủ trả về mã ${response.status}`);
    }
    await publishPlaceholderPointer(config.endpoint,{ snapshot:payload });
    syncStatus.lastPush=Date.now();
    emitSyncStatus();
    return true;
  }catch(err){
    syncStatus.lastError=err.message||'Không thể đẩy dữ liệu.';
    emitSyncStatus();
    if(manual) throw err;
    console.warn('Không thể đồng bộ lên máy chủ', err);
    return false;
  }finally{
    syncPushInFlight=false;
    if(syncPendingUpload){
      syncPendingUpload=false;
      scheduleSyncUpload(800);
    }
  }
}

async function pullFromRemote({ initial=false, manual=false }={}){
  let config=getInternalSyncConfig();
  if(!config.enabled || typeof fetch!=='function') return false;
  const useJson=isJsonStorageProvider(config);
  if(useJson){
    if(!config.endpoint) return false;
    if(isPlaceholderEndpoint(config.endpoint)){
      await resolvePlaceholderEndpoint({ manual:false });
      config=getInternalSyncConfig();
      if(isPlaceholderEndpoint(config.endpoint)){
        if(initial){
          scheduleSyncUpload(300);
        }
        return false;
      }
    }
  }
  if(syncPullInFlight){
    if(manual){
      throw new Error('Đang tải dữ liệu mới từ máy chủ.');
    }
    return false;
  }
  syncPullInFlight=true;
  syncStatus.lastError='';
  emitSyncStatus();
  try{
    if(!useJson){
      const result=await pullGithubPayload(config,{ initial });
      return result;
    }
    const response=await fetch(config.endpoint,{
      method:'GET',
      headers:buildSyncHeaders(config,false),
      cache:'no-store'
    });
    if(response.status===404){
      if(initial){
        scheduleSyncUpload(300);
      }
      return false;
    }
    if(!response.ok){
      throw new Error(`Máy chủ trả về mã ${response.status}`);
    }
    const text=await response.text();
    if(!text){
      if(initial){
        scheduleSyncUpload(300);
      }
      return false;
    }
    const remote=JSON.parse(text);
    if(remote && typeof remote==='object'){
      const normalized=normalizeRemoteState(remote);
      const remoteVersion=Number(normalized.version)||0;
      if(!lastVersion || remoteVersion>lastVersion){
        persistState(normalized,{ silent:true, skipSync:true, preserveVersion:true });
        stateCache=normalized;
        lastVersion=remoteVersion;
        notifyAll();
        broadcastSync(remoteVersion);
      }
      syncStatus.lastPull=Date.now();
      emitSyncStatus();
      return true;
    }
  }catch(err){
    syncStatus.lastError=err.message||'Không thể tải dữ liệu.';
    emitSyncStatus();
    if(manual) throw err;
    console.warn('Không thể đồng bộ từ máy chủ', err);
  }finally{
    syncPullInFlight=false;
  }
  return false;
}

function normalizeRemoteState(remote){
  const base=buildDefaultState();
  const normalized={
    ...base,
    ...remote,
    collections:{
      ...base.collections,
      ...(remote.collections||{})
    },
    branding:{
      ...base.branding,
      ...(remote.branding||{})
    }
  };
  if(!Array.isArray(normalized.users)) normalized.users=base.users;
  if(!Array.isArray(normalized.staff)) normalized.staff=base.staff;
  return normalized;
}

function buildSyncHeaders(config,isWrite){
  const headers={};
  if(isWrite){
    headers['Content-Type']='application/json';
  }
  const scheme=(config.authScheme||'Bearer').trim();
  if(config.apiKey){
    if(scheme==='Api-Key'){
      headers['X-API-Key']=config.apiKey;
    }else if(scheme && scheme!=='None'){
      headers['Authorization']=`${scheme} ${config.apiKey}`.trim();
    }
  }
  normalizeHeaders(config.headers).forEach(item=>{
    headers[item.key]=item.value;
  });
  return headers;
}

function buildGithubHeaders(config,{ write=false }={}){
  const headers={
    Accept:'application/vnd.github+json',
    'X-GitHub-Api-Version':'2022-11-28'
  };
  if(write){
    headers['Content-Type']='application/json';
  }
  const token=(config.githubToken||'').trim();
  if(token){
    headers['Authorization']=`Bearer ${token}`;
  }
  return headers;
}

function encodeBase64String(value){
  if(typeof value!=='string') value=String(value??'');
  if(typeof btoa==='function' && typeof TextEncoder==='function'){
    const bytes=new TextEncoder().encode(value);
    let binary='';
    bytes.forEach(byte=>{ binary+=String.fromCharCode(byte); });
    return btoa(binary);
  }
  if(typeof btoa==='function'){
    try{
      return btoa(unescape(encodeURIComponent(value)));
    }catch(err){
      return btoa(value);
    }
  }
  if(typeof Buffer!=='undefined'){
    return Buffer.from(value,'utf-8').toString('base64');
  }
  throw new Error('Không thể mã hóa dữ liệu sang Base64.');
}

function decodeBase64String(value){
  const normalized=(value||'').replace(/\s+/g,'');
  if(!normalized) return '';
  if(typeof atob==='function' && typeof TextDecoder==='function'){
    const binary=atob(normalized);
    const length=binary.length;
    const bytes=new Uint8Array(length);
    for(let i=0;i<length;i++){
      bytes[i]=binary.charCodeAt(i);
    }
    return new TextDecoder('utf-8',{ fatal:false }).decode(bytes);
  }
  if(typeof atob==='function'){
    try{
      return decodeURIComponent(escape(atob(normalized)));
    }catch(err){
      return atob(normalized);
    }
  }
  if(typeof Buffer!=='undefined'){
    try{
      return Buffer.from(normalized,'base64').toString('utf-8');
    }catch(err){
      return '';
    }
  }
  return '';
}

async function safeJson(response){
  try{
    return await response.json();
  }catch(err){
    return null;
  }
}

async function ensureGithubBranch(config){
  const owner=(config.githubOwner||'').trim();
  const repo=(config.githubRepo||'').trim();
  const branch=(config.githubBranch||'').trim();
  if(!owner || !repo || !branch) return false;
  const headers=buildGithubHeaders(config);
  const refUrl=`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`;
  const refResponse=await fetch(refUrl,{ headers, cache:'no-store' });
  if(refResponse.ok) return true;
  if(refResponse.status!==404){
    const detail=await safeJson(refResponse);
    throw new Error(detail?.message||`Không thể kiểm tra nhánh ${branch}.`);
  }
  const repoInfoResponse=await fetch(`https://api.github.com/repos/${owner}/${repo}`,{ headers, cache:'no-store' });
  if(!repoInfoResponse.ok){
    const detail=await safeJson(repoInfoResponse);
    throw new Error(detail?.message||'Không thể lấy thông tin repository GitHub.');
  }
  const repoInfo=await repoInfoResponse.json();
  const baseBranch=(repoInfo.default_branch||'main').trim();
  const baseRefResponse=await fetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${baseBranch}`,{ headers, cache:'no-store' });
  if(!baseRefResponse.ok){
    const detail=await safeJson(baseRefResponse);
    throw new Error(detail?.message||`Không thể truy vấn nhánh gốc ${baseBranch}.`);
  }
  const baseRef=await baseRefResponse.json();
  const baseSha=baseRef?.object?.sha;
  if(!baseSha){
    throw new Error('Không tìm thấy commit nguồn để tạo nhánh GitHub.');
  }
  const createResponse=await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`,{
    method:'POST',
    headers:buildGithubHeaders(config,{ write:true }),
    body:JSON.stringify({ ref:`refs/heads/${branch}`, sha:baseSha })
  });
  if(!createResponse.ok && createResponse.status!==422){
    const detail=await safeJson(createResponse);
    throw new Error(detail?.message||'Không thể tạo nhánh đồng bộ trên GitHub.');
  }
  return true;
}

async function fetchGithubRemote(config){
  const owner=(config.githubOwner||'').trim();
  const repo=(config.githubRepo||'').trim();
  const branch=(config.githubBranch||'').trim();
  const path=(config.githubPath||'').trim().replace(/^\/+/, '');
  if(!owner || !repo || !branch || !path){
    throw new Error('Thiếu thông tin GitHub để đồng bộ.');
  }
  const url=`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURI(path)}?ref=${encodeURIComponent(branch)}`;
  const response=await fetch(url,{ headers:buildGithubHeaders(config), cache:'no-store' });
  if(response.status===404){
    return { exists:false };
  }
  if(!response.ok){
    const detail=await safeJson(response);
    throw new Error(detail?.message||`GitHub trả về mã ${response.status}`);
  }
  const data=await response.json();
  const content=decodeBase64String(data.content||'');
  return { exists:true, sha:data.sha||'', text:content };
}

async function pushGithubPayload(config,payload,{ manual=false, retryBranch=false }={}){
  await ensureGithubBranch(config);
  let sha=getGithubSha();
  if(!sha){
    try{
      const existing=await fetchGithubRemote(config);
      if(existing.exists){
        sha=existing.sha||'';
        updateGithubSha(sha);
      }
    }catch(err){
      if(manual) throw err;
    }
  }
  const owner=(config.githubOwner||'').trim();
  const repo=(config.githubRepo||'').trim();
  const path=(config.githubPath||'').trim().replace(/^\/+/, '');
  const url=`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURI(path)}`;
  const body={
    message:`Cập nhật dữ liệu KLC Bến Lức – ${new Date().toISOString()}`,
    content:encodeBase64String(JSON.stringify(payload)),
    branch:config.githubBranch
  };
  if(sha){
    body.sha=sha;
  }
  const response=await fetch(url,{
    method:'PUT',
    headers:buildGithubHeaders(config,{ write:true }),
    body:JSON.stringify(body)
  });
  if(response.status===422){
    const detail=await safeJson(response);
    const message=(detail?.message||'').toLowerCase();
    if(!retryBranch && (message.includes('branch') || message.includes('head') || message.includes('invalid'))){
      await ensureGithubBranch(config);
      updateGithubSha('');
      return pushGithubPayload(config,payload,{ manual, retryBranch:true });
    }
    throw new Error(detail?.message||'Không thể cập nhật dữ liệu trên GitHub.');
  }
  if(!response.ok){
    const detail=await safeJson(response);
    throw new Error(detail?.message||`GitHub trả về mã ${response.status}`);
  }
  const result=await response.json();
  updateGithubSha(result?.content?.sha||'');
  return true;
}

async function pullGithubPayload(config,{ initial=false }={}){
  const remote=await fetchGithubRemote(config);
  if(!remote.exists){
    if(initial){
      scheduleSyncUpload(300);
    }
    return false;
  }
  updateGithubSha(remote.sha||'');
  if(!remote.text){
    if(initial){
      scheduleSyncUpload(300);
    }
    return false;
  }
  try{
    const data=JSON.parse(remote.text);
    if(data && typeof data==='object'){
      const normalized=normalizeRemoteState(data);
      const remoteVersion=Number(normalized.version)||0;
      if(!lastVersion || remoteVersion>lastVersion){
        persistState(normalized,{ silent:true, skipSync:true, preserveVersion:true });
        stateCache=normalized;
        lastVersion=remoteVersion;
        notifyAll();
        broadcastSync(remoteVersion);
      }
      syncStatus.lastPull=Date.now();
      emitSyncStatus();
      return true;
    }
  }catch(err){
    throw new Error('Không thể đọc dữ liệu JSON từ GitHub.');
  }
  return false;
}

async function provisionRemoteStore({ payload=null }={}){
  if(provisioningPromise) return provisioningPromise;
  const config=getInternalSyncConfig();
  if(!config.enabled || typeof fetch!=='function' || !isJsonStorageProvider(config)){
    return null;
  }
  provisioningPromise=(async()=>{
    try{
      const bodyPayload=payload?payload:clone(loadState());
      const response=await fetch(JSONSTORAGE_CREATE_ENDPOINT,{
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body:JSON.stringify(bodyPayload),
        cache:'no-store'
      });
      if(!response.ok){
        throw new Error(`Máy chủ đồng bộ không thể tạo kho mới (mã ${response.status}).`);
      }
      let endpoint=response.headers?.get?.('Location');
      if(endpoint){
        endpoint=endpoint.trim();
      }
      if(!endpoint){
        let text='';
        try{
          text=await response.text();
        }catch(err){
          text='';
        }
        if(text){
          try{
            const data=JSON.parse(text);
            endpoint=data?.uri||data?.url||(data?.id?`${JSONSTORAGE_CREATE_ENDPOINT}/${data.id}`:'');
          }catch(err){
            endpoint='';
          }
        }
      }
      if(!endpoint){
        throw new Error('Máy chủ không trả về địa chỉ kho dữ liệu sau khi khởi tạo.');
      }
      syncConfig={
        ...config,
        endpoint:endpoint.trim()
      };
      saveSyncConfigToStorage();
      updateSyncEnabledFlag();
      notifyEndpointUpdate(syncConfig.endpoint,{ auto:true });
      syncStatus.lastPush=Date.now();
      syncStatus.lastError='';
      emitSyncStatus();
      restartSyncTimers();
      try{
        await publishPlaceholderPointer(syncConfig.endpoint,{ snapshot:bodyPayload });
      }catch(err){
        console.warn('Không thể phát hành thông tin kho đồng bộ mới.', err);
      }
      return syncConfig.endpoint;
    }catch(err){
      syncStatus.lastError=err.message||'Không thể tạo kho đồng bộ mới.';
      emitSyncStatus();
      console.error('Không thể khởi tạo kho đồng bộ mặc định', err);
      return null;
    }finally{
      provisioningPromise=null;
    }
  })();
  return provisioningPromise;
}

function startSyncService(){
  if(syncServiceStarted) return;
  syncServiceStarted=true;
  restartSyncTimers();
}

function migrateLegacyData(target){
  let migrated=false;
  Object.entries(LEGACY_KEYS).forEach(([name,key])=>{
    const raw=storageGet(key);
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
  const rawUsers=storageGet(LEGACY_USERS_KEY);
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
  const rawBranding=storageGet(LEGACY_BRANDING_KEY);
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
    Object.values(LEGACY_KEYS).forEach(key=>storageRemove(key));
    storageRemove(LEGACY_USERS_KEY);
    storageRemove(LEGACY_BRANDING_KEY);
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
      numeric=Number(storageGet(VERSION_KEY)||'0');
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

export function getSyncConfig(){
  const config=getInternalSyncConfig();
  return { ...config, headers:cloneHeaders(config.headers) };
}

export function saveSyncConfig(config){
  const previous=clone(getInternalSyncConfig());
  const merged={ ...previous, ...config };
  syncConfig=normalizeSyncConfig(merged);
  saveSyncConfigToStorage();
  updateSyncEnabledFlag();
  restartSyncTimers();
  notifyEndpointUpdate(syncConfig.endpoint,{ auto:false });
  if(isJsonStorageProvider(syncConfig)){
    const pointerPromise=publishPlaceholderPointer(syncConfig.endpoint,{ snapshot:clone(loadState()) });
    if(pointerPromise && typeof pointerPromise.catch==='function'){
      pointerPromise.catch(err=>console.warn('Không thể cập nhật liên kết đồng bộ mặc định.', err));
    }
  }
  if(configSourceChanged(previous,syncConfig)){
    resetSyncMetadata();
  }
  return getSyncConfig();
}

export function getSyncStatus(){
  return { ...syncStatus };
}

export async function testSyncConnection(){
  let config=getInternalSyncConfig();
  if(typeof fetch!=='function'){
    throw new Error('Trình duyệt hiện tại không hỗ trợ đồng bộ từ xa.');
  }
  if(!config.enabled){
    throw new Error('Chưa bật đồng bộ hoặc chưa nhập thông tin máy chủ.');
  }
  try{
    if(!isJsonStorageProvider(config)){
      if(!config.githubOwner || !config.githubRepo || !config.githubBranch || !config.githubPath || !config.githubToken){
        throw new Error('Cấu hình GitHub chưa đầy đủ (owner, repository, branch, path, token).');
      }
      await ensureGithubBranch(config);
      await fetchGithubRemote(config);
      return true;
    }
    if(!config.endpoint){
      throw new Error('Chưa nhập địa chỉ máy chủ JSON.');
    }
    if(isPlaceholderEndpoint(config.endpoint)){
      await resolvePlaceholderEndpoint({ manual:true });
      config=getInternalSyncConfig();
      if(isPlaceholderEndpoint(config.endpoint)){
        const provisioned=await provisionRemoteStore({ payload:clone(loadState()) });
        if(!provisioned){
          throw new Error(syncStatus.lastError||'Không thể khởi tạo kho đồng bộ mặc định.');
        }
        return true;
      }
    }
    const response=await fetch(config.endpoint,{
      method:'GET',
      headers:buildSyncHeaders(config,false),
      cache:'no-store'
    });
    if(response.status===404) return true;
    if(!response.ok){
      throw new Error(`Máy chủ trả về mã ${response.status}`);
    }
    return true;
  }catch(err){
    throw new Error(err.message||'Không thể kết nối máy chủ đồng bộ.');
  }
}

export async function triggerSyncNow(mode='both'){
  let config=getInternalSyncConfig();
  if(typeof fetch!=='function'){
    throw new Error('Trình duyệt hiện tại không hỗ trợ đồng bộ từ xa.');
  }
  if(!config.enabled){
    throw new Error('Đồng bộ chưa được bật.');
  }
  if(!isJsonStorageProvider(config)){
    if(!config.githubOwner || !config.githubRepo || !config.githubBranch || !config.githubPath || !config.githubToken){
      throw new Error('Cấu hình GitHub chưa đầy đủ để đồng bộ.');
    }
  }else{
    if(!config.endpoint){
      throw new Error('Chưa nhập địa chỉ máy chủ JSON.');
    }
    if(isPlaceholderEndpoint(config.endpoint)){
      await resolvePlaceholderEndpoint({ manual:true });
      config=getInternalSyncConfig();
      if(isPlaceholderEndpoint(config.endpoint)){
        const provisioned=await provisionRemoteStore({ payload:clone(loadState()) });
        if(!provisioned){
          throw new Error(syncStatus.lastError||'Không thể khởi tạo kho đồng bộ mặc định.');
        }
      }
    }
  }
  if(mode==='pull' || mode==='both'){
    await pullFromRemote({ manual:true });
  }
  if(mode==='push' || mode==='both'){
    await pushToRemote({ manual:true });
  }
  return getSyncStatus();
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
