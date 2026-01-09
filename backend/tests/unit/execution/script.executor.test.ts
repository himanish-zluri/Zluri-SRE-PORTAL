import { executeScript } from '../../../src/execution/script.executor';
import fs from 'fs';

jest.mock('fs');

// Mock vm2 module
const mockVm = {
  on: jest.fn(),
  run: jest.fn()
};

jest.mock('vm2', () => ({
  NodeVM: jest.fn().mockImplementation(() => mockVm)
}));

describe('ScriptExecutor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVm.on.mockClear();
    mockVm.run.mockClear();
  });

  describe('executeScript', () => {
    it('should execute script and return stdout/stderr', async () => {
      (fs.readFileSync as jest.Mock).mockReturnValue('console.log("Hello World");');
      mockVm.run.mockResolvedValue(undefined);

      const result = await executeScript('/path/to/script.js', { PG_HOST: 'localhost' });

      expect(fs.readFileSync).toHaveBeenCalledWith('/path/to/script.js', 'utf-8');
      expect(result).toEqual({ stdout: '', stderr: '' });
    });

    it('should throw error on script execution failure', async () => {
      (fs.readFileSync as jest.Mock).mockReturnValue('throw new Error("Script error");');
      mockVm.run.mockRejectedValue(new Error('Script error'));

      await expect(executeScript('/path/to/script.js', {}))
        .rejects.toThrow('Script error');
    });

    it('should throw default error message when error has no message', async () => {
      (fs.readFileSync as jest.Mock).mockReturnValue('invalid code');
      mockVm.run.mockRejectedValue({});

      await expect(executeScript('/path/to/script.js', {}))
        .rejects.toThrow('Script execution failed');
    });

    it('should register console event handlers', async () => {
      (fs.readFileSync as jest.Mock).mockReturnValue('console.log("test");');
      mockVm.run.mockResolvedValue(undefined);

      await executeScript('/path/to/script.js', {});

      expect(mockVm.on).toHaveBeenCalledWith('console.log', expect.any(Function));
      expect(mockVm.on).toHaveBeenCalledWith('console.error', expect.any(Function));
      expect(mockVm.on).toHaveBeenCalledWith('console.warn', expect.any(Function));
    });
  });
});
