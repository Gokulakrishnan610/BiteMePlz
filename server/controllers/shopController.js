import asyncHandler from 'express-async-handler';
import { shopService } from '../services/databaseService.js';
import { UserService } from '../services/databaseService.js';
import { ProductService } from '../services/databaseService.js';
import { OrderService } from '../services/databaseService.js';
import { handlefinal_validityExpired } from './orderController.js';
import { logshopActivity } from '../utils/shopLogger.js';

// @desc    Get all shops
// @route   GET /api/shops
// @access  Public
const getshops = asyncHandler(async (req, res) => {
  const shops = await shopService.find({ is_active: true });
  res.json(shops);
});

// @desc    Get shop by ID
// @route   GET /api/shops/:id
// @access  Public
const getshopById = asyncHandler(async (req, res) => {
  const shop = await shopService.findById(req.params.id);

  if (shop) {
    res.json(shop);
  } else {
    res.status(404);
    throw new Error('shop not found');
  }
});

// @desc    Update shop
// @route   PUT /api/shops/:id
// @access  Private/Admin or shopAdmin
const updateshop = asyncHandler(async (req, res) => {
  const shop = await shopService.findById(req.params.id);

  if (!shop) {
    res.status(404);
    throw new Error('shop not found');
  }

  // Check if user is admin or the shop admin of this shop
  const userId = req.user.id || req.user._id;
  if (
    req.user.role !== 'admin' && 
    (req.user.role !== 'shopAdmin' || shop.shop_admin.toString() !== userId.toString())
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
    is_active: shop.is_active,
    is_open: shop.is_open,
    final_validity_time: shop.final_validity_time,
    qrValidityMinutes: shop.qr_validity_minutes
  };

  // Validate final_validity_time if it's being updated
  if (req.body.final_validity_time) {
    const validityTime = new Date(req.body.final_validity_time);
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

  const updateData = {
    name: req.body.name || shop.name,
    description: req.body.description || shop.description,
    location: req.body.location || shop.location,
    image: req.body.image || shop.image,
    is_active: req.body.is_active !== undefined ? req.body.is_active : shop.is_active,
    is_open: req.body.is_open !== undefined ? req.body.is_open : shop.is_open
  };
  
  if (req.body.final_validity_time) {
    updateData.final_validity_time = new Date(req.body.final_validity_time);
  }

  if (req.body.qr_validity_minutes) {
    updateData.qr_validity_minutes = req.body.qr_validity_minutes;
  }

  const updatedshop = await shopService.findByIdAndUpdate(shop.id, updateData);

  // Store new state for logging
  const newState = {
    name: updatedshop.name,
    description: updatedshop.description,
    location: updatedshop.location,
    image: updatedshop.image,
    is_active: updatedshop.is_active,
    is_open: updatedshop.is_open,
    final_validity_time: updatedshop.final_validity_time,
    qrValidityMinutes: updatedshop.qr_validity_minutes
  };

  // Determine what was updated
  const changes = [];
  if (previousState.final_validity_time !== newState.final_validity_time) {
    changes.push('final validity time');
  }
  if (previousState.qrValidityMinutes !== newState.qrValidityMinutes) {
    changes.push('QR validity duration');
  }
  if (previousState.is_open !== newState.is_open) {
    changes.push(newState.is_open ? 'opened shop' : 'closed shop');
  }
  if (previousState.is_active !== newState.is_active) {
    changes.push(newState.is_active ? 'activated shop' : 'deactivated shop');
  }

  // Log the activity
  if (changes.length > 0) {
    const action = req.body.final_validity_time ? 'validity_updated' : 
                  req.body.qr_validity_minutes ? 'qr_validity_updated' : 
                  'settings_updated';
    
    const logUserId = req.user.id || req.user._id;
    await logshopActivity({
      shop: shop.id,
      action,
      performedBy: logUserId,
      previousState,
      newState,
      metadata: {
        changes,
        updatedFields: Object.keys(req.body)
      },
      description: `shop settings updated: ${changes.join(', ')}`,
      req
    });
  }

  res.json(updatedshop);
});

// @desc    Delete shop
// @route   DELETE /api/shops/:id
// @access  Private/Admin
const deleteshop = asyncHandler(async (req, res) => {
  const shop = await shopService.findById(req.params.id);

  if (!shop) {
    res.status(404);
    throw new Error('shop not found');
  }

  // Log the deletion
  const deleteUserId = req.user.id || req.user._id;
  await logshopActivity({
    shop: shop.id,
    action: 'shop_deleted',
    performedBy: deleteUserId,
    previousState: {
      name: shop.name,
      is_active: shop.is_active
    },
    newState: {
      deleted: true
    },
    metadata: {
      deletedAt: new Date()
    },
    description: `shop "${shop.name}" deleted by admin`,
    req
  });

  // Delete associated products
  await ProductService.find({ shop: shop.id }).then(products => {
    products.forEach(async (product) => {
      await ProductService.findByIdAndDelete(product.id);
    });
  });
  
  // Update shop admin user
  if (shop.shop_admin) {
    await UserService.findByIdAndUpdate(shop.shop_admin, { 
      role: 'student',
      shop: null
    });
  }

  await shopService.findByIdAndDelete(shop.id);
  res.json({ message: 'shop removed' });
});

// Simple in-memory cache for analytics (5 minutes)
const analyticsCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// @desc    Get shop analytics
// @route   GET /api/shops/:id/analytics
// @access  Private/Admin or shopAdmin
const getshopAnalytics = asyncHandler(async (req, res) => {
  try {
    console.log('Getting analytics for shop:', req.params.id);
    
    const shop = await shopService.findById(req.params.id);

    if (!shop) {
      res.status(404);
      throw new Error('shop not found');
    }

    // Check if user is admin or the shop admin of this shop
    const userId = req.user.id || req.user._id;
    if (
      req.user.role !== 'admin' && 
      (req.user.role !== 'shopAdmin' || shop.shop_admin.toString() !== userId.toString())
    ) {
      res.status(401);
      throw new Error('Not authorized');
    }

    // Check cache first
    const cacheKey = `analytics_${shop.id}`;
    const cachedData = analyticsCache.get(cacheKey);
    if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_DURATION) {
      console.log('Returning cached analytics data');
      return res.json(cachedData.data);
    }

    // Set a timeout for the entire operation
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Analytics request timeout')), 30000); // 30 second timeout
    });

    const analyticsPromise = (async () => {
      // Get total products with error handling
      let products = [];
      try {
        products = await ProductService.find({ shop: shop.id });
      } catch (error) {
        console.error('Error fetching products:', error);
        products = [];
      }
      const totalProducts = products?.length || 0;
      
      // Get orders for this shop with error handling
      let orders = [];
      try {
        orders = await OrderService.find({ shop_id: shop.id });
      } catch (error) {
        console.error('Error fetching orders:', error);
        orders = [];
      }
      
      // Calculate order statistics with null safety
      const totalOrders = orders?.length || 0;
      const totalPaidOrders = orders?.filter(order => order && order.is_paid).length || 0;
      const totalVerifiedOrders = orders?.filter(order => order && order.is_verified).length || 0;
      const totalExpiredOrders = orders?.filter(order => order && order.status === 'expired').length || 0;
      const totalRevenue = orders
        ?.filter(order => order && order.is_paid)
        .reduce((sum, order) => sum + parseFloat(order.total_price || 0), 0) || 0;

      // Get daily order statistics for the last 7 days
      const dailyStats = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayOrders = orders?.filter(order => {
          if (!order || !order.created_at) return false;
          try {
            const orderDate = new Date(order.created_at).toISOString().split('T')[0];
            return orderDate === dateStr;
          } catch (error) {
            console.error('Error parsing order date:', error);
            return false;
          }
        }) || [];
        
        const paidOrders = dayOrders.filter(order => order && order.is_paid).length;
        const verifiedOrders = dayOrders.filter(order => order && order.is_verified).length;
        const expiredOrders = dayOrders.filter(order => order && order.status === 'expired').length;
        const revenue = dayOrders
          .filter(order => order && order.is_paid)
          .reduce((sum, order) => sum + parseFloat(order.total_price || 0), 0);
        
        dailyStats.push({
          _id: { date: dateStr },
          totalOrders: dayOrders.length,
          paidOrders,
          verifiedOrders,
          expiredOrders,
          revenue
        });
      }
      
      // Sort daily stats by date
      dailyStats.sort((a, b) => a._id.date.localeCompare(b._id.date));

      // Get products out of stock
      const outOfStock = products?.filter(product => (product.stock || 0) <= 0).length || 0;

      // Monthly sales for the last 6 months
      const monthlySales = [];
      for (let i = 0; i < 6; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        
        const monthOrders = orders?.filter(order => {
          if (!order || !order.created_at) return false;
          try {
            const orderDate = new Date(order.created_at);
            return orderDate.getMonth() + 1 === month && 
                   orderDate.getFullYear() === year && 
                   order.is_paid;
          } catch (error) {
            console.error('Error parsing order date for monthly stats:', error);
            return false;
          }
        }) || [];
        
        const count = monthOrders.length;
        const total = monthOrders.reduce((sum, order) => sum + parseFloat(order.total_price || 0), 0);
        
        monthlySales.push({
          _id: { month, year },
          count,
          total
        });
      }
      
      // Sort monthly sales by year and month
      monthlySales.sort((a, b) => {
        if (a._id.year !== b._id.year) return a._id.year - b._id.year;
        return a._id.month - b._id.month;
      });

      return {
        totalProducts,
        outOfStock,
        orderStats: {
          totalOrders,
          totalPaidOrders,
          totalVerifiedOrders,
          totalExpiredOrders,
          totalRevenue
        },
        dailyStats,
        monthlySales,
        topProducts: [] // Simplified for now
      };
    })();

    // Race between timeout and analytics calculation
    const result = await Promise.race([analyticsPromise, timeoutPromise]);
    
    // Cache the result
    analyticsCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error getting shop analytics:', error);
    if (error.message === 'Analytics request timeout') {
      res.status(408);
      throw new Error('Analytics request timed out. Please try again.');
    }
    res.status(500);
    throw new Error('Failed to get shop analytics');
  }
});

