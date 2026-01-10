// db and collection() are pre-injected
const logs = await db.collection('logs').find().toArray();
console.log(logs);
