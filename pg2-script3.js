const allResults = [];
for (let i = 1; i <= 50; i++) {
  const users = await query(`SELECT * FROM orders`);
  allResults.push(users);
}
return allResults;
