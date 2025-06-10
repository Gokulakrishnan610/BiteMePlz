import mongoose from 'mongoose';

const orderItemSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    image: { type: String, required: true },
    price: { type: Number, required: true },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Product',
    },
  }
);

const orderSchema = mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true
    },
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
    orderItems: [orderItemSchema],
    totalPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    paymentResult: {
      razorpay_order_id: { type: String },
      razorpay_payment_id: { type: String },
      razorpay_signature: { type: String },
      status: { type: String },
    },
    isPaid: {
      type: Boolean,
      required: true,
      default: false,
    },
    paidAt: {
      type: Date,
    },
    qrCode: {
      type: String,
    },
    qrValidUntil: {
      type: Date,
    },
    balanceAmount: {
      type: Number,
      default: 0,
    },
    heldAmount: {
      type: Number,
      default: 0,
    },
    finalValidity: {
      type: Date,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifiedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'expired'],
      default: 'pending'
    },
    expiresAt: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true,
  }
);

// Static method to generate order ID
orderSchema.statics.generateOrderId = async function(shopName) {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  // Get the base order ID format
  const baseOrderId = `${shopName.substring(0, 3).toUpperCase()}${day}${month}${year}`;
  
  // Find the last order with this base ID
  const lastOrder = await this.findOne({
    orderId: new RegExp(`^${baseOrderId}`)
  }, {}, { sort: { 'orderId': -1 } });

  let sequence = 1;
  if (lastOrder) {
    const lastSequence = parseInt(lastOrder.orderId.slice(-3));
    sequence = lastSequence + 1;
  }

  // Format the sequence number to be 3 digits
  const sequenceStr = String(sequence).padStart(3, '0');
  
  return `${baseOrderId}${sequenceStr}`;
};

const Order = mongoose.model('Order', orderSchema);

export default Order;