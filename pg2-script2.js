// query() is pre-injected - use it to run SQL
const users = await query('SELECT * FROM users LIMIT 10');
console.log(users);

// Multiple queries
const orders = await query('SELECT * FROM orders WHERE status = $1', ['pending']);
const products = await query('SELECT * FROM products');

// The last console.log output will be returned as result
console.log({ users: users.rows, orders: orders.rows });