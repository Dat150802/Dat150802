import { initApp, ensureAdminUserList, addUser } from './core/app.js';
import { toast, confirmAction } from './core/ui.js';
import {
  getUsers,
  getLayoutConfig,
  saveLayoutConfig,
  getDefaultLayout,
  getBranding,
  saveBranding,
  applyBrandingTheme,
  removeItem,
  removeUser,
  getStaff,
  saveStaff
} from './core/storage.js';
import { getDeletionRequests, resolveDeletionRequest } from './core/deletion.js';

const user=initApp('system');
ensureAdminUserList();
bindUserActions();

const isAdmin=user.role==='admin';
const form=document.getElementById('user-form');
const resetBtn=document.getElementById('user-reset');

if(!isAdmin){
  document.getElementById('system-form-wrapper').classList.add('hidden');
  document.getElementById('system-warning').classList.remove('hidden');
  document.querySelectorAll('[data-admin-only]').forEach(el=>el.classList.add('hidden'));
}else{
  setupUserForm();
  setupBrandingSection();
  setupLayoutBuilder();
  renderDeletionRequests();
  setupStaffManager();
}

window.addEventListener('klc:userlist-updated',()=>{
  ensureAdminUserList();
  bindUserActions();
});

function setupUserForm(){
  form.addEventListener('submit',evt=>{
    evt.preventDefault();
    const formData=new FormData(form);
    const payload={
      username:formData.get('username'),
      name:formData.get('name'),
      password:formData.get('password'),
      role:formData.get('role')
    };
    if(!payload.username || !payload.password){
      toast('Vui lòng nhập đầy đủ tài khoản và mật khẩu.','error');
      return;
    }
    const users=getUsers();
    if(users.some(item=>item.username===payload.username)){
      toast('Tài khoản đã tồn tại.','error');
      return;
    }
    addUser(payload);
    form.reset();
    toast('Đã thêm người dùng mới.','success');
  });
  if(resetBtn){
    resetBtn.addEventListener('click',()=>form.reset());
  }
}

function bindUserActions(){
  if(!isAdmin) return;
  const table=document.getElementById('system-user-table');
  if(!table) return;
  table.querySelectorAll('[data-action="delete-user"]').forEach(btn=>{
    btn.removeEventListener('click',handleUserDeleteListener);
    btn.addEventListener('click',handleUserDeleteListener);
  });
}

function handleUserDeleteListener(evt){
  const username=evt.currentTarget.dataset.username;
  handleUserDelete(username);
}

async function handleUserDelete(username){
  if(username==='admin'){
    toast('Không thể xóa tài khoản mặc định.','error');
    return;
  }
  if(username===user.username){
    toast('Bạn không thể tự xóa tài khoản đang đăng nhập.','error');
    return;
  }
  if(!await confirmAction(`Xóa tài khoản "${username}"?`)) return;
  removeUser(username);
  toast('Đã xóa tài khoản người dùng.','success');
  ensureAdminUserList();
}

