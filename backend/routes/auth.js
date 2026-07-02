const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Notification = require('../models/Notification');
const sendEmail = require('../utils/email');
const upload = require('../middleware/upload');
const { protect } = require('../middleware/auth');
const { Fido2Lib } = require('fido2-lib');

// Initialize FIDO2/WebAuthn library
const f2l = new Fido2Lib({
  timeout: 60000,
  rpId: process.env.RP_ID || 'localhost',
  rpName: process.env.RP_NAME || 'CAMPUS-PAY-App',
  challengeSize: 32,
  cryptoParams: [-7, -257], // ES256, RS256
});

// Helper: Generate Session JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'campus_pay_local_secret_key_123456789', {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// Helper: Format User Response (overwrites walletBalance for students with central institute balance)
const formatUserResponse = async (user) => {
  let walletBalance = user.walletBalance;
  if (user.role === 'student') {
    const { getInstituteFund } = require('../utils/fund');
    const fund = await getInstituteFund();
    walletBalance = fund.balance;
  }
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    profileImage: user.profileImage,
    kycStatus: user.kycStatus,
    kycDocument: user.kycDocument,
    bankDetails: user.bankDetails,
    walletBalance,
    totalEarnings: user.totalEarnings,
    status: user.status,
    hasWebAuthn: user.webauthnCredentials ? user.webauthnCredentials.length > 0 : false,
  };
};


// Helper: Generate temporary signed signup token
const generateSignupToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'campus_pay_local_secret_key_123456789', {
    expiresIn: '30m', // 30 minutes to complete registration
  });
};

// @desc    Register user (Initial Signup info - Stateless, does NOT write to DB yet)
// @route   POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Please enter all basic registration details' });
    }

    const userName = name || 'New User';

    // Check if user already exists in DB
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, error: 'User already exists with this email' });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes from now

    // Always print OTP in console for easy development testing
    console.log(`\n[DEV ONLY] OTP Code for ${email}: ${otpCode}\n`);

    // Generate signed stateless signup token containing registration details
    const signupToken = generateSignupToken({
      name: userName,
      email,
      password,
      role: role || 'student',
      otpCode,
      otpExpires,
    });

    // Send OTP via Email
    const emailHtml = `
      <p>Dear User,</p>
      <p>Your CAMPUS-PAY verification code is: <strong>${otpCode}</strong></p>
      <p>This code is valid for 10 minutes. Please enter it on the signup screen to verify your email address.</p>
      <p>Thank you,<br/>CAMPUS-PAY Team</p>
    `;

    await sendEmail({
      to: email,
      subject: `Your CAMPUS-PAY Code: ${otpCode}`,
      html: emailHtml,
      text: `Dear User, Your CAMPUS-PAY verification code is ${otpCode}. It is valid for 10 minutes.`,
    });

    res.status(201).json({
      success: true,
      message: 'Registration initiated. OTP sent to your registered email.',
      signupToken,
      email,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Registration failed. Server error.' });
  }
});

// @desc    Verify OTP (Stateless - returns a signed verified details token)
// @route   POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { otp, signupToken } = req.body;

    if (!otp || !signupToken) {
      return res.status(400).json({ success: false, error: 'Missing OTP or signup session token' });
    }

    // Decode & verify signup session token
    let decoded;
    try {
      decoded = jwt.verify(signupToken, process.env.JWT_SECRET || 'campus_pay_local_secret_key_123456789');
    } catch (err) {
      return res.status(400).json({ success: false, error: 'Invalid or expired signup session. Please start again.' });
    }

    const { name, email, password, role, otpCode, otpExpires } = decoded;

    // Check if OTP matches and hasn't expired
    if (otpCode !== otp || Date.now() > otpExpires) {
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP code' });
    }

    // Generate a temporary completeProfileToken containing verified signup details
    const completeProfileToken = jwt.sign(
      { name, email, password, role },
      process.env.JWT_SECRET || 'campus_pay_local_secret_key_123456789',
      { expiresIn: '30m' }
    );

    res.status(200).json({
      success: true,
      message: 'Email successfully verified. Please complete your profile setup.',
      token: completeProfileToken,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Verification failed. Server error.' });
  }
});

