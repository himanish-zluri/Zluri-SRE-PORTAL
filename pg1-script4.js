// Multiple PostgreSQL queries in script
const users = await query('SELECT * FROM users');
const userCount = await query('SELECT COUNT(*) as total FROM users');

console.log('Users found:', users.length);
console.log('Total users:', userCount[0].total);

return {
    users: users,
    totalUsers: userCount[0].total,
    summary: `Found ${users.length} users`
};
