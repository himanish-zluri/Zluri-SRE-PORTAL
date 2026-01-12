// client and query() are pre-injected
const orders = await query('SELECT * FROM orders');
console.log(orders);
