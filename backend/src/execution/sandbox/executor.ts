/**
 * Sandbox Executor - Runs scripts in isolated child processes
 * 
 * Features:
 * - Process isolation (script can't crash main server)
 * - Timeout support (kills process after configured time)
 * - Captured stdout/stderr
 * - Clean error handling
 */
import { fork, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';

const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds

// Determine if we're running in ts-node (development) or compiled JS (production)
function getRunnerPath(runnerName: string): string {
  const jsPath = path.join(__dirname, `${runnerName}.js`);
  const tsPath = path.join(__dirname, `${runnerName}.ts`);
  
  // In production (compiled), .js files exist in __dirname
  // In development (ts-node), we need to use .ts files with ts-node
  if (fs.existsSync(jsPath)) {
    return jsPath;
  }
  return tsPath;
}

// Get fork options based on environment
function getForkOptions(): { execArgv?: string[] } {
  // Check if we're running under ts-node
  const isTsNode = process.argv[0].includes('ts-node') || 
                   (process as any)[Symbol.for('ts-node.register.instance')];
  
  if (isTsNode) {
    return { execArgv: ['-r', 'ts-node/register'] };
  }
  return {};
}

export interface SandboxResult {
  success: boolean;
  result?: any;
  logs?: any[];
  error?: string;
  stdout: string;
  stderr: string;
}

interface ExecuteOptions {
  timeoutMs?: number;
}

function executeInSandbox(
  runnerPath: string,
  config: Record<string, any>,
  options: ExecuteOptions = {}
): Promise<SandboxResult> {
  return new Promise((resolve, reject) => {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    
    let stdout = '';
    let stderr = '';
    let child: ChildProcess | null = null;
    let timedOut = false;

    // Set up timeout
    const timeoutId = setTimeout(() => {
      timedOut = true;
      child?.kill('SIGKILL');
    }, timeoutMs);

    try {
      // Fork the runner script with config as argument
      const forkOptions = getForkOptions();
      child = fork(runnerPath, [JSON.stringify(config)], {
        ...forkOptions,
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        // Isolate environment - only pass what's needed
        env: {
          NODE_ENV: process.env.NODE_ENV,
          // Don't pass sensitive env vars like JWT_SECRET, ENCRYPTION_KEY
        },
      });

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(new Error(`Failed to start sandbox: ${error.message}`));
      });

      child.on('close', (code) => {
        clearTimeout(timeoutId);

        if (timedOut) {
          resolve({
            success: false,
            error: `Script execution timed out after ${timeoutMs / 1000} seconds`,
            stdout,
            stderr,
          });
          return;
        }

        // Try to parse stdout as JSON result
        let result: SandboxResult;
        try {
          const parsed = JSON.parse(stdout);
          result = {
            success: parsed.success ?? (code === 0),
            result: parsed.result,
            logs: parsed.logs,
            error: parsed.error,
            stdout,
            stderr,
          };
        } catch {
          // If stdout isn't JSON, treat as raw output
          result = {
            success: code === 0,
            stdout,
            stderr,
            error: code !== 0 ? stderr || 'Script execution failed' : undefined,
          };
        }

        resolve(result);
      });

    } catch (error: any) {
      clearTimeout(timeoutId);
      reject(new Error(`Sandbox error: ${error.message}`));
    }
  });
}

export async function executePostgresScriptSandboxed(
  scriptPath: string,
  env: {
    PG_HOST: string;
    PG_PORT: string;
    PG_USER: string;
    PG_PASSWORD: string;
    PG_DATABASE: string;
  },
  options?: ExecuteOptions
): Promise<any> {
  const runnerPath = getRunnerPath('postgres-script.executor');
  
  const config = {
    scriptPath,
    ...env,
  };

  const result = await executeInSandbox(runnerPath, config, options);

  if (!result.success) {
    throw new Error(result.error || 'Script execution failed');
  }

  // Return the parsed result directly, not wrapped in stdout/stderr
  // The result is already parsed from the child process JSON output
  if (result.result !== undefined) {
    return result.result;
  }
  
  // If we have logs, try to parse them as JSON (scripts often console.log JSON data)
  if (result.logs && result.logs.length > 0) {
    const logValue = result.logs.length === 1 ? result.logs[0] : result.logs;
    
    // Try to parse single log entry as JSON
    if (typeof logValue === 'string') {
      try {
        return JSON.parse(logValue);
      } catch {
        return logValue;
      }
    }
    return logValue;
  }

  // Fallback: try to parse stdout as JSON
  try {
    return JSON.parse(result.stdout);
  } catch {
    return { output: result.stdout, stderr: result.stderr };
  }
}

export async function executeMongoScriptSandboxed(
  scriptPath: string,
  mongoUri: string,
  databaseName: string,
  options?: ExecuteOptions
): Promise<any> {
  const runnerPath = getRunnerPath('mongo-script.executor');
  
  const config = {
    scriptPath,
    mongoUri,
    databaseName,
  };

  const result = await executeInSandbox(runnerPath, config, options);

  if (!result.success) {
    throw new Error(result.error || 'Script execution failed');
  }

  return result.result ?? result.logs?.[result.logs.length - 1] ?? { success: true };
}

// Export for testing
export { executeInSandbox, DEFAULT_TIMEOUT_MS };
