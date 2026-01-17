// db and collection() are pre-injected
const logs = await db.collection('products').find().toArray();
console.log(logs);
