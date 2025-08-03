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
      shop_id: shop,
      action,
      performed_by: performedBy,
      details: {
        previousState,
        newState,
        metadata: {
          ...metadata,
          ...(req && {
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent')
          })
        },
        description
      }
    };

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

  const query = { shop_id: shopId };
  
  if (action) query.action = action;
  if (performedBy) query.performed_by = performedBy;
  try {
    let logs = await ShopLogService.find(query);
    
    // Apply date filtering manually since Supabase doesn't support complex queries
    if (startDate || endDate) {
      logs = logs.filter(log => {
        const logDate = new Date(log.created_at);
        if (startDate && logDate < new Date(startDate)) return false;
        if (endDate && logDate > new Date(endDate)) return false;
        return true;
      });
    }
    
    // Apply pagination manually
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedLogs = logs.slice(startIndex, endIndex);

    return {
      logs: paginatedLogs,
      totalPages: Math.ceil(logs.length / parseInt(limit)),
      currentPage: parseInt(page),
      total: logs.length
    };
  } catch (error) {
    console.error('Error getting shop logs:', error);
    throw error;
  }
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

  try {
    const logs = await ShopLogService.find({ 
      shop_id: shopId
    }).then(logs => logs.filter(log => new Date(log.created_at) >= startDate));

    // Calculate stats manually
    const actionCounts = {};
    const dailyActivity = {};
    
    logs.forEach(log => {
      // Count actions
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
      
      // Group by date
      const date = new Date(log.created_at).toDateString();
      dailyActivity[date] = (dailyActivity[date] || 0) + 1;
    });

    const stats = Object.entries(actionCounts).map(([action, count]) => ({
      _id: action,
      count,
      lastOccurrence: logs
        .filter(log => log.action === action)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]?.created_at
    }));

    const dailyActivityArray = Object.entries(dailyActivity).map(([date, count]) => ({
      _id: { date, action: 'all' },
      count
    }));

    return { stats, dailyActivity: dailyActivityArray };
  } catch (error) {
    console.error('Error getting shop activity stats:', error);
    throw error;
  }
};