const { Client } = require('pg');

(async () => {
  const client = new Client({
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
  });

  await client.connect();

  const res = await client.query('SELECT * FROM query_metrics');

  // ✅ ONLY output
  console.log(JSON.stringify(res.rows));

  await client.end();
})();
