const mongoose = require('mongoose');
const crypto = require('crypto');

const TransactionSchema = new mongoose.Schema({
  transaction_id: {
    type: String,
    unique: true,
    required: true,
    default: () => 'TXN' + crypto.randomBytes(8).toString('hex').toUpperCase(),
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null, // null if loading funds from bank/card
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null, // null if redeeming out to a bank account
  },
  amount: {
    type: Number,
    required: [true, 'Please add an amount'],
  },
  type: {
    type: String,
    enum: ['pay', 'add', 'send', 'redeem', 'add_institute_funds', 'refund'],
    required: [true, 'Please add transaction type'],
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'success',
  },
  description: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Transaction', TransactionSchema);
