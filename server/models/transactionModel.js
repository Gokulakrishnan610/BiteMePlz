import mongoose from 'mongoose';

const transactionSchema = mongoose.Schema(
  {
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Shop',
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Order',
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    type: {
      type: String,
      required: true,
      enum: ['payment', 'refund', 'verification', 'expiry', 'cancellation'],
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['success', 'failed', 'pending'],
      default: 'success'
    },
    paymentMethod: {
      type: String,
      enum: ['balance', 'razorpay'],
    },
    description: {
      type: String,
      required: true,
    },
    metadata: {
      orderId: String,
      paymentId: String,
      qrExpiry: Date,
      finalValidity: Date,
      balanceAmount: Number,
      previousBalance: Number,
      newBalance: Number,
    }
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
transactionSchema.index({ shop: 1, createdAt: -1 });
transactionSchema.index({ order: 1 });
transactionSchema.index({ user: 1 });
transactionSchema.index({ type: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;