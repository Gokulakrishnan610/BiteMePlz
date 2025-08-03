import asyncHandler from 'express-async-handler';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { OrderService } from '../services/databaseService.js';
import { ProductService } from '../services/databaseService.js';
import { shopService } from '../services/databaseService.js';
import { UserService } from '../services/databaseService.js';
import { logTransaction } from '../utils/transactionLogger.js';
import { logshopActivity } from '../utils/shopLogger.js';
import WalletService from '../utils/walletService.js';

const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID||"rzp_test_RVKFS8WX756Anx",
  key_secret: process.env.RAZORPAY_SECRET||"kpUZ6zd9t5q7VRM2c76xnqdo",
});

const getEndOfDay = (final_validity_time) => {
  if (!final_validity_time) return null;
  return new Date(final_validity_time);
};

const getQRValidityTime = (minutes) => {
  const date = new Date();
  date.setMinutes(date.getMinutes() + minutes);
  return date;
};

const handleExpiredQR = async (order) => {
  try {
    console.log(`Processing QR expiry for order ${order.id}`);
    
    const shop = await shopService.findById(order.shop_id);
    if (!shop) {
      console.error('shop not found for order:', order.id);
      return;
    }

    // Check if order is already expired or verified
    if (order.status === 'expired' || order.is_verified) {
      console.log(`Order ${order.id} already expired or verified, skipping`);
      return;
    }

    // Get current time
    const now = new Date();

    // Check if final validity is reached
    if (now >= shop.final_validity_time) {
      console.log(`Order ${order.id} reached final validity, processing as final validity expiry`);
      await handlefinal_validityExpired(order);
      return;
    }

    // Return products to stock only if QR is expired and order is not verified
    for (const item of order.order_items) {
      const product = await ProductService.findById(item.product);
      if (product) {
        await ProductService.findByIdAndUpdate(product.id, {
          stock: product.stock + item.quantity
        });
        console.log(`Returned ${item.quantity} units of ${product.name} to stock`);
      }
    }

    // Process balance refund for expired QR orders
    if (!order.is_verified && order.balance_amount > 0) {
      try {
        const user = await UserService.findById(order.user_id);
        if (!user) {
          console.error(`User not found for order ${order.id}`);
          return;
        }

        const refundAmount = order.balance_amount;
        const previousBalance = user.balance || 0;
        const newBalance = previousBalance + refundAmount;

        console.log(`Processing refund: ₹${refundAmount} to user ${user.id} for order ${order.id}`);

        // Update user's wallet balance
        await UserService.findByIdAndUpdate(user.id, {
          balance: newBalance
        });

        // Log the refund transaction
        await logTransaction({
          shop: order.shop_id,
          order: order.id,
          user: order.user_id,
          type: 'refund',
          amount: refundAmount,
          paymentMethod: 'balance',
          description: 'QR code expired - amount refunded to wallet',
          metadata: {
            order_id: order.order_id,
            qrExpiry: order.qr_valid_until,
            previousBalance,
            newBalance,
            refundReason: 'QR expired'
          }
        });

        // Update order status
        await OrderService.findByIdAndUpdate(order.id, {
          status: 'expired',
          balance_amount: 0
        });

        console.log(`Successfully refunded ₹${refundAmount} to user ${user.id}`);
      } catch (error) {
        console.error('Error processing balance refund:', error);
      }
    }

    console.log(`Order ${order.id} expired. Balance returned to wallet.`);
  } catch (error) {
    console.error('Error handling expired QR:', error);
    // Retry the operation after a short delay
    setTimeout(() => handleExpiredQR(order), 5000);
  }
};