function setupBrandingSection(){
  const brandingForm=document.getElementById('branding-form');
  if(!brandingForm) return;
  const previewLogo=document.getElementById('branding-preview');
  const previewTitle=document.getElementById('branding-preview-title');
  const previewTagline=document.getElementById('branding-preview-tagline');
  const uploadInput=document.getElementById('branding-upload');
  const saveBtn=document.getElementById('branding-save');
  const resetBtn=document.getElementById('branding-reset');
  let branding=getBranding();
  let uploadedLogo='';

  function applyPreview(){
    previewLogo.src=branding.logo||'assets/img/logo-klc.svg';
    previewTitle.textContent=branding.title||'KLC Bến Lức';
    previewTagline.textContent=branding.tagline||'Cổng nội bộ';
    brandingForm.elements.title.value=branding.title||'';
    brandingForm.elements.tagline.value=branding.tagline||'';
    brandingForm.elements.logoUrl.value='';
    brandingForm.elements.accent.value=branding.accent||'#0b7c82';
  }

  applyPreview();

  brandingForm.addEventListener('input',evt=>{
    if(evt.target.name==='title'){
      previewTitle.textContent=evt.target.value||'KLC Bến Lức';
    }
    if(evt.target.name==='tagline'){
      previewTagline.textContent=evt.target.value||'Cổng nội bộ';
    }
    if(evt.target.name==='accent'){
      document.documentElement.style.setProperty('--brand-blue', evt.target.value||'#0b7c82');
    }
  });

  if(uploadInput){
    uploadInput.addEventListener('change',()=>{
      const file=uploadInput.files?.[0];
      if(!file) return;
      const reader=new FileReader();
      reader.onload=()=>{
        uploadedLogo=reader.result;
        previewLogo.src=uploadedLogo;
      };
      reader.readAsDataURL(file);
    });
  }

  if(saveBtn){
    saveBtn.addEventListener('click',evt=>{
      evt.preventDefault();
      const formData=new FormData(brandingForm);
      const payload={
        title:formData.get('title')||'KLC Bến Lức',
        tagline:formData.get('tagline')||'Cổng nội bộ',
        accent:formData.get('accent')||'#0b7c82'
      };
      const url=formData.get('logoUrl');
      if(uploadedLogo){
        payload.logo=uploadedLogo;
      }else if(url){
        payload.logo=url;
      }else{
        payload.logo=branding.logo;
      }
      saveBranding(payload);
      branding=getBranding();
      applyBrandingTheme();
      applyPreview();
      uploadedLogo='';
      toast('Đã cập nhật nhận diện thương hiệu.','success');
    });
  }

  if(resetBtn){
    resetBtn.addEventListener('click',evt=>{
      evt.preventDefault();
      uploadedLogo='';
      saveBranding({});
      branding=getBranding();
      applyBrandingTheme();
      applyPreview();
      toast('Đã khôi phục nhận diện mặc định.','success');
    });
  }
}

function setupStaffManager(){
  const form=document.getElementById('staff-form');
  const input=document.getElementById('staff-input');
  const list=document.getElementById('staff-list');
  if(!form || !input || !list) return;
  let staff=getStaff();

  function render(){
    if(!staff.length){
      list.innerHTML='<span class="text-sm text-slate-500">Chưa có nhân viên nào.</span>';
      return;
    }
    list.innerHTML=staff.map(name=>
      `<span class="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-sm flex items-center gap-2">
        <span>${name}</span>
        <button type="button" class="text-rose-600" data-role="remove-staff" data-name="${name}">×</button>
      </span>`
    ).join('');
    list.querySelectorAll('[data-role="remove-staff"]').forEach(btn=>{
      btn.addEventListener('click',()=>removeStaff(btn.dataset.name));
    });
  }

  function removeStaff(name){
    staff=staff.filter(item=>item!==name);
    saveStaff(staff);
    toast(`Đã loại ${name} khỏi danh sách nhân viên.`,'info');
    staff=getStaff();
    render();
  }

  form.addEventListener('submit',evt=>{
    evt.preventDefault();
    const name=input.value.trim();
    if(!name){
      toast('Vui lòng nhập tên nhân viên.','error');
      return;
    }
    if(staff.includes(name)){
      toast('Tên nhân viên đã có trong danh sách.','error');
      return;
    }
    staff=[name, ...staff];
    saveStaff(staff);
    toast('Đã thêm nhân viên mới.','success');
    input.value='';
    staff=getStaff();
    render();
  });

  window.addEventListener('klc:staff-updated',evt=>{
    staff=evt.detail.staff;
    render();
  });

  render();
}

