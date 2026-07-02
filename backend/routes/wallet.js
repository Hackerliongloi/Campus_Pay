const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const { protect, authorize } = require('../middleware/auth');

// @desc    Send money to another student or pay a vendor
// @route   POST /api/wallet/transfer
// @access  Private (Student)
router.post('/transfer', protect, authorize('student'), async (req, res) => {
  try {
    const { receiverEmail, amount, description, mpin } = req.body;
    const parsedAmount = parseFloat(amount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Please enter a valid positive amount' });
    }

    if (!mpin) {
      return res.status(400).json({ success: false, error: 'Please provide security MPIN' });
    }

    if (req.user.status === 'frozen') {
      return res.status(403).json({ success: false, error: 'Your wallet has been frozen. You cannot make payments.' });
    }

    if (req.user.kycStatus !== 'approved') {
      return res.status(403).json({
        success: false,
        error: `Transaction blocked. Your KYC status is: ${req.user.kycStatus.toUpperCase()}. You must wait for Admin to verify your Student ID card.`,
      });
    }

    // Verify MPIN
    const sender = await User.findById(req.user.id).select('+mpin');
    if (!sender) {
      return res.status(404).json({ success: false, error: 'Sender user not found' });
    }

    const isMpinValid = await sender.matchMpin(mpin);
    if (!isMpinValid) {
      return res.status(401).json({ success: false, error: 'Incorrect security MPIN' });
    }

    // Find receiver
    const receiver = await User.findOne({ email: receiverEmail });
    if (!receiver) {
      return res.status(404).json({ success: false, error: 'Receiver email account not found' });
    }

    if (receiver.role !== 'vendor') {
      return res.status(400).json({
        success: false,
        error: 'Direct wallet transfers from students are restricted exclusively to approved canteen vendors. Student-to-student transfers are not allowed.',
      });
    }

    if (receiver._id.toString() === req.user.id.toString()) {
      return res.status(400).json({ success: false, error: 'Cannot transfer funds to yourself' });
    }

    if (receiver.status === 'suspended') {
      return res.status(400).json({ success: false, error: 'Receiver account has been suspended' });
    }

    // Deduct from central Institute Fund atomically
    const { getInstituteFund } = require('../utils/fund');
    const fund = await getInstituteFund();

    if (fund.balance < parsedAmount) {
      return res.status(400).json({ success: false, error: 'Insufficient Institute Balance' });
    }

    const InstituteFund = require('../models/InstituteFund');
    const fundUpdate = await InstituteFund.findOneAndUpdate(
      { _id: fund._id, balance: { $gte: parsedAmount } },
      { $inc: { balance: -parsedAmount } },
      { new: true }
    );

    if (!fundUpdate) {
      return res.status(400).json({ success: false, error: 'Insufficient Institute Balance' });
    }

    // Determine type (transfer to student or payment to vendor)
    const isVendor = receiver.role === 'vendor';
    const txnType = isVendor ? 'pay' : 'send';

    // Credit receiver atomically
    if (isVendor) {
      // Vendor gets credited to totalEarnings and walletBalance
      await User.findByIdAndUpdate(receiver._id, {
        $inc: { walletBalance: parsedAmount, totalEarnings: parsedAmount },
      });
    } else {
      await User.findByIdAndUpdate(receiver._id, {
        $inc: { walletBalance: parsedAmount },
      });
    }

    // Create transaction log
    const transaction = await Transaction.create({
      sender: req.user.id,
      receiver: receiver._id,
      amount: parsedAmount,
      type: txnType,
      status: 'success',
      description: description || (isVendor ? `Scan & Pay to ${receiver.name}` : `Transfer to ${receiver.name}`),
    });

    // Create notifications for sender and receiver
    try {
      await Notification.create({
        recipient: receiver._id,
        title: isVendor ? 'Payment Received' : 'Fund Received',
        message: `You received ₹${parsedAmount} from ${req.user.name}.`,
        type: 'transaction',
      });

      await Notification.create({
        recipient: req.user.id,
        title: isVendor ? 'Payment Sent' : 'Fund Transferred',
        message: `Successfully sent ₹${parsedAmount} to ${receiver.name}.`,
        type: 'transaction',
      });
    } catch (notifErr) {
      console.error('Failed to create transaction notifications:', notifErr);
    }

    res.status(200).json({
      success: true,
      message: `Successfully transferred ₹${parsedAmount} to ${receiver.name}`,
      balance: fundUpdate.balance,
      transaction,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Transaction failed. Server error.' });
  }
});

// @desc    Get transaction history
// @route   GET /api/wallet/history
// @access  Private (Student/Vendor/Admin)
router.get('/history', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const search = req.query.search;
    let query = {};

    if (req.user.role === 'admin') {
      // Admins see all transactions
      query = {};
    } else if (req.user.role === 'subadmin') {
      // Sub-admins only see transactions where a student is involved
      const studentUsers = await User.find({ role: 'student' }).select('_id');
      const studentIds = studentUsers.map((u) => u._id);
      query = {
        $or: [{ sender: { $in: studentIds } }, { receiver: { $in: studentIds } }]
      };
    } else {
      // Users see only their transactions (as sender or receiver)
      query = {
        $or: [{ sender: req.user.id }, { receiver: req.user.id }],
      };
    }

    if (search) {
      // Find users whose name or email matches search (case-insensitive)
      const matchingUsers = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      const matchingUserIds = matchingUsers.map((u) => u._id);

      // If we already have a restriction, we intersect it
      if (query.$or) {
        const originalOr = query.$or;
        query = {
          $and: [
            { $or: originalOr },
            {
              $or: [
                { sender: { $in: matchingUserIds } },
                { receiver: { $in: matchingUserIds } }
              ]
            }
          ]
        };
      } else {
        query = {
          $or: [
            { sender: { $in: matchingUserIds } },
            { receiver: { $in: matchingUserIds } }
          ]
        };
      }
    }

    const total = await Transaction.countDocuments(query);
    const transactions = await Transaction.find(query)
      .populate('sender', 'name email role profileImage')
      .populate('receiver', 'name email role profileImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: transactions.length,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        totalTransactions: total,
      },
      transactions,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to retrieve transaction history' });
  }
});

module.exports = router;
