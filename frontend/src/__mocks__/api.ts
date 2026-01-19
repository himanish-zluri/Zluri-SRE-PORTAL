// Mock API for testing
export const authApi = {
  login: jest.fn(),
  refresh: jest.fn(),
  logout: jest.fn(),
  logoutAll: jest.fn(),
};

export const instancesApi = {
  getAll: jest.fn(),
};

export const databasesApi = {
  getByInstance: jest.fn(),
};

export const podsApi = {
  getAll: jest.fn(),
  getById: jest.fn(),
};

export const usersApi = {
  getAll: jest.fn(),
};

export const queriesApi = {
  getForApproval: jest.fn(),
  getMySubmissions: jest.fn(),
  getById: jest.fn(),
  submit: jest.fn(),
  approve: jest.fn(),
  reject: jest.fn(),
};

export const auditApi = {
  getAll: jest.fn(),
  getByQuery: jest.fn(),
};

const api = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
};

export default api;