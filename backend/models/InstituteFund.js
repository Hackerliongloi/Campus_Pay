const mongoose = require('mongoose');

const InstituteFundSchema = new mongoose.Schema({
  balance: {
    type: Number,
    required: true,
    default: 0,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('InstituteFund', InstituteFundSchema);