const handlefinal_validityExpired = async (order) => {
  try {
    console.log(`Processing final validity expiry for order ${order.id}`);
    
    const shop = await shopService.findById(order.shop_id);
    if (!shop) {
      console.error('shop not found for order:', order.id);
      throw new Error('shop not found');
    }

    // Only process if order is not already expired
    if (order.status === 'expired') {
      console.log(`Order ${order.id} already expired, skipping`);
      return;
    }

    // Handle balance forfeiture for final validity expiry
    const balanceAmount = order.balance_amount || 0;
    console.log(`Order ${order.id} has balance amount: ₹${balanceAmount}`);

    // Update order status and clear balance amount
    await OrderService.findByIdAndUpdate(order.id, {
      status: 'expired',
      balance_amount: 0
    });
    console.log(`Order ${order.id} marked as expired`);

    // Log transaction for final validity expiry (balance forfeited)
    if (balanceAmount > 0) {
      await logTransaction({
        shop: order.shop_id,
        order: order.id,
        user: order.user_id,
        type: 'forfeiture',
        amount: balanceAmount,
        paymentMethod: 'balance',
        description: 'Final validity expired - balance forfeited',
        metadata: {
          order_id: order.order_id,
          final_validity: order.final_validity,
          forfeitedAmount: balanceAmount,
          reason: 'Final validity expired'
        }
      });
    }

    // Return products to stock if not verified
    if (!order.is_verified) {
      for (const item of order.order_items) {
        const product = await ProductService.findById(item.product);
        if (product) {
          await ProductService.findByIdAndUpdate(product.id, {
            stock: product.stock + item.quantity
          });
          console.log(`Returned ${item.quantity} units of ${product.name} to stock`);
        }
      }
    }

    console.log(`Order ${order.id} final validity expired. Products returned to stock.`);
  } catch (error) {
    console.error('Error handling final validity expiry:', error);
    throw error; // Re-throw the error to be handled by the caller
  }
};

const checkExpiryAndRefund = asyncHandler(async (req, res) => {
  const order = await OrderService.findById(req.params.order_id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found or not eligible for refund');
  }

  const now = new Date();
  const qrExpiry = new Date(order.qr_valid_until);
  const final_validity = new Date(order.final_validity);

  if (now >= qrExpiry && now < final_validity) {
    await handleExpiredQR(order);
  } else if (now >= final_validity) {
    await handlefinal_validityExpired(order);
  }

  res.json({ 
    message: 'Order expiry check completed',
    status: order.status,
    balanceAmount: order.balance_amount
  });
});

