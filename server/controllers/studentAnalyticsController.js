import asyncHandler from 'express-async-handler';
import { getStudentBehaviorAnalytics, getAdvancedStudentInsights } from '../utils/studentAnalytics.js';
import StudentAnalytics from '../models/studentAnalyticsModel.js';

// @desc    Get student behavior analytics for a shop
// @route   GET /api/student-analytics/shop/:shopId
// @access  Private/Admin or ShopAdmin
const getShopStudentAnalytics = asyncHandler(async (req, res) => {
  const { shopId } = req.params;
  const { startDate, endDate, activity, userId } = req.query;

  // Check authorization
  if (
    req.user.role !== 'admin' && 
    (req.user.role !== 'shopAdmin' || req.user.shop.toString() !== shopId)
  ) {
    res.status(401);
    throw new Error('Not authorized');
  }

  const analytics = await getStudentBehaviorAnalytics({
    shopId,
    startDate,
    endDate,
    activity,
    userId
  });

  res.json(analytics);
});

// @desc    Get advanced student insights
// @route   GET /api/student-analytics/shop/:shopId/insights
// @access  Private/Admin or ShopAdmin
const getAdvancedStudentAnalytics = asyncHandler(async (req, res) => {
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

  const insights = await getAdvancedStudentInsights(shopId, period);
  res.json(insights);
});

// @desc    Get overall student analytics (admin only)
// @route   GET /api/student-analytics/overview
// @access  Private/Admin
const getOverallStudentAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate, activity } = req.query;

  const analytics = await getStudentBehaviorAnalytics({
    startDate,
    endDate,
    activity
  });

  // Get cross-shop insights
  const crossShopInsights = await StudentAnalytics.aggregate([
    {
      $match: {
        timestamp: {
          $gte: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          $lte: endDate ? new Date(endDate) : new Date()
        }
      }
    },
    {
      $group: {
        _id: '$user',
        shopsVisited: { $addToSet: '$shop' },
        totalActivities: { $sum: 1 },
        orders: {
          $sum: { $cond: [{ $eq: ['$activity', 'order_placed'] }, 1, 0] }
        }
      }
    },
    {
      $addFields: {
        shopCount: { $size: '$shopsVisited' }
      }
    },
    {
      $group: {
        _id: null,
        avgShopsPerUser: { $avg: '$shopCount' },
        multiShopUsers: {
          $sum: { $cond: [{ $gt: ['$shopCount', 1] }, 1, 0] }
        },
        totalUsers: { $sum: 1 }
      }
    }
  ]);

  res.json({
    ...analytics,
    crossShopInsights: crossShopInsights[0] || {}
  });
});

// @desc    Track student activity
// @route   POST /api/student-analytics/track
// @access  Private
const trackActivity = asyncHandler(async (req, res) => {
  const { shop, activity, sessionId, productId, orderId, metadata } = req.body;

  const analyticsEntry = await StudentAnalytics.create({
    user: req.user._id,
    shop,
    activity,
    sessionId,
    productId,
    orderId,
    metadata,
    timestamp: new Date()
  });

  res.status(201).json(analyticsEntry);
});

export {
  getShopStudentAnalytics,
  getAdvancedStudentAnalytics,
  getOverallStudentAnalytics,
  trackActivity
};