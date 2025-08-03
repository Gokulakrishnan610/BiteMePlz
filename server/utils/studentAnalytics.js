import { StudentAnalyticsService } from '../services/databaseService.js';
import { v4 as uuidv4 } from 'uuid';

export const trackStudentActivity = async ({
  user,
  shop,
  activity,
  sessionId = null,
  productId = null,
  orderId = null,
  metadata = {}
}) => {
  try {
    // Generate session ID if not provided
    if (!sessionId) {
      sessionId = uuidv4();
    }

    const analyticsEntry = {
      user,
      shop,
      sessionId,
      activity,
      productId,
      orderId,
      metadata,
      timestamp: new Date()
    };

    const analytics = await StudentAnalyticsService.create(analyticsEntry);
    console.log(`Student activity tracked: ${activity} for user ${user}`);
    return analytics;
  } catch (error) {
    console.error('Failed to track student activity:', error);
    throw error;
  }
};

export const getStudentBehaviorAnalytics = async (options = {}) => {
  const {
    shop_id,
    userId,
    startDate,
    endDate,
    activity
  } = options;

  const matchQuery = {};
  
  if (shop_id) matchQuery.shop = shop_id;
  if (userId) matchQuery.user = userId;
  if (activity) matchQuery.activity = activity;
  if (startDate || endDate) {
    matchQuery.timestamp = {};
    if (startDate) matchQuery.timestamp.$gte = new Date(startDate);
    if (endDate) matchQuery.timestamp.$lte = new Date(endDate);
  }

  // User journey analysis
  const userJourneys = await StudentAnalyticsService.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$sessionId',
        user: { $first: '$user' },
        shop: { $first: '$shop' },
        activities: {
          $push: {
            activity: '$activity',
            timestamp: '$timestamp',
            metadata: '$metadata'
          }
        },
        startTime: { $min: '$timestamp' },
        endTime: { $max: '$timestamp' },
        totalActivities: { $sum: 1 }
      }
    },
    {
      $addFields: {
        sessionDuration: {
          $divide: [
            { $subtract: ['$endTime', '$startTime'] },
            1000 * 60 // Convert to minutes
          ]
        }
      }
    },
    { $sort: { startTime: -1 } },
    { $limit: 100 }
  ]);

  // Conversion funnel analysis
  const conversionFunnel = await StudentAnalyticsService.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$activity',
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$user' }
      }
    },
    {
      $addFields: {
        uniqueUserCount: { $size: '$uniqueUsers' }
      }
    },
    { $sort: { count: -1 } }
  ]);

  // Popular products analysis
  const popularProducts = await StudentAnalyticsService.aggregate([
    {
      $match: {
        ...matchQuery,
        activity: { $in: ['product_view', 'cart_add'] },
        productId: { $exists: true }
      }
    },
    {
      $group: {
        _id: '$productId',
        views: {
          $sum: { $cond: [{ $eq: ['$activity', 'product_view'] }, 1, 0] }
        },
        addToCarts: {
          $sum: { $cond: [{ $eq: ['$activity', 'cart_add'] }, 1, 0] }
        },
        uniqueUsers: { $addToSet: '$user' }
      }
    },
    {
      $addFields: {
        uniqueUserCount: { $size: '$uniqueUsers' },
        conversionRate: {
          $cond: [
            { $gt: ['$views', 0] },
            { $multiply: [{ $divide: ['$addToCarts', '$views'] }, 100] },
            0
          ]
        }
      }
    },
    { $sort: { views: -1 } },
    { $limit: 20 }
  ]);

  // Time-based activity patterns
  const activityPatterns = await StudentAnalyticsService.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: {
          hour: { $hour: '$timestamp' },
          activity: '$activity'
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.hour': 1 } }
  ]);

  // User engagement metrics
  const engagementMetrics = await StudentAnalyticsService.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$user',
        totalActivities: { $sum: 1 },
        uniqueSessions: { $addToSet: '$sessionId' },
        firstActivity: { $min: '$timestamp' },
        lastActivity: { $max: '$timestamp' },
        shops: { $addToSet: '$shop' }
      }
    },
    {
      $addFields: {
        sessionCount: { $size: '$uniqueSessions' },
        shopCount: { $size: '$shops' },
        avgActivitiesPerSession: {
          $divide: ['$totalActivities', { $size: '$uniqueSessions' }]
        }
      }
    },
    { $sort: { totalActivities: -1 } }
  ]);

  return {
    userJourneys,
    conversionFunnel,
    popularProducts,
    activityPatterns,
    engagementMetrics
  };
};

export const getAdvancedStudentInsights = async (shop_id, period = '30d') => {
  const now = new Date();
  let startDate;

  switch (period) {
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  // Customer segmentation based on behavior
  const customerSegmentation = await StudentAnalyticsService.aggregate([
    {
      $match: {
        shop: shop_id,
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$user',
        totalActivities: { $sum: 1 },
        orders: {
          $sum: { $cond: [{ $eq: ['$activity', 'order_placed'] }, 1, 0] }
        },
        totalSpent: {
          $sum: { $ifNull: ['$metadata.amount', 0] }
        },
        lastActivity: { $max: '$timestamp' }
      }
    },
    {
      $addFields: {
        segment: {
          $switch: {
            branches: [
              {
                case: { $and: [{ $gte: ['$orders', 5] }, { $gte: ['$totalSpent', 1000] }] },
                then: 'VIP'
              },
              {
                case: { $and: [{ $gte: ['$orders', 2] }, { $gte: ['$totalSpent', 500] }] },
                then: 'Regular'
              },
              {
                case: { $gte: ['$orders', 1] },
                then: 'Occasional'
              }
            ],
            default: 'Browser'
          }
        }
      }
    },
    {
      $group: {
        _id: '$segment',
        count: { $sum: 1 },
        avgSpent: { $avg: '$totalSpent' },
        avgOrders: { $avg: '$orders' }
      }
    }
  ]);

  // Abandonment analysis
  const abandonmentAnalysis = await StudentAnalyticsService.aggregate([
    {
      $match: {
        shop: shop_id,
        timestamp: { $gte: startDate },
        activity: { $in: ['cart_add', 'checkout_start', 'payment_attempt', 'order_placed'] }
      }
    },
    {
      $group: {
        _id: '$sessionId',
        activities: {
          $push: {
            activity: '$activity',
            timestamp: '$timestamp'
          }
        }
      }
    },
    {
      $addFields: {
        hasCartAdd: { $in: ['cart_add', '$activities.activity'] },
        hasCheckoutStart: { $in: ['checkout_start', '$activities.activity'] },
        hasPaymentAttempt: { $in: ['payment_attempt', '$activities.activity'] },
        hasOrderPlaced: { $in: ['order_placed', '$activities.activity'] }
      }
    },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        cartAddSessions: { $sum: { $cond: ['$hasCartAdd', 1, 0] } },
        checkoutStartSessions: { $sum: { $cond: ['$hasCheckoutStart', 1, 0] } },
        paymentAttemptSessions: { $sum: { $cond: ['$hasPaymentAttempt', 1, 0] } },
        orderPlacedSessions: { $sum: { $cond: ['$hasOrderPlaced', 1, 0] } }
      }
    }
  ]);

  return {
    customerSegmentation,
    abandonmentAnalysis
  };
};