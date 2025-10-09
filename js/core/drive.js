const DRIVE_DISCOVERY_DOCS=['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
const DRIVE_SCOPES='https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.appdata';

let gapiLoaded=false;
let initPromise=null;
let driveConfig=null;
let driveState={
  ready:false,
  signedIn:false,
  fileId:'',
  profile:null,
  error:''
};
const listeners=new Set();

function emit(){
  const snapshot={...driveState};
  listeners.forEach(listener=>{
    try{ listener(snapshot); }catch(err){ console.error('Drive listener error',err); }
  });
  if(typeof window!=='undefined'){
    window.dispatchEvent(new CustomEvent('klc:drive-status',{ detail:snapshot }));
  }
}

function updateState(patch){
  driveState={...driveState,...patch};
  emit();
}

export function subscribeDriveStatus(listener){
  if(typeof listener==='function'){ listeners.add(listener); }
  return ()=>listeners.delete(listener);
}

export function getDriveStatus(){
  return { ...driveState };
}

function ensureScript(){
  if(gapiLoaded) return Promise.resolve();
  if(initPromise) return initPromise;
  initPromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='https://apis.google.com/js/api.js';
    script.async=true;
    script.onload=()=>{
      gapiLoaded=true;
      resolve();
    };
    script.onerror=()=>reject(new Error('Không thể tải Google API.'));
    document.head.appendChild(script);
  });
  return initPromise;
}

function loadClient(){
  return new Promise((resolve,reject)=>{
    if(!window.gapi) return reject(new Error('Google API chưa sẵn sàng.'));
    window.gapi.load('client:auth2',{
      callback:resolve,
      onerror:()=>reject(new Error('Không thể khởi tạo Google API client.'))
    });
  });
}

export async function initDriveClient(config){
  if(!config?.clientId || !config?.apiKey){
    updateState({ ready:false, signedIn:false, error:'Chưa cấu hình Client ID/API Key.' });
    throw new Error('Thiếu Client ID hoặc API Key.');
  }
  driveConfig={ ...config };
  await ensureScript();
  await loadClient();
  if(window.gapi?.client?.getToken){
    // noop when already initialised with new auth flow
  }
  const auth=window.gapi.auth2?.getAuthInstance();
  if(auth){
    // Already initialised with different config? reset if changed
    const current=auth.currentUser.get();
    updateState({
      ready:true,
      signedIn:auth.isSignedIn.get(),
      profile:current?.getBasicProfile?{
        name:current.getBasicProfile().getName(),
        email:current.getBasicProfile().getEmail()
      }:null,
      error:''
    });
    return;
  }
  await window.gapi.client.init({
    apiKey:config.apiKey,
    clientId:config.clientId,
    discoveryDocs:DRIVE_DISCOVERY_DOCS,
    scope:DRIVE_SCOPES
  });
  const instance=window.gapi.auth2.getAuthInstance();
  instance.isSignedIn.listen(handleSignedIn);
  handleSignedIn(instance.isSignedIn.get());
}

function handleSignedIn(isSignedIn){
  const instance=window.gapi.auth2.getAuthInstance();
  const user=isSignedIn?instance.currentUser.get():null;
  const profile=user?.getBasicProfile?.();
  updateState({
    ready:true,
    signedIn:isSignedIn,
    profile:profile?{
      name:profile.getName(),
      email:profile.getEmail()
    }:null,
    error:''
  });
}

export async function ensureDriveAuth(config){
  await initDriveClient(config);
  const instance=window.gapi.auth2.getAuthInstance();
  if(!instance) throw new Error('Không thể khởi tạo xác thực Google.');
  if(!instance.isSignedIn.get()){
    await instance.signIn();
  }
  return true;
}

export async function driveSignOut(){
  const instance=window.gapi.auth2?.getAuthInstance?.();
  if(instance){
    await instance.signOut();
    updateState({ signedIn:false, fileId:'' });
  }
}

function getParents(folderId){
  if(!folderId) return ['root'];
  return [folderId];
}

function encodeMultipart(metadata,data){
  const boundary='-------klc-drive-sync-' + Math.random().toString(16).slice(2);
  const delimiter=`--${boundary}\r\n`;
  const closeDelimiter=`--${boundary}--`;
  const base64Data=btoa(unescape(encodeURIComponent(typeof data==='string'?data:JSON.stringify(data))));
  return {
    body:
      delimiter + 'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) + '\r\n' +
      delimiter + 'Content-Type: application/json\r\n' +
      'Content-Transfer-Encoding: base64\r\n\r\n' +
      base64Data + '\r\n' +
      closeDelimiter,
    boundary
  };
}

export async function ensureDriveFile(config){
  await ensureDriveAuth(config);
  const gapi=window.gapi;
  const name=config.fileName||'klc-database.json';
  const folderId=config.folderId||'';
  const parents=getParents(folderId);
  if(config.fileId){
    updateState({ fileId:config.fileId });
    return { fileId:config.fileId, created:false };
  }
  const query=[`name='${name.replace(/'/g,"\\'")}'`,`trashed=false`];
  if(folderId){
    query.push(`'${folderId}' in parents`);
  }
  const list=await gapi.client.drive.files.list({
    q:query.join(' and '),
    fields:'files(id, name, modifiedTime)',
    spaces:'drive'
  });
  const files=list.result?.files||[];
  if(files.length){
    const file=files[0];
    updateState({ fileId:file.id });
    return { fileId:file.id, created:false };
  }
  const metadata={ name, mimeType:'application/json', parents };
  const { body, boundary }=encodeMultipart(metadata, JSON.stringify({}));
  const created=await gapi.client.request({
    path:'/upload/drive/v3/files',
    method:'POST',
    params:{ uploadType:'multipart' },
    headers:{ 'Content-Type':'multipart/related; boundary='+boundary },
    body
  });
  const fileId=created.result?.id;
  if(!fileId) throw new Error('Không thể tạo file sao lưu trên Google Drive.');
  updateState({ fileId });
  return { fileId, created:true };
}

export async function downloadDriveFile(fileId){
  await ensureDriveAuth(driveConfig);
  const response=await window.gapi.client.drive.files.get({ fileId, alt:'media' });
  if(response?.body){
    return JSON.parse(response.body);
  }
  return null;
}

export async function uploadDriveFile(fileId,data,config){
  await ensureDriveAuth(config||driveConfig);
  const metadata={ name:config?.fileName||driveConfig?.fileName||'klc-database.json' };
  const { body, boundary }=encodeMultipart(metadata,data);
  await window.gapi.client.request({
    path:`/upload/drive/v3/files/${fileId}`,
    method:'PATCH',
    params:{ uploadType:'multipart' },
    headers:{ 'Content-Type':'multipart/related; boundary='+boundary },
    body
  });
  updateState({ fileId });
}

export async function exportDriveFile(fileId){
  await ensureDriveAuth(driveConfig);
  const response=await window.gapi.client.drive.files.get({ fileId, alt:'media' });
  const text=response?.body||'{}';
  return new Blob([text],{ type:'application/json' });
}

export function setDriveConfig(config){
  driveConfig={ ...config };
}
