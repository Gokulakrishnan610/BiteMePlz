import mongoose from 'mongoose';

const studentAnalyticsSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Shop',
    },
    sessionId: {
      type: String,
      required: true
    },
    activity: {
      type: String,
      required: true,
      enum: [
        'shop_visit',
        'product_view',
        'cart_add',
        'cart_remove',
        'checkout_start',
        'payment_attempt',
        'payment_success',
        'payment_failed',
        'order_placed',
        'qr_generated',
        'qr_verified',
        'order_expired',
        'wallet_used',
        'search_performed',
        'category_filtered'
      ]
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    metadata: {
      searchQuery: String,
      category: String,
      quantity: Number,
      amount: Number,
      paymentMethod: String,
      timeSpent: Number,
      deviceType: String,
      browserInfo: String,
      referrer: String,
      cartValue: Number,
      conversionStep: String
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
  }
);

// Indexes for analytics queries
studentAnalyticsSchema.index({ user: 1, timestamp: -1 });
studentAnalyticsSchema.index({ shop: 1, timestamp: -1 });
studentAnalyticsSchema.index({ activity: 1, timestamp: -1 });
studentAnalyticsSchema.index({ sessionId: 1, timestamp: -1 });

const StudentAnalytics = mongoose.model('StudentAnalytics', studentAnalyticsSchema);

export default StudentAnalytics;