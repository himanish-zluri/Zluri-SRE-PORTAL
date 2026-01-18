// MongoDB script for md2 database (products collection)
// Both db.collectionName and collection() syntax are supported

// Method 1: Natural MongoDB syntax (recommended)
const products = await db.products.find({});
console.log('Products using db.products.find():');
console.log(products);

// // Method 2: Collection helper function (backward compatibility)
const productsAlt = await collection('products').find({});
console.log('Products using collection() helper:');
console.log(productsAlt);

// Example: Find products with specific criteria
const expensiveProducts = await db.products.find({ price: { $gt: 100 } });
console.log('Expensive products (price > 100):');
console.log(expensiveProducts);

// Example: Count documents
const productCount = await db.products.countDocuments({});
console.log('Total products:', productCount);
