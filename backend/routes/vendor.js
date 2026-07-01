const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const upload = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');

// @desc    Register or update bank details
// @route   POST /api/vendor/bank-details
// @access  Private (Vendor)
router.post('/bank-details', protect, authorize('vendor'), async (req, res) => {
  try {
    const { accountNo, ifsc, bankName } = req.body;

    if (!accountNo || !ifsc || !bankName) {
      return res.status(400).json({ success: false, error: 'Please provide account number, IFSC, and bank name' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { bankDetails: { accountNo, ifsc, bankName } },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Bank details updated successfully',
      bankDetails: user.bankDetails,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error. Failed to save bank details.' });
  }
});

// @desc    Upload / Re-submit KYC Documents
// @route   POST /api/vendor/upload-kyc
// @access  Private (Vendor)
router.post('/upload-kyc', protect, authorize('vendor'), upload.single('kycDocument'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload a KYC document file' });
    }

    const documentUrl = req.file.path && req.file.path.startsWith('http') ? req.file.path : `/uploads/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { kycDocument: documentUrl, kycStatus: 'pending' },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'KYC document uploaded successfully. Verification is pending.',
      kycStatus: user.kycStatus,
      kycDocument: user.kycDocument,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error. KYC upload failed.' });
  }
});

// @desc    Get Vendor Stats (Earnings, Wallet Balance, KYC Status)
// @route   GET /api/vendor/stats
// @access  Private (Vendor)
router.get('/stats', protect, authorize('vendor'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Vendor profile not found' });
    }

    // Get number of payments received
    const salesCount = await Transaction.countDocuments({
      receiver: req.user.id,
      type: 'pay',
      status: 'success',
    });

    res.status(200).json({
      success: true,
      stats: {
        walletBalance: user.walletBalance,
        totalEarnings: user.totalEarnings,
        kycStatus: user.kycStatus,
        kycDocument: user.kycDocument,
        bankDetails: user.bankDetails,
        salesCount,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error. Failed to fetch stats.' });
  }
});

// @desc    Redeem earnings to bank account
// @route   POST /api/vendor/redeem
// @access  Private (Vendor)
router.post('/redeem', protect, authorize('vendor'), async (req, res) => {
  try {
    const { amount } = req.body;
    const parsedAmount = parseFloat(amount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Please enter a valid positive amount to redeem' });
    }

    const user = await User.findById(req.user.id);

    // Guard: Check KYC verification
    if (user.kycStatus !== 'approved') {
      return res.status(403).json({
        success: false,
        error: `Redemption blocked. Your KYC status is: ${user.kycStatus.toUpperCase()}. Only approved vendors can redeem earnings.`,
      });
    }

    // Guard: Check if bank account is registered
    if (!user.bankDetails || !user.bankDetails.accountNo) {
      return res.status(400).json({
        success: false,
        error: 'Redemption blocked. Please register your bank details first.',
      });
    }

    // Guard: Check balance
    if (user.walletBalance < parsedAmount) {
      return res.status(400).json({ success: false, error: 'Insufficient earnings balance to redeem' });
    }

    // Deduct balance atomically
    const updatedUser = await User.findOneAndUpdate(
      { _id: req.user.id, walletBalance: { $gte: parsedAmount } },
      { $inc: { walletBalance: -parsedAmount } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(400).json({ success: false, error: 'Redemption failed. Insufficient funds.' });
    }

    // Create redemption log
    const transaction = await Transaction.create({
      sender: req.user.id,
      receiver: null, // transfer to external bank
      amount: parsedAmount,
      type: 'redeem',
      status: 'pending',
      description: `Redeemed to Bank (${user.bankDetails.bankName} - A/C *${user.bankDetails.accountNo.slice(-4)})`,
    });

    // Notify the vendor
    try {
      await Notification.create({
        recipient: req.user.id,
        title: 'Redeem Request Submitted',
        message: `Your redeem request of ₹${parsedAmount.toFixed(2)} has been submitted successfully and is pending settlement approval.`,
        type: 'transaction',
      });
    } catch (notifErr) {
      console.error('Failed to notify vendor of redeem request:', notifErr);
    }

    // Notify all sub-admins (excluding super admin per rules)
    try {
      const subadmins = await User.find({ role: 'subadmin' });
      for (const sub of subadmins) {
        await Notification.create({
          recipient: sub._id,
          title: 'New Redeem Request Pending',
          message: `${req.user.name} has submitted a new redeem request of ₹${parsedAmount.toFixed(2)} for settlement approval.`,
          type: 'transaction',
        });
      }
    } catch (notifErr) {
      console.error('Failed to notify subadmins of redeem request:', notifErr);
    }

    res.status(200).json({
      success: true,
      message: `Redeem request of ₹${parsedAmount} submitted successfully and is pending admin approval.`,
      walletBalance: updatedUser.walletBalance,
      transaction,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Redemption failed. Server error.' });
  }
});

module.exports = router;