function setupLayoutBuilder(){
  const palette=document.getElementById('builder-palette');
  const canvas=document.getElementById('builder-canvas');
  const saveBtn=document.getElementById('builder-save');
  const resetBtn=document.getElementById('builder-reset');
  if(!palette || !canvas) return;

  const library=[
    { type:'summary', label:'Khối chỉ số', description:'Hiển thị 4 chỉ số quan trọng.', unique:true },
    { type:'range', label:'Báo cáo khoảng ngày', description:'Form lọc thu chi theo ngày.', unique:true },
    { type:'chart', label:'Biểu đồ thu chi', description:'Biểu đồ đường 12 tháng.', unique:true },
    { type:'activities', label:'Hoạt động mới', description:'Danh sách hoạt động gần nhất.', unique:true },
    { type:'shortcuts', label:'Lối tắt nhanh', description:'Nhóm nút truy cập nhanh theo nhu cầu.', unique:false },
    { type:'media', label:'Hình ảnh / logo', description:'Chèn logo, banner hoặc hình minh hoạ.', unique:false },
    { type:'html', label:'Khối HTML', description:'Biên tập nội dung nâng cao với HTML.', unique:false },
    { type:'note', label:'Ghi chú tuỳ chỉnh', description:'Khối văn bản do bạn biên soạn.', unique:false }
  ];

  let layout=getLayoutConfig();

  function renderPalette(){
    palette.innerHTML=library.map(block=>{
      const disabled=block.unique && layout.some(item=>item.type===block.type);
      return `<div class="builder-tile ${disabled?'disabled':''}" draggable="${disabled?'false':'true'}" data-type="${block.type}">
          <div class="font-semibold text-brand-blue">${block.label}</div>
          <div class="text-xs text-slate-500">${block.description}</div>
        </div>`;
    }).join('');
    palette.querySelectorAll('.builder-tile').forEach(tile=>{
      if(tile.classList.contains('disabled')) return;
      tile.addEventListener('dragstart',evt=>{
        evt.dataTransfer.setData('text/plain',`palette:${tile.dataset.type}`);
      });
    });
  }

  function renderCanvas(){
    if(!layout.length){
      canvas.innerHTML='<div class="builder-placeholder">Kéo thả khối từ thư viện ở bên trái để bổ sung vào trang.</div>';
      return;
    }
    canvas.innerHTML='';
    layout.forEach((block,index)=>{
      const item=document.createElement('div');
      item.className='builder-item';
      item.draggable=true;
      item.dataset.index=String(index);
      item.addEventListener('dragstart',evt=>{
        evt.dataTransfer.setData('text/plain',`canvas:${index}`);
      });
      item.addEventListener('dragover',evt=>{
        evt.preventDefault();
        item.classList.add('drag-over');
      });
      item.addEventListener('dragleave',()=>item.classList.remove('drag-over'));
      item.addEventListener('drop',evt=>{
        evt.preventDefault();
        item.classList.remove('drag-over');
        handleDrop(index, evt.dataTransfer.getData('text/plain'));
      });

      const header=document.createElement('header');
      header.innerHTML=`<span class="badge badge-info">${labelForType(block.type)}</span>`;
      const actions=document.createElement('div');
      actions.className='builder-item-actions';
      const removeBtn=document.createElement('button');
      removeBtn.type='button';
      removeBtn.className='px-3 py-1 rounded-lg border border-rose-200 text-rose-600';
      removeBtn.textContent='Xóa khối';
      removeBtn.addEventListener('click',()=>{
        layout.splice(index,1);
        renderCanvas();
        renderPalette();
      });
      actions.appendChild(removeBtn);
      header.appendChild(actions);
      item.appendChild(header);

      renderBlockEditor(item, block);

      canvas.appendChild(item);
    });
  }

  function renderBlockEditor(container, block){
    switch(block.type){
      case 'note':{
        container.appendChild(createTitleInput(block, block.title||'Ghi chú nội bộ'));
        const textArea=document.createElement('textarea');
        textArea.placeholder='Nội dung ghi chú hiển thị trên trang tổng quan';
        textArea.value=block.content||'';
        textArea.addEventListener('input',()=>{
          block.content=textArea.value;
        });
        container.appendChild(textArea);
        break;
      }
      case 'shortcuts':{
        if(!Array.isArray(block.links)){
          block.links=[];
        }
        if(!block.links.length){
          block.links.push({ label:'', href:'' });
        }
        container.appendChild(createTitleInput(block, block.title||'Lối tắt nhanh'));
        container.appendChild(buildShortcutEditor(block));
        break;
      }
      case 'media':{
        if(!block.image){
          block.image='assets/img/logo-klc.svg';
        }
        container.appendChild(createTitleInput(block, block.title||'Logo thương hiệu'));
        container.appendChild(buildMediaEditor(block));
        break;
      }
      case 'html':{
        container.appendChild(createTitleInput(block, block.title||'Khối HTML tuỳ chỉnh'));
        container.appendChild(buildHtmlEditor(block));
        break;
      }
      default:{
        container.appendChild(createTitleInput(block, block.title||labelForType(block.type)));
      }
    }
  }

  function createTitleInput(block, fallback){
    const input=document.createElement('input');
    input.className='builder-item-title';
    input.value=block.title||fallback||'';
    input.placeholder='Tiêu đề hiển thị';
    input.addEventListener('input',()=>{
      block.title=input.value;
    });
    return input;
  }

  function buildShortcutEditor(block){
    const wrapper=document.createElement('div');
    wrapper.className='builder-shortcut-list';
    block.links.forEach((link,idx)=>{
      const row=document.createElement('div');
      row.className='builder-shortcut-row';
      const labelInput=document.createElement('input');
      labelInput.placeholder='Tên hiển thị';
      labelInput.value=link.label||'';
      labelInput.addEventListener('input',()=>{
        block.links[idx].label=labelInput.value;
      });
      const hrefInput=document.createElement('input');
      hrefInput.placeholder='Đường dẫn (vd: customers.html hoặc https://...)';
      hrefInput.value=link.href||'';
      hrefInput.addEventListener('input',()=>{
        block.links[idx].href=hrefInput.value;
      });
      row.appendChild(labelInput);
      row.appendChild(hrefInput);
      const removeBtn=document.createElement('button');
      removeBtn.type='button';
      removeBtn.className='remove-shortcut';
      removeBtn.textContent='Xóa';
      removeBtn.addEventListener('click',()=>{
        block.links.splice(idx,1);
        renderCanvas();
      });
      row.appendChild(removeBtn);
      wrapper.appendChild(row);
    });
    const addBtn=document.createElement('button');
    addBtn.type='button';
    addBtn.className='builder-add-shortcut';
    addBtn.textContent='Thêm lối tắt';
    addBtn.addEventListener('click',()=>{
      block.links.push({ label:'', href:'' });
      renderCanvas();
    });
    const helper=document.createElement('div');
    helper.className='builder-html-note';
    helper.textContent='Có thể nhập đường dẫn nội bộ (customers.html) hoặc liên kết ngoài (https://...).';
    const container=document.createElement('div');
    container.appendChild(wrapper);
    container.appendChild(addBtn);
    container.appendChild(helper);
    return container;
  }

  function buildMediaEditor(block){
    const container=document.createElement('div');
    container.className='builder-media-controls';
    const preview=document.createElement('img');
    preview.className='builder-media-preview';
    preview.src=block.image||'assets/img/logo-klc.svg';
    preview.alt='Xem trước hình ảnh';
    container.appendChild(preview);

    const urlInput=document.createElement('input');
    urlInput.className='input-brand';
    urlInput.placeholder='Hoặc dán đường dẫn hình ảnh (https://...)';
    urlInput.value=block.image && !String(block.image).startsWith('data:')?block.image:'';
    urlInput.addEventListener('input',()=>{
      block.image=urlInput.value;
      preview.src=block.image||'assets/img/logo-klc.svg';
    });
    container.appendChild(urlInput);

    const upload=document.createElement('input');
    upload.type='file';
    upload.accept='image/*';
    upload.className='input-brand';
    upload.addEventListener('change',()=>{
      const file=upload.files?.[0];
      if(!file) return;
      const reader=new FileReader();
      reader.onload=()=>{
        block.image=reader.result;
        preview.src=reader.result;
        urlInput.value='';
      };
      reader.readAsDataURL(file);
      upload.value='';
    });
    container.appendChild(upload);

    const captionInput=document.createElement('input');
    captionInput.className='input-brand';
    captionInput.placeholder='Chú thích hình ảnh (tùy chọn)';
    captionInput.value=block.caption||'';
    captionInput.addEventListener('input',()=>{
      block.caption=captionInput.value;
    });
    container.appendChild(captionInput);

    const helper=document.createElement('div');
    helper.className='builder-html-note';
    helper.textContent='Hình ảnh được lưu kèm theo bố cục – ưu tiên ảnh nền trong suốt (PNG, SVG).';
    container.appendChild(helper);

    return container;
  }

  function buildHtmlEditor(block){
    const container=document.createElement('div');
    const textarea=document.createElement('textarea');
    textarea.placeholder='Nhập nội dung HTML (p, h2, ul, li, strong, a, ...).';
    textarea.value=block.html||'';
    textarea.addEventListener('input',()=>{
      block.html=textarea.value;
    });
    container.appendChild(textarea);
    const helper=document.createElement('div');
    helper.className='builder-html-note';
    helper.textContent='Nội dung HTML sẽ được hiển thị cho toàn bộ người dùng. Hệ thống tự động loại bỏ script để bảo mật.';
    container.appendChild(helper);
    return container;
  }

  function handleDrop(targetIndex,data){
    const index=Number.isInteger(targetIndex)?targetIndex:Number(targetIndex);
    if(!data) return;
    if(data.startsWith('palette:')){
      const type=data.split(':')[1];
      addBlock(type,index);
      return;
    }
    if(data.startsWith('canvas:')){
      const fromIndex=Number(data.split(':')[1]);
      if(Number.isNaN(fromIndex) || fromIndex===index) return;
      const [moved]=layout.splice(fromIndex,1);
      layout.splice(index,0,moved);
      renderCanvas();
      renderPalette();
    }
  }

  function addBlock(type,targetIndex){
    const libEntry=library.find(item=>item.type===type);
    if(!libEntry) return;
    if(libEntry.unique && layout.some(item=>item.type===type)){
      toast('Khối này chỉ có thể xuất hiện một lần.','info');
      return;
    }
    const baseTitle=labelForType(type);
    const newBlock={ id:`${type}_${Date.now()}`, type, title:baseTitle };
    if(type==='note'){
      newBlock.content='Ghi chú mới – cập nhật nội dung tại đây.';
    }else if(type==='shortcuts'){
      newBlock.links=[
        { label:'Khách hàng', href:'customers.html' },
        { label:'Chăm sóc khách', href:'care.html' },
        { label:'Bảo hành/Bảo dưỡng', href:'service.html' }
      ];
    }else if(type==='media'){
      newBlock.image='assets/img/logo-klc.svg';
      newBlock.caption='Logo thương hiệu KLC Bến Lức';
    }else if(type==='html'){
      newBlock.html='<p>Nhập nội dung HTML tại đây…</p>';
    }
    const index=Number(targetIndex);
    if(Number.isInteger(index)){
      layout.splice(index,0,newBlock);
    }else{
      layout.push(newBlock);
    }
    renderCanvas();
    renderPalette();
  }

  canvas.addEventListener('dragover',evt=>{
    evt.preventDefault();
  });
  canvas.addEventListener('drop',evt=>{
    evt.preventDefault();
    const data=evt.dataTransfer.getData('text/plain');
    if(!layout.length){
      handleDrop(0,data);
    }else{
      addBlockFromDrop(data);
    }
  });

  function addBlockFromDrop(data){
    if(data.startsWith('palette:')){
      addBlock(data.split(':')[1]);
    }else if(data.startsWith('canvas:')){
      const fromIndex=Number(data.split(':')[1]);
      if(Number.isNaN(fromIndex)) return;
      const [moved]=layout.splice(fromIndex,1);
      layout.push(moved);
      renderCanvas();
      renderPalette();
    }
  }

  if(saveBtn){
    saveBtn.addEventListener('click',evt=>{
      evt.preventDefault();
      saveLayoutConfig(layout);
      toast('Đã lưu bố cục trang tổng quan.','success');
    });
  }

  if(resetBtn){
    resetBtn.addEventListener('click',evt=>{
      evt.preventDefault();
      layout=getDefaultLayout();
      renderCanvas();
      renderPalette();
      toast('Đã khôi phục bố cục mặc định.','info');
    });
  }

  renderPalette();
  renderCanvas();
}

