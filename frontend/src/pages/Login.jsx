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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl animate-float"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>

      <div className="w-full max-w-md glass-panel rounded-2xl p-8 relative z-10 border border-white/5 shadow-2xl">
        {/* Title / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 rounded-xl mb-3 text-indigo-400 animate-glow">
            <ShieldCheck size={36} />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            CAMPUS<span className="text-gradient">PAY</span>
          </h1>
          <p className="text-gray-400 mt-2 text-sm">Secure campus wallet & administration portal</p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-gray-950/60 p-1.5 rounded-xl mb-6 border border-white/5">
          <button
            onClick={() => { setMethod('password'); setError(''); }}
            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
              method === 'password' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
            }`}
          >
            Password Login
          </button>
          <button
            onClick={() => { setMethod('biometric'); setError(''); }}
            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 ${
              method === 'biometric' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Fingerprint size={14} /> Biometric Passkey
          </button>
        </div>

        {/* Alert Notifications */}
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

        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email input (Always required) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="enter your college email"
                className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-indigo-500 text-white transition-all placeholder:text-gray-600"
              />
            </div>
          </div>

          {/* Password specific */}
          {method === 'password' && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">Password</label>
                <button
                  type="button"
                  onClick={() => { setShowForgotModal(true); setForgotStep(1); }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-3 pl-10 pr-10 text-sm focus:outline-none focus:border-indigo-500 text-white transition-all placeholder:text-gray-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}

          {/* Biometrics config toggles */}
          {method === 'biometric' && (
            <div className="flex items-center justify-between p-3 bg-indigo-950/20 border border-indigo-500/10 rounded-xl">
              <span className="text-xs text-indigo-300 font-medium">Use Mock Authentication Fallback</span>
              <input
                type="checkbox"
                checked={useMockBio}
                onChange={(e) => setUseMockBio(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
              />
            </div>
          )}

          {/* Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/35 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : method === 'biometric' ? (
              <>
                <Fingerprint size={18} />
                <span>Scan Passkey</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {/* Footnote Link */}
        <div className="text-center mt-6 text-sm text-gray-400">
          New to Campus Pay?{' '}
          <Link to="/signup" className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors">
            Create an Account
          </Link>
        </div>
      </div>

      {/* ==========================================================================
         FORGOT PASSWORD RESET DIALOG MODAL
         ========================================================================== */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm glass-panel border border-white/5 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                <KeyRound size={16} className="text-indigo-400" /> Reset Password
              </h3>
              <button
                onClick={() => { setShowForgotModal(false); setForgotError(''); setForgotSuccess(''); }}
                className="text-gray-500 hover:text-white text-sm font-semibold cursor-pointer"
              >
                &times;
              </button>
            </div>

            {forgotError && (
              <div className="p-2.5 bg-red-950/20 border border-red-500/20 text-red-400 text-xs rounded-xl">
                {forgotError}
              </div>
            )}
            {forgotSuccess && (
              <div className="p-2.5 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl">
                {forgotSuccess}
              </div>
            )}

            {forgotStep === 1 ? (
              /* Request OTP Form */
              <form onSubmit={handleForgotRequest} className="space-y-4">
                <p className="text-xs text-gray-400">
                  Enter your registered college email. We will send an OTP code to verify your identity.
                </p>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Email ID</label>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="student@college.edu"
                    className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {forgotLoading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <span>Send Verification OTP</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* Verify OTP & Reset Password Form */
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="p-2 bg-indigo-950/20 border border-indigo-500/10 rounded-xl text-[10px] text-indigo-300">
                  Enter the 6-digit OTP code sent to: <strong>{resetEmail}</strong>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Enter 6-Digit OTP</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-2.5 px-3 text-center text-sm font-bold tracking-widest text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Enter New Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-xs cursor-pointer flex items-center justify-center"
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
                  className="w-full text-center text-[10px] text-gray-500 hover:text-gray-400 transition-colors"
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
