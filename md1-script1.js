// Multiple queries in script
const logs = await db.logs.find({});
const errorLogs = await db.logs.find({ level: 'error' });
const totalCount = await db.logs.countDocuments({});

console.log('Total logs:', logs.length);
console.log('Error logs:', errorLogs.length);
console.log('Count from DB:', totalCount);

// Return combined results
return {
    allLogs: logs,
    errorLogs: errorLogs,
    totalCount: totalCount,
    summary: `Found ${logs.length} total logs, ${errorLogs.length} errors`
};
