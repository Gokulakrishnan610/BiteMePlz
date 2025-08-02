import mongoose from 'mongoose';

const shopLogSchema = mongoose.Schema(
  {
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Shop',
    },
    action: {
      type: String,
      required: true,
      enum: [
        // Shop management actions
        'shop_opened',
        'shop_closed',
        'shop_created',
        'shop_activated',
        'shop_deactivated',
        'shop_deleted',
        'shop_updated',
        'manual_close',
        'auto_close',
        'final_validity_expired',
        'settings_updated',
        'validity_updated',
        'qr_validity_updated',
        
        // Product management actions
        'product_created',
        'product_updated',
        'product_deleted',
        'product_activated',
        'product_deactivated',
        'stock_updated',
        'price_updated',
        
        // Order management actions
        'order_verified',
        'order_cancelled',
        'order_refunded',
        
        // System actions
        'login_attempt',
        'logout',
        'password_changed',
        'profile_updated',
        
        // Financial actions
        'payment_received',
        'refund_processed',
        'balance_updated'
      ]
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    previousState: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    newState: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    description: {
      type: String,
      required: true
    },
    ipAddress: {
      type: String
    },
    userAgent: {
      type: String
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    category: {
      type: String,
      enum: ['shop', 'product', 'order', 'user', 'system', 'financial'],
      default: 'shop'
    }
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
shopLogSchema.index({ shop: 1, createdAt: -1 });
shopLogSchema.index({ action: 1, createdAt: -1 });
shopLogSchema.index({ performedBy: 1, createdAt: -1 });
shopLogSchema.index({ category: 1, createdAt: -1 });
shopLogSchema.index({ severity: 1, createdAt: -1 });

const ShopLog = mongoose.model('ShopLog', shopLogSchema);

export default ShopLog;