// @desc    Close shop and expire all orders
// @route   POST /api/shops/:id/close
// @access  Private/shopAdmin
const closeshop = asyncHandler(async (req, res) => {
  const shop = await shopService.findById(req.params.id);

  if (!shop) {
    res.status(404);
    throw new Error('shop not found');
  }

  // Check if user is admin or the shop admin of this shop
  const userId = req.user.id || req.user._id;
  if (
    req.user.role !== 'admin' && 
    (req.user.role !== 'shopAdmin' || shop.shop_admin.toString() !== userId.toString())
  ) {
    res.status(401);
    throw new Error('Not authorized');
  }

  // Store previous state
  const previousState = {
    is_open: shop.is_open,
    final_validity_time: shop.final_validity_time
  };

  // Close the shop
  await shopService.findByIdAndUpdate(shop.id, { is_open: false });

  // Log the manual closure
  const closeUserId = req.user.id || req.user._id;
  await logshopActivity({
    shop: shop.id,
    action: 'manual_close',
    performedBy: closeUserId,
    previousState,
    newState: {
      is_open: false,
      closedAt: new Date()
    },
    metadata: {
      manualClosure: true,
      closedBy: req.user.name
    },
    description: `shop manually closed by ${req.user.name}`,
    req
  });

  // Get all unverified orders for this shop
  const orders = await OrderService.find({
    shop_id: shop.id,
    is_paid: true,
    is_verified: false
  });
  
  // Filter out expired orders manually since Supabase doesn't support $ne
  const activeOrders = orders.filter(order => order.status !== 'expired');

  // Process each order
  let expiredCount = 0;
  let failedOrders = [];
  
  for (const order of activeOrders) {
    try {
      console.log(`Processing order ${order.id} for shop closure`);
      await handlefinal_validityExpired(order);
      expiredCount++;
      console.log(`Successfully processed order ${order.id}`);
    } catch (error) {
      console.error(`Failed to process order ${order.id}:`, error);
      failedOrders.push({
        order_id: order.id,
        error: error.message
      });
    }
  }

  res.json({
    message: `shop closed successfully. ${expiredCount} orders expired.${failedOrders.length > 0 ? ` ${failedOrders.length} orders failed to process.` : ''}`,
    shop,
    failedOrders: failedOrders.length > 0 ? failedOrders : undefined
  });
});

