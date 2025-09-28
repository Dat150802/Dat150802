// Core storage module
const STORAGE_KEY = 'klc_app_v1';

const storage = {
  load() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  },

  save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },

  clear() {
    localStorage.removeItem(STORAGE_KEY);
  },

  seedIfEmpty() {
    if (!this.load()) {
      // Initial seed data
      const seedData = {
        users: [
          {
            id: 'admin1',
            username: 'admin',
            passHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', // klcbenluc@2025
            role: 'admin',
            displayName: 'Admin'
          },
          {
            id: 'staff1',
            username: 'nhanvien',
            passHash: '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', // 123456
            role: 'staff',
            displayName: 'Nhân viên'
          }
        ],
        sessions: [],
        customers: [],
        care: [],
        warranty: [],
        maintenance: [],
        tasks: [],
        inventory: [],
        finance: [],
        notifications: [],
        settings: {
          employees: ['Đạt', 'Huỳnh'],
          brand: {
            gold: '#F6C90E',
            blue: '#0F52BA'
          },
          models: [
            'KY5',
            'KY01', 
            'KY02',
            'KY15',
            'KY20',
            'RO66',
            'RO68',
            'K7979 LUXURY'
          ]
        }
      };
      this.save(seedData);
    }
  }
};

export default storage;