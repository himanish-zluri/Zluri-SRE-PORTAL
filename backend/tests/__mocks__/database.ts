// Mock for MikroORM database module
export const mockEntityManager = {
  find: jest.fn(),
  findOne: jest.fn(),
  findOneOrFail: jest.fn(),
  count: jest.fn(),
  persistAndFlush: jest.fn(),
  flush: jest.fn(),
  nativeDelete: jest.fn(),
  fork: jest.fn(),
};

// Make fork return the same mock
mockEntityManager.fork.mockReturnValue(mockEntityManager);

export const mockOrm = {
  em: mockEntityManager,
  close: jest.fn(),
};

export const getEntityManager = jest.fn(() => mockEntityManager);
export const initializeDatabase = jest.fn(() => Promise.resolve(mockOrm));
export const closeDatabase = jest.fn(() => Promise.resolve());
export const orm = mockOrm;
export const em = mockEntityManager;