function renderDeletionRequests(){
  const tableBody=document.getElementById('deletion-requests-body');
  if(!tableBody) return;
  const requests=getDeletionRequests();
  if(!requests.length){
    tableBody.innerHTML='<tr><td colspan="6" class="px-3 py-3 text-center text-slate-500">Chưa có yêu cầu xóa nào.</td></tr>';
    return;
  }
  const sorted=[...requests].sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0));
  tableBody.innerHTML=sorted.map(req=>{
    const label=labelForCollection(req.collection);
    const statusBadge=req.status==='pending'
      ?'<span class="badge badge-warning">Chờ duyệt</span>'
      :req.status==='approved'
        ?'<span class="badge badge-success">Đã duyệt</span>'
        :'<span class="badge badge-danger">Từ chối</span>';
    const actions=req.status==='pending'
      ?`<button class="px-3 py-1 rounded-lg border border-emerald-200 text-emerald-600" data-action="approve" data-id="${req.id}">Duyệt & xóa</button>
         <button class="px-3 py-1 rounded-lg border border-slate-300 text-slate-600" data-action="reject" data-id="${req.id}">Từ chối</button>`
      :req.note?`<span class="text-sm text-slate-500">${req.note}</span>`:'-';
    const snapshot=req.snapshot?`<details class="mt-2 text-xs text-slate-500">
        <summary class="cursor-pointer text-brand-blue">Xem dữ liệu</summary>
        <pre class="bg-slate-100 p-3 rounded-xl overflow-auto mt-1">${JSON.stringify(req.snapshot,null,2)}</pre>
      </details>`:'';
    return `<tr>
      <td class="px-3 py-3 align-top">${formatDateTime(req.createdAt)}</td>
      <td class="px-3 py-3 align-top">${label}</td>
      <td class="px-3 py-3 align-top">${req.requestedName||req.requestedBy}</td>
      <td class="px-3 py-3 align-top text-sm">${req.reason||'-'}${snapshot}</td>
      <td class="px-3 py-3 align-top">${statusBadge}</td>
      <td class="px-3 py-3 align-top text-right space-y-2">${actions}</td>
    </tr>`;
  }).join('');
  tableBody.querySelectorAll('button[data-action="approve"]').forEach(btn=>{
    btn.addEventListener('click',()=>approveRequest(btn.dataset.id));
  });
  tableBody.querySelectorAll('button[data-action="reject"]').forEach(btn=>{
    btn.addEventListener('click',()=>rejectRequest(btn.dataset.id));
  });
}