// @desc    Toggle shop open/closed status
// @route   POST /api/shops/:id/toggle
// @access  Private/shopAdmin
const toggleshopStatus = asyncHandler(async (req, res) => {
  const shop = await shopService.findById(req.params.id);

  if (!shop) {
    res.status(404);
    throw new Error('shop not found');
  }

  // Check if user is admin or the shop admin of this shop
  const userId = req.user.id || req.user._id;
  if (
    req.user.role !== 'admin' && 
    (req.user.role !== 'shopAdmin' || shop.shop_admin.toString() !== userId.toString())
  ) {
    res.status(401);
    throw new Error('Not authorized');
  }

  // Store previous state
  const previousState = {
    is_open: shop.is_open
  };

  // Toggle the shop status
  const newis_open = !shop.is_open;
  await shopService.findByIdAndUpdate(shop.id, { is_open: newis_open });

  // Log the toggle action
  const toggleUserId = req.user.id || req.user._id;
  await logshopActivity({
    shop: shop.id,
    action: newis_open ? 'shop_opened' : 'shop_closed',
    performedBy: toggleUserId,
    previousState,
    newState: {
      is_open: newis_open,
      toggledAt: new Date()
    },
    metadata: {
      manualToggle: true,
      toggledBy: req.user.name
    },
    description: `shop ${newis_open ? 'opened' : 'closed'} by ${req.user.name}`,
    req
  });

  // If closing the shop, process unverified orders and set all wallets to zero
  if (!newis_open) {
    // Get all unverified orders for this shop
    const orders = await OrderService.find({
      shop_id: shop.id,
      is_paid: true,
      is_verified: false
    });
    
    // Filter out expired orders manually since Supabase doesn't support $ne
    const activeOrders = orders.filter(order => order.status !== 'expired');

    // Process each order
    let expiredCount = 0;
    let failedOrders = [];
    
    for (const order of activeOrders) {
      try {
        console.log(`Processing order ${order.id} for shop closure`);
        await handlefinal_validityExpired(order);
        expiredCount++;
        console.log(`Successfully processed order ${order.id}`);
      } catch (error) {
        console.error(`Failed to process order ${order.id}:`, error);
        failedOrders.push({
          order_id: order.id,
          error: error.message
        });
      }
    }

    res.json({
      message: `shop closed successfully. ${expiredCount} orders expired.${failedOrders.length > 0 ? ` ${failedOrders.length} orders failed to process.` : ''}`,
      shop: { ...shop, is_open: newis_open },
      failedOrders: failedOrders.length > 0 ? failedOrders : undefined
    });

  } else {
    res.json({
      message: `shop ${newis_open ? 'opened' : 'closed'} successfully.`,
      shop: { ...shop, is_open: newis_open }
    });
  }
});

