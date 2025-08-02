import mongoose from 'mongoose';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Define __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, 'server/.env') });

// MongoDB connection
const connectMongoDB = async () => {
  try {
    await mongoose.connect("mongodb://localhost:27017/DevslabKisok");
    console.log('MongoDB Connected for migration');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Supabase connection
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  console.error('Please set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Import MongoDB models
import User from './server/models/userModel.js';
import Shop from './server/models/shopModel.js';
import Product from './server/models/productModel.js';
import Order from './server/models/orderModel.js';
import Transaction from './server/models/transactionModel.js';
import ShopLog from './server/models/shopLogModel.js';
import StudentAnalytics from './server/models/studentAnalyticsModel.js';

// Migration functions
const migrateUsers = async () => {
  console.log('Migrating users...');
  const users = await User.find({});
  
  for (const user of users) {
    try {
      const userData = {
        name: user.name,
        roll_no: user.rollNo,
        email: user.email,
        password: user.password,
        role: user.role,
        is_verified: user.isVerified,
        otp: user.otp,
        password_reset_otp: user.passwordResetOtp,
        password_reset_token: user.passwordResetToken,
        balance: user.balance,
        created_at: user.createdAt,
        updated_at: user.updatedAt
      };

      const { error } = await supabase
        .from('users')
        .insert([userData]);

      if (error) {
        console.error(`Error migrating user ${user.email}:`, error);
      } else {
        console.log(`Migrated user: ${user.email}`);
      }
    } catch (error) {
      console.error(`Error migrating user ${user.email}:`, error);
    }
  }
  console.log('Users migration completed');
};

const migrateShops = async () => {
  console.log('Migrating shops...');
  const shops = await Shop.find({});
  
  for (const shop of shops) {
    try {
      const shopData = {
        name: shop.name,
        description: shop.description,
        location: shop.location,
        image: shop.image,
        shop_admin: shop.shopAdmin,
        is_active: shop.isActive,
        is_open: shop.isOpen,
        final_validity_time: shop.finalValidityTime,
        next_opening_time: shop.nextOpeningTime,
        qr_validity_minutes: shop.qrValidityMinutes,
        created_at: shop.createdAt,
        updated_at: shop.updatedAt
      };

      const { error } = await supabase
        .from('shops')
        .insert([shopData]);

      if (error) {
        console.error(`Error migrating shop ${shop.name}:`, error);
      } else {
        console.log(`Migrated shop: ${shop.name}`);
      }
    } catch (error) {
      console.error(`Error migrating shop ${shop.name}:`, error);
    }
  }
  console.log('Shops migration completed');
};

const migrateProducts = async () => {
  console.log('Migrating products...');
  const products = await Product.find({});
  
  for (const product of products) {
    try {
      const productData = {
        name: product.name,
        description: product.description,
        price: product.price,
        image: product.image,
        shop: product.shop,
        is_available: product.isAvailable,
        created_at: product.createdAt,
        updated_at: product.updatedAt
      };

      const { error } = await supabase
        .from('products')
        .insert([productData]);

      if (error) {
        console.error(`Error migrating product ${product.name}:`, error);
      } else {
        console.log(`Migrated product: ${product.name}`);
      }
    } catch (error) {
      console.error(`Error migrating product ${product.name}:`, error);
    }
  }
  console.log('Products migration completed');
};

const migrateOrders = async () => {
  console.log('Migrating orders...');
  const orders = await Order.find({});
  
  for (const order of orders) {
    try {
      const orderData = {
        order_id: order.orderId,
        user_id: order.user,
        shop_id: order.shop,
        order_items: order.orderItems,
        total_price: order.totalPrice,
        payment_result: order.paymentResult,
        is_paid: order.isPaid,
        paid_at: order.paidAt,
        qr_code: order.qrCode,
        qr_valid_until: order.qrValidUntil,
        balance_amount: order.balanceAmount,
        held_amount: order.heldAmount,
        final_validity: order.finalValidity,
        is_verified: order.isVerified,
        verified_at: order.verifiedAt,
        status: order.status,
        expires_at: order.expiresAt,
        created_at: order.createdAt,
        updated_at: order.updatedAt
      };

      const { error } = await supabase
        .from('orders')
        .insert([orderData]);

      if (error) {
        console.error(`Error migrating order ${order.orderId}:`, error);
      } else {
        console.log(`Migrated order: ${order.orderId}`);
      }
    } catch (error) {
      console.error(`Error migrating order ${order.orderId}:`, error);
    }
  }
  console.log('Orders migration completed');
};

const migrateTransactions = async () => {
  console.log('Migrating transactions...');
  const transactions = await Transaction.find({});
  
  for (const transaction of transactions) {
    try {
      const transactionData = {
        user_id: transaction.user,
        shop_id: transaction.shop,
        order_id: transaction.order,
        amount: transaction.amount,
        type: transaction.type,
        description: transaction.description,
        created_at: transaction.createdAt,
        updated_at: transaction.updatedAt
      };

      const { error } = await supabase
        .from('transactions')
        .insert([transactionData]);

      if (error) {
        console.error(`Error migrating transaction ${transaction._id}:`, error);
      } else {
        console.log(`Migrated transaction: ${transaction._id}`);
      }
    } catch (error) {
      console.error(`Error migrating transaction ${transaction._id}:`, error);
    }
  }
  console.log('Transactions migration completed');
};

const migrateShopLogs = async () => {
  console.log('Migrating shop logs...');
  const shopLogs = await ShopLog.find({});
  
  for (const log of shopLogs) {
    try {
      const logData = {
        shop_id: log.shop,
        action: log.action,
        performed_by: log.performedBy,
        details: log.details,
        created_at: log.createdAt
      };

      const { error } = await supabase
        .from('shop_logs')
        .insert([logData]);

      if (error) {
        console.error(`Error migrating shop log ${log._id}:`, error);
      } else {
        console.log(`Migrated shop log: ${log._id}`);
      }
    } catch (error) {
      console.error(`Error migrating shop log ${log._id}:`, error);
    }
  }
  console.log('Shop logs migration completed');
};

const migrateStudentAnalytics = async () => {
  console.log('Migrating student analytics...');
  const analytics = await StudentAnalytics.find({});
  
  for (const analytic of analytics) {
    try {
      const analyticData = {
        user_id: analytic.user,
        shop_id: analytic.shop,
        total_spent: analytic.totalSpent,
        total_orders: analytic.totalOrders,
        favorite_products: analytic.favoriteProducts,
        spending_pattern: analytic.spendingPattern,
        created_at: analytic.createdAt,
        updated_at: analytic.updatedAt
      };

      const { error } = await supabase
        .from('student_analytics')
        .insert([analyticData]);

      if (error) {
        console.error(`Error migrating analytics ${analytic._id}:`, error);
      } else {
        console.log(`Migrated analytics: ${analytic._id}`);
      }
    } catch (error) {
      console.error(`Error migrating analytics ${analytic._id}:`, error);
    }
  }
  console.log('Student analytics migration completed');
};

// Main migration function
const runMigration = async () => {
  try {
    console.log('Starting migration from MongoDB to Supabase...');
    
    // Connect to MongoDB
    await connectMongoDB();
    
    // Run migrations in order (due to foreign key constraints)
    await migrateUsers();
    await migrateShops();
    await migrateProducts();
    await migrateOrders();
    await migrateTransactions();
    await migrateShopLogs();
    await migrateStudentAnalytics();
    
    console.log('Migration completed successfully!');
    
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration();
}

export { runMigration }; 