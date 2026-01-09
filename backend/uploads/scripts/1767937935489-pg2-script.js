import pg from 'pg';

const client = new pg.Client({
  host: process.env.PG_HOST,
  port: Number(process.env.PG_PORT),
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE
});

await client.connect();

const res = await client.query('SELECT * FROM orders');
console.log(res.rows);

await client.end();
