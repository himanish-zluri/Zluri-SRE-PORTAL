// db is already injected
const logs = await db.collection('logs').find({}).toArray();
return logs;
