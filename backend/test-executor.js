// Direct test of the script executor
const { executeScript } = require('./src/execution/script.executor.ts');
const path = require('path');

async function testExecutor() {
  try {
    // Mock PostgreSQL connection
    const connection = {
      host: 'localhost',
      port: 5432,
      username: 'himanish',
      password: 'zluri',
      database: 'db_query_portal',
    };

    // Test with the script file
    const scriptPath = path.join(__dirname, '../test-script.js');
    
    console.log('🧪 Testing script executor...');
    console.log('📁 Script path:', scriptPath);
    
    const result = await executeScript(scriptPath, connection);
    
    console.log('✅ Execution successful!');
    console.log('📤 stdout:', result.stdout);
    console.log('📤 stderr:', result.stderr);
    console.log('🔢 exitCode:', result.exitCode);
    
  } catch (error) {
    console.error('❌ Execution failed:', error.message);
  }
}

testExecutor();