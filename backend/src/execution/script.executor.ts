import { NodeVM } from 'vm2';
import fs from 'fs';

export async function executeScript(
  scriptPath: string,
  env: Record<string, string>
): Promise<{ stdout: string; stderr: string }> {
  const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
  
  let stdout = '';
  let stderr = '';

  // Create sandboxed VM with limited access
  const vm = new NodeVM({
    console: 'redirect',
    sandbox: {
      process: {
        env: env // Only inject the specific env vars, not process.env
      }
    },
    require: {
      external: ['pg', 'mongodb'], // Only allow database packages
      builtin: ['util', 'stream', 'events', 'buffer', 'crypto', 'dns', 'net', 'tls', 'url'],
      root: './node_modules'
    },
    timeout: 30000 // 30 second timeout
  });

  // Capture console output
  vm.on('console.log', (...args: any[]) => {
    stdout += args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ') + '\n';
  });

  vm.on('console.error', (...args: any[]) => {
    stderr += args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ') + '\n';
  });

  vm.on('console.warn', (...args: any[]) => {
    stderr += args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ') + '\n';
  });

  try {
    // Wrap script in async IIFE for top-level await support
    const wrappedScript = `
      (async () => {
        ${scriptContent}
      })();
    `;
    
    await vm.run(wrappedScript, scriptPath);
    return { stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (error: any) {
    throw new Error(error.message || 'Script execution failed');
  }
}