// @desc    Create multi-shop order
// @route   POST /api/orders/multi-shop
// @access  Private
const createMultiShopOrder = asyncHandler(async (req, res) => {
  const { order_items, totalPrice, paymentMethod } = req.body;

  if (!order_items?.length) {
    res.status(400);
    throw new Error('No order items');
  }

  // Group items by shop
  const itemsByShop = {};
  for (const item of order_items) {
    if (!itemsByShop[item.shop_id]) {
      itemsByShop[item.shop_id] = [];
    }
    itemsByShop[item.shop_id].push(item);
  }

  // Validate all shops and products
  const shopIds = Object.keys(itemsByShop);
  const shops = {};
  
  for (const shop_id of shopIds) {
    const shop = await shopService.findById(shop_id);
    if (!shop) {
      res.status(404);
      throw new Error(`Shop ${shop_id} not found`);
    }
    if (!shop.is_open) {
      res.status(400);
      throw new Error(`Shop ${shop.name} is currently closed`);
    }
    
    // Check final validity time
    const now = new Date();
    const final_validity = new Date(shop.final_validity_time);
    if (now >= final_validity) {
      res.status(400);
      throw new Error(`Shop ${shop.name} has closed for the day`);
    }
    
    shops[shop_id] = shop;
  }

  // Validate all products and stock
  for (const item of order_items) {
    const product = await ProductService.findById(item.product);
    if (!product) {
      res.status(404);
      throw new Error(`Product ${item.product} not found`);
    }
    if (!product.is_available) {
      res.status(400);
      throw new Error(`${product.name} is not available`);
    }
    if (product.stock < item.quantity) {
      res.status(400);
      throw new Error(`Insufficient stock for ${product.name}`);
    }
  }

  // Validate wallet balance if using balance payment
  if (paymentMethod === 'balance') {
    const userId = req.user.id || req.user._id;
    if (!userId) {
      res.status(400);
      throw new Error('User ID not found in request');
    }
    
    const hasSufficientBalance = await WalletService.hasSufficientBalance(userId, totalPrice);
    if (!hasSufficientBalance) {
      const currentBalance = await WalletService.getBalance(userId);
      res.status(400);
      throw new Error(`Insufficient balance. Required: ₹${totalPrice}, Available: ₹${currentBalance}`);
    }
  }

  let razorpayOrder;
  if (paymentMethod !== 'balance') {
    razorpayOrder = await instance.orders.create({
      amount: totalPrice * 100,
      currency: 'INR',
      receipt: crypto.randomBytes(16).toString('hex'),
    });
  }

  const expiryTime = new Date();
  expiryTime.setMinutes(expiryTime.getMinutes() + 3);

  // Create main order ID
  const mainOrderId = await OrderService.generateorder_id('MULTI');

  // Create orders for each shop
  const orders = [];
  for (const [shop_id, shopItems] of Object.entries(itemsByShop)) {
    const shop = shops[shop_id];
    const shopTotal = shopItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    const order = await OrderService.create({
      order_id: `${mainOrderId}-${shop_id}`,
      user_id: req.user._id,
      shop_id: shop_id,
      order_items: shopItems,
      total_price: shopTotal,
      payment_result: razorpayOrder ? {
        razorpay_order_id: razorpayOrder.id,
      } : undefined,
      expires_at: expiryTime,
      final_validity: getEndOfDay(shop.final_validity_time),
      parent_order_id: mainOrderId,
      is_multi_shop: true
    });
    
    orders.push(order);
  }

  // Process wallet balance payment
  if (paymentMethod === 'balance') {
    try {
      const userId = req.user.id || req.user._id;
      const user = await UserService.findById(userId);
      const previousBalance = user.balance || 0;
      const newBalance = previousBalance - totalPrice;
      
      await UserService.findByIdAndUpdate(userId, {
        balance: newBalance
      });

      // Update all orders with payment details and QR codes
      for (const order of orders) {
        const shop = shops[order.shop_id];
        const qrCodeData = JSON.stringify({
          order_id: order.order_id,
          shop_id: order.shop_id,
          parent_order_id: mainOrderId,
          paymentMethod: 'balance',
          timestamp: Date.now()
        });

        const updatedOrder = await OrderService.findByIdAndUpdate(order.id, {
          is_paid: true,
          paid_at: new Date().toISOString(),
          qr_code: qrCodeData,
          qr_valid_until: getQRValidityTime(shop.qr_validity_minutes),
          balance_amount: order.total_price,
          status: 'completed'
        });

        // Log transaction for each shop
        await logTransaction({
          shop: order.shop_id,
          order: order.id,
          user: userId,
          type: 'payment',
          amount: order.total_price,
          paymentMethod: 'balance',
          description: `Multi-shop payment - ${shop.name}`,
          metadata: {
            order_id: order.order_id,
            parent_order_id: mainOrderId,
            previousBalance,
            newBalance,
            qrExpiry: updatedOrder.qr_valid_until,
            final_validity: order.final_validity,
            shopName: shop.name
          }
        });

        // Set timer for QR expiry
        setTimeout(async () => {
          const unverifiedOrder = await OrderService.findById(order.id);
          if (unverifiedOrder && !unverifiedOrder.is_verified) {
            await handleExpiredQR(unverifiedOrder);
          }
        }, shop.qr_validity_minutes * 60 * 1000);
      }

      res.status(201).json({
        success: true,
        main_order_id: mainOrderId,
        orders: orders.map(order => ({
          _id: order.id,
          order_id: order.order_id,
          shop_id: order.shop_id,
          shop_name: shops[order.shop_id].name,
          order_items: order.order_items,
          totalPrice: order.total_price,
          isPaid: true,
          paidAt: new Date().toISOString(),
          qrCode: JSON.stringify({
            order_id: order.order_id,
            shop_id: order.shop_id,
            parent_order_id: mainOrderId,
            paymentMethod: 'balance',
            timestamp: Date.now()
          }),
          qrValidUntil: getQRValidityTime(shops[order.shop_id].qr_validity_minutes),
          final_validity: order.final_validity,
          status: 'completed'
        })),
        payment: {
          method: 'balance',
          amount: totalPrice,
          previousBalance,
          newBalance
        }
      });
    } catch (error) {
      console.error('Error processing multi-shop balance payment:', error);
      res.status(500);
      throw new Error('Failed to process multi-shop balance payment');
    }
  } else {
    res.status(201).json({
      success: true,
      main_order_id: mainOrderId,
      orders: orders,
      razorpay_order_id: razorpayOrder.id
    });
  }
});

