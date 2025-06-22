import asyncHandler from 'express-async-handler';
import Shop from '../models/shopModel.js';
import User from '../models/userModel.js';
import Product from '../models/productModel.js';
import Order from '../models/orderModel.js';
import { handleFinalValidityExpired } from './orderController.js';
import { logShopActivity } from '../utils/shopLogger.js';

// @desc    Get all shops
// @route   GET /api/shops
// @access  Public
const getShops = asyncHandler(async (req, res) => {
  const shops = await Shop.find({ isActive: true });
  res.json(shops);
});

// @desc    Get shop by ID
// @route   GET /api/shops/:id
// @access  Public
const getShopById = asyncHandler(async (req, res) => {
  const shop = await Shop.findById(req.params.id).populate('products');

  if (shop) {
    res.json(shop);
  } else {
    res.status(404);
    throw new Error('Shop not found');
  }
});

// @desc    Update shop
// @route   PUT /api/shops/:id
// @access  Private/Admin or ShopAdmin
const updateShop = asyncHandler(async (req, res) => {
  const shop = await Shop.findById(req.params.id);

  if (!shop) {
    res.status(404);
    throw new Error('Shop not found');
  }

  // Check if user is admin or the shop admin of this shop
  if (
    req.user.role !== 'admin' && 
    (req.user.role !== 'shopAdmin' || shop.shopAdmin.toString() !== req.user._id.toString())
  ) {
    res.status(401);
    throw new Error('Not authorized');
  }

  // Store previous state for logging
  const previousState = {
    name: shop.name,
    description: shop.description,
    location: shop.location,
    image: shop.image,
    isActive: shop.isActive,
    isOpen: shop.isOpen,
    finalValidityTime: shop.finalValidityTime,
    qrValidityMinutes: shop.qrValidityMinutes
  };

  // Validate finalValidityTime if it's being updated
  if (req.body.finalValidityTime) {
    const validityTime = new Date(req.body.finalValidityTime);
    if (isNaN(validityTime.getTime())) {
      res.status(400);
      throw new Error('Invalid date format for final validity time');
    }
    
    // Ensure the time is not in the past
    const now = new Date();
    if (validityTime <= now) {
      res.status(400);
      throw new Error('Final validity time cannot be in the past');
    }
  }

  shop.name = req.body.name || shop.name;
  shop.description = req.body.description || shop.description;
  shop.location = req.body.location || shop.location;
  shop.image = req.body.image || shop.image;
  shop.isActive = req.body.isActive !== undefined ? req.body.isActive : shop.isActive;
  shop.isOpen = req.body.isOpen !== undefined ? req.body.isOpen : shop.isOpen;
  
  if (req.body.finalValidityTime) {
    shop.finalValidityTime = new Date(req.body.finalValidityTime);
  }

  if (req.body.qrValidityMinutes) {
    shop.qrValidityMinutes = req.body.qrValidityMinutes;
  }

  const updatedShop = await shop.save();

  // Store new state for logging
  const newState = {
    name: updatedShop.name,
    description: updatedShop.description,
    location: updatedShop.location,
    image: updatedShop.image,
    isActive: updatedShop.isActive,
    isOpen: updatedShop.isOpen,
    finalValidityTime: updatedShop.finalValidityTime,
    qrValidityMinutes: updatedShop.qrValidityMinutes
  };

  // Determine what was updated
  const changes = [];
  if (previousState.finalValidityTime !== newState.finalValidityTime) {
    changes.push('final validity time');
  }
  if (previousState.qrValidityMinutes !== newState.qrValidityMinutes) {
    changes.push('QR validity duration');
  }
  if (previousState.isOpen !== newState.isOpen) {
    changes.push(newState.isOpen ? 'opened shop' : 'closed shop');
  }
  if (previousState.isActive !== newState.isActive) {
    changes.push(newState.isActive ? 'activated shop' : 'deactivated shop');
  }

  // Log the activity
  if (changes.length > 0) {
    const action = req.body.finalValidityTime ? 'validity_updated' : 
                  req.body.qrValidityMinutes ? 'qr_validity_updated' : 
                  'settings_updated';
    
    await logShopActivity({
      shop: shop._id,
      action,
      performedBy: req.user._id,
      previousState,
      newState,
      metadata: {
        changes,
        updatedFields: Object.keys(req.body)
      },
      description: `Shop settings updated: ${changes.join(', ')}`,
      req
    });
  }

  res.json(updatedShop);
});

