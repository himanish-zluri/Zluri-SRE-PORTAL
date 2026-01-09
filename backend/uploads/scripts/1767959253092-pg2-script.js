// client and query() are pre-injected
const users = await query('SELECT * FROM users');
console.log(users);

// Or use client directly
const result = await client.query('SELECT * FROM orders WHERE id = $1', [123]);
console.log(result.rows);
