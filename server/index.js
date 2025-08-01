import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Define __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables first
dotenv.config({ path: path.join(__dirname, '.env') });

// Log environment variables status
console.log('Environment variables loaded:', {
  JWT_SECRET: process.env.JWT_SECRET ? 'Set' : 'Not Set',
  PORT: process.env.PORT || '5000',
  NODE_ENV: process.env.NODE_ENV || 'development'
});

import express from 'express';
import cors from 'cors';
import connectDB from './config/db.js';
import userRoutes from './routes/userRoutes.js';
import shopRoutes from './routes/shopRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import shopLogRoutes from './routes/shopLogRoutes.js';
import studentAnalyticsRoutes from './routes/studentAnalyticsRoutes.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';
import Order from './models/orderModel.js';
import Shop from './models/shopModel.js';
import User from './models/userModel.js';
import { handleExpiredQR, handleFinalValidityExpired } from './controllers/orderController.js';
import { logShopActivity } from './utils/shopLogger.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/shop-logs', shopLogRoutes);
app.use('/api/student-analytics', studentAnalyticsRoutes);

// Uploads folder - serve static files
const uploadsPath = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsPath));

// Production setup
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../dist', 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('API is running...');
  });
}

// Error Handlers
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Function to check and reset wallets when final validity expires
const checkFinalValidityAndResetWallets = async () => {
  try {
    console.log('Checking final validity times for all shops...');
    
    // Get all active shops
    const shops = await Shop.find({ isActive: true });
    const now = new Date();
    
    let walletsResetForShops = [];
    let shouldResetWallets = false;
    
    for (const shop of shops) {
      const finalValidityTime = new Date(shop.finalValidityTime);
      
      // Check if final validity time has passed
      if (now >= finalValidityTime) {
        console.log(`Final validity expired for shop ${shop.name} at ${finalValidityTime}`);
        
        // Log the automatic closure
        await logShopActivity({
          shop: shop._id,
          action: 'final_validity_expired',
          performedBy: shop.shopAdmin,
          previousState: { finalValidityTime: shop.finalValidityTime },
          newState: { status: 'expired' },
          metadata: { 
            expiredAt: now,
            autoExpiry: true
          },
          description: `Shop automatically closed due to final validity expiry at ${finalValidityTime.toLocaleString()}`
        });

        // Get all unverified orders for this shop
        const orders = await Order.find({
          shop: shop._id,
          isPaid: true,
          isVerified: false,
          status: { $ne: 'expired' }
        });

        // Process each order
        for (const order of orders) {
          try {
            await handleFinalValidityExpired(order);
            console.log(`Processed expired order ${order._id} for shop ${shop.name}`);
          } catch (error) {
            console.error(`Failed to process order ${order._id}:`, error);
          }
        }
        
        walletsResetForShops.push(shop.name);
        shouldResetWallets = true;
      }
    }
    
    // If any shop's final validity has expired, reset all wallets to zero
    if (shouldResetWallets) {
      const result = await User.updateMany({}, { $set: { balance: 0 } });
      console.log(`Final validity expired for shops: ${walletsResetForShops.join(', ')}`);
      console.log(`Reset ${result.modifiedCount} user wallets to zero`);
      
      // Log wallet reset activity
      for (const shopName of walletsResetForShops) {
        const shop = await Shop.findOne({ name: shopName });
        if (shop) {
          await logShopActivity({
            shop: shop._id,
            action: 'auto_close',
            performedBy: shop.shopAdmin,
            previousState: { walletsActive: true },
            newState: { walletsActive: false },
            metadata: { 
              walletsReset: result.modifiedCount,
              resetAt: new Date()
            },
            description: `All user wallets reset to zero due to final validity expiry`
          });
        }
      }
    }
    
  } catch (error) {
    console.error('Error in final validity check:', error);
  }
};

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    await connectDB();
    console.log('MongoDB connected successfully');

    // Set up periodic check for expired orders (every 2 minutes)
    setInterval(async () => {
      try {
        console.log('Starting periodic expired orders check...');
        const now = new Date();
        const orders = await Order.find({
          isPaid: true,
          isVerified: false,
          status: { $ne: 'expired' }
        });

        console.log(`Found ${orders.length} orders to check for expiry`);

        for (const order of orders) {
          const qrExpiry = new Date(order.qrValidUntil);
          const finalValidity = new Date(order.finalValidity);
          
          if (now >= finalValidity) {
            await handleFinalValidityExpired(order);
          } else if (now >= qrExpiry) {
            await handleExpiredQR(order);
          }
        }
        console.log('Periodic expired orders check completed');
      } catch (error) {
        console.error('Error in periodic expired orders check:', error);
      }
    }, 2 * 60 * 1000); // Check every 2 minutes

    // Set up periodic check for final validity and wallet reset (every 1 minute)
    setInterval(checkFinalValidityAndResetWallets, 1 * 60 * 1000); // Check every 1 minute
    
    // Run initial check
    checkFinalValidityAndResetWallets();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Uploads directory: ${uploadsPath}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();