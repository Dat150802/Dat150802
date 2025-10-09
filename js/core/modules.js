import { getPageModulesConfig, getDefaultPageModules } from './storage.js';

export function applyPageModules(pageId){
  if(typeof document==='undefined') return;
  const config=mergeWithDefaults(pageId);
  document.querySelectorAll(`[data-module-page="${pageId}"]`).forEach(section=>{
    const moduleId=section.dataset.moduleId;
    if(!moduleId) return;
    const visible=config[moduleId] !== false;
    section.classList.toggle('hidden', !visible);
  });
}

export function watchPageModules(pageId){
  if(typeof window==='undefined') return;
  window.addEventListener('klc:modules-updated',()=>applyPageModules(pageId));
}

function mergeWithDefaults(pageId){
  const defaults=getDefaultPageModules();
  const config=getPageModulesConfig();
  return { ...(defaults[pageId]||{}), ...(config[pageId]||{}) };
}