const createOrder = asyncHandler(async (req, res) => {
  const { order_items, shop_id, totalPrice, paymentMethod } = req.body;

  if (!order_items?.length) {
    res.status(400);
    throw new Error('No order items');
  }

  const shop = await shopService.findById(shop_id);
  if (!shop) {
    res.status(404);
    throw new Error('shop not found');
  }

  // Check if shop is accepting orders - this will now properly check final validity
  if (!shop.is_open) {
    res.status(400);
    throw new Error('shop is currently closed');
  }
  
  // Check final validity time
  const now = new Date();
  const final_validity = new Date(shop.final_validity_time);
  
  if (now >= final_validity) {
    res.status(400);
    throw new Error('shop has closed for the day. Orders are no longer accepted.');
  }

  for (const item of order_items) {
    const product = await ProductService.findById(item.product);
    if (!product) {
      res.status(404);
      throw new Error(`Product ${item.product} not found`);
    }
    if (!product.is_available) {
      res.status(400);
      throw new Error(`${product.name} is not available`);
    }
    if (product.stock < item.quantity) {
      res.status(400);
      throw new Error(`Insufficient stock for ${product.name}`);
    }
  }

  // Validate wallet balance if using balance payment
  if (paymentMethod === 'balance') {
    // Check if user has id or _id field
    const userId = req.user.id || req.user._id;
    if (!userId) {
      console.error('No user ID found in req.user:', req.user);
      res.status(400);
      throw new Error('User ID not found in request');
    }
    
    const hasSufficientBalance = await WalletService.hasSufficientBalance(userId, totalPrice);
    if (!hasSufficientBalance) {
      const currentBalance = await WalletService.getBalance(userId);
      res.status(400);
      throw new Error(`Insufficient balance. Required: ₹${totalPrice}, Available: ₹${currentBalance}`);
    }
  }

  let razorpayOrder;
  if (paymentMethod !== 'balance') {
    razorpayOrder = await instance.orders.create({
      amount: totalPrice * 100,
      currency: 'INR',
      receipt: crypto.randomBytes(16).toString('hex'),
    });
  }

  const expiryTime = new Date();
  expiryTime.setMinutes(expiryTime.getMinutes() + 3);

  const order_id = await OrderService.generateorder_id(shop.name);

  const order = await OrderService.create({
    order_id,
    user_id: req.user._id,
    shop_id: shop_id,
    order_items,
    total_price: totalPrice,
    payment_result: razorpayOrder ? {
      razorpay_order_id: razorpayOrder.id,
    } : undefined,
    expires_at: expiryTime,
    final_validity: getEndOfDay(shop.final_validity_time)
  });

  // Process wallet balance payment
  if (paymentMethod === 'balance') {
    try {
      // Debug: Log the user object to see its structure
      console.log('User object in createOrder:', req.user);
      
      // Check if user has id or _id field
      const userId = req.user.id || req.user._id;
      if (!userId) {
        console.error('No user ID found in req.user:', req.user);
        res.status(400);
        throw new Error('User ID not found in request');
      }
      
      const user = await UserService.findById(userId);
      const previousBalance = user.balance || 0;
      
      // Deduct amount from user's wallet
      const newBalance = previousBalance - totalPrice;
      await UserService.findByIdAndUpdate(userId, {
        balance: newBalance
      });

             // Update order with payment details
       const updatedOrder = await OrderService.findByIdAndUpdate(order.id, {
         is_paid: true,
         paid_at: new Date().toISOString(),
         qr_code: JSON.stringify({
           order_id: order.order_id,
           paymentMethod: 'balance',
           timestamp: Date.now()
         }),
                   qr_valid_until: getQRValidityTime(shop.qr_validity_minutes),
          balance_amount: totalPrice,
          status: 'completed'
       }, { new: true });

      // Log the transaction
      await logTransaction({
        shop: shop_id,
        order: order.id,
        user: userId,
        type: 'payment',
        amount: totalPrice,
        paymentMethod: 'balance',
        description: 'Payment successful using wallet balance',
        metadata: {
          order_id: order.order_id,
          previousBalance,
          newBalance,
          qrExpiry: updatedOrder.qr_valid_until,
          final_validity: order.final_validity,
          shopName: shop.name
        }
      });

      // Set timer for QR expiry
      setTimeout(async () => {
        const unverifiedOrder = await OrderService.findById(order.id);
        if (unverifiedOrder && !unverifiedOrder.is_verified) {
          await handleExpiredQR(unverifiedOrder);
        }
      }, shop.qr_validity_minutes * 60 * 1000);

      // Set timer for final validity
      const final_validity_timeout = Math.max(0, new Date(order.final_validity).getTime() - Date.now());
      if (final_validity_timeout > 0) {
        setTimeout(async () => {
          const unverifiedOrder = await OrderService.findById(order.id);
                  if (unverifiedOrder && !unverifiedOrder.is_verified) {
          await handlefinal_validityExpired(unverifiedOrder);
        }
        }, final_validity_timeout);
      }

      // Update product stock
      for (const item of order_items) {
        const product = await ProductService.findById(item.product);
        if (product) {
          await ProductService.findByIdAndUpdate(product.id, {
            stock: product.stock - item.quantity
          });
        }
      }

      res.status(201).json({
        success: true,
                 order: {
           _id: order.id,
           order_id: order.order_id,
           order_items: order.order_items,
           totalPrice: order.total_price,
           isPaid: updatedOrder.is_paid,
           paidAt: updatedOrder.paid_at,
           qrCode: updatedOrder.qr_code,
           qrValidUntil: updatedOrder.qr_valid_until,
           final_validity: order.final_validity,
           status: updatedOrder.status
         },
        payment: {
          method: 'balance',
          amount: totalPrice,
          previousBalance,
          newBalance,
          shopName: shop.name
        }
      });
      return;
    } catch (error) {
      console.error('Error processing balance payment:', error);
      res.status(500);
      throw new Error('Failed to process balance payment');
    }
  } else {
    setTimeout(async () => {
      const unpaidOrders = await OrderService.find({
        id: order.id,
        is_paid: false
      });

      if (unpaidOrders && unpaidOrders.length > 0) {
        const unpaidOrder = unpaidOrders[0];
        await OrderService.findByIdAndUpdate(unpaidOrder.id, {
          status: 'expired'
        });
        
        // Log cancellation
        await logTransaction({
          shop: shop_id,
          order: order.id,
          user: userId,
          type: 'cancellation',
          amount: totalPrice,
          status: 'failed',
          paymentMethod: 'razorpay',
          description: 'Order cancelled due to payment timeout',
          metadata: {
            order_id: order.order_id,
            reason: 'payment_timeout'
          }
        });
      }
    }, 3 * 60 * 1000);
  }

  res.status(201).json({
    order,
    razorpayorder_id: razorpayOrder?.id,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID||"rzp_test_RVKFS8WX756Anx",
  });
});

