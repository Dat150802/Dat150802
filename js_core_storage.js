const STORAGE_KEY = 'klc_app_v1';
function load() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
}
function save(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
function seedIfEmpty() {
  let data = load();
  if (!data.users) {
    data = {
      users: [
        { id: 'u_admin', username: 'admin', passHash: 'f47b5d7e2dc7f2e6633e6a8b5e3c2e1b28a0b5c0c9d99aeea1d69b3f57e3a1c2', role: 'admin', displayName: 'Quản trị viên', active: true },
        { id: 'u_staff', username: 'nhanvien', passHash: '8d969eef6ecad3c29a3a629280e686cff8fab2', role: 'staff', displayName: 'Nhân viên', active: true }
      ],
      session: null,
      customers: [
        { id: makeId('cus'), date: now(), name: 'Nguyễn Văn A', phone: '0912345678', address: 'Ấp 3, Bến Lức', source: { type: 'online', detail: 'Facebook' }, status: { purchased: true, model: 'KY5', price: 12000000 }, note: 'Khách tiềm năng' },
        { id: makeId('cus'), date: now(), name: 'Trần Thị B', phone: '0909876543', address: 'Ấp 4, Bến Lức', source: { type: 'offline', detail: '' }, status: { purchased: false, consults: [{ model: 'KY01', price: 9000000, installment: false }] }, note: 'Đang tư vấn' }
      ],
      care: [],
      warranty: [],
      maintenance: [],
      tasks: [],
      inventory: [],
      finance: [],
      notifications: [{ id: makeId('noti'), createdAt: now(), type: 'info', message: 'Chào mừng bạn đến với KLC Bến Lức!', level: 'info', read: false }],
      settings: {
        employees: ['Đạt', 'Huỳnh'],
        brand: { gold: '#F6C90E', blue: '#0F52BA' },
        models: ['KY5', 'KY01', 'KY02', 'KY15', 'KY20', 'RO66', 'RO68', 'K7979 LUXURY']
      }
    };
    save(data);
  }
}
seedIfEmpty();