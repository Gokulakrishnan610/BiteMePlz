import asyncHandler from 'express-async-handler';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { OrderService } from '../services/databaseService.js';
import { ProductService } from '../services/databaseService.js';
import { ShopService } from '../services/databaseService.js';
import { UserService } from '../services/databaseService.js';
import { logTransaction } from '../utils/transactionLogger.js';
import { logShopActivity } from '../utils/shopLogger.js';
import WalletService from '../utils/walletService.js';

const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID||"rzp_test_RVKFS8WX756Anx",
  key_secret: process.env.RAZORPAY_SECRET||"kpUZ6zd9t5q7VRM2c76xnqdo",
});

const getEndOfDay = (finalValidityTime) => {
  if (!finalValidityTime) return null;
  return new Date(finalValidityTime);
};

const getQRValidityTime = (minutes) => {
  const date = new Date();
  date.setMinutes(date.getMinutes() + minutes);
  return date;
};

const handleExpiredQR = async (order) => {
  try {
    console.log(`Processing QR expiry for order ${order.id}`);
    
    const shop = await ShopService.findById(order.shop);
    if (!shop) {
      console.error('Shop not found for order:', order.id);
      return;
    }

    // Check if order is already expired or verified
    if (order.status === 'expired' || order.isVerified) {
      console.log(`Order ${order.id} already expired or verified, skipping`);
      return;
    }

    // Get current time
    const now = new Date();

    // Check if final validity is reached
    if (now >= shop.finalValidityTime) {
      console.log(`Order ${order.id} reached final validity, processing as final validity expiry`);
      await handleFinalValidityExpired(order);
      return;
    }

    // Return products to stock only if QR is expired and order is not verified
    for (const item of order.orderItems) {
      const product = await ProductService.findById(item.product);
      if (product) {
        await ProductService.findByIdAndUpdate(product.id, {
          stock: product.stock + item.quantity
        });
        console.log(`Returned ${item.quantity} units of ${product.name} to stock`);
      }
    }

    // Process balance refund for expired QR orders
    if (!order.isVerified && order.balanceAmount > 0) {
      try {
        const user = await UserService.findById(order.user);
        if (!user) {
          console.error(`User not found for order ${order.id}`);
          return;
        }

        const refundAmount = order.balanceAmount;
        const previousBalance = user.balance || 0;
        const newBalance = previousBalance + refundAmount;

        console.log(`Processing refund: ₹${refundAmount} to user ${user.id} for order ${order.id}`);

        // Update user's wallet balance
        await UserService.findByIdAndUpdate(user.id, {
          balance: newBalance
        });

        // Log the refund transaction
        await logTransaction({
          shop: order.shop,
          order: order.id,
          user: order.user,
          type: 'refund',
          amount: refundAmount,
          paymentMethod: 'balance',
          description: 'QR code expired - amount refunded to wallet',
          metadata: {
            orderId: order.orderId,
            qrExpiry: order.qrValidUntil,
            previousBalance,
            newBalance,
            refundReason: 'QR expired'
          }
        });

        // Update order status
        await OrderService.findByIdAndUpdate(order.id, {
          status: 'expired',
          balanceAmount: 0
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

const handleFinalValidityExpired = async (order) => {
  try {
    console.log(`Processing final validity expiry for order ${order.id}`);
    
    const shop = await ShopService.findById(order.shop);
    if (!shop) {
      console.error('Shop not found for order:', order.id);
      throw new Error('Shop not found');
    }

    // Only process if order is not already expired
    if (order.status === 'expired') {
      console.log(`Order ${order.id} already expired, skipping`);
      return;
    }

    // Handle balance forfeiture for final validity expiry
    const balanceAmount = order.balanceAmount || 0;
    console.log(`Order ${order.id} has balance amount: ₹${balanceAmount}`);

    // Update order status and clear balance amount
    order.status = 'expired';
    order.balanceAmount = 0;
    await order.save();
    console.log(`Order ${order.id} marked as expired`);

    // Log transaction for final validity expiry (balance forfeited)
    if (balanceAmount > 0) {
      await logTransaction({
        shop: order.shop,
        order: order.id,
        user: order.user,
        type: 'forfeiture',
        amount: balanceAmount,
        paymentMethod: 'balance',
        description: 'Final validity expired - balance forfeited',
        metadata: {
          orderId: order.orderId,
          finalValidity: order.finalValidity,
          forfeitedAmount: balanceAmount,
          reason: 'Final validity expired'
        }
      });
    }

    // Return products to stock if not verified
    if (!order.isVerified) {
      for (const item of order.orderItems) {
        const product = await ProductService.findById(item.product);
        if (product) {
          product.stock += item.quantity;
          await product.save();
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
  const order = await OrderService.findById(req.params.orderId);

  if (!order) {
    res.status(404);
    throw new Error('Order not found or not eligible for refund');
  }

  const now = new Date();
  const qrExpiry = new Date(order.qrValidUntil);
  const finalValidity = new Date(order.finalValidity);

  if (now >= qrExpiry && now < finalValidity) {
    await handleExpiredQR(order);
  } else if (now >= finalValidity) {
    await handleFinalValidityExpired(order);
  }

  res.json({ 
    message: 'Order expiry check completed',
    status: order.status,
    balanceAmount: order.balanceAmount
  });
});

const createOrder = asyncHandler(async (req, res) => {
  const { orderItems, shopId, totalPrice, paymentMethod } = req.body;

  if (!orderItems?.length) {
    res.status(400);
    throw new Error('No order items');
  }

  const shop = await ShopService.findById(shopId);
  if (!shop) {
    res.status(404);
    throw new Error('Shop not found');
  }

  // Check if shop is accepting orders - this will now properly check final validity
  if (!shop.isAcceptingOrders()) {
    const now = new Date();
    const finalValidity = new Date(shop.finalValidityTime);
    
    if (now >= finalValidity) {
      res.status(400);
      throw new Error('Shop has closed for the day. Orders are no longer accepted.');
    } else {
      res.status(400);
      throw new Error('Shop is currently closed');
    }
  }

  for (const item of orderItems) {
    const product = await ProductService.findById(item.product);
    if (!product) {
      res.status(404);
      throw new Error(`Product ${item.product} not found`);
    }
    if (!product.isAvailable) {
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

  const orderId = await OrderService.generateOrderId(shop.name);

  const order = await OrderService.create({
    orderId,
    user: req.user._id,
    shop: shopId,
    orderItems,
    totalPrice,
    paymentResult: razorpayOrder ? {
      razorpay_order_id: razorpayOrder.id,
    } : undefined,
    expiresAt: expiryTime,
    finalValidity: getEndOfDay(shop.finalValidityTime)
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
        isPaid: true,
        paidAt: Date.now(),
        qrCode: JSON.stringify({
          orderId: order.orderId,
          paymentMethod: 'balance',
          timestamp: Date.now()
        }),
        qrValidUntil: getQRValidityTime(shop.qrValidityMinutes),
        balanceAmount: totalPrice,
        status: 'completed'
      }, { new: true });

      // Log the transaction
      await logTransaction({
        shop: shopId,
        order: order.id,
        user: userId,
        type: 'payment',
        amount: totalPrice,
        paymentMethod: 'balance',
        description: 'Payment successful using wallet balance',
        metadata: {
          orderId: order.orderId,
          previousBalance,
          newBalance,
          qrExpiry: updatedOrder.qrValidUntil,
          finalValidity: order.finalValidity,
          shopName: shop.name
        }
      });

      // Set timer for QR expiry
      setTimeout(async () => {
        const unverifiedOrder = await OrderService.findById(order.id);
        if (unverifiedOrder && !unverifiedOrder.isVerified) {
          await handleExpiredQR(unverifiedOrder);
        }
      }, shop.qrValidityMinutes * 60 * 1000);

      // Set timer for final validity
      const finalValidityTimeout = Math.max(0, new Date(order.finalValidity).getTime() - Date.now());
      if (finalValidityTimeout > 0) {
        setTimeout(async () => {
          const unverifiedOrder = await OrderService.findById(order.id);
          if (unverifiedOrder && !unverifiedOrder.isVerified) {
            await handleFinalValidityExpired(unverifiedOrder);
          }
        }, finalValidityTimeout);
      }

      // Update product stock
      for (const item of orderItems) {
        const product = await ProductService.findById(item.product);
        if (product) {
          product.stock -= item.quantity;
          await product.save();
        }
      }

      res.status(201).json({
        success: true,
        order: {
          _id: order.id,
          orderId: order.orderId,
          orderItems: order.orderItems,
          totalPrice: order.totalPrice,
          isPaid: updatedOrder.isPaid,
          paidAt: updatedOrder.paidAt,
          qrCode: updatedOrder.qrCode,
          qrValidUntil: updatedOrder.qrValidUntil,
          finalValidity: order.finalValidity,
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
      const unpaidOrder = await OrderService.findOne({
        _id: order.id,
        isPaid: false
      });

      if (unpaidOrder) {
        unpaidOrder.status = 'expired';
        await unpaidOrder.save();
        
        // Log cancellation
        await logTransaction({
          shop: shopId,
          order: order.id,
          user: userId,
          type: 'cancellation',
          amount: totalPrice,
          status: 'failed',
          paymentMethod: 'razorpay',
          description: 'Order cancelled due to payment timeout',
          metadata: {
            orderId: order.orderId,
            reason: 'payment_timeout'
          }
        });
      }
    }, 3 * 60 * 1000);
  }

  res.status(201).json({
    order,
    razorpayOrderId: razorpayOrder?.id,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID||"rzp_test_RVKFS8WX756Anx",
  });
});

const getOrderById = asyncHandler(async (req, res) => {
  const order = await OrderService.findById(req.params.id).populate('user', 'name rollNo');

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (
    req.user.role === 'student' && 
    order.user._id.toString() !== req.user._id.toString()
  ) {
    res.status(401);
    throw new Error('Not authorized');
  }

  if (
    req.user.role === 'shopAdmin' && 
    order.shop.toString() !== req.user.shop.toString()
  ) {
    res.status(401);
    throw new Error('Not authorized');
  }

  res.json(order);
});

const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await OrderService.find({ user: req.user._id }).sort('-createdAt');
  res.json(orders);
});

const getShopOrders = asyncHandler(async (req, res) => {
  const shopId = req.params.shopId;
  
  if (
    req.user.role === 'shopAdmin' && 
    req.user.shop.toString() !== shopId
  ) {
    res.status(401);
    throw new Error('Not authorized');
  }

  const orders = await OrderService.find({ shop: shopId })
    .populate('user', 'name email')
    .sort('-createdAt');
  res.json(orders);
});

const getOrderByPaymentId = asyncHandler(async (req, res) => {
  const order = await OrderService.findOne({
    'paymentResult.razorpay_payment_id': req.params.paymentId,
    isPaid: true
  });

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (
    req.user.role !== 'admin' && 
    (req.user.role !== 'shopAdmin' || order.shop.toString() !== req.user.shop.toString())
  ) {
    res.status(401);
    throw new Error('Not authorized');
  }

  res.json({
    orderId: order._id,
    paymentId: order.paymentResult.razorpay_payment_id,
    signature: order.paymentResult.razorpay_signature
  });
});

const continuePayment = asyncHandler(async (req, res) => {
  const order = await OrderService.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (order.isPaid) {
    res.status(400);
    throw new Error('Order is already paid');
  }

  if (order.status === 'expired') {
    res.status(400);
    throw new Error('Order has expired');
  }

  if (order.user.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized');
  }

  // Check if shop is still accepting orders
  const shop = await ShopService.findById(order.shop);
  if (!shop || !shop.isAcceptingOrders()) {
    res.status(400);
    throw new Error('Shop is no longer accepting orders');
  }

  for (const item of order.orderItems) {
    const product = await ProductService.findById(item.product);
    if (!product || !product.isAvailable) {
      res.status(400);
      throw new Error(`${item.name} is not available`);
    }
    if (product.stock < item.quantity) {
      res.status(400);
      throw new Error(`Insufficient stock for ${item.name}`);
    }
  }

  const razorpayOrder = await instance.orders.create({
    amount: order.totalPrice * 100,
    currency: 'INR',
    receipt: crypto.randomBytes(16).toString('hex'),
  });

  const expiryTime = new Date();
  expiryTime.setMinutes(expiryTime.getMinutes() + 3);

  order.paymentResult.razorpay_order_id = razorpayOrder.id;
  order.expiresAt = expiryTime;
  await order.save();

  res.json({
    razorpayOrderId: razorpayOrder.id,
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

  const shop = await ShopService.findById(order.shop);
  if (!shop) {
    res.status(404);
    throw new Error('Shop not found');
  }

  // Check if shop is still accepting orders
  if (!shop.isAcceptingOrders()) {
    res.status(400);
    throw new Error('Shop is no longer accepting orders');
  }

  const finalValidity = shop?.finalValidityTime ? getEndOfDay(shop.finalValidityTime) : getEndOfDay('23:59');

  for (const item of order.orderItems) {
    const product = await ProductService.findById(item.product);
    if (!product || !product.isAvailable) {
      res.status(400);
      throw new Error(`${item.name} is not available`);
    }
    if (product.stock < item.quantity) {
      res.status(400);
      throw new Error(`Insufficient stock for ${item.name}`);
    }
    product.stock -= item.quantity;
    await product.save();
  }

  const qrCodeData = JSON.stringify({
    orderId: order.id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });

  order.isPaid = true;
  order.paidAt = Date.now();
  order.qrCode = qrCodeData;
  order.qrValidUntil = getQRValidityTime(shop.qrValidityMinutes);
  order.balanceAmount = order.totalPrice;
  order.finalValidity = finalValidity;
  order.status = 'completed';
  order.paymentResult = {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    status: 'COMPLETED',
  };

  const updatedOrder = await order.save();

  // Log transaction
  await logTransaction({
    shop: order.shop,
    order: order.id,
    user: order.user,
    type: 'payment',
    amount: order.totalPrice,
    paymentMethod: 'razorpay',
    description: 'Payment successful via Razorpay',
    metadata: {
      orderId: order.orderId,
      paymentId: razorpay_payment_id,
      qrExpiry: order.qrValidUntil,
      finalValidity: order.finalValidity
    }
  });

  // Set timer for QR expiry
  setTimeout(async () => {
    const unverifiedOrder = await OrderService.findOne({
      _id: order.id,
      isVerified: false
    });
    if (unverifiedOrder) {
      await handleExpiredQR(unverifiedOrder);
    }
  }, shop.qrValidityMinutes * 60 * 1000);

  // Set timer for final validity
  const finalValidityTimeout = new Date(finalValidity).getTime() - Date.now();
  if (finalValidityTimeout > 0) {
    setTimeout(async () => {
      const unverifiedOrder = await OrderService.findOne({
        _id: order.id,
        isVerified: false
      });
      if (unverifiedOrder) {
        await handleFinalValidityExpired(unverifiedOrder);
      }
    }, finalValidityTimeout);
  }

  res.json(updatedOrder);
});

const cancelOrder = asyncHandler(async (req, res) => {
  const order = await OrderService.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (order.user.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized');
  }

  if (order.isPaid) {
    res.status(400);
    throw new Error('Cannot cancel paid order');
  }

  if (order.status === 'expired') {
    res.status(400);
    throw new Error('Order has already expired');
  }

  order.status = 'expired';
  await order.save();

  // Log cancellation
  await logTransaction({
    shop: order.shop,
    order: order.id,
    user: order.user,
    type: 'cancellation',
    amount: order.totalPrice,
    status: 'success',
    description: 'Order cancelled by user',
    metadata: {
      orderId: order.orderId,
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
  
  const order = await OrderService.findById(qrPayload.orderId).populate('user', 'name rollNo');
  
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  
  if (
    req.user.role !== 'admin' && 
    (req.user.role !== 'shopAdmin' || order.shop.toString() !== req.user.shop.toString())
  ) {
    res.status(401);
    throw new Error('Not authorized');
  }
  
  if (new Date() > order.qrValidUntil) {
    res.status(400);
    throw new Error('QR code has expired');
  }

  if (new Date() > order.finalValidity) {
    res.status(400);
    throw new Error('Order validity has expired');
  }
  
  if (!order.isPaid) {
    res.status(400);
    throw new Error('Order is not paid');
  }
  
  if (order.isVerified) {
    res.status(400);
    throw new Error('Order already verified');
  }

  // Don't add balance back to user when verifying - balance should be zero after final validity
  order.isVerified = true;
  order.verifiedAt = Date.now();
  order.balanceAmount = 0;
  
  const updatedOrder = await order.save();

  // Log verification
  await logTransaction({
    shop: order.shop,
    order: order.id,
    user: order.user._id,
    type: 'verification',
    amount: order.totalPrice,
    paymentMethod: order.paymentResult?.razorpay_payment_id ? 'razorpay' : 'balance',
    description: 'Order verified by shop staff',
    metadata: {
      orderId: order.orderId,
      verifiedBy: req.user._id,
      verifiedAt: order.verifiedAt
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

  if (order.user.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized');
  }

  if (!order.isVerified && order.status !== 'expired') {
    res.status(400);
    throw new Error('Only verified or expired orders can be deleted');
  }

  await order.deleteOne();
  res.json({ message: 'Order deleted successfully' });
});

// @desc    Manually expire all orders past final validity and set wallet to zero
// @route   POST /api/orders/expire-all
// @access  Admin
const expireAllOrders = asyncHandler(async (req, res) => {
  const orders = await OrderService.find({ status: { $ne: 'expired' }, isPaid: true, isVerified: false });
  let expiredCount = 0;
  for (const order of orders) {
    if (new Date() >= new Date(order.finalValidity)) {
      await handleFinalValidityExpired(order);
      expiredCount++;
    }
  }
  
  // Reset all user wallets to zero
  const result = await UserService.updateMany({}, { $set: { balance: 0 } });
  
  res.json({ 
    message: `All expired orders processed. Total expired: ${expiredCount}. ${result.modifiedCount} user wallets reset to zero.`,
    walletsReset: result.modifiedCount
  });
});

export {
  createOrder,
  getOrderById,
  getMyOrders,
  getShopOrders,
  getOrderByPaymentId,
  continuePayment,
  updateOrderToPaid,
  cancelOrder,
  verifyOrderQR,
  deleteOrder,
  checkExpiryAndRefund,
  expireAllOrders,
  handleExpiredQR,
  handleFinalValidityExpired
};