const getOrderById = asyncHandler(async (req, res) => {
  const order = await OrderService.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (
    req.user.role === 'student' && 
    order.user_id.toString() !== req.user._id.toString()
  ) {
    res.status(401);
    throw new Error('Not authorized');
  }

  if (
    req.user.role === 'shopAdmin' && 
    order.shop_id.toString() !== req.user.shop.toString()
  ) {
    res.status(401);
    throw new Error('Not authorized');
  }

  res.json(order);
});

const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await OrderService.find({ user_id: req.user._id });
  // Sort by created_at in descending order
  orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(orders);
});

const getshopOrders = asyncHandler(async (req, res) => {
  const shop_id = req.params.shop_id;
  
  if (
    req.user.role === 'shopAdmin' && 
    req.user.shop.toString() !== shop_id
  ) {
    res.status(401);
    throw new Error('Not authorized');
  }

  const orders = await OrderService.find({ shop_id: shop_id });
  
  // For Supabase, we need to manually populate user data
  const ordersWithUsers = await Promise.all(
    orders.map(async (order) => {
      try {
        const user = await UserService.findById(order.user_id);
        return {
          ...order,
          user: user ? { name: user.name, email: user.email } : null
        };
      } catch (error) {
        console.error('Error fetching user for order:', error);
        return {
          ...order,
          user: null
        };
      }
    })
  );
  
  // Sort by created_at in descending order
  ordersWithUsers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(ordersWithUsers);
});

