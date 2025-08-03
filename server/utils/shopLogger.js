import { ShopLogService } from '../services/databaseService.js';

export const logShopActivity = async ({
  shop,
  action,
  performedBy,
  previousState = {},
  newState = {},
  metadata = {},
  description,
  req = null
}) => {
  try {
    const logEntry = {
      shop,
      action,
      performedBy,
      previousState,
      newState,
      metadata,
      description
    };

    // Add request info if available
    if (req) {
      logEntry.ipAddress = req.ip || req.connection.remoteAddress;
      logEntry.userAgent = req.get('User-Agent');
    }

    const log = await ShopLogService.create(logEntry);
    console.log(`Shop activity logged: ${action} for shop ${shop} by user ${performedBy}`);
    return log;
  } catch (error) {
    console.error('Failed to log shop activity:', error);
    throw error;
  }
};

export const getShopLogs = async (shopId, options = {}) => {
  const {
    page = 1,
    limit = 50,
    action,
    startDate,
    endDate,
    performedBy
  } = options;

  const query = { shop: shopId };
  
  if (action) query.action = action;
  if (performedBy) query.performedBy = performedBy;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const logs = await ShopLogService.find(query)
    .populate('performedBy', 'name email role')
    .populate('shop', 'name')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await ShopLogService.countDocuments(query);

  return {
    logs,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    total
  };
};

export const getShopActivityStats = async (shopId, period = '30d') => {
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

  const stats = await ShopLogService.aggregate([
    {
      $match: {
        shop: shopId,
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        lastOccurrence: { $max: '$createdAt' }
      }
    }
  ]);

  const dailyActivity = await ShopLogService.aggregate([
    {
      $match: {
        shop: shopId,
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          action: '$action'
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.date': 1 }
    }
  ]);

  return { stats, dailyActivity };
};