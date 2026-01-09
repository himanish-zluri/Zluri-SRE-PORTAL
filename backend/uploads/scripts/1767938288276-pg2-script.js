const pg = require('pg');

const client = new pg.Client({
  host: process.env.PG_HOST,
  port: Number(process.env.PG_PORT),
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE
});

(async () => {
  await client.connect();
  const res = await client.query('SELECT * FROM orders');
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
})();
