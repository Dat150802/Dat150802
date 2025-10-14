const API_ENDPOINT =
  'https://script.google.com/macros/s/AKfycbzbdULkckGgOBaFIjuMpJIQ0sLhSwDqnum1ve_OPdqNtuOAaqryHlY8CY6y2JBVhhU_0w/exec';

const defaultHeaders = {
  'Content-Type': 'application/json',
};

const ApiClient = {
  async request(action, payload = {}) {
    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: defaultHeaders,
        body: JSON.stringify({ action, payload }),
      });

      if (!response.ok) {
        throw new Error(`API ${response.status}`);
      }

      const data = await response.json();
      if (data?.status === 'success') {
        return data;
      }
      throw new Error(data?.message || 'Không thể xử lý dữ liệu');
    } catch (error) {
      console.warn('[API] Lỗi gọi Apps Script:', error);
      throw error;
    }
  },

  async fetchRecords(sheet) {
    const { records = [] } = await this.request('list', { sheet });
    return records;
  },

  async createRecord(sheet, record) {
    return this.request('create', { sheet, record });
  },

  async updateRecord(sheet, record) {
    return this.request('update', { sheet, record });
  },

  async deleteRecord(sheet, id) {
    return this.request('delete', { sheet, id });
  },
};

export default ApiClient;
