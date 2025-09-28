// Loader Overlay & Toast
let loadingOverlay = null, toastTimeout = null;
function showLoading(msg='Đang tải…') {
  if (!loadingOverlay) {
    loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'loadingOverlay';
    loadingOverlay.innerHTML = `
      <div class="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
        <div class="flex flex-col items-center">
          <div class="animate-spin rounded-full h-12 w-12 border-t-4 border-brand-gold mb-4"></div>
          <div class="text-white text-lg font-bold">${msg}</div>
        </div>
      </div>
    `;
    document.body.appendChild(loadingOverlay);
  }
}
function hideLoading() {
  if (loadingOverlay) {
    loadingOverlay.remove();
    loadingOverlay = null;
  }
}
function toast(msg, type='info') {
  hideToast();
  const colors = { info: 'bg-brand-blue', success: 'bg-green-500', error: 'bg-red-500', warn: 'bg-yellow-500' };
  const el = document.createElement('div');
  el.className = `fixed top-4 right-4 px-6 py-3 rounded shadow-lg text-white ${colors[type]||colors.info} z-50`;
  el.innerText = msg;
  el.id = 'toastMsg';
  document.body.appendChild(el);
  toastTimeout = setTimeout(hideToast, 3500);
}
function hideToast() {
  const el = document.getElementById('toastMsg');
  if (el) el.remove();
  if (toastTimeout) clearTimeout(toastTimeout);
}