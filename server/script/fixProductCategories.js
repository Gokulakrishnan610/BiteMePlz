import mongoose from 'mongoose';
import Product from '../models/productModel.js'; // Adjust path if needed

// If you're using .env, uncomment the lines below:
// import dotenv from 'dotenv';
// dotenv.config();

const MONGO_URI = 'mongodb://localhost:27017/DevslabKisok'; // or use process.env.MONGO_URI

// Only these categories are allowed (based on your schema)
const validCategories = ['food', 'beverages', 'snacks', 'stationery', 'electronics', 'others'];

const fixCategories = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    const products = await Product.find({});

    for (const product of products) {
      const rawCategory = product.category || '';
      const normalized = rawCategory.trim().toLowerCase();
      const finalCategory = validCategories.includes(normalized) ? normalized : 'others';

      if (product.category !== finalCategory) {
        product.category = finalCategory;
        await product.save();
        console.log(`✔️ Updated ${product.name} → ${finalCategory}`);
      }
    }

    console.log('🎉 All product categories have been sanitized.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating product categories:', error);
    process.exit(1);
  }
};

fixCategories();
