import { 
  executeInSandbox, 
  executePostgresScriptSandboxed, 
  executeMongoScriptSandboxed,
  DEFAULT_TIMEOUT_MS 
} from '../../../../src/execution/sandbox/executor';
import { fork, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import fs from 'fs';

jest.mock('child_process');
jest.mock('fs');

describe('Sandbox Executor', () => {
  let mockChild: EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
    kill: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockChild = Object.assign(new EventEmitter(), {
      stdout: new EventEmitter(),
      stderr: new EventEmitter(),
      kill: jest.fn(),
    });

    (fork as jest.Mock).mockReturnValue(mockChild);
    (fs.existsSync as jest.Mock).mockReturnValue(true); // Assume .js files exist
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('executeInSandbox', () => {
    it('should fork child process with config', async () => {
      const config = { scriptPath: '/test.js', foo: 'bar' };
      
      const promise = executeInSandbox('/runner.js', config);
      
      // Simulate successful completion
      mockChild.stdout.emit('data', JSON.stringify({ success: true, result: 'ok' }));
      mockChild.emit('close', 0);

      await promise;

      expect(fork).toHaveBeenCalledWith(
        '/runner.js',
        [JSON.stringify(config)],
        expect.objectContaining({
          stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        })
      );
    });

    it('should return parsed JSON result on success', async () => {
      const promise = executeInSandbox('/runner.js', {});
      
      mockChild.stdout.emit('data', JSON.stringify({ 
        success: true, 
        result: { data: 'test' },
        logs: ['log1', 'log2']
      }));
      mockChild.emit('close', 0);

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.result).toEqual({ data: 'test' });
      expect(result.logs).toEqual(['log1', 'log2']);
    });

    it('should handle non-JSON stdout', async () => {
      const promise = executeInSandbox('/runner.js', {});
      
      mockChild.stdout.emit('data', 'plain text output');
      mockChild.emit('close', 0);

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.stdout).toBe('plain text output');
    });

    it('should capture stderr', async () => {
      const promise = executeInSandbox('/runner.js', {});
      
      mockChild.stdout.emit('data', JSON.stringify({ success: true }));
      mockChild.stderr.emit('data', 'warning message');
      mockChild.emit('close', 0);

      const result = await promise;

      expect(result.stderr).toBe('warning message');
    });

    it('should return error on non-zero exit code', async () => {
      const promise = executeInSandbox('/runner.js', {});
      
      mockChild.stdout.emit('data', JSON.stringify({ success: false, error: 'Script failed' }));
      mockChild.emit('close', 1);

      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toBe('Script failed');
    });

    it('should handle timeout and kill process', async () => {
      const promise = executeInSandbox('/runner.js', {}, { timeoutMs: 1000 });
      
      // Advance time past timeout
      jest.advanceTimersByTime(1001);
      
      // Process gets killed, then closes
      mockChild.emit('close', null);

      const result = await promise;

      expect(mockChild.kill).toHaveBeenCalledWith('SIGKILL');
      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');
    });

    it('should use default timeout', async () => {
      expect(DEFAULT_TIMEOUT_MS).toBe(30000);
    });

    it('should reject on fork error', async () => {
      const promise = executeInSandbox('/runner.js', {});
      
      mockChild.emit('error', new Error('Fork failed'));

      await expect(promise).rejects.toThrow('Failed to start sandbox: Fork failed');
    });

    it('should handle stderr as error when exit code is non-zero and no JSON', async () => {
      const promise = executeInSandbox('/runner.js', {});
      
      mockChild.stdout.emit('data', 'not json');
      mockChild.stderr.emit('data', 'Error: something went wrong');
      mockChild.emit('close', 1);

      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toBe('Error: something went wrong');
    });

    it('should accumulate multiple stdout chunks', async () => {
      const promise = executeInSandbox('/runner.js', {});
      
      mockChild.stdout.emit('data', '{"success":');
      mockChild.stdout.emit('data', 'true}');
      mockChild.emit('close', 0);

      const result = await promise;

      expect(result.success).toBe(true);
    });

    it('should clear timeout on successful completion', async () => {
      const promise = executeInSandbox('/runner.js', {}, { timeoutMs: 5000 });
      
      mockChild.stdout.emit('data', JSON.stringify({ success: true }));
      mockChild.emit('close', 0);

      await promise;

      // Advance time - should not trigger timeout since it was cleared
      jest.advanceTimersByTime(10000);
      
      expect(mockChild.kill).not.toHaveBeenCalled();
    });

    it('should handle empty stdout with non-zero exit', async () => {
      const promise = executeInSandbox('/runner.js', {});
      
      mockChild.emit('close', 1);

      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toBe('Script execution failed');
    });

    it('should handle fork throwing synchronously', async () => {
      (fork as jest.Mock).mockImplementation(() => {
        throw new Error('Cannot fork');
      });

      await expect(executeInSandbox('/runner.js', {}))
        .rejects.toThrow('Sandbox error: Cannot fork');
    });

    it('should use success from parsed JSON when code is 0', async () => {
      const promise = executeInSandbox('/runner.js', {});
      
      // JSON says success: false but exit code is 0
      mockChild.stdout.emit('data', JSON.stringify({ success: false, error: 'partial failure' }));
      mockChild.emit('close', 0);

      const result = await promise;

      expect(result.success).toBe(false);
    });

    it('should default success to true when not in JSON and code is 0', async () => {
      const promise = executeInSandbox('/runner.js', {});
      
      // JSON without success field
      mockChild.stdout.emit('data', JSON.stringify({ result: 'data' }));
      mockChild.emit('close', 0);

      const result = await promise;

      expect(result.success).toBe(true);
    });
  });

  describe('executePostgresScriptSandboxed', () => {
    it('should call executeInSandbox with postgres config', async () => {
      const promise = executePostgresScriptSandboxed(
        '/script.js',
        {
          PG_HOST: 'localhost',
          PG_PORT: '5432',
          PG_USER: 'user',
          PG_PASSWORD: 'pass',
          PG_DATABASE: 'testdb',
        }
      );

      mockChild.stdout.emit('data', JSON.stringify({ success: true, result: { rows: [] } }));
      mockChild.emit('close', 0);

      const result = await promise;

      expect(result.stdout).toEqual({ rows: [] });
      expect(result.stderr).toBe('');
    });

    it('should use .ts runner path when .js does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      const promise = executePostgresScriptSandboxed(
        '/script.js',
        {
          PG_HOST: 'localhost',
          PG_PORT: '5432',
          PG_USER: 'user',
          PG_PASSWORD: 'pass',
          PG_DATABASE: 'testdb',
        }
      );

      mockChild.stdout.emit('data', JSON.stringify({ success: true, result: 'ok' }));
      mockChild.emit('close', 0);

      await promise;

      // Verify fork was called with .ts path
      expect(fork).toHaveBeenCalledWith(
        expect.stringContaining('postgres-script.executor.ts'),
        expect.any(Array),
        expect.any(Object)
      );
    });

    it('should throw error on failure', async () => {
      const promise = executePostgresScriptSandboxed(
        '/script.js',
        {
          PG_HOST: 'localhost',
          PG_PORT: '5432',
          PG_USER: 'user',
          PG_PASSWORD: 'pass',
          PG_DATABASE: 'testdb',
        }
      );

      mockChild.stdout.emit('data', JSON.stringify({ success: false, error: 'DB error' }));
      mockChild.emit('close', 1);

      await expect(promise).rejects.toThrow('DB error');
    });

    it('should use logs when result is undefined', async () => {
      const promise = executePostgresScriptSandboxed(
        '/script.js',
        {
          PG_HOST: 'localhost',
          PG_PORT: '5432',
          PG_USER: 'user',
          PG_PASSWORD: 'pass',
          PG_DATABASE: 'testdb',
        }
      );

      mockChild.stdout.emit('data', JSON.stringify({ success: true, logs: ['line1', 'line2'] }));
      mockChild.emit('close', 0);

      const result = await promise;

      expect(result.stdout).toBe('line1\nline2');
    });

    it('should use stdout when result and logs are undefined', async () => {
      const promise = executePostgresScriptSandboxed(
        '/script.js',
        {
          PG_HOST: 'localhost',
          PG_PORT: '5432',
          PG_USER: 'user',
          PG_PASSWORD: 'pass',
          PG_DATABASE: 'testdb',
        }
      );

      mockChild.stdout.emit('data', JSON.stringify({ success: true }));
      mockChild.emit('close', 0);

      const result = await promise;

      expect(result.stdout).toBe('{"success":true}');
    });

    it('should throw default error when no error message', async () => {
      const promise = executePostgresScriptSandboxed(
        '/script.js',
        {
          PG_HOST: 'localhost',
          PG_PORT: '5432',
          PG_USER: 'user',
          PG_PASSWORD: 'pass',
          PG_DATABASE: 'testdb',
        }
      );

      mockChild.stdout.emit('data', JSON.stringify({ success: false }));
      mockChild.emit('close', 1);

      await expect(promise).rejects.toThrow('Script execution failed');
    });

    it('should pass timeout option', async () => {
      const promise = executePostgresScriptSandboxed(
        '/script.js',
        {
          PG_HOST: 'localhost',
          PG_PORT: '5432',
          PG_USER: 'user',
          PG_PASSWORD: 'pass',
          PG_DATABASE: 'testdb',
        },
        { timeoutMs: 5000 }
      );

      jest.advanceTimersByTime(5001);
      mockChild.emit('close', null);

      await expect(promise).rejects.toThrow('timed out');
    });
  });

  describe('executeMongoScriptSandboxed', () => {
    it('should call executeInSandbox with mongo config', async () => {
      const promise = executeMongoScriptSandboxed(
        '/script.js',
        'mongodb://localhost:27017',
        'testdb'
      );

      mockChild.stdout.emit('data', JSON.stringify({ success: true, result: { docs: [] } }));
      mockChild.emit('close', 0);

      const result = await promise;

      expect(result).toEqual({ docs: [] });
    });

    it('should add ts-node execArgv when running under ts-node', async () => {
      // Simulate ts-node environment
      const originalArgv = process.argv;
      process.argv = ['ts-node', 'script.ts'];
      
      const promise = executeMongoScriptSandboxed(
        '/script.js',
        'mongodb://localhost:27017',
        'testdb'
      );

      mockChild.stdout.emit('data', JSON.stringify({ success: true, result: 'ok' }));
      mockChild.emit('close', 0);

      await promise;

      expect(fork).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          execArgv: ['-r', 'ts-node/register']
        })
      );

      process.argv = originalArgv;
    });

    it('should throw error on failure', async () => {
      const promise = executeMongoScriptSandboxed(
        '/script.js',
        'mongodb://localhost:27017',
        'testdb'
      );

      mockChild.stdout.emit('data', JSON.stringify({ success: false, error: 'Mongo error' }));
      mockChild.emit('close', 1);

      await expect(promise).rejects.toThrow('Mongo error');
    });

    it('should use last log when result is undefined', async () => {
      const promise = executeMongoScriptSandboxed(
        '/script.js',
        'mongodb://localhost:27017',
        'testdb'
      );

      mockChild.stdout.emit('data', JSON.stringify({ success: true, logs: ['first', 'last'] }));
      mockChild.emit('close', 0);

      const result = await promise;

      expect(result).toBe('last');
    });

    it('should return default success when result and logs are undefined', async () => {
      const promise = executeMongoScriptSandboxed(
        '/script.js',
        'mongodb://localhost:27017',
        'testdb'
      );

      mockChild.stdout.emit('data', JSON.stringify({ success: true }));
      mockChild.emit('close', 0);

      const result = await promise;

      expect(result).toEqual({ success: true });
    });

    it('should throw default error when no error message', async () => {
      const promise = executeMongoScriptSandboxed(
        '/script.js',
        'mongodb://localhost:27017',
        'testdb'
      );

      mockChild.stdout.emit('data', JSON.stringify({ success: false }));
      mockChild.emit('close', 1);

      await expect(promise).rejects.toThrow('Script execution failed');
    });

    it('should pass timeout option', async () => {
      const promise = executeMongoScriptSandboxed(
        '/script.js',
        'mongodb://localhost:27017',
        'testdb',
        { timeoutMs: 10000 }
      );

      jest.advanceTimersByTime(10001);
      mockChild.emit('close', null);

      await expect(promise).rejects.toThrow('timed out');
    });
  });
});