// @desc    Delete shop
// @route   DELETE /api/shops/:id
// @access  Private/Admin
const deleteShop = asyncHandler(async (req, res) => {
  const shop = await Shop.findById(req.params.id);

  if (!shop) {
    res.status(404);
    throw new Error('Shop not found');
  }

  // Log the deletion
  await logShopActivity({
    shop: shop._id,
    action: 'shop_deleted',
    performedBy: req.user._id,
    previousState: {
      name: shop.name,
      isActive: shop.isActive
    },
    newState: {
      deleted: true
    },
    metadata: {
      deletedAt: new Date()
    },
    description: `Shop "${shop.name}" deleted by admin`,
    req
  });

  // Delete associated products
  await Product.deleteMany({ shop: shop._id });
  
  // Update shop admin user
  if (shop.shopAdmin) {
    await User.findByIdAndUpdate(shop.shopAdmin, { 
      role: 'student',
      $unset: { shop: "" }
    });
  }

  await shop.deleteOne();
  res.json({ message: 'Shop removed' });
});

// @desc    Get shop analytics
// @route   GET /api/shops/:id/analytics
// @access  Private/Admin or ShopAdmin
const getShopAnalytics = asyncHandler(async (req, res) => {
  const shop = await Shop.findById(req.params.id);

  if (!shop) {
    res.status(404);
    throw new Error('Shop not found');
  }

  // Check if user is admin or the shop admin of this shop
  if (
    req.user.role !== 'admin' && 
    (req.user.role !== 'shopAdmin' || shop.shopAdmin.toString() !== req.user._id.toString())
  ) {
    res.status(401);
    throw new Error('Not authorized');
  }

  // Get total products
  const totalProducts = await Product.countDocuments({ shop: shop._id });
  
  // Get order statistics
  const orderStats = await Order.aggregate([
    {
      $match: {
        shop: shop._id
      }
    },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalPaidOrders: { 
          $sum: { $cond: [{ $eq: ["$isPaid", true] }, 1, 0] }
        },
        totalVerifiedOrders: { 
          $sum: { $cond: [{ $eq: ["$isVerified", true] }, 1, 0] }
        },
        totalExpiredOrders: { 
          $sum: { $cond: [{ $eq: ["$status", "expired"] }, 1, 0] }
        },
        totalRevenue: { 
          $sum: { $cond: [{ $eq: ["$isPaid", true] }, "$totalPrice", 0] }
        }
      }
    }
  ]);

  // Get daily order statistics for the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const dailyStats = await Order.aggregate([
    {
      $match: {
        shop: shop._id,
        createdAt: { $gte: sevenDaysAgo }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
        },
        totalOrders: { $sum: 1 },
        paidOrders: { 
          $sum: { $cond: [{ $eq: ["$isPaid", true] }, 1, 0] }
        },
        verifiedOrders: { 
          $sum: { $cond: [{ $eq: ["$isVerified", true] }, 1, 0] }
        },
        expiredOrders: { 
          $sum: { $cond: [{ $eq: ["$status", "expired"] }, 1, 0] }
        },
        revenue: { 
          $sum: { $cond: [{ $eq: ["$isPaid", true] }, "$totalPrice", 0] }
        }
      }
    },
    { $sort: { "_id.date": 1 } }
  ]);

  // Get products out of stock
  const outOfStock = await Product.countDocuments({ 
    shop: shop._id,
    stock: { $lte: 0 }
  });

  // Monthly sales for the last 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  const monthlySales = await Order.aggregate([
    {
      $match: {
        shop: shop._id,
        isPaid: true,
        createdAt: { $gte: sixMonthsAgo }
      }
    },
    {
      $group: {
        _id: { 
          month: { $month: "$createdAt" },
          year: { $year: "$createdAt" }
        },
        count: { $sum: 1 },
        total: { $sum: "$totalPrice" }
      }
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]);

  // Top selling products
  const topProducts = await Order.aggregate([
    {
      $match: {
        shop: shop._id,
        isPaid: true
      }
    },
    { $unwind: "$orderItems" },
    {
      $group: {
        _id: "$orderItems.product",
        name: { $first: "$orderItems.name" },
        totalSold: { $sum: "$orderItems.quantity" },
        totalRevenue: { $sum: { $multiply: ["$orderItems.price", "$orderItems.quantity"] } }
      }
    },
    { $sort: { totalSold: -1 } },
    { $limit: 5 }
  ]);

  res.json({
    totalProducts,
    outOfStock,
    orderStats: orderStats[0] || {
      totalOrders: 0,
      totalPaidOrders: 0,
      totalVerifiedOrders: 0,
      totalExpiredOrders: 0,
      totalRevenue: 0
    },
    dailyStats,
    monthlySales,
    topProducts
  });
});

