import { executeScript } from '../../../src/execution/script.executor';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

jest.mock('child_process');

describe('ScriptExecutor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('executeScript', () => {
    it('should execute script and return stdout/stderr', async () => {
      const mockStdout = new EventEmitter();
      const mockStderr = new EventEmitter();
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = mockStdout;
      mockProcess.stderr = mockStderr;

      (spawn as jest.Mock).mockReturnValue(mockProcess);

      const resultPromise = executeScript('/path/to/script.js', { PG_HOST: 'localhost' });

      // Simulate output
      mockStdout.emit('data', Buffer.from('Hello '));
      mockStdout.emit('data', Buffer.from('World'));
      mockStderr.emit('data', Buffer.from('Warning'));
      mockProcess.emit('close', 0);

      const result = await resultPromise;

      expect(spawn).toHaveBeenCalledWith('node', ['/path/to/script.js'], expect.objectContaining({
        env: expect.objectContaining({ PG_HOST: 'localhost' })
      }));
      expect(result).toEqual({ stdout: 'Hello World', stderr: 'Warning' });
    });

    it('should reject on non-zero exit code', async () => {
      const mockStdout = new EventEmitter();
      const mockStderr = new EventEmitter();
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = mockStdout;
      mockProcess.stderr = mockStderr;

      (spawn as jest.Mock).mockReturnValue(mockProcess);

      const resultPromise = executeScript('/path/to/script.js', {});

      mockStderr.emit('data', Buffer.from('Error: Something went wrong'));
      mockProcess.emit('close', 1);

      await expect(resultPromise).rejects.toThrow('Error: Something went wrong');
    });

    it('should reject with default message on non-zero exit without stderr', async () => {
      const mockStdout = new EventEmitter();
      const mockStderr = new EventEmitter();
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = mockStdout;
      mockProcess.stderr = mockStderr;

      (spawn as jest.Mock).mockReturnValue(mockProcess);

      const resultPromise = executeScript('/path/to/script.js', {});

      mockProcess.emit('close', 1);

      await expect(resultPromise).rejects.toThrow('Script execution failed');
    });
  });
});
