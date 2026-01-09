// db is already connected and available
const users = await db.collection('users').find({}).toArray();
return users;
