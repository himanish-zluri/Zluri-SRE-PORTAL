const products = await db.products.find({});
const expensiveProducts = await db.products.find({ price: { $gt: 100 } });
const totalCount = await db.products.countDocuments({});

console.log('Total products:', products.length);
console.log('Expensive products:', expensiveProducts.length);

return {
    allProducts: products,
    expensiveProducts: expensiveProducts,
    totalCount: totalCount,
    summary: `Found ${products.length} total products, ${expensiveProducts.length} expensive ones`
};
