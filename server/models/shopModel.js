import mongoose from 'mongoose';

const shopSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    image: {
      type: String,
    },
    shopAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isOpen: {
      type: Boolean,
      default: true,
    },
    finalValidityTime: {
      type: Date,
      required: true
    },
    nextOpeningTime: {
      type: Date,
      required: true,
      default: () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(7, 0, 0, 0); // 7 AM next day
        return tomorrow;
      }
    },
    qrValidityMinutes: {
      type: Number,
      required: true,
      default: 20,
      min: [1, 'QR validity must be at least 1 minute'],
      max: [60, 'QR validity cannot exceed 60 minutes'],
      validate: {
        validator: function(v) {
          return Number.isInteger(v) && v >= 1 && v <= 60;
        },
        message: props => `${props.value} is not a valid QR validity duration!`
      }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for products
shopSchema.virtual('products', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'shop',
});

// Method to check if shop is accepting orders
shopSchema.methods.isAcceptingOrders = function() {
  if (!this.isOpen || !this.isActive) return false;

  // Get current time
  const now = new Date();
  const validityTime = new Date(this.finalValidityTime);

  // Get current hour
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();

  // Check if before opening hours (7 AM)
  if (currentHour < 7) {
    console.log('Shop closed: Before opening hours (7 AM)');
    return false;
  }

  // Check if after final validity time
  if (now >= validityTime) {
    console.log('Shop closed: After final validity time');
    return false;
  }

  console.log('Shop open:', {
    currentTime: now.toLocaleString(),
    validityTime: validityTime.toLocaleString()
  });
  
  return true;
};

// Pre-save middleware to update nextOpeningTime when finalValidityTime changes
shopSchema.pre('save', function(next) {
  if (this.isModified('finalValidityTime') || !this.nextOpeningTime) {
    // Set next opening time to 7 AM next day in IST
    const nextDay = new Date(this.finalValidityTime);
    nextDay.setDate(nextDay.getDate() + 1);
    // Convert to IST (UTC+5:30)
    nextDay.setHours(7 - 5, 30, 0, 0); // 7 AM IST = 1:30 AM UTC
    this.nextOpeningTime = nextDay;
  }
  next();
});

const Shop = mongoose.model('Shop', shopSchema);

export default Shop;