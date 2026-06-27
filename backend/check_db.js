const mongoose = require('mongoose');
require('dotenv').config();

async function checkProducts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shopsense');

    const Product = require('./src/models/Product');

    // Check total products
    const total = await Product.countDocuments();
    console.log('Total products:', total);

    // Check products with 'phone' in name
    const phoneProducts = await Product.find({ name: { $regex: /phone/i } }).limit(5);
    console.log('Products with phone in name:', phoneProducts.length);
    if (phoneProducts.length > 0) {
      console.log('Sample phone products:');
      phoneProducts.forEach(p => console.log(' -', p.name));
    }

    // Check text search
    const textSearch = await Product.find({ $text: { $search: 'phone' } }).limit(5);
    console.log('Text search results for phone:', textSearch.length);
    if (textSearch.length > 0) {
      console.log('Sample text search results:');
      textSearch.forEach(p => console.log(' -', p.name));
    }

    // Test different search approaches
    console.log('=== Testing different search approaches ===');

    // 1. Regex search on multiple fields
    const multiFieldResults = await Product.find({
      $or: [
        { name: { $regex: /phone/i } },
        { brand: { $regex: /phone/i } },
        { category: { $regex: /phone/i } },
        { description: { $regex: /phone/i } }
      ]
    });
    console.log('Multi-field regex search:', multiFieldResults.length);

    // Check text index
    const indexes = await Product.collection.indexes();
    console.log('Indexes:', Object.keys(indexes));

    const textIndex = indexes.find(idx => idx.key && idx.key['_fts']);
    console.log('Text index found:', !!textIndex);
    if (textIndex) {
      console.log('Text index fields:', textIndex.key);
    }

    // Check text search for smartphone
    const smartphoneTextSearch = await Product.find({ $text: { $search: 'smartphone' } }).limit(5);
    console.log('Text search results for smartphone:', smartphoneTextSearch.length);
    if (smartphoneTextSearch.length > 0) {
      console.log('Sample smartphone text search results:');
      smartphoneTextSearch.forEach(p => console.log(' -', p.name));
    }

    // Check regex search for smartphone
    const smartphoneRegex = await Product.find({ name: { $regex: /smartphone/i } }).limit(5);
    console.log('Regex search for smartphone:', smartphoneRegex.length);
    if (smartphoneRegex.length > 0) {
      console.log('Sample smartphone regex results:');
      smartphoneRegex.forEach(p => console.log(' -', p.name));
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkProducts();