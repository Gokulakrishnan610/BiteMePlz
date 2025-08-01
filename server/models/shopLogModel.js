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
        'shop_opened',
        'shop_closed',
        'validity_updated',
        'qr_validity_updated',
        'shop_created',
        'shop_activated',
        'shop_deactivated',
        'manual_close',
        'auto_close',
        'final_validity_expired',
        'settings_updated'
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

const ShopLog = mongoose.model('ShopLog', shopLogSchema);

export default ShopLog;