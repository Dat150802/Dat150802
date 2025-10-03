import { appendItem, readCollection, saveCollection, generateId } from './storage.js';

export function getDeletionRequests(){
  return readCollection('deletionRequests');
}

export function getPendingDeletionIds(collection){
  return new Set(
    getDeletionRequests()
      .filter(item=>item.collection===collection && item.status==='pending')
      .map(item=>item.targetId)
  );
}

export function submitDeletionRequest(collection, record, user, reason){
  if(!record?.id) throw new Error('Thiếu thông tin bản ghi để yêu cầu xóa.');
  const pending=getDeletionRequests();
  const hasPending=pending.some(item=>item.collection===collection && item.targetId===record.id && item.status==='pending');
  if(hasPending){
    throw new Error('Đã tồn tại yêu cầu xóa đang chờ duyệt cho bản ghi này.');
  }
  const payload={
    id:generateId('del'),
    collection,
    targetId:record.id,
    targetLabel:record.name||record.title||record.product||record.task||record.phone||'Bản ghi',
    snapshot:record,
    reason,
    status:'pending',
    requestedBy:user.username,
    requestedName:user.name,
    createdAt:new Date().toISOString()
  };
  appendItem('deletionRequests', payload);
  return payload;
}

export function resolveDeletionRequest(id, status, note=''){
  const requests=getDeletionRequests();
  const index=requests.findIndex(item=>item.id===id);
  if(index===-1) return null;
  requests[index]={
    ...requests[index],
    status,
    note,
    resolvedAt:new Date().toISOString()
  };
  saveCollection('deletionRequests', requests);
  return requests[index];
}

export function resolvePendingByRecord(collection, targetId, status, note=''){
  const requests=getDeletionRequests();
  let updated=false;
  const next=requests.map(item=>{
    if(item.collection===collection && item.targetId===targetId && item.status==='pending'){
      updated=true;
      return {
        ...item,
        status,
        note,
        resolvedAt:new Date().toISOString()
      };
    }
    return item;
  });
  if(updated){
    saveCollection('deletionRequests', next);
  }
}
