require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const seedSubadmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/campus-pay');
    console.log('Connected to MongoDB.');

    // Delete existing subadmin if any
    await User.deleteMany({ email: 'subadmin@campuspay.com' });

    // Create subadmin account
    const subadmin = await User.create({
      name: 'Test Sub-Admin',
      email: 'subadmin@campuspay.com',
      password: 'subadminpassword',
      role: 'subadmin',
      isVerified: true,
      kycStatus: 'approved',
      status: 'active'
    });

    console.log('Seeded Test Sub-Admin:');
    console.log('  Email: subadmin@campuspay.com');
    console.log('  Password: subadminpassword');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding subadmin:', error);
    process.exit(1);
  }
};

seedSubadmin();
