export function showLoading(message='Đang xử lý…'){
  const overlay=document.getElementById('app-loading');
  if(!overlay) return;
  overlay.innerHTML=`<div class="loading-box"><div class="spinner"></div><div>${message}</div></div>`;
  overlay.classList.add('active');
}

export function hideLoading(){
  const overlay=document.getElementById('app-loading');
  if(!overlay) return;
  overlay.classList.remove('active');
  overlay.innerHTML='';
}

const toastStack=document.getElementById('toast-stack');
export function toast(message,type='info',title='Thông báo'){
  if(!toastStack) return;
  const el=document.createElement('div');
  el.className=`toast ${type}`;
  el.innerHTML=`<div><div class="toast-title">${title}</div><div class="toast-message">${message}</div></div>`;
  toastStack.appendChild(el);
  setTimeout(()=>{
    el.classList.add('opacity-0');
    setTimeout(()=>el.remove(),300);
  },3200);
}

export function confirmAction(message){
  return new Promise((resolve)=>{
    const ok=window.confirm(message);
    resolve(ok);
  });
}

export function bindSearch(input, callback){
  let timer;
  input.addEventListener('input',()=>{
    clearTimeout(timer);
    timer=setTimeout(()=>callback(input.value.trim()),200);
  });
}
