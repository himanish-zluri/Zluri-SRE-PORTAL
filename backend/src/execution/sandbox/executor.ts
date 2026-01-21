/**
 * Sandbox Executor - Runs scripts in isolated child processes
 * 
 * Features:
 * - Process isolation (script can't crash main server)
 * - Timeout support (kills process after configured time)
 * - Captured stdout/stderr
 * - Clean error handling
 * - Temp file management (writes script content to temp file, executes, cleans up)
 */
import { fork, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { v4 as uuid } from 'uuid';
import { QueryExecutionError, InternalError } from '../../errors';

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

// Create a temp file with script content
function createTempScriptFile(scriptContent: string): string {
  const tempDir = os.tmpdir();
  const tempFileName = `script-${uuid()}.js`;
  const tempFilePath = path.join(tempDir, tempFileName);
  fs.writeFileSync(tempFilePath, scriptContent, 'utf-8');
  return tempFilePath;
}

// Clean up temp file
function cleanupTempFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // Ignore cleanup errors
  }
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
        reject(new InternalError(`Failed to start sandbox: ${error.message}`));
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
      reject(new InternalError(`Sandbox error: ${error.message}`));
    }
  });
}

export async function executePostgresScriptSandboxed(
  scriptContent: string,
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
  
  // Write script content to temp file
  const tempScriptPath = createTempScriptFile(scriptContent);
  
  try {
    const config = {
      scriptPath: tempScriptPath,
      ...env,
    };

    const result = await executeInSandbox(runnerPath, config, options);

    if (!result.success) {
      const errorMessage = result.error || 'Script execution failed';
      
      // Categorize different types of script execution errors
      if (errorMessage.includes('timed out')) {
        throw new QueryExecutionError(errorMessage);
      }
      
      // Database connection errors
      if (errorMessage.includes('connection') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND')) {
        throw new InternalError(`Database connection failed: ${errorMessage}`);
      }
      
      // SQL syntax errors and other query-related errors
      if (errorMessage.includes('syntax error') || 
          errorMessage.includes('column') || 
          errorMessage.includes('table') || 
          errorMessage.includes('function') ||
          errorMessage.includes('constraint') ||
          errorMessage.includes('violation')) {
        throw new QueryExecutionError(`SQL Error: ${errorMessage}`);
      }
      
      // JavaScript syntax errors in script
      if (errorMessage.includes('SyntaxError') || errorMessage.includes('ReferenceError')) {
        throw new QueryExecutionError(`Script syntax error: ${errorMessage}`);
      }
      
      // Default to query execution error for script failures
      throw new QueryExecutionError(errorMessage);
    }

    // Return the parsed result directly (from `return` statement in script)
    if (result.result !== undefined) {
      return result.result;
    }
    
    // If we have logs, process them - flatten arrays but keep all rows
    if (result.logs && result.logs.length > 0) {
      const allRows: any[] = [];
      
      for (const log of result.logs) {
        // Skip error logs
        if (log && typeof log === 'object' && log._error) continue;
        
        if (Array.isArray(log)) {
          // It's an array (like query results) - add each row
          allRows.push(...log);
        } else if (typeof log === 'string') {
          // Try to parse as JSON
          try {
            const parsed = JSON.parse(log);
            if (Array.isArray(parsed)) {
              allRows.push(...parsed);
            } else {
              allRows.push(parsed);
            }
          } catch {
            // Not JSON, keep as string
            allRows.push(log);
          }
        } else if (log !== null && log !== undefined) {
          allRows.push(log);
        }
      }

      if (allRows.length > 0) {
        return allRows.length === 1 ? allRows[0] : allRows;
      }
    }

    // Fallback: try to parse stdout as JSON
    try {
      return JSON.parse(result.stdout);
    } catch {
      return { output: result.stdout, stderr: result.stderr };
    }
  } finally {
    // Always clean up temp file
    cleanupTempFile(tempScriptPath);
  }
}

export async function executeMongoScriptSandboxed(
  scriptContent: string,
  mongoUri: string,
  databaseName: string,
  options?: ExecuteOptions
): Promise<any> {
  const runnerPath = getRunnerPath('mongo-script.executor');
  
  // Write script content to temp file
  const tempScriptPath = createTempScriptFile(scriptContent);
  
  try {
    const config = {
      scriptPath: tempScriptPath,
      mongoUri,
      databaseName,
    };

    const result = await executeInSandbox(runnerPath, config, options);

    if (!result.success) {
      const errorMessage = result.error || 'Script execution failed';
      
      // Categorize different types of script execution errors
      if (errorMessage.includes('timed out')) {
        throw new QueryExecutionError(errorMessage);
      }
      
      // MongoDB connection errors
      if (errorMessage.includes('connection') || 
          errorMessage.includes('MongoNetworkError') || 
          errorMessage.includes('MongoServerSelectionError') ||
          errorMessage.includes('ECONNREFUSED') || 
          errorMessage.includes('ENOTFOUND')) {
        throw new InternalError(`Database connection failed: ${errorMessage}`);
      }
      
      // MongoDB query errors
      if (errorMessage.includes('MongoDB query failed') ||
          errorMessage.includes('duplicate key') ||
          errorMessage.includes('validation failed') ||
          errorMessage.includes('unauthorized') ||
          errorMessage.includes('namespace not found')) {
        throw new QueryExecutionError(`MongoDB Error: ${errorMessage}`);
      }
      
      // JavaScript syntax errors in script
      if (errorMessage.includes('SyntaxError') || errorMessage.includes('ReferenceError')) {
        throw new QueryExecutionError(`Script syntax error: ${errorMessage}`);
      }
      
      // Default to query execution error for script failures
      throw new QueryExecutionError(errorMessage);
    }

    return result.result ?? result.logs?.[result.logs.length - 1] ?? { success: true };
  } finally {
    // Always clean up temp file
    cleanupTempFile(tempScriptPath);
  }
}

// Export for testing
export { executeInSandbox, DEFAULT_TIMEOUT_MS, createTempScriptFile, cleanupTempFile };
