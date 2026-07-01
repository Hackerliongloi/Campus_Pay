const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');
const bcrypt = require('bcryptjs');
const { protect, authorize } = require('../middleware/auth');

// Apply protection & authorization to all routes in this file
router.use(protect);
router.use(authorize('admin', 'subadmin'));

// Helper: Hashing MPIN
const hashValue = async (val) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(val, salt);
};

/* ==========================================================================
   USER MANAGEMENT
   ========================================================================== */

// @desc    Get all students and vendors
// @route   GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const { role, search, status } = req.query;
    let query = {};

    if (req.user.role === 'subadmin') {
      // Sub-admins are strictly restricted to student accounts only
      query.role = 'student';
    } else if (role) {
      query.role = role;
    }

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: users.length, users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to retrieve users' });
  }
});

// @desc    Freeze / Suspend / Activate user accounts
// @route   POST /api/admin/users/status
router.post('/users/status', async (req, res) => {
  try {
    const { userId, status } = req.body;

    if (!['active', 'suspended', 'frozen'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status update' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Sub-admins can only modify student accounts
    if (req.user.role === 'subadmin' && user.role !== 'student') {
      return res.status(403).json({ success: false, error: 'Sub-admins are only authorized to modify student accounts' });
    }

    // Sub-admins cannot freeze admins
    if (user.role === 'admin' && req.user.role === 'subadmin') {
      return res.status(403).json({ success: false, error: 'Sub-admins cannot modify main admin accounts' });
    }

    const oldStatus = user.status;
    user.status = status;
    await user.save();

    // Notify the user about status changes
    try {
      await Notification.create({
        recipient: user._id,
        title: 'Account Status Update',
        message: `Your account status has been updated to ${status.toUpperCase()} by the administrator.`,
        type: 'system',
      });
    } catch (err) {
      console.error('Failed to create status notification:', err);
    }

    // If unfreezing from 'frozen' to 'active', clear all transaction history for this user
    let deletedCount = 0;
    if (oldStatus === 'frozen' && status === 'active') {
      const deleteResult = await Transaction.deleteMany({
        $or: [{ sender: user._id }, { receiver: user._id }]
      });
      deletedCount = deleteResult.deletedCount;
    }

    res.status(200).json({
      success: true,
      message: oldStatus === 'frozen' && status === 'active'
        ? `Account status set to ACTIVE. Cleared ${deletedCount} transaction logs.`
        : `Account status for ${user.name} set to: ${status.toUpperCase()}`,
      user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to modify account status' });
  }
});

// @desc    Admin Reset Student MPIN
// @route   POST /api/admin/users/reset-mpin
router.post('/users/reset-mpin', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Only main administrator is authorized to reset MPIN' });
    }
    const { userId, newMpin } = req.body;

    if (!newMpin || newMpin.length !== 4 || isNaN(newMpin)) {
      return res.status(400).json({ success: false, error: 'MPIN must be exactly 4 digits' });
    }

    const user = await User.findById(userId);
    if (!user || user.role !== 'student') {
      return res.status(404).json({ success: false, error: 'Student account not found' });
    }

    user.mpin = newMpin; // Schema's pre-save middleware will hash this automatically!
    await user.save();

    res.status(200).json({ success: true, message: `MPIN for ${user.name} reset successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to reset MPIN' });
  }
});

/* ==========================================================================
   SUB-ADMIN MANAGEMENT (Admin only)
   ========================================================================== */

// @desc    Create a sub-admin
// @route   POST /api/admin/subadmins
router.post('/subadmins', authorize('admin'), async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide all details' });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }

    const subadmin = await User.create({
      name,
      email,
      password,
      role: 'subadmin',
      isVerified: true, // Auto-verified
      kycStatus: 'approved',
    });

    res.status(201).json({
      success: true,
      message: 'Sub-admin created successfully',
      subadmin: {
        id: subadmin._id,
        name: subadmin.name,
        email: subadmin.email,
        role: subadmin.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to create sub-admin' });
  }
});

/* ==========================================================================
   KYC MANAGEMENT
   ========================================================================== */

// @desc    Approve / Reject user KYC document
// @route   POST /api/admin/kyc-approve
router.post('/kyc-approve', async (req, res) => {
  try {
    const { vendorId, action, rejectionReason } = req.body; // vendorId contains student or vendor ID

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Action must be approve or reject' });
    }

    const targetUser = await User.findById(vendorId);
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (!['student', 'vendor'].includes(targetUser.role)) {
      return res.status(400).json({ success: false, error: 'Only student or vendor profiles require KYC verification' });
    }

    targetUser.kycStatus = action === 'approve' ? 'approved' : 'rejected';
    await targetUser.save();

    // Notify the user about their KYC update
    try {
      await Notification.create({
        recipient: targetUser._id,
        title: action === 'approve' ? 'KYC Verification Approved' : 'KYC Verification Rejected',
        message: action === 'approve'
          ? 'Your Student/Vendor ID verification has been approved. All wallet functionalities are now unlocked.'
          : `Your Student/Vendor ID verification was rejected. Reason: ${rejectionReason || 'Invalid document format/blurry photo. Please raise a support complaint.'}`,
        type: 'kyc',
      });
    } catch (notifErr) {
      console.error('Failed to create KYC notification:', notifErr);
    }

    res.status(200).json({
      success: true,
      message: `KYC for ${targetUser.name} has been ${targetUser.kycStatus.toUpperCase()}`,
      user: targetUser,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to process KYC request' });
  }
});

/* ==========================================================================
   COMPLAINT MANAGEMENT
   ========================================================================== */

// @desc    Get all complaints
// @route   GET /api/admin/complaints
router.get('/complaints', async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};
    if (status) query.status = status;

    if (req.user.role === 'subadmin') {
      // Sub-admins are restricted to student complaints only
      const studentUsers = await User.find({ role: 'student' }).select('_id');
      const studentIds = studentUsers.map((u) => u._id);
      query.student = { $in: studentIds };
    }

    const complaints = await Complaint.find(query)
      .populate('student', 'name email role profileImage')
      .populate('resolvedBy', 'name email role')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: complaints.length, complaints });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to retrieve complaints' });
  }
});

// @desc    Respond to/resolve student complaint
// @route   POST /api/admin/complaints/:id/resolve
router.post('/complaints/:id/resolve', async (req, res) => {
  try {
    const { response } = req.body;
    if (!response) {
      return res.status(400).json({ success: false, error: 'Please provide response text to resolve' });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, error: 'Complaint not found' });
    }

    complaint.response = response;
    complaint.status = 'resolved';
    complaint.resolvedBy = req.user.id;
    await complaint.save();

    // Notify the user about their complaint resolution
    try {
      await Notification.create({
        recipient: complaint.student,
        title: 'Support Ticket Resolved',
        message: `Your complaint regarding "${complaint.title}" has been resolved. Response: "${response}".`,
        type: 'complaint',
      });
    } catch (notifErr) {
      console.error('Failed to create complaint resolution notification:', notifErr);
    }

    res.status(200).json({
      success: true,
      message: 'Complaint marked as RESOLVED',
      complaint,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to resolve complaint' });
  }
});

/* ==========================================================================
   ANALYTICS & SYSTEM MONITORING
   ========================================================================== */

// @desc    Get system-wide analytics data
// @route   GET /api/admin/analytics
router.get('/analytics', async (req, res) => {
  try {
    const isSubadmin = req.user.role === 'subadmin';

    // 1. User metrics
    const studentCount = await User.countDocuments({ role: 'student' });
    const vendorCount = isSubadmin ? 0 : await User.countDocuments({ role: 'vendor' });
    const subadminCount = isSubadmin ? 0 : await User.countDocuments({ role: 'subadmin' });

    // 2. Build txnQuery for transaction stats
    let txnQuery = { status: 'success' };
    if (isSubadmin) {
      // Limit to transactions where a student is involved
      const studentUsers = await User.find({ role: 'student' }).select('_id');
      const studentIds = studentUsers.map((u) => u._id);
      txnQuery.$or = [{ sender: { $in: studentIds } }, { receiver: { $in: studentIds } }];
    }

    // 3. Transaction metrics
    const transactionCount = await Transaction.countDocuments(txnQuery);
    
    // Aggregation query matches
    const volumeMatch = { status: 'success', type: { $in: ['pay', 'send'] } };
    if (isSubadmin) {
      const studentUsers = await User.find({ role: 'student' }).select('_id');
      const studentIds = studentUsers.map((u) => u._id);
      volumeMatch.$or = [{ sender: { $in: studentIds } }, { receiver: { $in: studentIds } }];
    }

    const totalVolumeResult = await Transaction.aggregate([
      { $match: volumeMatch },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalVolume = totalVolumeResult[0]?.total || 0;

    // 4. Transactions distribution by type
    const distributionMatch = isSubadmin ? txnQuery : {};
    const txnDistribution = await Transaction.aggregate([
      ...(isSubadmin ? [{ $match: distributionMatch }] : []),
      { $group: { _id: '$type', count: { $sum: 1 }, volume: { $sum: '$amount' } } },
    ]);

    // 5. Pending items counts
    const pendingKycCount = await User.countDocuments({ role: 'student', kycStatus: 'pending' });
    
    let activeComplaintsCountQuery = { status: 'open' };
    if (isSubadmin) {
      const studentUsers = await User.find({ role: 'student' }).select('_id');
      const studentIds = studentUsers.map((u) => u._id);
      activeComplaintsCountQuery.student = { $in: studentIds };
    }
    const activeComplaintsCount = await Complaint.countDocuments(activeComplaintsCountQuery);

    // 6. Build recent transactions list
    const recentTransactions = await Transaction.find(isSubadmin ? txnQuery : {})
      .populate('sender', 'name email role')
      .populate('receiver', 'name email role')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      analytics: {
        users: {
          students: studentCount,
          vendors: vendorCount,
          subadmins: subadminCount,
          total: studentCount + vendorCount + subadminCount + 1, // +1 for main admin
        },
        financials: {
          totalVolume,
          transactionCount,
          distribution: txnDistribution,
        },
        pendingTasks: {
          kyc: pendingKycCount,
          complaints: activeComplaintsCount,
        },
        recentTransactions,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to retrieve analytics data' });
  }
});

// @desc    Allocate / Add funds to a student wallet (Admin only)
// @route   POST /api/admin/allocate-funds
router.post('/allocate-funds', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Only main administrator is authorized to allocate funds' });
    }
    const { studentEmail, amount, description } = req.body;
    const parsedAmount = parseFloat(amount);

    if (!studentEmail || isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Please enter a valid student email and a positive amount' });
    }

    const student = await User.findOne({ email: studentEmail, role: 'student' });
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student account not found' });
    }

    if (student.status !== 'active') {
      return res.status(400).json({ success: false, error: `Cannot allocate funds. Student account is ${student.status}` });
    }

    // Allocate funds atomically
    student.walletBalance += parsedAmount;
    await student.save();

    // Create transaction log
    const transaction = await Transaction.create({
      sender: null, // external load / institute allocation
      receiver: student._id,
      amount: parsedAmount,
      type: 'add',
      status: 'success',
      description: description || 'Institute Fund Allocation',
    });

    res.status(200).json({
      success: true,
      message: `Successfully allocated ₹${parsedAmount} to ${student.name}`,
      balance: student.walletBalance,
      transaction,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to allocate funds. Server error.' });
  }
});

// @desc    Get all pending vendor redeem requests
// @route   GET /api/admin/redeem-requests
router.get('/redeem-requests', async (req, res) => {
  try {
    if (req.user.role === 'subadmin') {
      return res.status(403).json({ success: false, error: 'Sub-admins are not authorized to view or manage redeem requests' });
    }

    const requests = await Transaction.find({ type: 'redeem', status: 'pending' })
      .populate('sender', 'name email role bankDetails')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: requests.length, requests });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to retrieve redeem requests' });
  }
});

// @desc    Approve / Reject vendor redeem request
// @route   POST /api/admin/redeem-approve
router.post('/redeem-approve', async (req, res) => {
  try {
    if (req.user.role === 'subadmin') {
      return res.status(403).json({ success: false, error: 'Sub-admins are not authorized to view or manage redeem requests' });
    }

    const { transactionId, action } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Action must be approve or reject' });
    }

    const transaction = await Transaction.findById(transactionId).populate('sender');
    if (!transaction || transaction.type !== 'redeem') {
      return res.status(404).json({ success: false, error: 'Redeem request not found' });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Redeem request has already been processed' });
    }

    if (action === 'approve') {
      transaction.status = 'success';
      await transaction.save();

      // Notify the vendor
      try {
        await Notification.create({
          recipient: transaction.sender._id,
          title: 'Redeem Request Settled',
          message: `Your redeem request of ₹${transaction.amount.toFixed(2)} was approved and settled to your bank account successfully.`,
          type: 'transaction',
        });
      } catch (notifErr) {
        console.error('Failed to notify vendor of approved redeem:', notifErr);
      }
    } else {
      transaction.status = 'failed';
      await transaction.save();

      // Refund the vendor
      const vendor = transaction.sender;
      if (vendor) {
        vendor.walletBalance += transaction.amount;
        vendor.totalEarnings += transaction.amount;
        await vendor.save();
      }

      // Notify the vendor
      try {
        await Notification.create({
          recipient: transaction.sender._id,
          title: 'Redeem Request Rejected',
          message: `Your redeem request of ₹${transaction.amount.toFixed(2)} was rejected by the administrator. The funds have been refunded back to your wallet balance.`,
          type: 'transaction',
        });
      } catch (notifErr) {
        console.error('Failed to notify vendor of rejected redeem:', notifErr);
      }
    }

    res.status(200).json({
      success: true,
      message: `Redeem request of ₹${transaction.amount} has been ${action === 'approve' ? 'APPROVED & SETTLED' : 'REJECTED & REFUNDED'}`,
      transaction,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to process redeem request' });
  }
});

// @desc    Add institute balance to student
// @route   POST /api/admin/add-balance
router.post('/add-balance', async (req, res) => {
  try {
    const { studentId, amount, description } = req.body;
    const parsedAmount = parseFloat(amount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Please enter a valid positive amount' });
    }

    const student = await User.findOne({ _id: studentId, role: 'student' });
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student account not found' });
    }

    if (student.status !== 'active') {
      return res.status(400).json({ success: false, error: `Cannot add balance. Student account is ${student.status}` });
    }

    student.walletBalance += parsedAmount;
    await student.save();

    // Create transaction log
    const transaction = await Transaction.create({
      sender: null,
      receiver: student._id,
      amount: parsedAmount,
      type: 'add',
      status: 'success',
      description: description || `Institute Balance Added by ${req.user.name}`,
    });

    // Notify student
    try {
      await Notification.create({
        recipient: student._id,
        title: 'Institute Balance Added',
        message: `₹${parsedAmount.toFixed(2)} has been added to your institute wallet balance by ${req.user.name}.`,
        type: 'transaction',
      });
    } catch (notifErr) {
      console.error('Failed to create balance notification:', notifErr);
    }

    res.status(200).json({
      success: true,
      message: `Successfully added ₹${parsedAmount.toFixed(2)} to ${student.name}'s balance.`,
      balance: student.walletBalance,
      transaction,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to add balance. Server error.' });
  }
});

// @desc    Broadcast a notification to users
// @route   POST /api/admin/broadcast-notification
router.post('/broadcast-notification', async (req, res) => {
  try {
    const { targetGroup, targetEmail, title, message, type } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, error: 'Please provide both title and message' });
    }

    let recipients = [];
    if (targetGroup === 'all') {
      recipients = await User.find({ role: { $in: ['student', 'vendor', 'subadmin'] } }).select('_id');
    } else if (targetGroup === 'students') {
      recipients = await User.find({ role: 'student' }).select('_id');
    } else if (targetGroup === 'vendors') {
      recipients = await User.find({ role: 'vendor' }).select('_id');
    } else if (targetGroup === 'subadmins') {
      recipients = await User.find({ role: 'subadmin' }).select('_id');
    } else if (targetGroup === 'specific') {
      const user = await User.findOne({ email: targetEmail });
      if (!user) {
        return res.status(404).json({ success: false, error: `User with email ${targetEmail} not found` });
      }
      if (user.role === 'admin') {
        return res.status(400).json({ success: false, error: 'Super Admin accounts cannot receive notifications.' });
      }
      recipients = [user];
    } else {
      return res.status(400).json({ success: false, error: 'Invalid target group' });
    }

    const notificationsToCreate = recipients.map((r) => ({
      recipient: r._id,
      title,
      message,
      type: type || 'system',
    }));

    await Notification.insertMany(notificationsToCreate);

    res.status(200).json({
      success: true,
      message: `Broadcast sent successfully to ${recipients.length} user(s).`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to send broadcast. Server error.' });
  }
});

// @desc    Delete a subadmin account
// @route   DELETE /api/admin/subadmins/:id
router.delete('/subadmins/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Only Super Admin can delete sub-admins' });
    }

    const subadmin = await User.findOne({ _id: req.params.id, role: 'subadmin' });
    if (!subadmin) {
      return res.status(404).json({ success: false, error: 'Sub-admin not found' });
    }

    await User.findByIdAndDelete(req.params.id);

    // Delete subadmin notifications
    await Notification.deleteMany({ recipient: req.params.id });

    res.status(200).json({
      success: true,
      message: `Sub-admin account ${subadmin.email} deleted successfully.`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to delete sub-admin. Server error.' });
  }
});

module.exports = router;