// @desc    Close shop and expire all orders
// @route   POST /api/shops/:id/close
// @access  Private/ShopAdmin
const closeShop = asyncHandler(async (req, res) => {
  const shop = await Shop.findById(req.params.id);

  if (!shop) {
    res.status(404);
    throw new Error('Shop not found');
  }

  // Check if user is admin or the shop admin of this shop
  if (
    req.user.role !== 'admin' && 
    (req.user.role !== 'shopAdmin' || shop.shopAdmin.toString() !== req.user._id.toString())
  ) {
    res.status(401);
    throw new Error('Not authorized');
  }

  // Store previous state
  const previousState = {
    isOpen: shop.isOpen,
    finalValidityTime: shop.finalValidityTime
  };

  // Close the shop
  shop.isOpen = false;
  await shop.save();

  // Log the manual closure
  await logShopActivity({
    shop: shop._id,
    action: 'manual_close',
    performedBy: req.user._id,
    previousState,
    newState: {
      isOpen: false,
      closedAt: new Date()
    },
    metadata: {
      manualClosure: true,
      closedBy: req.user.name
    },
    description: `Shop manually closed by ${req.user.name}`,
    req
  });

  // Get all unverified orders for this shop
  const orders = await Order.find({
    shop: shop._id,
    isPaid: true,
    isVerified: false,
    status: { $ne: 'expired' }
  });

  // Process each order
  let expiredCount = 0;
  let failedOrders = [];
  
  for (const order of orders) {
    try {
      console.log(`Processing order ${order._id} for shop closure`);
      await handleFinalValidityExpired(order);
      expiredCount++;
      console.log(`Successfully processed order ${order._id}`);
    } catch (error) {
      console.error(`Failed to process order ${order._id}:`, error);
      failedOrders.push({
        orderId: order._id,
        error: error.message
      });
    }
  }

  res.json({
    message: `Shop closed successfully. ${expiredCount} orders expired.${failedOrders.length > 0 ? ` ${failedOrders.length} orders failed to process.` : ''}`,
    shop,
    failedOrders: failedOrders.length > 0 ? failedOrders : undefined
  });
});

