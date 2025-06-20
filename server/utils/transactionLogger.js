import Transaction from '../models/transactionModel.js';

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
    const transaction = await Transaction.create({
      shop,
      order,
      user,
      type,
      amount,
      status,
      paymentMethod,
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

export const getShopTransactions = async (shopId, options = {}) => {
  const {
    page = 1,
    limit = 50,
    type,
    startDate,
    endDate,
    status
  } = options;

  const query = { shop: shopId };
  
  if (type) query.type = type;
  if (status) query.status = status;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const transactions = await Transaction.find(query)
    .populate('user', 'name email rollNo')
    .populate('order', 'orderId totalPrice')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Transaction.countDocuments(query);

  return {
    transactions,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    total
  };
};

export const getShopTransactionStats = async (shopId, period = '30d') => {
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

  const stats = await Transaction.aggregate([
    {
      $match: {
        shop: shopId,
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        avgAmount: { $avg: '$amount' }
      }
    }
  ]);

  const dailyStats = await Transaction.aggregate([
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
          type: '$type'
        },
        count: { $sum: 1 },
        amount: { $sum: '$amount' }
      }
    },
    {
      $sort: { '_id.date': 1 }
    }
  ]);

  return { stats, dailyStats };
};