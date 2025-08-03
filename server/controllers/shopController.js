import asyncHandler from 'express-async-handler';
import { ShopService } from '../services/databaseService.js';
import { UserService } from '../services/databaseService.js';
import { ProductService } from '../services/databaseService.js';
import { OrderService } from '../services/databaseService.js';
import { handleFinalValidityExpired } from './orderController.js';
import { logShopActivity } from '../utils/shopLogger.js';

// @desc    Get all shops
// @route   GET /api/shops
// @access  Public
const getShops = asyncHandler(async (req, res) => {
  const shops = await ShopService.find({ is_active: true });
  res.json(shops);
});

// @desc    Get shop by ID
// @route   GET /api/shops/:id
// @access  Public
const getShopById = asyncHandler(async (req, res) => {
  const shop = await ShopService.findById(req.params.id);

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
  const shop = await ShopService.findById(req.params.id);

  if (!shop) {
    res.status(404);
    throw new Error('Shop not found');
  }

  // Check if user is admin or the shop admin of this shop
  if (
    req.user.role !== 'admin' && 
    (req.user.role !== 'shopAdmin' || shop.shop_admin.toString() !== req.user.id.toString())
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
    isActive: shop.is_active,
    isOpen: shop.is_open,
    finalValidityTime: shop.final_validity_time,
    qrValidityMinutes: shop.qr_validity_minutes
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

  const updateData = {
    name: req.body.name || shop.name,
    description: req.body.description || shop.description,
    location: req.body.location || shop.location,
    image: req.body.image || shop.image,
    is_active: req.body.isActive !== undefined ? req.body.isActive : shop.is_active,
    is_open: req.body.isOpen !== undefined ? req.body.isOpen : shop.is_open
  };
  
  if (req.body.finalValidityTime) {
    updateData.final_validity_time = new Date(req.body.finalValidityTime);
  }

  if (req.body.qrValidityMinutes) {
    updateData.qr_validity_minutes = req.body.qrValidityMinutes;
  }

  const updatedShop = await ShopService.findByIdAndUpdate(shop.id, updateData);

  // Store new state for logging
  const newState = {
    name: updatedShop.name,
    description: updatedShop.description,
    location: updatedShop.location,
    image: updatedShop.image,
    isActive: updatedShop.is_active,
    isOpen: updatedShop.is_open,
    finalValidityTime: updatedShop.final_validity_time,
    qrValidityMinutes: updatedShop.qr_validity_minutes
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
      shop: shop.id,
      action,
      performedBy: req.user.id,
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
  const shop = await ShopService.findById(req.params.id);

  if (!shop) {
    res.status(404);
    throw new Error('Shop not found');
  }

  // Log the deletion
  await logShopActivity({
    shop: shop.id,
    action: 'shop_deleted',
    performedBy: req.user.id,
    previousState: {
      name: shop.name,
      isActive: shop.is_active
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

  await ShopService.findByIdAndDelete(shop.id);
  res.json({ message: 'Shop removed' });
});

// @desc    Get shop analytics
// @route   GET /api/shops/:id/analytics
// @access  Private/Admin or ShopAdmin
const getShopAnalytics = asyncHandler(async (req, res) => {
  try {
    const shop = await ShopService.findById(req.params.id);

    if (!shop) {
      res.status(404);
      throw new Error('Shop not found');
    }

    // Check if user is admin or the shop admin of this shop
    if (
      req.user.role !== 'admin' && 
      (req.user.role !== 'shopAdmin' || shop.shop_admin.toString() !== req.user.id.toString())
    ) {
      res.status(401);
      throw new Error('Not authorized');
    }

    // Get total products
    const products = await ProductService.find({ shop: shop.id });
    const totalProducts = products.length;
    
    // Get orders for this shop
    const orders = await OrderService.find({ shop_id: shop.id });
    
    // Calculate order statistics
    const totalOrders = orders.length;
    const totalPaidOrders = orders.filter(order => order.is_paid).length;
    const totalVerifiedOrders = orders.filter(order => order.is_verified).length;
    const totalExpiredOrders = orders.filter(order => order.status === 'expired').length;
    const totalRevenue = orders
      .filter(order => order.is_paid)
      .reduce((sum, order) => sum + parseFloat(order.total_price || 0), 0);

    // Get daily order statistics for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const dailyStats = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayOrders = orders.filter(order => {
        const orderDate = new Date(order.created_at).toISOString().split('T')[0];
        return orderDate === dateStr;
      });
      
      const paidOrders = dayOrders.filter(order => order.is_paid).length;
      const verifiedOrders = dayOrders.filter(order => order.is_verified).length;
      const expiredOrders = dayOrders.filter(order => order.status === 'expired').length;
      const revenue = dayOrders
        .filter(order => order.is_paid)
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

    // Get products out of stock (assuming products have stock field)
    const outOfStock = products.filter(product => (product.stock || 0) <= 0).length;

    // Monthly sales for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlySales = [];
    for (let i = 0; i < 6; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      
      const monthOrders = orders.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate.getMonth() + 1 === month && 
               orderDate.getFullYear() === year && 
               order.is_paid;
      });
      
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

    // Top selling products (simplified - would need order items data)
    const topProducts = [];

    res.json({
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
      topProducts
    });
  } catch (error) {
    console.error('Error getting shop analytics:', error);
    res.status(500);
    throw new Error('Failed to get shop analytics');
  }
});

// @desc    Close shop and expire all orders
// @route   POST /api/shops/:id/close
// @access  Private/ShopAdmin
const closeShop = asyncHandler(async (req, res) => {
  const shop = await ShopService.findById(req.params.id);

  if (!shop) {
    res.status(404);
    throw new Error('Shop not found');
  }

  // Check if user is admin or the shop admin of this shop
  if (
    req.user.role !== 'admin' && 
    (req.user.role !== 'shopAdmin' || shop.shop_admin.toString() !== req.user.id.toString())
  ) {
    res.status(401);
    throw new Error('Not authorized');
  }

  // Store previous state
  const previousState = {
    isOpen: shop.is_open,
    finalValidityTime: shop.final_validity_time
  };

  // Close the shop
  await ShopService.findByIdAndUpdate(shop.id, { is_open: false });

  // Log the manual closure
  await logShopActivity({
    shop: shop.id,
    action: 'manual_close',
    performedBy: req.user.id,
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
  const orders = await OrderService.find({
    shop: shop.id,
    is_paid: true,
    is_verified: false,
    status: { $ne: 'expired' }
  });

  // Process each order
  let expiredCount = 0;
  let failedOrders = [];
  
  for (const order of orders) {
    try {
      console.log(`Processing order ${order.id} for shop closure`);
      await handleFinalValidityExpired(order);
      expiredCount++;
      console.log(`Successfully processed order ${order.id}`);
    } catch (error) {
      console.error(`Failed to process order ${order.id}:`, error);
      failedOrders.push({
        orderId: order.id,
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
  const shop = await ShopService.findById(req.params.id);

  if (!shop) {
    res.status(404);
    throw new Error('Shop not found');
  }

  // Check if user is admin or the shop admin of this shop
  if (
    req.user.role !== 'admin' && 
    (req.user.role !== 'shopAdmin' || shop.shop_admin.toString() !== req.user.id.toString())
  ) {
    res.status(401);
    throw new Error('Not authorized');
  }

  // Store previous state
  const previousState = {
    isOpen: shop.is_open
  };

  // Toggle the shop status
  const newIsOpen = !shop.is_open;
  await ShopService.findByIdAndUpdate(shop.id, { is_open: newIsOpen });

  // Log the toggle action
  await logShopActivity({
    shop: shop.id,
    action: newIsOpen ? 'shop_opened' : 'shop_closed',
    performedBy: req.user.id,
    previousState,
    newState: {
      isOpen: newIsOpen,
      toggledAt: new Date()
    },
    metadata: {
      manualToggle: true,
      toggledBy: req.user.name
    },
    description: `Shop ${newIsOpen ? 'opened' : 'closed'} by ${req.user.name}`,
    req
  });

  // If closing the shop, process unverified orders and set all wallets to zero
  if (!newIsOpen) {
    // Get all unverified orders for this shop
    const orders = await OrderService.find({
      shop: shop.id,
      is_paid: true,
      is_verified: false,
      status: { $ne: 'expired' }
    });

    // Process each order
    let expiredCount = 0;
    let failedOrders = [];
    
    for (const order of orders) {
      try {
        console.log(`Processing order ${order.id} for shop closure`);
        await handleFinalValidityExpired(order);
        expiredCount++;
        console.log(`Successfully processed order ${order.id}`);
      } catch (error) {
        console.error(`Failed to process order ${order.id}:`, error);
        failedOrders.push({
          orderId: order.id,
          error: error.message
        });
      }
    }

    // Set all users' wallet balances to zero
    const users = await UserService.find({});
    let walletResetCount = 0;
    for (const user of users) {
      await UserService.findByIdAndUpdate(user.id, { balance: 0 });
      walletResetCount++;
    }
    console.log(`Reset ${walletResetCount} user wallets to zero`);

    res.json({
      message: `Shop closed successfully. ${expiredCount} orders expired. ${walletResetCount} user wallets reset to zero.${failedOrders.length > 0 ? ` ${failedOrders.length} orders failed to process.` : ''}`,
      shop: { ...shop, is_open: newIsOpen },
      walletsReset: walletResetCount,
      failedOrders: failedOrders.length > 0 ? failedOrders : undefined
    });
  } else {
    res.json({
      message: `Shop ${newIsOpen ? 'opened' : 'closed'} successfully.`,
      shop: { ...shop, is_open: newIsOpen }
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
    const shops = await ShopService.find({ is_active: true });
    for (const shop of shops) {
      await logShopActivity({
        shop: shop.id,
        action: 'auto_close',
        performedBy: req.user.id,
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
  getShops, 
  getShopById, 
  updateShop, 
  deleteShop, 
  getShopAnalytics, 
  closeShop, 
  toggleShopStatus,
  resetAllWallets
};