// @desc    Toggle shop open/closed status
// @route   POST /api/shops/:id/toggle
// @access  Private/ShopAdmin
const toggleShopStatus = asyncHandler(async (req, res) => {
  const shop = await Shop.findById(req.params.id);

  if (!shop) {
    res.status(404);
    throw new Error('Shop not found');
  }

  // Check if user is admin or the shop admin of this shop
  if (
    req.user.role !== 'admin' && 
    (req.user.role !== 'shopAdmin' || shop.shopAdmin.toString() !== req.user._id.toString())
  ) {
    res.status(401);
    throw new Error('Not authorized');
  }

  // Store previous state
  const previousState = {
    isOpen: shop.isOpen
  };

  // Toggle the shop status
  shop.isOpen = !shop.isOpen;
  await shop.save();

  // Log the toggle action
  await logShopActivity({
    shop: shop._id,
    action: shop.isOpen ? 'shop_opened' : 'shop_closed',
    performedBy: req.user._id,
    previousState,
    newState: {
      isOpen: shop.isOpen,
      toggledAt: new Date()
    },
    metadata: {
      manualToggle: true,
      toggledBy: req.user.name
    },
    description: `Shop ${shop.isOpen ? 'opened' : 'closed'} by ${req.user.name}`,
    req
  });

  // If closing the shop, process unverified orders and set all wallets to zero
  if (!shop.isOpen) {
    // Get all unverified orders for this shop
    const orders = await Order.find({
      shop: shop._id,
      isPaid: true,
      isVerified: false,
      status: { $ne: 'expired' }
    });

    // Process each order
    let expiredCount = 0;
    let failedOrders = [];
    
    for (const order of orders) {
      try {
        console.log(`Processing order ${order._id} for shop closure`);
        await handleFinalValidityExpired(order);
        expiredCount++;
        console.log(`Successfully processed order ${order._id}`);
      } catch (error) {
        console.error(`Failed to process order ${order._id}:`, error);
        failedOrders.push({
          orderId: order._id,
          error: error.message
        });
      }
    }

    // Set all users' wallet balances to zero
    const walletResetResult = await User.updateMany({}, { $set: { balance: 0 } });
    console.log(`Reset ${walletResetResult.modifiedCount} user wallets to zero`);

    res.json({
      message: `Shop closed successfully. ${expiredCount} orders expired. ${walletResetResult.modifiedCount} user wallets reset to zero.${failedOrders.length > 0 ? ` ${failedOrders.length} orders failed to process.` : ''}`,
      shop,
      walletsReset: walletResetResult.modifiedCount,
      failedOrders: failedOrders.length > 0 ? failedOrders : undefined
    });
  } else {
    res.json({
      message: `Shop ${shop.isOpen ? 'opened' : 'closed'} successfully.`,
      shop
    });
  }
});

// @desc    Set all wallets to zero when final validity ends
// @route   POST /api/shops/reset-wallets
// @access  Private/Admin
const resetAllWallets = asyncHandler(async (req, res) => {
  try {
    // Set all users' wallet balances to zero
    const result = await User.updateMany({}, { $set: { balance: 0 } });
    
    console.log(`Reset ${result.modifiedCount} user wallets to zero due to final validity expiry`);
    
    // Log the wallet reset activity for all shops
    const shops = await Shop.find({ isActive: true });
    for (const shop of shops) {
      await logShopActivity({
        shop: shop._id,
        action: 'auto_close',
        performedBy: req.user._id,
        previousState: { walletsActive: true },
        newState: { walletsActive: false },
        metadata: { 
          walletsReset: result.modifiedCount,
          resetAt: new Date(),
          adminReset: true
        },
        description: `All user wallets reset to zero by admin`,
        req
      });
    }
    
    res.json({
      message: `Successfully reset ${result.modifiedCount} user wallets to zero`,
      walletsReset: result.modifiedCount
    });
  } catch (error) {
    console.error('Error resetting wallets:', error);
    res.status(500);
    throw new Error('Failed to reset wallets');
  }
});

export { 
  getShops, 
  getShopById, 
  updateShop, 
  deleteShop, 
  getShopAnalytics, 
  closeShop, 
  toggleShopStatus,
  resetAllWallets
};