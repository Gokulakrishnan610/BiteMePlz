import asyncHandler from 'express-async-handler';
import { getShopLogs, getShopActivityStats } from '../utils/shopLogger.js';
import ShopLog from '../models/shopLogModel.js';

// @desc    Get shop activity logs
// @route   GET /api/shop-logs/:shopId
// @access  Private/Admin or ShopAdmin
const getShopActivityLogs = asyncHandler(async (req, res) => {
  const { shopId } = req.params;
  const { page, limit, action, startDate, endDate, performedBy } = req.query;

  // Check authorization
  if (
    req.user.role !== 'admin' && 
    (req.user.role !== 'shopAdmin' || req.user.shop.toString() !== shopId)
  ) {
    res.status(401);
    throw new Error('Not authorized');
  }

  const result = await getShopLogs(shopId, {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 50,
    action,
    startDate,
    endDate,
    performedBy
  });

  res.json(result);
});

// @desc    Get shop activity statistics
// @route   GET /api/shop-logs/:shopId/stats
// @access  Private/Admin or ShopAdmin
const getShopActivityStatistics = asyncHandler(async (req, res) => {
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

  const stats = await getShopActivityStats(shopId, period);
  res.json(stats);
});

// @desc    Get all shop logs (admin only)
// @route   GET /api/shop-logs/all
// @access  Private/Admin
const getAllShopLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, action, startDate, endDate, shop } = req.query;

  const query = {};
  
  if (action) query.action = action;
  if (shop) query.shop = shop;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const logs = await ShopLog.find(query)
    .populate('performedBy', 'name email role')
    .populate('shop', 'name location')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await ShopLog.countDocuments(query);

  res.json({
    logs,
    totalPages: Math.ceil(total / limit),
    currentPage: parseInt(page),
    total
  });
});

export {
  getShopActivityLogs,
  getShopActivityStatistics,
  getAllShopLogs
};