// UI utilities module
const ui = {
  loadingOverlay: null,
  loadingCount: 0,

  init() {
    // Create loading overlay
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center hidden';
    overlay.innerHTML = `
      <div class="bg-white rounded-lg p-4 flex flex-col items-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div>
        <div class="text-brand-blue mt-2 text-lg font-medium">Đang tải...</div>
      </div>
    `;
    document.body.appendChild(overlay);
    this.loadingOverlay = overlay;
  },

  showLoading(message = 'Đang tải...') {
    this.loadingCount++;
    if (this.loadingCount === 1) {
      this.loadingOverlay.querySelector('div > div:last-child').textContent = message;
      this.loadingOverlay.classList.remove('hidden');
    }
  },

  hideLoading() {
    this.loadingCount = Math.max(0, this.loadingCount - 1);
    if (this.loadingCount === 0) {
      this.loadingOverlay.classList.add('hidden');
    }
  },

  toast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
      type === 'success' ? 'bg-green-500' :
      type === 'error' ? 'bg-red-500' :
      'bg-blue-500'
    } text-white`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
};

export default ui;