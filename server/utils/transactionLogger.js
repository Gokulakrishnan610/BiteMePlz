import { TransactionService } from '../services/databaseService.js';

export const logTransaction = async ({
  shop,
  order,
  user,
  type,
  amount,
  status = 'success',
  paymentMethod,
  description,
  metadata = {}
}) => {
  try {
    const transaction = await TransactionService.createTransaction({
      shop_id: shop,
      order_id: order,
      user_id: user,
      type,
      amount,
      status,
      payment_method: paymentMethod,
      description,
      metadata
    });
    
    console.log(`Transaction logged: ${type} - ${description} - ₹${amount}`);
    return transaction;
  } catch (error) {
    console.error('Failed to log transaction:', error);
    throw error;
  }
};

export const getShopTransactions = async (shop_id, options = {}) => {
  const {
    page = 1,
    limit = 50,
    type,
    startDate,
    endDate,
    status
  } = options;

  const query = { shop_id: shop_id };
  
  if (type) query.type = type;
  if (status) query.status = status;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const transactions = await TransactionService.getTransactions(query, {
    page,
    limit,
    sort: { createdAt: -1 }
  });

  const total = await TransactionService.getTransactionCount(query);

  return {
    transactions,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    total
  };
};

export const getShopTransactionStats = async (shop_id, period = '30d') => {
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

  const stats = await TransactionService.getTransactionStats(shop_id, startDate);

  const dailyStats = await TransactionService.getDailyTransactionStats(shop_id, startDate);

  return { stats, dailyStats };
};