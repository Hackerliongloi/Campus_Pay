import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, Key, ShieldCheck, Fingerprint, Eye, EyeOff, KeyRound, ArrowRight } from 'lucide-react';

const Login = () => {
  const { login, loginBiometrics } = useAuth();
  const navigate = useNavigate();

  // State parameters
  const [method, setMethod] = useState('password'); // 'password', 'biometric'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [useMockBio, setUseMockBio] = useState(true); // Default to true for ease of testing on standard browsers
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Forgot Password modal states
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1 = request email, 2 = verify otp and reset password
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      let res;
      if (method === 'password') {
        if (!email || !password) {
          setError('Please fill in all fields');
          setLoading(false);
          return;
        }
        res = await login(email, password);
      } else {
        if (!email) {
          setError('Please enter your email to proceed with biometric login');
          setLoading(false);
          return;
        }
        res = await loginBiometrics(email, useMockBio);
      }

      if (res.success) {
        setSuccess('Logged in successfully!');
        setTimeout(() => {
          navigate('/');
        }, 800);
      } else {
        setError(res.error || 'Authentication failed');
      }
    } catch (err) {
      setError('An error occurred during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Request reset password OTP
  const handleForgotRequest = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');
    setForgotLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });

      const data = await response.json();
      if (data.success) {
        setForgotSuccess('OTP code sent to your email.');
        setTimeout(() => {
          setForgotSuccess('');
          setForgotStep(2);
        }, 1000);
      } else {
        setForgotError(data.error || 'Failed to verify email address');
      }
    } catch (err) {
      setForgotError('Network failure connecting to server');
    } finally {
      setForgotLoading(false);
    }
  };

  // Verify OTP and reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');
    setForgotLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, otp: resetOtp, newPassword }),
      });

      const data = await response.json();
      if (data.success) {
        setForgotSuccess('Password updated successfully!');
        // Pre-fill email in main form for ease of login
        setEmail(resetEmail);
        setTimeout(() => {
          setForgotSuccess('');
          setShowForgotModal(false);
          setForgotStep(1);
          setResetEmail('');
          setResetOtp('');
          setNewPassword('');
        }, 1500);
      } else {
        setForgotError(data.error || 'Failed to reset password');
      }
    } catch (err) {
      setForgotError('Network communication failed');
    } finally {
      setForgotLoading(false);
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

          <div className="w-full relative z-10 space-y-6">
            {/* Title / Brand */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center p-4 bg-gradient-to-tr from-[#2563eb]/20 to-[#1d4ed8]/5 rounded-2xl border border-blue-500/15 text-blue-400 shadow-lg shadow-[#1d4ed8]/10 animate-glow">
                <ShieldCheck size={36} />
              </div>
              <h1 className="text-3xl font-black tracking-[0.12em] text-white uppercase font-sans">
                CAMPUS<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">PAY</span>
              </h1>
              <p className="text-blue-300/50 text-[10px] font-bold uppercase tracking-widest">
                Secure Campus Wallet & Merchant Portal
              </p>
            </div>

            {/* Alert Notifications */}
            {error && (
              <div className="p-3.5 bg-red-950/20 border border-red-500/20 text-red-300 text-[10px] rounded-xl font-medium tracking-wide">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/20 text-emerald-300 text-[10px] rounded-xl font-medium tracking-wide">
                {success}
              </div>
            )}

            {/* Premium Login Method Switcher */}
            <div className="flex bg-[#070a14]/85 p-1 rounded-2xl border border-white/5 relative z-10">
              <button
                type="button"
                onClick={() => { setMethod('password'); setError(''); }}
                className={`flex-1 py-2 text-[10px] font-bold tracking-wider uppercase rounded-xl transition-all duration-300 cursor-pointer ${
                  method === 'password'
                    ? 'bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white shadow-md shadow-[#1d4ed8]/15 border border-white/5'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                Password
              </button>
              <button
                type="button"
                onClick={() => { setMethod('biometric'); setError(''); }}
                className={`flex-1 py-2 text-[10px] font-bold tracking-wider uppercase rounded-xl transition-all duration-300 cursor-pointer ${
                  method === 'biometric'
                    ? 'bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white shadow-md shadow-[#1d4ed8]/15 border border-white/5'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                Passkey
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email input */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-blue-300/60 pl-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400" size={16} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@campuspay.com"
                    className="premium-input w-full py-3.5 pl-10 pr-4 text-xs placeholder:text-gray-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Password specific */}
              {method === 'password' && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center pl-1">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-blue-300/60">Password</label>
                    <button
                      type="button"
                      onClick={() => { setShowForgotModal(true); setForgotStep(1); }}
                      className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400" size={16} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="premium-input w-full py-3.5 pl-10 pr-10 text-xs placeholder:text-gray-600 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400/60 hover:text-blue-300"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Biometrics config toggles */}
              {method === 'biometric' && (
                <div className="flex items-center justify-between p-3.5 bg-blue-950/20 border border-blue-500/20 rounded-2xl">
                  <span className="text-[10px] text-blue-300 font-semibold uppercase tracking-wider">Use Mock Fallback</span>
                  <input
                    type="checkbox"
                    checked={useMockBio}
                    onChange={(e) => setUseMockBio(e.target.checked)}
                    className="w-4 h-4 cursor-pointer accent-blue-600 rounded"
                  />
                </div>
              )}

              {/* Action Button */}
              <button
                type="submit"
                disabled={loading}
                className="premium-button w-full py-3.5 px-4 rounded-xl text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:pointer-events-none mt-2"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : method === 'biometric' ? (
                  <>
                    <Fingerprint size={16} />
                    <span>Scan Passkey</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </form>

            {/* Footnote Link */}
            <div className="text-center text-xs text-gray-400">
              New to Campus Pay?{' '}
              <Link to="/signup" className="text-blue-400 font-bold hover:text-blue-300 transition-colors pl-1">
                Create an Account
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Reset Dialog Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xs glass-panel border border-white/5 rounded-2xl p-5 space-y-3">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="font-bold text-xs text-white flex items-center gap-1.5">
                <KeyRound size={14} className="text-[#9b51e0]" /> Reset Password
              </h3>
              <button
                onClick={() => { setShowForgotModal(false); setForgotError(''); setForgotSuccess(''); }}
                className="text-gray-500 hover:text-white text-base leading-none font-semibold cursor-pointer"
              >
                &times;
              </button>
            </div>

            {forgotError && (
              <div className="p-2 bg-red-950/20 border border-red-500/20 text-red-400 text-[10px] rounded-lg">
                {forgotError}
              </div>
            )}
            {forgotSuccess && (
              <div className="p-2 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-[10px] rounded-lg">
                {forgotSuccess}
              </div>
            )}

            {forgotStep === 1 ? (
              /* Request OTP Form */
              <form onSubmit={handleForgotRequest} className="space-y-3">
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  Enter your registered college email. We will send an OTP code to verify your identity.
                </p>
                <div>
                  <label className="block text-[9px] font-bold uppercase text-gray-500 mb-1">Email ID</label>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="student@college.edu"
                    className="w-full bg-gray-950/60 border border-white/5 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {forgotLoading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <span>Send OTP</span>
                      <ArrowRight size={12} />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* Verify OTP & Reset Password Form */
              <form onSubmit={handleResetPassword} className="space-y-3">
                <div className="p-2 bg-blue-950/20 border border-blue-500/20 rounded-lg text-[9px] text-blue-400">
                  Enter the 6-digit OTP code sent to: <strong>{resetEmail}</strong>
                </div>

                <div>
                  <label className="block text-[9px] font-bold uppercase text-gray-500 mb-1">6-Digit OTP</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="w-full bg-gray-950/60 border border-white/5 rounded-lg py-2 text-center text-xs font-bold tracking-widest text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold uppercase text-gray-500 mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-gray-950/60 border border-white/5 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 rounded-lg text-xs cursor-pointer flex items-center justify-center"
                >
                  {forgotLoading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <span>Update Password & Login</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setForgotStep(1)}
                  className="w-full text-center text-[9px] text-gray-500 hover:text-gray-400 transition-colors"
                >
                  Change email address
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
