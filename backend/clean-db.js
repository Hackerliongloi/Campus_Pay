require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Transaction = require('./models/Transaction');
const Complaint = require('./models/Complaint');
const Notification = require('./models/Notification');

const cleanDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/campus-pay');
    console.log('Connected to MongoDB.');

    // Delete all users except admins
    const deletedUsers = await User.deleteMany({ role: { $ne: 'admin' } });
    console.log(`Deleted ${deletedUsers.deletedCount} non-admin users.`);

    const deletedTxns = await Transaction.deleteMany({});
    console.log(`Deleted ${deletedTxns.deletedCount} transactions.`);

    const deletedComplaints = await Complaint.deleteMany({});
    console.log(`Deleted ${deletedComplaints.deletedCount} complaints.`);

    const deletedNotifications = await Notification.deleteMany({});
    console.log(`Deleted ${deletedNotifications.deletedCount} notifications.`);

    // Seed default admin user if none exists
    const adminExists = await User.exists({ role: 'admin' });
    if (!adminExists) {
      const adminUser = await User.create({
        name: 'System Administrator',
        email: 'admin@campuspay.com',
        password: 'admin123password',
        role: 'admin',
        isVerified: true,
        kycStatus: 'approved',
      });
      console.log('Seeded default Admin account:');
      console.log('  Email: admin@campuspay.com');
      console.log('  Password: admin123password');
    } else {
      console.log('Admin account already exists. Skipping seeding.');
    }

    console.log('Database cleaned and seeded successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error cleaning database:', error);
    process.exit(1);
  }
};

cleanDatabase();
