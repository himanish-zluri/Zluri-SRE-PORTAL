// Script to query query_metrics table from zluri_analytics database
const { Client } = require('pg');

async function main() {
  console.log('🚀 Starting query_metrics script');
  
  const client = new Client({
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE, // This should be 'zluri_analytics'
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully');
    
    console.log('📊 Executing query: SELECT * FROM query_metrics;');
    const result = await client.query('SELECT * FROM query_metrics');
    
    console.log(`📈 Found ${result.rowCount} rows`);
    console.log('📋 Results:');
    console.log(JSON.stringify(result.rows, null, 2));
    
    console.log('🎉 Query executed successfully!');
    
  } catch (error) {
    console.error('❌ Error occurred:', error.message);
    console.error('🔍 Error details:', error.stack);
    process.exit(1);
  } finally {
    console.log('🔌 Closing database connection...');
    await client.end();
    console.log('✅ Connection closed');
  }
}

main();