function approveRequest(id){
  const requests=getDeletionRequests();
  const request=requests.find(item=>item.id===id);
  if(!request) return;
  const removed=removeItem(request.collection, request.targetId);
  if(!removed){
    toast('Không tìm thấy dữ liệu cần xóa – có thể đã bị xóa trước đó.','error');
  }else{
    toast('Đã xóa dữ liệu theo yêu cầu.','success');
  }
  resolveDeletionRequest(id,'approved','Đã duyệt và xóa dữ liệu.');
  renderDeletionRequests();
}

function rejectRequest(id){
  const reason=prompt('Nhập ghi chú từ chối (tùy chọn):','');
  resolveDeletionRequest(id,'rejected',reason||'Đã từ chối yêu cầu.');
  toast('Đã cập nhật trạng thái yêu cầu.','info');
  renderDeletionRequests();
}

function labelForType(type){
  return {
    summary:'Khối chỉ số',
    range:'Báo cáo khoảng ngày',
    chart:'Biểu đồ thu chi',
    activities:'Hoạt động mới',
    shortcuts:'Lối tắt nhanh',
    media:'Hình ảnh/logo',
    html:'Khối HTML',
    note:'Ghi chú'
  }[type]||'Khối tuỳ chỉnh';
}

function labelForCollection(collection){
  return {
    customers:'Khách hàng',
    care:'CSKH',
    services:'Bảo hành/Bảo dưỡng',
    checklists:'Checklist công việc',
    inventory:'Tồn kho',
    finance:'Thu & Chi'
  }[collection]||collection;
}

function formatDateTime(value){
  if(!value) return '';
  const d=new Date(value);
  if(Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('vi-VN');
}