const getOrderByPaymentId = asyncHandler(async (req, res) => {
  const orders = await OrderService.find({
    'payment_result.razorpay_payment_id': req.params.paymentId,
    is_paid: true
  });

  if (!orders || orders.length === 0) {
    res.status(404);
    throw new Error('Order not found');
  }
  
  const order = orders[0];

  if (
    req.user.role !== 'admin' && 
    (req.user.role !== 'shopAdmin' || order.shop_id.toString() !== req.user.shop.toString())
  ) {
    res.status(401);
    throw new Error('Not authorized');
  }

  res.json({
    order_id: order._id,
    paymentId: order.payment_result.razorpay_payment_id,
    signature: order.payment_result.razorpay_signature
  });
});

const continuePayment = asyncHandler(async (req, res) => {
  const order = await OrderService.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (order.is_paid) {
    res.status(400);
    throw new Error('Order is already paid');
  }

  if (order.status === 'expired') {
    res.status(400);
    throw new Error('Order has expired');
  }

  if (order.user_id.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized');
  }

  // Check if shop is still accepting orders
  const shop = await shopService.findById(order.shop_id);
  if (!shop || !shop.is_open) {
    res.status(400);
    throw new Error('shop is no longer accepting orders');
  }

  for (const item of order.order_items) {
    const product = await ProductService.findById(item.product);
    if (!product || !product.is_available) {
      res.status(400);
      throw new Error(`${item.name} is not available`);
    }
    if (product.stock < item.quantity) {
      res.status(400);
      throw new Error(`Insufficient stock for ${item.name}`);
    }
  }

  const razorpayOrder = await instance.orders.create({
    amount: order.total_price * 100,
    currency: 'INR',
    receipt: crypto.randomBytes(16).toString('hex'),
  });

  const expiryTime = new Date();
  expiryTime.setMinutes(expiryTime.getMinutes() + 3);

  await OrderService.findByIdAndUpdate(order.id, {
    payment_result: {
      ...order.payment_result,
      razorpay_order_id: razorpayOrder.id
    },
    expires_at: expiryTime
  });

  res.json({
    razorpayorder_id: razorpayOrder.id,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID||"rzp_test_RVKFS8WX756Anx",
  });
});

