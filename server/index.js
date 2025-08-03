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
import userRoutes from './routes/userRoutes.js';
import shopRoutes from './routes/shopRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import shopLogRoutes from './routes/shopLogRoutes.js';
import studentAnalyticsRoutes from './routes/studentAnalyticsRoutes.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';
import { OrderService } from './services/databaseService.js';
import { ShopService } from './services/databaseService.js';
import { UserService } from './services/databaseService.js';
import { handleExpiredQR, handleFinalValidityExpired } from './controllers/orderController.js';
import { logShopActivity } from './utils/shopLogger.js';

// Import Supabase after environment variables are loaded
import { connectSupabase } from './config/supabase.js';

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
    const shops = await ShopService.find({ is_active: true });
    const now = new Date();
    
    let walletsResetForShops = [];
    let shouldResetWallets = false;
    
    for (const shop of shops) {
      const final_validity_time = new Date(shop.final_validity_time);
      
      // Check if final validity time has passed
      if (now >= final_validity_time) {
        console.log(`Final validity expired for shop ${shop.name} at ${final_validity_time}`);
        
        // Log the automatic closure
        await logShopActivity({
          shop: shop.id,
          action: 'final_validity_expired',
          performedBy: shop.shop_admin,
          previousState: { final_validity_time: shop.final_validity_time },
          newState: { status: 'expired' },
          metadata: { 
            expiredAt: now,
            autoExpiry: true
          },
          description: `Shop automatically closed due to final validity expiry at ${final_validity_time.toLocaleString()}`
        });

        // Get all unverified orders for this shop
        const orders = await OrderService.find({
          shop_id: shop.id,
          is_paid: true,
          is_verified: false,
          status: 'pending'
        });

        // Process each order
        for (const order of orders) {
          try {
            await handleFinalValidityExpired(order);
            console.log(`Processed expired order ${order.id} for shop ${shop.name}`);
          } catch (error) {
            console.error(`Failed to process order ${order.id}:`, error);
          }
        }
        
        walletsResetForShops.push(shop.name);
        shouldResetWallets = true;
      }
    }
    
    // If any shop's final validity has expired, reset all wallets to zero
    if (shouldResetWallets) {
      // Update all users to set balance to 0
      const users = await UserService.find({});
      for (const user of users) {
        await UserService.findByIdAndUpdate(user.id, { balance: 0 });
      }
      const result = { modifiedCount: users.length };
      console.log(`Final validity expired for shops: ${walletsResetForShops.join(', ')}`);
      console.log(`Reset ${result.modifiedCount} user wallets to zero`);
      
      // Log wallet reset activity
      for (const shopName of walletsResetForShops) {
        const shops = await ShopService.find({ name: shopName });
        const shop = shops[0];
        if (shop) {
                      await logShopActivity({
              shop: shop.id,
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

// Connect to Supabase and start server
const startServer = async () => {
  try {
    await connectSupabase();
    console.log('Supabase connected successfully');

    // Set up periodic check for expired orders (every 2 minutes)
    setInterval(async () => {
      try {
        console.log('Starting periodic expired orders check...');
        const now = new Date();
        const orders = await OrderService.find({
          is_paid: true,
          is_verified: false,
          status: 'pending'
        });

        console.log(`Found ${orders.length} orders to check for expiry`);

        for (const order of orders) {
          const qrExpiry = new Date(order.qr_valid_until);
          const finalValidity = new Date(order.final_validity);
          
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