const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema({
  // ...existing code...
  finalValidityTime: {
    type: Date,
    required: [true, 'Final validity time is required'],
    validate: {
      validator: function(v) {
        return v instanceof Date && !isNaN(v);
      },
      message: 'Invalid date format for finalValidityTime'
    }
  },
  // ...existing code...
});

module.exports = mongoose.model('Shop', shopSchema);