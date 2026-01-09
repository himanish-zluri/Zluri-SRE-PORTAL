// db and collection() are pre-injected
const users = await db.collection('users').find().toArray();
console.log(users);

// Or use helper
const orders = await collection('orders').find({ status: 'pending' }).toArray();
console.log(orders);