// @desc    Complete profile & Save user record to database (Saves user to DB only here)
// @route   POST /api/auth/complete-profile
router.post(
  '/complete-profile',
  upload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'kycDocument', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      // Extract registration session token from Authorization headers
      let regToken;
      if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
      ) {
        regToken = req.headers.authorization.split(' ')[1];
      }

      if (!regToken) {
        return res.status(401).json({ success: false, error: 'Not authorized. Missing session token.' });
      }

      // Decode and verify registration token
      let decoded;
      try {
        decoded = jwt.verify(regToken, process.env.JWT_SECRET || 'campus_pay_local_secret_key_123456789');
      } catch (err) {
        return res.status(401).json({ success: false, error: 'Session expired. Please sign up again.' });
      }

      const { email, password, role } = decoded;
      const name = req.body.name || decoded.name;

      if (!name || name === 'New User') {
        return res.status(400).json({ success: false, error: 'Full name is required to complete profile' });
      }

      // Double check if email already registered in DB
      const userExists = await User.findOne({ email });
      if (userExists) {
        return res.status(400).json({ success: false, error: 'User is already registered' });
      }

      let mpin = undefined;
      let profileImageUrl = '';
      let bankDetails = undefined;
      let kycDocumentUrl = '';
      let kycStatus = undefined;

      if (role === 'student') {
        const mpinInput = req.body.mpin;
        if (!mpinInput) {
          return res.status(400).json({ success: false, error: 'Please set up your 4-digit MPIN' });
        }
        if (mpinInput.length !== 4 || isNaN(mpinInput)) {
          return res.status(400).json({ success: false, error: 'MPIN must be exactly 4 digits' });
        }
        mpin = mpinInput;
        kycStatus = 'pending';

        // Mandatory Student ID Card Picture (KYC)
        if (req.files && req.files['kycDocument']) {
          const file = req.files['kycDocument'][0];
          kycDocumentUrl = file.path && file.path.startsWith('http') ? file.path : `/uploads/${file.filename}`;
        } else {
          return res.status(400).json({ success: false, error: 'Student ID Card Picture is required for KYC verification' });
        }

        // Optional profile photo
        if (req.files && req.files['profileImage']) {
          const file = req.files['profileImage'][0];
          profileImageUrl = file.path && file.path.startsWith('http') ? file.path : `/uploads/${file.filename}`;
        }
      } else if (role === 'vendor') {
        const { accountNo, ifsc, bankName } = req.body;
        if (!accountNo || !ifsc || !bankName) {
          return res.status(400).json({ success: false, error: 'Please provide all bank settlement details' });
        }
        bankDetails = { accountNo, ifsc, bankName };
        kycStatus = 'pending';

        // Mandatory KYC Document for Vendor
        if (req.files && req.files['kycDocument']) {
          const file = req.files['kycDocument'][0];
          kycDocumentUrl = file.path && file.path.startsWith('http') ? file.path : `/uploads/${file.filename}`;
        } else {
          return res.status(400).json({ success: false, error: 'Business Certificate/ID Picture is required for KYC verification' });
        }

        // Optional profile photo
        if (req.files && req.files['profileImage']) {
          const file = req.files['profileImage'][0];
          profileImageUrl = file.path && file.path.startsWith('http') ? file.path : `/uploads/${file.filename}`;
        }
      }

      // Create new user in the Database
      const user = await User.create({
        name,
        email,
        password, // Schema's pre-save middleware will hash this automatically!
        role,
        isVerified: true,
        profileImage: profileImageUrl,
        mpin,     // Schema's pre-save middleware will hash this automatically!
        bankDetails,
        kycDocument: kycDocumentUrl,
        kycStatus,
        walletBalance: role === 'student' ? 10000 : 0,
      });

      // Notify all sub-admins if KYC document is uploaded (excluding super admin per rules)
      if (user.kycStatus === 'pending') {
        try {
          const admins = await User.find({ role: 'subadmin' });
          for (const admin of admins) {
            await Notification.create({
              recipient: admin._id,
              title: `New ${user.role === 'student' ? 'Student' : 'Vendor'} KYC Uploaded`,
              message: `${user.name} has registered and uploaded a KYC document for verification.`,
              type: 'kyc',
            });
          }
        } catch (notifErr) {
          console.error('Failed to notify admins of new KYC document:', notifErr);
        }
      }

      // Generate actual login session token
      const sessionToken = generateToken(user._id);

      res.status(201).json({
        success: true,
        message: 'Registration completed successfully!',
        token: sessionToken,
        user: await formatUserResponse(user),
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: 'Failed to complete profile registration. Server error.' });
    }
  }
);

// @desc    Password Login
// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      return res.status(401).json({ success: false, error: 'Account not verified. Please register or verify OTP.' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ success: false, error: 'Your account has been suspended by an Admin.' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: await formatUserResponse(user),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Login failed. Server error.' });
  }
});

