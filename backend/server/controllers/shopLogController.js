import asyncHandler from 'express-async-handler';
import { shopLogService } from '../services/databaseService.js';

// @desc    Get shop activity logs
// @route   GET /api/shop-logs/:shop_id
// @access  Private/Admin or shopAdmin
const getshopActivityLogs = asyncHandler(async (req, res) => {
  const { shop_id } = req.params;
  const { page, limit, action, startDate, endDate, performedBy } = req.query;

  // Check authorization
  if (
    req.user.role !== 'admin' && 
    (req.user.role !== 'shopAdmin' || req.user.shop.toString() !== shop_id)
  ) {
    res.status(401);
    throw new Error('Not authorized');
  }

  try {
    const query = { shop_id: shop_id };
    
    if (action) query.action = action;
    if (performedBy) query.performed_by = performedBy;
    if (startDate || endDate) {
      query.created_at = {};
      if (startDate) query.created_at.$gte = new Date(startDate);
      if (endDate) query.created_at.$lte = new Date(endDate);
    }

    const logs = await shopLogService.find(query);
    
    // Apply pagination manually
    const startIndex = (parseInt(page) || 1 - 1) * (parseInt(limit) || 50);
    const endIndex = startIndex + (parseInt(limit) || 50);
    const paginatedLogs = logs.slice(startIndex, endIndex);

    res.json({
      logs: paginatedLogs,
      totalPages: Math.ceil(logs.length / (parseInt(limit) || 50)),
      currentPage: parseInt(page) || 1,
      total: logs.length
    });
  } catch (error) {
    console.error('Error fetching shop activity logs:', error);
    res.status(500);
    throw new Error('Failed to fetch shop activity logs');
  }
});

// @desc    Get shop activity statistics
// @route   GET /api/shop-logs/:shop_id/stats
// @access  Private/Admin or shopAdmin
const getshopActivityStatistics = asyncHandler(async (req, res) => {
  const { shop_id } = req.params;
  const { period } = req.query;

  // Check authorization
  if (
    req.user.role !== 'admin' && 
    (req.user.role !== 'shopAdmin' || req.user.shop.toString() !== shop_id)
  ) {
    res.status(401);
    throw new Error('Not authorized');
  }

  try {
    const logs = await shopLogService.find({ shop_id: shop_id });
    
    // Calculate basic statistics
    const totalActions = logs.length;
    const actionCounts = {};
    const dailyActivity = {};
    
    logs.forEach(log => {
      // Count actions
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
      
      // Group by date
      const date = new Date(log.created_at).toDateString();
      dailyActivity[date] = (dailyActivity[date] || 0) + 1;
    });

    const stats = {
      totalActions,
      actionCounts,
      dailyActivity: Object.entries(dailyActivity).map(([date, count]) => ({
        date,
        count
      })),
      period: period || 'all'
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching shop activity statistics:', error);
    res.status(500);
    throw new Error('Failed to fetch shop activity statistics');
  }
});

// @desc    Get all shop logs (admin only)
// @route   GET /api/shop-logs/all
// @access  Private/Admin
const getAllshopLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, action, startDate, endDate, shop } = req.query;

  const query = {};
  
  if (action) query.action = action;
  if (shop) query.shop_id = shop;
  if (startDate || endDate) {
    query.created_at = {};
    if (startDate) query.created_at.$gte = new Date(startDate);
    if (endDate) query.created_at.$lte = new Date(endDate);
  }

  try {
    const logs = await shopLogService.find(query);
    
    // Apply pagination manually since Supabase doesn't have built-in pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedLogs = logs.slice(startIndex, endIndex);

    res.json({
      logs: paginatedLogs,
      totalPages: Math.ceil(logs.length / parseInt(limit)),
      currentPage: parseInt(page),
      total: logs.length
    });
  } catch (error) {
    console.error('Error fetching shop logs:', error);
    res.status(500);
    throw new Error('Failed to fetch shop logs');
  }
});

export {
  getshopActivityLogs,
  getshopActivityStatistics,
  getAllshopLogs
};