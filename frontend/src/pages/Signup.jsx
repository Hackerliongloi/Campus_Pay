import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Mail, Lock, User, UserCheck, Key, Image, Landmark, FileText, CheckCircle2, ChevronRight } from 'lucide-react';

const Signup = () => {
  const navigate = useNavigate();
  const { fetchMe } = useAuth(); // to reload context token if verified

  // State Machine Step: 1 = Details, 2 = OTP, 3 = Profile Setup, 4 = KYC Setup, 5 = Success
  const [step, setStep] = useState(1);

  // Form Fields State
  const [role, setRole] = useState('student'); // 'student', 'vendor'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 2 OTP State
  const [otp, setOtp] = useState('');
  const [token, setToken] = useState(''); // Store signup token for profile setup step
  const [signupToken, setSignupToken] = useState(''); // Store stateless signup token

  // Step 4 Student State
  const [mpin, setMpin] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [profilePreview, setProfilePreview] = useState('');

  // Step 4 Vendor State
  const [bankName, setBankName] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [kycDocument, setKycDocument] = useState(null);
  const [kycFileName, setKycFileName] = useState('');

  // Utilities State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Submit Step 1: Basic Registration Info
  const handleRegisterBasic = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await response.json();
      if (data.success) {
        setSignupToken(data.signupToken); // Store stateless signup session
        setSuccess('OTP verification code sent to your email.');
        setTimeout(() => {
          setSuccess('');
          setStep(2); // Progress to OTP Verification
        }, 1000);
      } else {
        setError(data.error || 'Signup failed');
      }
    } catch (err) {
      setError('Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Step 2: OTP Verification
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp, signupToken }),
      });

      const data = await response.json();
      if (data.success) {
        setToken(data.token); // Save temporary token to use in next step header
        setSuccess('Email verified successfully!');
        setTimeout(() => {
          setSuccess('');
          setStep(3); // Progress to Profile Setup (Name & Pic)
        }, 1000);
      } else {
        setError(data.error || 'Invalid or expired OTP');
      }
    } catch (err) {
      setError('Verification failed. Network error.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Step 3: Proceed to KYC Setup
  const handleProceedToKyc = (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Full name is required');
      return;
    }
    setStep(4); // Progress to KYC Setup
  };

  // Submit Step 4: Complete Profile & Save (Student or Vendor)
  const handleCompleteProfile = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('name', name); // Submit updated name from Step 3

      if (!mpin || mpin.length !== 4) {
        setError('Please set up a 4-digit MPIN');
        setLoading(false);
        return;
      }
      formData.append('mpin', mpin);

      if (role === 'student') {
        if (!kycDocument) {
          setError('Please upload a picture of your Student ID card for verification');
          setLoading(false);
          return;
        }
        formData.append('kycDocument', kycDocument);
        if (profileImage) {
          formData.append('profileImage', profileImage);
        }
      } else {
        if (!bankName || !accountNo || !ifsc) {
          setError('Please fill in all bank details');
          setLoading(false);
          return;
        }
        if (!kycDocument) {
          setError('Please upload a business registration or trade license copy for verification');
          setLoading(false);
          return;
        }
        formData.append('bankName', bankName);
        formData.append('accountNo', accountNo);
        formData.append('ifsc', ifsc);
        formData.append('kycDocument', kycDocument);
        if (profileImage) {
          formData.append('profileImage', profileImage);
        }
      }

      const response = await fetch('/api/auth/complete-profile', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`, // Use signup-session JWT token
        },
        body: formData, // Form data for files
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('Profile completed successfully!');
        // Save token to localStorage to log the user in immediately
        localStorage.setItem('token', token);
        await fetchMe(token);

        setTimeout(() => {
          setSuccess('');
          setStep(5); // Progress to final Success Confirmation
        }, 1000);
      } else {
        setError(data.error || 'Failed to update profile details');
      }
    } catch (err) {
      setError('Network failure during profile completion.');
    } finally {
      setLoading(false);
    }
  };

  // Profile Image selection handler
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // KYC File selection handler
  const handleKycFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setKycDocument(file);
      setKycFileName(file.name);
    }
  };

  return (
    <div className="mobile-app-container">
      <div className="mobile-app-shell overflow-hidden">
        <div className="mobile-notch"></div>
        
        <div className="mobile-content p-6 flex flex-col justify-center">
          {/* Background Ambient Orbs inside shell */}
          <div className="absolute top-1/12 left-1/10 w-56 h-56 bg-indigo-500/10 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-1/10 right-1/10 w-56 h-56 bg-cyan-600/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>

          <div className="w-full relative z-10 space-y-4">
            {/* Title / Brand */}
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-black tracking-[0.12em] text-white uppercase font-sans">
                CAMPUS<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">PAY</span>
              </h1>
              <p className="text-blue-300/50 text-[10px] font-bold uppercase tracking-widest">
                Create a Secure Wallet Account
              </p>

              {/* Progress Indicator */}
              {step <= 4 && (
                <div className="flex items-center justify-center gap-3 mt-4 max-w-xs mx-auto px-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border transition-all duration-300 ${
                    step >= 1
                      ? 'bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] border-blue-500/35 text-white shadow-md shadow-[#1d4ed8]/20 scale-105'
                      : 'border-white/5 bg-gray-900/60 text-gray-500'
                  }`}>1</div>
                  <div className={`flex-1 h-0.5 rounded ${step >= 2 ? 'bg-gradient-to-r from-blue-500 to-[#1d4ed8]' : 'bg-white/5'}`}></div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border transition-all duration-300 ${
                    step >= 2
                      ? 'bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] border-blue-500/35 text-white shadow-md shadow-[#1d4ed8]/20 scale-105'
                      : 'border-white/5 bg-gray-900/60 text-gray-500'
                  }`}>2</div>
                  <div className={`flex-1 h-0.5 rounded ${step >= 3 ? 'bg-gradient-to-r from-blue-500 to-[#1d4ed8]' : 'bg-white/5'}`}></div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border transition-all duration-300 ${
                    step >= 3
                      ? 'bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] border-blue-500/35 text-white shadow-md shadow-[#1d4ed8]/20 scale-105'
                      : 'border-white/5 bg-gray-900/60 text-gray-500'
                  }`}>3</div>
                  <div className={`flex-1 h-0.5 rounded ${step >= 4 ? 'bg-gradient-to-r from-blue-500 to-[#1d4ed8]' : 'bg-white/5'}`}></div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border transition-all duration-300 ${
                    step >= 4
                      ? 'bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] border-blue-500/35 text-white shadow-md shadow-[#1d4ed8]/20 scale-105'
                      : 'border-white/5 bg-gray-900/60 text-gray-500'
                  }`}>4</div>
                </div>
              )}
            </div>

            {/* Global Notifications */}
            {error && (
              <div className="p-3.5 bg-red-950/20 border border-red-500/20 text-red-300 text-[10px] rounded-xl font-medium tracking-wide">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-[10px] rounded-xl font-medium tracking-wide">
                {success}
              </div>
            )}

            {/* STEP 1: Registration Details */}
            {step === 1 && (
              <form onSubmit={handleRegisterBasic} className="space-y-4 animate-fade-in">
                {/* Role Tab Selection */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-blue-300/60 pl-1">I am registering as a</label>
                  <div className="grid grid-cols-2 gap-3 bg-[#070a14]/85 p-1 rounded-2xl border border-white/5">
                    <button
                      type="button"
                      onClick={() => setRole('student')}
                      className={`py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                        role === 'student'
                          ? 'bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white shadow-md border-white/10'
                          : 'text-gray-500 border-transparent hover:text-gray-300'
                      }`}
                    >
                      <User size={14} /> Student
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('vendor')}
                      className={`py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                        role === 'vendor'
                          ? 'bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white shadow-md border-white/10'
                          : 'text-gray-500 border-transparent hover:text-gray-300'
                      }`}
                    >
                      <UserCheck size={14} /> Vendor
                    </button>
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-blue-300/60 pl-1">College Email ID</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400" size={16} />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="rahul.s@university.edu"
                      className="premium-input w-full py-3.5 pl-10 pr-4 text-xs placeholder:text-gray-600 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-blue-300/60 pl-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400" size={16} />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create secure password"
                      className="premium-input w-full py-3.5 pl-10 pr-4 text-xs placeholder:text-gray-600 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-blue-300/60 pl-1">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400" size={16} />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="premium-input w-full py-3.5 pl-10 pr-4 text-xs placeholder:text-gray-600 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Action */}
                <button
                  type="submit"
                  disabled={loading}
                  className="premium-button w-full py-3.5 px-4 rounded-xl text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2 cursor-pointer transition-all mt-2"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <span>Send Verification OTP</span>
                      <ChevronRight size={16} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 2: OTP Verification */}
            {step === 2 && (
              <form onSubmit={handleVerifyOtp} className="space-y-5 animate-fade-in">
                <div className="p-3.5 bg-blue-950/20 border border-blue-500/15 rounded-2xl text-blue-300 text-[10px] leading-relaxed pl-4">
                  We have sent a 6-digit verification code to: <strong className="text-white">{email}</strong>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-blue-300/60 pl-1">Enter 6-Digit OTP</label>
                  <div className="relative">
                    <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400" size={16} />
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••••"
                      className="premium-input w-full py-3.5 pl-10 pr-4 text-center text-lg tracking-widest font-black placeholder:text-gray-600 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="premium-button w-full py-3.5 px-4 rounded-xl text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <span>Verify OTP & Proceed</span>
                  )}
                </button>

                <button
                  type="button"
                   onClick={() => setStep(1)}
                  className="w-full text-center text-[10px] font-semibold text-blue-400/60 hover:text-blue-300 transition-colors"
                >
                  Change Email or Details
                </button>
              </form>
            )}

            {/* STEP 3: Profile Setup (Full Name & Profile Photo) */}
            {step === 3 && (
              <form onSubmit={handleProceedToKyc} className="space-y-5 animate-fade-in">
                <div className="flex flex-col items-center">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-blue-300/60 mb-2">Profile Photo</label>
                  <div className="relative w-20 h-20 rounded-full bg-[#070a14]/85 border border-white/5 overflow-hidden flex items-center justify-center cursor-pointer hover:border-blue-500/50 transition-all shadow-md group">
                    {profilePreview ? (
                      <img src={profilePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Image className="text-blue-400/60 group-hover:text-blue-400" size={24} />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                  <span className="text-[9px] text-gray-500 mt-1 font-semibold uppercase tracking-wider">Browse</span>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-blue-300/60 pl-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400" size={16} />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="premium-input w-full py-3.5 pl-10 pr-4 text-xs placeholder:text-gray-600 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="premium-button w-full py-3.5 px-4 rounded-xl text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2 cursor-pointer transition-all mt-2"
                >
                  <span>Continue to KYC Verification</span>
                  <ChevronRight size={16} />
                </button>
              </form>
            )}

            {/* STEP 4: KYC Setup (Student or Vendor Specific) */}
            {step === 4 && (
              <form onSubmit={handleCompleteProfile} className="space-y-5 animate-fade-in">
                {role === 'student' ? (
                  /* STUDENT KYC SETUP */
                  <>
                    <div className="space-y-4">
                      <div className="flex flex-col">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-blue-300/60 mb-2 pl-1">Student ID Card (KYC)</label>
                        <label className="bg-[#070a14]/85 border border-dashed border-blue-500/25 hover:border-blue-500/50 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all h-24 text-center shadow-md">
                          <FileText className="text-blue-400" size={24} />
                          <span className="text-[10px] text-gray-400 font-bold truncate max-w-[200px] mt-1.5">{kycFileName || 'Upload Student ID Card'}</span>
                          <input
                            type="file"
                            required
                            accept="image/*,.pdf"
                            onChange={handleKycFileChange}
                            className="hidden"
                          />
                        </label>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-blue-300/60 pl-1">Set 4-Digit MPIN (for transactions)</label>
                        <div className="relative">
                          <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400" size={16} />
                          <input
                            type="password"
                            maxLength={4}
                            required
                            value={mpin}
                            onChange={(e) => setMpin(e.target.value.replace(/\D/g, ''))}
                            placeholder="••••"
                            className="premium-input w-full py-3.5 pl-10 pr-4 text-center text-lg font-black tracking-widest focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  /* VENDOR BANK ACCOUNT & KYC SETUP */
                  <>
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-blue-300 border-b border-blue-500/10 pb-1.5 flex items-center gap-1.5 pl-1">
                        <Landmark size={14} className="text-blue-400" /> Bank Settlement Account
                      </h3>

                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-blue-300/60 pl-1">Bank Name</label>
                          <input
                            type="text"
                            required
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                            placeholder="e.g. State Bank of India"
                            className="premium-input w-full py-3 px-3 text-xs focus:outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-blue-300/60 pl-1">Account Number</label>
                            <input
                              type="text"
                              required
                              value={accountNo}
                              onChange={(e) => setAccountNo(e.target.value.replace(/\D/g, ''))}
                              placeholder="31205561001"
                              className="premium-input w-full py-3 px-3 text-xs focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-blue-300/60 pl-1">IFSC Code</label>
                            <input
                              type="text"
                              required
                              value={ifsc}
                              onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                              placeholder="SBIN0001234"
                              className="premium-input w-full py-3 px-3 text-xs focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-blue-300/60 pl-1">Set 4-Digit MPIN (for transactions & login)</label>
                        <div className="relative">
                          <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400" size={16} />
                          <input
                            type="password"
                            maxLength={4}
                            required
                            value={mpin}
                            onChange={(e) => setMpin(e.target.value.replace(/\D/g, ''))}
                            placeholder="••••"
                            className="premium-input w-full py-3.5 pl-10 pr-4 text-center text-lg font-black tracking-widest focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-blue-300/60 mb-2 pl-1">Business Registration / ID Card (KYC)</label>
                        <label className="bg-[#070a14]/85 border border-dashed border-blue-500/25 hover:border-blue-500/50 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all h-24 text-center shadow-md">
                           <FileText className="text-blue-400" size={24} />
                           <span className="text-[10px] text-gray-400 font-bold truncate max-w-[200px] mt-1.5">{kycFileName || 'Upload Business ID Card'}</span>
                           <input
                             type="file"
                             required
                             accept="image/*,.pdf"
                             onChange={handleKycFileChange}
                             className="hidden"
                           />
                        </label>
                      </div>
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="premium-button w-full py-3.5 px-4 rounded-xl text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2 cursor-pointer transition-all mt-2"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <span>Complete Profile & Save</span>
                  )}
                </button>
              </form>
            )}

            {/* STEP 5: Success state */}
            {step === 5 && (
              <div className="text-center py-6 space-y-6 animate-fade-in">
                <div className="inline-flex items-center justify-center p-4 bg-emerald-500/10 text-emerald-400 rounded-full animate-glow border border-emerald-500/20">
                  <CheckCircle2 size={48} />
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-extrabold text-white">Registration Complete!</h2>
                  {role === 'student' ? (
                    <p className="text-xs text-gray-400 px-4 leading-relaxed">
                      Welcome to CAMPUS-PAY! Your student wallet is now active. You can load funds, scan vendor QR codes, or setup biometrics.
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 px-4 leading-relaxed">
                      Your vendor registration is submitted! Your KYC status is currently <strong className="text-amber-400">PENDING</strong> verification by admin. You can register your terminal or setup settlement.
                    </p>
                  )}
                </div>

                <button
                  onClick={() => navigate('/')}
                  className="premium-button w-full py-3.5 px-4 rounded-xl text-xs font-bold tracking-widest uppercase cursor-pointer"
                >
                  Go to Dashboard
                </button>
              </div>
            )}

            {/* Footer link for standard flows */}
            {step === 1 && (
              <div className="text-center mt-6 text-xs text-gray-400">
                Already have an account?{' '}
                <Link to="/login" className="text-blue-400 font-bold hover:text-blue-300 transition-colors pl-1">
                  Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
