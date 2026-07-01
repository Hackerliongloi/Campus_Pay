const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const Notification = require('../models/Notification');
const upload = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');

// Apply protection to all routes in this file
router.use(protect);

// @desc    Raise a new complaint with optional screenshot
// @route   POST /api/complaints
// @access  Private (Student)
router.post('/', authorize('student', 'vendor'), upload.single('screenshot'), async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title || !description) {
      return res.status(400).json({ success: false, error: 'Please provide title and description' });
    }

    let screenshotUrl = '';
    if (req.file) {
      screenshotUrl = req.file.path && req.file.path.startsWith('http') ? req.file.path : `/uploads/${req.file.filename}`;
    }

    const complaint = await Complaint.create({
      student: req.user.id,
      title,
      description,
      screenshot: screenshotUrl,
      status: 'open',
    });

    // Notify all sub-admins (excluding super admin per rules)
    try {
      const admins = await User.find({ role: 'subadmin' });
      for (const admin of admins) {
        await Notification.create({
          recipient: admin._id,
          title: 'New Complaint Filed',
          message: `${req.user.name} (${req.user.role.toUpperCase()}) has submitted a new support ticket: "${title}".`,
          type: 'complaint',
        });
      }
    } catch (notifErr) {
      console.error('Failed to notify admins of new complaint:', notifErr);
    }

    res.status(201).json({
      success: true,
      message: 'Complaint registered successfully',
      complaint,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to submit complaint. Server error.' });
  }
});

// @desc    Get all complaints submitted by the logged-in student
// @route   GET /api/complaints
// @access  Private (Student)
router.get('/', authorize('student', 'vendor'), async (req, res) => {
  try {
    const complaints = await Complaint.find({ student: req.user.id })
      .populate('resolvedBy', 'name email role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: complaints.length,
      complaints,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to retrieve complaints. Server error.' });
  }
});

module.exports = router;