// @desc    MPIN Login (Students only)
// @route   POST /api/auth/login-mpin
router.post('/login-mpin', async (req, res) => {
  try {
    const { email, mpin } = req.body;

    if (!email || !mpin) {
      return res.status(400).json({ success: false, error: 'Please provide email and MPIN' });
    }

    const user = await User.findOne({ email }).select('+mpin');
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    if (user.role !== 'student') {
      return res.status(403).json({ success: false, error: 'MPIN login is only available for students' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ success: false, error: 'Your account has been suspended.' });
    }

    const isMatch = await user.matchMpin(mpin);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid MPIN' });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: await formatUserResponse(user),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'MPIN Login failed. Server error.' });
  }
});

/* ==========================================================================
   WEBAUTHN (BIOMETRICS) AUTHENTICATION ENDPOINTS
   ========================================================================== */

// @desc    Generate WebAuthn Registration Options
// @route   POST /api/auth/webauthn/register-options
router.post('/webauthn/register-options', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Generate FIDO2 Attestation Options
    const challenge = crypto.randomBytes(32).toString('base64url');
    user.currentChallenge = challenge;
    await user.save();

    // Map existing credentials to prevent duplicate registrations
    const excludeCredentials = user.webauthnCredentials.map((cred) => ({
      id: cred.credentialId,
      type: 'public-key',
    }));

    const options = {
      challenge,
      rp: {
        name: process.env.RP_NAME || 'CAMPUS-PAY-App',
        id: process.env.RP_ID || 'localhost',
      },
      user: {
        id: user._id.toString(),
        name: user.email,
        displayName: user.name,
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },   // ES256
        { type: 'public-key', alg: -257 }, // RS256
      ],
      timeout: 60000,
      excludeCredentials,
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Enforce on-device (TouchID/FaceID/WindowsHello)
        userVerification: 'required',
        residentKey: 'required',
      },
      attestation: 'none',
    };

    res.json(options);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'WebAuthn Options generation failed' });
  }
});

// @desc    Verify WebAuthn Registration Credential
// @route   POST /api/auth/webauthn/register-verify
router.post('/webauthn/register-verify', protect, async (req, res) => {
  try {
    const { credentialResponse, mock } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Check if challenge exists
    if (!user.currentChallenge) {
      return res.status(400).json({ success: false, error: 'WebAuthn registration was not initiated' });
    }

    // Mock Fallback validation (Useful for non-biometric environments and tests)
    if (mock) {
      user.webauthnCredentials.push({
        credentialId: credentialResponse.id || 'mock_credential_id_' + Date.now(),
        publicKey: 'mock_public_key_base64_data',
        prevCounter: 0,
      });
      user.currentChallenge = undefined;
      await user.save();
      return res.json({ success: true, message: 'Mock Biometric Auth Registered successfully!' });
    }

    // In production, we verify using the fido2-lib
    try {
      const parsedCred = {
        id: credentialResponse.id,
        rawId: credentialResponse.rawId,
        type: credentialResponse.type,
        response: credentialResponse.response,
      };

      // FIDO2 Library attestation result parser
      const attestationResult = await f2l.attestationResult(parsedCred, {
        challenge: user.currentChallenge,
        origin: process.env.ORIGIN || 'http://localhost:5173',
        factor: 'either',
      });

      // Save credentials details in user record
      const clientData = attestationResult.clientData;
      const authnrData = attestationResult.authnrData;

      const publicKeyPem = authnrData.get('credentialPublicKeyPem');
      const counter = authnrData.get('counter') || 0;

      user.webauthnCredentials.push({
        credentialId: credentialResponse.id,
        publicKey: Buffer.from(publicKeyPem).toString('base64'),
        prevCounter: counter,
        transports: credentialResponse.response.transports || [],
      });

      user.currentChallenge = undefined;
      await user.save();

      res.status(200).json({ success: true, message: 'Biometric Authenticator registered successfully!' });
    } catch (verifyError) {
      console.warn('Real WebAuthn failed, fallback or error output:', verifyError);
      res.status(400).json({ success: false, error: `Authentication validation failed: ${verifyError.message}` });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'WebAuthn verification failed' });
  }
});

// @desc    Generate WebAuthn Login Options
// @route   POST /api/auth/webauthn/login-options
router.post('/webauthn/login-options', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Please provide email' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.webauthnCredentials.length === 0) {
      return res.status(400).json({ success: false, error: 'No biometric credentials registered for this account' });
    }

    // Generate FIDO2 Assertion Options
    const challenge = crypto.randomBytes(32).toString('base64url');
    user.currentChallenge = challenge;
    await user.save();

    const allowCredentials = user.webauthnCredentials.map((cred) => ({
      id: cred.credentialId,
      type: 'public-key',
      transports: cred.transports,
    }));

    const options = {
      challenge,
      timeout: 60000,
      rpId: process.env.RP_ID || 'localhost',
      allowCredentials,
      userVerification: 'required',
    };

    res.json(options);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Biometric login init options failed' });
  }
});

