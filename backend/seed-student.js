require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Transaction = require('./models/Transaction');

const seedStudent = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/campus-pay');
    console.log('Connected to MongoDB.');

    // Delete existing test student if any
    await User.deleteMany({ email: 'student@campuspay.com' });

    // Create active student but set status to frozen
    const student = await User.create({
      name: 'Test Student',
      email: 'student@campuspay.com',
      password: 'studentpassword',
      role: 'student',
      isVerified: true,
      kycStatus: 'approved',
      status: 'frozen', // Frozen account
      walletBalance: 2500,
      mpin: '1234'
    });

    console.log('Seeded Test Student:');
    console.log('  Email: student@campuspay.com');
    console.log('  Password: studentpassword');
    console.log('  Status: frozen');
    
    // Clean existing transactions for this student
    await Transaction.deleteMany({
      $or: [{ sender: student._id }, { receiver: student._id }]
    });

    // Create a mock vendor to pay to
    let vendor = await User.findOne({ role: 'vendor' });
    if (!vendor) {
      vendor = await User.create({
        name: 'Canteen Vendor',
        email: 'canteen@campuspay.com',
        password: 'vendorpassword',
        role: 'vendor',
        isVerified: true,
        kycStatus: 'approved',
        status: 'active'
      });
    }

    // 1. Transaction: Add funds (Credit)
    await Transaction.create({
      sender: student._id,
      receiver: student._id,
      amount: 3000,
      type: 'add',
      status: 'success',
      description: 'Loaded via UPI Credit',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
    });

    // 2. Transaction: Pay vendor (Debit)
    await Transaction.create({
      sender: student._id,
      receiver: vendor._id,
      amount: 500,
      type: 'pay',
      status: 'success',
      description: 'Paid for Lunch Combo',
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12 hours ago
    });

    console.log('Seeded 2 mock transactions for the student.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding student:', error);
    process.exit(1);
  }
};

seedStudent();