// @desc    Set all wallets to zero when final validity ends
// @route   POST /api/shops/reset-wallets
// @access  Private/Admin
const resetAllWallets = asyncHandler(async (req, res) => {
  try {
    // Set all users' wallet balances to zero
    const users = await UserService.find({});
    let walletResetCount = 0;
    for (const user of users) {
      await UserService.findByIdAndUpdate(user.id, { balance: 0 });
      walletResetCount++;
    }
    
    console.log(`Reset ${walletResetCount} user wallets to zero due to final validity expiry`);
    
    // Log the wallet reset activity for all shops
    const shops = await shopService.find({ is_active: true });
    const resetUserId = req.user.id || req.user._id;
    for (const shop of shops) {
      await logshopActivity({
        shop: shop.id,
        action: 'auto_close',
        performedBy: resetUserId,
        previousState: { walletsActive: true },
        newState: { walletsActive: false },
        metadata: { 
          walletsReset: walletResetCount,
          resetAt: new Date(),
          adminReset: true
        },
        description: `All user wallets reset to zero by admin`,
        req
      });
    }
    
    res.json({
      message: `Successfully reset ${walletResetCount} user wallets to zero`,
      walletsReset: walletResetCount
    });
  } catch (error) {
    console.error('Error resetting wallets:', error);
    res.status(500);
    throw new Error('Failed to reset wallets');
  }
});

export { 
  getshops, 
  getshopById, 
  updateshop, 
  deleteshop, 
  getshopAnalytics, 
  closeshop, 
  toggleshopStatus,
  resetAllWallets
};
