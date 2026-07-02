require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const createAdmin = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('Error: MONGODB_URI is not defined in the environment variables.');
      process.exit(1);
    }
    
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');

    const adminEmail = 'admin@campuspay.com';
    const adminPassword = 'AdminPassword123!';

    // Delete existing admin if any to avoid unique email conflicts
    await User.deleteMany({ email: adminEmail });

    // Create admin account
    const admin = await User.create({
      name: 'System Admin',
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      isVerified: true,
      status: 'active'
    });

    console.log('\n--- ADMIN USER CREATED ---');
    console.log(`Email:    ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log(`Role:     ${admin.role}`);
    console.log('--------------------------\n');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
};

createAdmin();