// @desc    Verify WebAuthn Login Assertion
// @route   POST /api/auth/webauthn/login-verify
router.post('/webauthn/login-verify', async (req, res) => {
  try {
    const { email, credentialResponse, mock } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (!user.currentChallenge) {
      return res.status(400).json({ success: false, error: 'Biometric login was not initiated' });
    }

    // Mock validation handler
    if (mock) {
      user.currentChallenge = undefined;
      await user.save();

      const token = generateToken(user._id);
      return res.json({
        success: true,
        token,
        user: await formatUserResponse(user),
      });
    }

    // Verify via Fido2
    const credentialId = credentialResponse.id;
    const userCredential = user.webauthnCredentials.find(
      (cred) => cred.credentialId === credentialId
    );

    if (!userCredential) {
      return res.status(400).json({ success: false, error: 'Credential not recognized for this account' });
    }

    try {
      const publicKeyPem = Buffer.from(userCredential.publicKey, 'base64').toString('ascii');

      const assertionResult = await f2l.assertionResult(credentialResponse, {
        challenge: user.currentChallenge,
        origin: process.env.ORIGIN || 'http://localhost:5173',
        factor: 'either',
        publicKey: publicKeyPem,
        prevCounter: userCredential.prevCounter || 0,
        userHandle: user._id.toString(),
      });

      // Update counter
      const counter = assertionResult.authnrData.get('counter') || 0;
      userCredential.prevCounter = counter;
      user.currentChallenge = undefined;
      await user.save();

      const token = generateToken(user._id);

      res.status(200).json({
        success: true,
        token,
        user: await formatUserResponse(user),
      });
    } catch (verifyError) {
      console.warn('Fido2 verification assertion failed:', verifyError);
      res.status(400).json({ success: false, error: 'Invalid biometric authentication match' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Biometric authentication validation failed' });
  }
});

// @desc    Get Current User Details
// @route   GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.status(200).json({
      success: true,
      user: await formatUserResponse(user),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch user data' });
  }
});

// @desc    Forgot Password - request OTP
// @route   POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Please provide your email address' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, error: 'No user account found with this email' });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    user.otp = {
      code: otpCode,
      expiresAt: otpExpires,
    };
    await user.save();

    // Print to console in dev mode
    console.log(`\n[DEV ONLY] Password Reset OTP Code for ${email}: ${otpCode}\n`);

    // Send email
    const emailHtml = `
      <p>Dear ${user.name},</p>
      <p>You requested to reset your password. Please use the following verification OTP code:</p>
      <h2 style="color: #4F46E5;">${otpCode}</h2>
      <p>This code is valid for 10 minutes. If you did not request this, please secure your account.</p>
      <p>Thanks,<br/>CAMPUS-PAY Team</p>
    `;

    await sendEmail({
      to: email,
      subject: `Reset Password Verification Code: ${otpCode}`,
      html: emailHtml,
      text: `Your reset password OTP code is ${otpCode}. It is valid for 10 minutes.`,
    });

    res.json({ success: true, message: 'Password reset OTP code sent to your email.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to process request. Server error.' });
  }
});

// @desc    Reset Password - verify OTP & update password
// @route   POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, error: 'Please provide all details (email, OTP, new password)' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Verify OTP
    if (!user.otp || user.otp.code !== otp || new Date() > user.otp.expiresAt) {
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP verification code' });
    }

    // Update password
    user.password = newPassword; // Pre-save hook will hash this automatically!
    user.otp = undefined; // Clear OTP
    await user.save();

    res.json({ success: true, message: 'Password reset successful! You can now log in with your new password.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to reset password. Server error.' });
  }
});

// @desc    Update Profile Details (Name and Profile Image)
// @route   PUT /api/auth/update-profile
// @access  Private
router.put('/update-profile', protect, upload.single('profileImage'), async (req, res) => {
  try {
    const { name } = req.body;
    const updateData = {};

    if (name) {
      if (name.trim().length < 2) {
        return res.status(400).json({ success: false, error: 'Name must be at least 2 characters long' });
      }
      updateData.name = name.trim();
    }

    if (req.file) {
      const fileUrl = req.file.path && req.file.path.startsWith('http') ? req.file.path : `/uploads/${req.file.filename}`;
      updateData.profileImage = fileUrl;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, error: 'Please provide name or profile image to update' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully!',
      user: await formatUserResponse(user),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to update profile. Server error.' });
  }
});

module.exports = router;
