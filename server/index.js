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
import { errorHandler, notFound } from './middleware/errorMiddleware.js';
import Order from './models/orderModel.js';
import { handleExpiredQR, handleFinalValidityExpired } from './controllers/orderController.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

// Uploads folder
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    await connectDB();
    console.log('MongoDB connected successfully');

    // Set up periodic check for expired orders (every 5 minutes)
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
    }, 5 * 60 * 1000); // Check every 5 minutes

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();