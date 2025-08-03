import asyncHandler from 'express-async-handler';
import { StudentAnalyticsService } from '../services/databaseService.js';

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

  const analytics = await StudentAnalyticsService.getStudentBehaviorAnalytics({
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

  const insights = await StudentAnalyticsService.getAdvancedStudentInsights(shopId, period);
  res.json(insights);
});

// @desc    Get overall student analytics (admin only)
// @route   GET /api/student-analytics/overview
// @access  Private/Admin
const getOverallStudentAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate, activity } = req.query;

  const analytics = await StudentAnalyticsService.getStudentBehaviorAnalytics({
    startDate,
    endDate,
    activity
  });

  // Get cross-shop insights
  const crossShopInsights = await StudentAnalyticsService.aggregateCrossShopInsights({
    startDate,
    endDate
  });

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

  const analyticsEntry = await StudentAnalyticsService.createAnalyticsEntry({
    userId: req.user._id,
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