const updateOrderToPaid = asyncHandler(async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

  const order = await OrderService.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  const generated_signature = crypto
    .createHmac('sha256', process.env.RAZORPAY_SECRET||"kpUZ6zd9t5q7VRM2c76xnqdo")
    .update(razorpay_order_id + '|' + razorpay_payment_id)
    .digest('hex');

  if (generated_signature !== razorpay_signature) {
    res.status(400);
    throw new Error('Payment verification failed');
  }

  const shop = await shopService.findById(order.shop_id);
  if (!shop) {
    res.status(404);
    throw new Error('shop not found');
  }

  // Check if shop is still accepting orders
  if (!shop.is_open) {
    res.status(400);
    throw new Error('shop is no longer accepting orders');
  }

  const final_validity = shop?.final_validity_time ? getEndOfDay(shop.final_validity_time) : getEndOfDay('23:59');

  for (const item of order.order_items) {
    const product = await ProductService.findById(item.product);
    if (!product || !product.is_available) {
      res.status(400);
      throw new Error(`${item.name} is not available`);
    }
    if (product.stock < item.quantity) {
      res.status(400);
      throw new Error(`Insufficient stock for ${item.name}`);
    }
    await ProductService.findByIdAndUpdate(product.id, {
      stock: product.stock - item.quantity
    });
  }

  const qrCodeData = JSON.stringify({
    order_id: order.id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });

     const updatedOrder = await OrderService.findByIdAndUpdate(order.id, {
     is_paid: true,
     paid_at: new Date().toISOString(),
     qr_code: qrCodeData,
           qr_valid_until: getQRValidityTime(shop.qr_validity_minutes),
     balance_amount: order.total_price,
     final_validity: final_validity,
     status: 'completed',
     payment_result: {
       razorpay_order_id,
       razorpay_payment_id,
       razorpay_signature,
       status: 'COMPLETED',
     }
   });

  // Log transaction
  await logTransaction({
    shop: order.shop_id,
    order: order.id,
    user: order.user_id,
    type: 'payment',
    amount: order.total_price,
    paymentMethod: 'razorpay',
    description: 'Payment successful via Razorpay',
    metadata: {
      order_id: order.order_id,
      paymentId: razorpay_payment_id,
      qrExpiry: order.qr_valid_until,
      final_validity: order.final_validity
    }
  });

        // Set timer for QR expiry
      setTimeout(async () => {
        const unverifiedOrders = await OrderService.find({
          id: order.id,
          is_verified: false
        });
        if (unverifiedOrders && unverifiedOrders.length > 0) {
          await handleExpiredQR(unverifiedOrders[0]);
        }
      }, shop.qr_validity_minutes * 60 * 1000);

  // Set timer for final validity
  const final_validity_timeout = new Date(final_validity).getTime() - Date.now();
  if (final_validity_timeout > 0) {
    setTimeout(async () => {
      const unverifiedOrders = await OrderService.find({
        id: order.id,
        is_verified: false
      });
      if (unverifiedOrders && unverifiedOrders.length > 0) {
        await handlefinal_validityExpired(unverifiedOrders[0]);
      }
    }, final_validity_timeout);
  }

  res.json(updatedOrder);
});

const cancelOrder = asyncHandler(async (req, res) => {
  const order = await OrderService.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (order.user_id.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized');
  }

  if (order.is_paid) {
    res.status(400);
    throw new Error('Cannot cancel paid order');
  }

  if (order.status === 'expired') {
    res.status(400);
    throw new Error('Order has already expired');
  }

  await OrderService.findByIdAndUpdate(order.id, {
    status: 'expired'
  });

  // Log cancellation
  await logTransaction({
    shop: order.shop_id,
    order: order.id,
    user: order.user_id,
    type: 'cancellation',
    amount: order.total_price,
    status: 'success',
    description: 'Order cancelled by user',
    metadata: {
      order_id: order.order_id,
      reason: 'user_cancelled'
    }
  });

  res.json({ message: 'Order cancelled successfully' });
});

