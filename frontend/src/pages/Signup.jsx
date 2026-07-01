import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Mail, Lock, User, UserCheck, Key, Image, Landmark, FileText, CheckCircle2, ChevronRight } from 'lucide-react';

const Signup = () => {
  const navigate = useNavigate();
  const { fetchMe } = useAuth(); // to reload context token if verified

  // State Machine Step: 1 = Details, 2 = OTP, 3 = Profile Setup, 4 = Success
  const [step, setStep] = useState(1);

  // Form Fields State
  const [role, setRole] = useState('student'); // 'student', 'vendor'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Step 2 OTP State
  const [otp, setOtp] = useState('');
  const [token, setToken] = useState(''); // Store signup token for profile setup step
  const [signupToken, setSignupToken] = useState(''); // Store stateless signup token

  // Step 3 Student State
  const [mpin, setMpin] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [profilePreview, setProfilePreview] = useState('');

  // Step 3 Vendor State
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
    setLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
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
          setStep(3); // Progress to Profile Completion
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

  // Submit Step 3: Complete Profile Setup (Student or Vendor)
  const handleCompleteProfile = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new FormData();

      if (role === 'student') {
        if (!mpin || mpin.length !== 4) {
          setError('Please set up a 4-digit MPIN');
          setLoading(false);
          return;
        }
        if (!kycDocument) {
          setError('Please upload a picture of your Student ID card for verification');
          setLoading(false);
          return;
        }
        formData.append('mpin', mpin);
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
        formData.append('bankName', bankName);
        formData.append('accountNo', accountNo);
        formData.append('ifsc', ifsc);
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
          setStep(4); // Progress to final Success Confirmation
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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl animate-float"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>

      <div className="w-full max-w-lg glass-panel rounded-2xl p-8 relative z-10 border border-white/5 shadow-2xl">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight">
            CAMPUS<span className="text-gradient">PAY</span>
          </h1>
          <p className="text-gray-400 mt-2 text-sm">Create a new secure account</p>

          {/* Progress Indicator */}
          {step <= 3 && (
            <div className="flex items-center justify-center gap-4 mt-6 max-w-xs mx-auto">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border transition-all ${
                step >= 1 ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-800 text-gray-500'
              }`}>1</div>
              <div className={`flex-1 h-0.5 ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-800'}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border transition-all ${
                step >= 2 ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-800 text-gray-500'
              }`}>2</div>
              <div className={`flex-1 h-0.5 ${step >= 3 ? 'bg-indigo-600' : 'bg-gray-800'}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border transition-all ${
                step >= 3 ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-800 text-gray-500'
              }`}>3</div>
            </div>
          )}
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-500/20 text-red-400 text-sm rounded-xl">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 text-sm rounded-xl">
            {success}
          </div>
        )}

        {/* STEP 1: Registration Details */}
        {step === 1 && (
          <form onSubmit={handleRegisterBasic} className="space-y-5 animate-fade-in">
            {/* Role Tab Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">I am registering as a</label>
              <div className="grid grid-cols-2 gap-3 bg-gray-950/60 p-1.5 rounded-xl border border-white/5">
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={`py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                    role === 'student' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <User size={16} /> Student
                </button>
                <button
                  type="button"
                  onClick={() => setRole('vendor')}
                  className={`py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                    role === 'vendor' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <UserCheck size={16} /> Vendor
                </button>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-indigo-500 text-white transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">College Email ID</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rahul.s@university.edu"
                  className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-indigo-500 text-white transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create secure password"
                  className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-indigo-500 text-white transition-all"
                />
              </div>
            </div>

            {/* Action */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <span>Send verification OTP</span>
                  <ChevronRight size={18} />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: OTP Verification */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-5 animate-fade-in">
            <div className="text-center p-2 bg-indigo-950/10 border border-indigo-500/10 rounded-xl text-indigo-300 text-xs">
              We have sent a 6-digit verification code to <strong>{email}</strong>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Enter 6-Digit OTP</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-center text-lg tracking-widest font-bold focus:outline-none focus:border-indigo-500 text-white transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <span>Verify OTP & Proceed</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full text-center text-xs text-gray-500 hover:text-gray-400 transition-colors"
            >
              Change email or registration details
            </button>
          </form>
        )}

        {/* STEP 3: Profile Setup (Student or Vendor Specific) */}
        {step === 3 && (
          <form onSubmit={handleCompleteProfile} className="space-y-5 animate-fade-in">
            {role === 'student' ? (
              /* STUDENT PROFILE COMPLETION */
              <>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex flex-col items-center">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Profile Photo (Optional)</label>
                    <div className="relative w-20 h-20 rounded-full bg-gray-950/60 border border-white/10 overflow-hidden flex items-center justify-center cursor-pointer hover:border-indigo-500 transition-all">
                      {profilePreview ? (
                        <img src={profilePreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Image className="text-gray-500" size={24} />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                    <span className="text-[10px] text-gray-500 mt-1">Browse photo</span>
                  </div>

                  <div className="flex flex-col justify-center">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Student ID Card (KYC)</label>
                    <label className="bg-gray-950/60 border border-dashed border-white/10 hover:border-indigo-500/50 hover:bg-gray-950/80 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all h-20 text-center">
                      <FileText className="text-gray-500 mb-0.5" size={16} />
                      <span className="text-[10px] text-gray-400 font-semibold truncate max-w-[120px]">{kycFileName || 'Upload ID Card image'}</span>
                      <input
                        type="file"
                        required
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setKycDocument(file);
                            setKycFileName(file.name);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Set 4-Digit MPIN (for quick transactions)</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                      type="password"
                      maxLength={4}
                      required
                      value={mpin}
                      onChange={(e) => setMpin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••"
                      className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-center text-lg font-bold tracking-widest focus:outline-none focus:border-indigo-500 text-white transition-all"
                    />
                  </div>
                </div>
              </>
            ) : (
              /* VENDOR PROFILE COMPLETION */
              <>
                <div className="space-y-4">
                  {/* Optional Profile Photo for Vendor */}
                  <div className="flex flex-col items-center mb-6">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Profile Photo (Optional)</label>
                    <div className="relative w-20 h-20 rounded-full bg-gray-950/60 border border-white/10 overflow-hidden flex items-center justify-center cursor-pointer hover:border-indigo-500 transition-all">
                      {profilePreview ? (
                        <img src={profilePreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Image className="text-gray-500" size={24} />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                    <span className="text-[10px] text-gray-500 mt-1">Tap circle to browse photo</span>
                  </div>

                  <h3 className="text-sm font-bold text-gray-300 border-b border-white/5 pb-1 flex items-center gap-1.5">
                    <Landmark size={16} className="text-indigo-400" /> Bank Settlement Account
                  </h3>

                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Bank Name</label>
                      <input
                        type="text"
                        required
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="e.g. State Bank of India"
                        className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Account Number</label>
                        <input
                          type="text"
                          required
                          value={accountNo}
                          onChange={(e) => setAccountNo(e.target.value.replace(/\D/g, ''))}
                          placeholder="31205561001"
                          className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">IFSC Code</label>
                        <input
                          type="text"
                          required
                          value={ifsc}
                          onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                          placeholder="SBIN0001234"
                          className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <span>Complete Profile & Save</span>
              )}
            </button>
          </form>
        )}

        {/* STEP 4: Success state */}
        {step === 4 && (
          <div className="text-center py-6 space-y-6 animate-fade-in">
            <div className="inline-flex items-center justify-center p-4 bg-emerald-500/10 text-emerald-400 rounded-full animate-glow">
              <CheckCircle2 size={48} />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-white">Registration Complete!</h2>
              {role === 'student' ? (
                <p className="text-sm text-gray-400 px-4">
                  Welcome to CAMPUS-PAY! Your student wallet is now active. You can load funds, scan vendor QR codes, or setup biometrics.
                </p>
              ) : (
                <p className="text-sm text-gray-400 px-4">
                  Your vendor registration is submitted! Your KYC status is currently <strong>PENDING</strong> verification by admin. You can register your terminal or setup settlement.
                </p>
              )}
            </div>

            <button
              onClick={() => navigate('/')}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg shadow-indigo-600/25 hover:-translate-y-0.5 cursor-pointer"
            >
              Go to Dashboard
            </button>
          </div>
        )}

        {/* Footer link for standard flows */}
        {step === 1 && (
          <div className="text-center mt-6 text-sm text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors">
              Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Signup;
