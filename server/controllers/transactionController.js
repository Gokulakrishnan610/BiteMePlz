import asyncHandler from 'express-async-handler';
import { TransactionService } from '../services/databaseService.js';
import { ShopService } from '../services/databaseService.js';
import { getShopTransactions, getShopTransactionStats } from '../utils/transactionLogger.js';

// @desc    Get shop transactions
// @route   GET /api/transactions/shop/:shopId
// @access  Private/Admin or ShopAdmin
const getShopTransactionHistory = asyncHandler(async (req, res) => {
  const { shopId } = req.params;
  const { page, limit, type, startDate, endDate, status } = req.query;

  // Check authorization
  if (
    req.user.role !== 'admin' && 
    (req.user.role !== 'shopAdmin' || req.user.shop.toString() !== shopId)
  ) {
    res.status(401);
    throw new Error('Not authorized');
  }

  const shop = await ShopService.findById(shopId);
  if (!shop) {
    res.status(404);
    throw new Error('Shop not found');
  }

  const result = await getShopTransactions(shopId, {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 50,
    type,
    startDate,
    endDate,
    status
  });

  res.json(result);
});

// @desc    Get shop transaction statistics
// @route   GET /api/transactions/shop/:shopId/stats
// @access  Private/Admin or ShopAdmin
const getShopTransactionStatistics = asyncHandler(async (req, res) => {
  const { shopId } = req.params;
  const { period } = req.query;

  // Check authorization
  if (
    req.user.role !== 'admin' && 
    (req.user.role !== 'shopAdmin' || req.user.shop.toString() !== shopId)
  ) {
    res.status(401);
    throw new Error('Not authorized');
  }

  const shop = await ShopService.findById(shopId);
  if (!shop) {
    res.status(404);
    throw new Error('Shop not found');
  }

  const stats = await getShopTransactionStats(shopId, period);
  res.json(stats);
});

// @desc    Get transaction details
// @route   GET /api/transactions/:id
// @access  Private/Admin or ShopAdmin
const getTransactionDetails = asyncHandler(async (req, res) => {
  const transaction = await TransactionService.findById(req.params.id)
    .populate('shop', 'name')
    .populate('user', 'name email rollNo')
    .populate('order', 'orderId totalPrice orderItems');

  if (!transaction) {
    res.status(404);
    throw new Error('Transaction not found');
  }

  // Check authorization
  if (
    req.user.role !== 'admin' && 
    (req.user.role !== 'shopAdmin' || transaction.shop._id.toString() !== req.user.shop.toString())
  ) {
    res.status(401);
    throw new Error('Not authorized');
  }

  res.json(transaction);
});

export {
  getShopTransactionHistory,
  getShopTransactionStatistics,
  getTransactionDetails
};