const verifyOrderQR = asyncHandler(async (req, res) => {
  const { qrData } = req.body;
  
  if (!qrData) {
    res.status(400);
    throw new Error('QR code data is required');
  }

  const qrPayload = JSON.parse(qrData);
  
  // Handle both single shop and multi-shop orders
  let order;
  if (qrPayload.parent_order_id) {
    // Multi-shop order - find by order_id and shop_id
    order = await OrderService.findOne({
      order_id: qrPayload.order_id,
      shop_id: qrPayload.shop_id
    });
  } else {
    // Single shop order - find by order_id
    order = await OrderService.findById(qrPayload.order_id);
  }
  
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  
  if (
    req.user.role !== 'admin' && 
    (req.user.role !== 'shopAdmin' || order.shop_id.toString() !== req.user.shop.toString())
  ) {
    res.status(401);
    throw new Error('Not authorized');
  }
  
  if (new Date() > order.qr_valid_until) {
    res.status(400);
    throw new Error('QR code has expired');
  }

  if (new Date() > order.final_validity) {
    res.status(400);
    throw new Error('Order validity has expired');
  }
  
  if (!order.is_paid) {
    res.status(400);
    throw new Error('Order is not paid');
  }
  
  if (order.is_verified) {
    res.status(400);
    throw new Error('Order already verified');
  }

     // Don't add balance back to user when verifying - balance should be zero after final validity
   const updatedOrder = await OrderService.findByIdAndUpdate(order.id, {
     is_verified: true,
     verified_at: new Date().toISOString(),
     balance_amount: 0
   });

  // Log verification
  await logTransaction({
    shop: order.shop_id,
    order: order.id,
    user: order.user_id,
    type: 'verification',
    amount: order.total_price,
    paymentMethod: order.payment_result?.razorpay_payment_id ? 'razorpay' : 'balance',
    description: 'Order verified by shop staff',
    metadata: {
      order_id: order.order_id,
      verifiedBy: req.user._id,
              verifiedAt: order.verified_at
    }
  });

  res.json(updatedOrder);
});

const deleteOrder = asyncHandler(async (req, res) => {
  const order = await OrderService.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (order.user_id.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized');
  }

  if (!order.is_verified && order.status !== 'expired') {
    res.status(400);
    throw new Error('Only verified or expired orders can be deleted');
  }

  await OrderService.findByIdAndDelete(order.id);
  res.json({ message: 'Order deleted successfully' });
});

// @desc    Manually expire all orders past final validity and set wallet to zero
// @route   POST /api/orders/expire-all
// @access  Admin
const expireAllOrders = asyncHandler(async (req, res) => {
  // Get all orders that are not expired, are paid, and not verified
  const allOrders = await OrderService.find({});
  const orders = allOrders.filter(order => 
    order.status !== 'expired' && 
    order.is_paid === true && 
    order.is_verified === false
  );
  let expiredCount = 0;
  for (const order of orders) {
    if (new Date() >= new Date(order.final_validity)) {
      await handlefinal_validityExpired(order);
      expiredCount++;
    }
  }
  
  // Reset all user wallets to zero
  const users = await UserService.find({});
  let walletsReset = 0;
  
  for (const user of users) {
    if (user.balance > 0) {
      await UserService.findByIdAndUpdate(user.id, { balance: 0 });
      walletsReset++;
    }
  }
  
  res.json({ 
    message: `All expired orders processed. Total expired: ${expiredCount}. ${walletsReset} user wallets reset to zero.`,
    walletsReset
  });
});

export {
  createOrder,
  createMultiShopOrder,
  getOrderById,
  getMyOrders,
  getshopOrders,
  getOrderByPaymentId,
  continuePayment,
  updateOrderToPaid,
  cancelOrder,
  verifyOrderQR,
  deleteOrder,
  checkExpiryAndRefund,
  expireAllOrders,
  handleExpiredQR,
  handlefinal_validityExpired
};