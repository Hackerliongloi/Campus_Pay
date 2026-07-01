const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email',
    ],
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false, // Don't return password by default
  },
  role: {
    type: String,
    enum: ['student', 'vendor', 'admin', 'subadmin'],
    default: 'student',
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'frozen'],
    default: 'active',
  },
  profileImage: {
    type: String,
    default: '',
  },

  // Student specific fields
  walletBalance: {
    type: Number,
    default: 0,
  },
  mpin: {
    type: String,
    select: false, // Don't return MPIN by default
  },

  // Vendor specific fields
  kycStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  kycDocument: {
    type: String,
    default: '',
  },
  bankDetails: {
    accountNo: { type: String, default: '' },
    ifsc: { type: String, default: '' },
    bankName: { type: String, default: '' },
  },
  totalEarnings: {
    type: Number,
    default: 0,
  },

  // OTP details for Signup/Verification
  otp: {
    code: { type: String },
    expiresAt: { type: Date },
  },

  // WebAuthn Biometric details
  webauthnCredentials: [
    {
      credentialId: { type: String, required: true },
      publicKey: { type: String, required: true }, // base64 encoded
      prevCounter: { type: Number, default: 0 },
      transports: [String],
    },
  ],
  currentChallenge: {
    type: String,
  },
}, {
  timestamps: true,
});

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Hash MPIN before saving if modified
UserSchema.pre('save', async function (next) {
  if (!this.isModified('mpin') || !this.mpin) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.mpin = await bcrypt.hash(this.mpin, salt);
  next();
});

// Compare password
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Compare MPIN
UserSchema.methods.matchMpin = async function (enteredMpin) {
  if (!this.mpin) return false;
  return await bcrypt.compare(enteredMpin, this.mpin);
};

module.exports = mongoose.model('User', UserSchema);
