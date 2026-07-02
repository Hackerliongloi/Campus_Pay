import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Landmark, ArrowDownLeft, TrendingUp, History, QrCode, FileText, CheckCircle2,
  AlertCircle, Clock, LogOut, ArrowRight, Loader2, Settings, Upload, MessageSquare, Search, Bell, Trash2, Send, ShieldAlert
} from 'lucide-react';

const VendorDashboard = () => {
  const { user, logout, updateProfile } = useAuth();

  // Edit Profile States
  const [showEditModal, setShowEditModal] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');
  const [newAvatar, setNewAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  // Path helper to resolve local uploads or Cloudinary URLs
  const getImageUrl = (path) => {
    if (!path) return '';
    return path.startsWith('http') ? path : `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}${path}`;
  };
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState('earnings'); // 'earnings', 'qr', 'bank', 'notifications'

  // Support Tickets state
  const [complaints, setComplaints] = useState([]);
  const [compTitle, setCompTitle] = useState('');
  const [compDesc, setCompDesc] = useState('');
  const [compFile, setCompFile] = useState(null);
  const [compFileName, setCompFileName] = useState('');

  // Redeem funds state
  const [redeemAmount, setRedeemAmount] = useState('');
  const [redeemMpin, setRedeemMpin] = useState('');
  // Send money states
  const [sendStudentEmail, setSendStudentEmail] = useState('');
  const [sendStudentAmount, setSendStudentAmount] = useState('');
  const [sendMpin, setSendMpin] = useState('');
  const [sendError, setSendError] = useState('');
  const [sendSuccess, setSendSuccess] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  // QR bill generation state
  const [billAmount, setBillAmount] = useState('');
  const [billNote, setBillNote] = useState('');

  // Notification States
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      const res = await fetch('/api/notifications/read', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (data.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteNotification = async (id, e) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (data.success) {
        setNotifications((prev) => prev.filter((n) => n._id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const markNotificationRead = async (id) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (data.success) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Enforce KYC restriction: redirect to support tab if not approved
  useEffect(() => {
    if (user && user.kycStatus !== 'approved') {
      const allowedTabs = ['support', 'complaint-history'];
      if (!allowedTabs.includes(activeTab)) {
        setActiveTab('support');
      }
    }
  }, [user, activeTab]);

  const getGroupedNotifications = () => {
    const groups = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: []
    };
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    notifications.forEach(notif => {
      const notifDate = new Date(notif.createdAt);
      if (notifDate >= today) {
        groups.today.push(notif);
      } else if (notifDate >= yesterday) {
        groups.yesterday.push(notif);
      } else if (notifDate >= oneWeekAgo) {
        groups.thisWeek.push(notif);
      } else {
        groups.older.push(notif);
      }
    });
    
    return groups;
  };
  const [generatedBill, setGeneratedBill] = useState(null); // holds generated bill details

  // QR countdown & transaction success states
  const [countdown, setCountdown] = useState(300);
  const [isExpired, setIsExpired] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successTxn, setSuccessTxn] = useState(null);

  // Sales Search State
  const [salesSearch, setSalesSearch] = useState('');

  // Complaints Search State
  const [complaintsSearch, setComplaintsSearch] = useState('');

  useEffect(() => {
    if (!generatedBill) return;

    // Reset verification states
    setIsExpired(false);
    setShowSuccess(false);
    setSuccessTxn(null);
    setCountdown(300);

    // 1. Countdown timer interval (1s updates)
    const timerInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerInterval);
          setIsExpired(true);
          setGeneratedBill(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // 2. Status checker polling interval (3s frequency)
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/wallet/history?limit=10', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        const data = await response.json();
        if (data.success && data.transactions) {
          // Look for matching pay transaction
          const matchTxn = data.transactions.find((txn) => {
            const isPay = txn.type === 'pay';
            const isAmountMatch = Math.abs(txn.amount - generatedBill.amount) < 0.01;
            const txnTime = new Date(txn.createdAt).getTime();
            return isPay && isAmountMatch && txnTime > generatedBill.timestamp;
          });

          if (matchTxn) {
            setSuccessTxn(matchTxn);
            setShowSuccess(true);
            setGeneratedBill(null);
            clearInterval(timerInterval);
            clearInterval(pollInterval);
            // Refresh stats instantly
            fetchStats();
            fetchHistory();
          }
        }
      } catch (err) {
        console.error('Error polling for payment:', err);
      }
    }, 3000);

    return () => {
      clearInterval(timerInterval);
      clearInterval(pollInterval);
    };
  }, [generatedBill]);

  // Handle Edit Profile Submission
  const handleEditProfileSubmit = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditSuccess('');
    setEditLoading(true);

    try {
      const formData = new FormData();
      if (newName) formData.append('name', newName);
      if (newAvatar) formData.append('profileImage', newAvatar);

      const res = await updateProfile(formData);
      if (res.success) {
        setEditSuccess('Profile updated successfully!');
        setTimeout(() => {
          setEditSuccess('');
          setShowEditModal(false);
          setNewAvatar(null);
          setAvatarPreview('');
        }, 1200);
      } else {
        setEditError(res.error || 'Failed to update profile');
      }
    } catch (err) {
      setEditError('Connection failed');
    } finally {
      setEditLoading(false);
    }
  };

  // Banking profile state
  const [bankName, setBankName] = useState(user?.bankDetails?.bankName || '');
  const [accountNo, setAccountNo] = useState(user?.bankDetails?.accountNo || '');
  const [ifsc, setIfsc] = useState(user?.bankDetails?.ifsc || '');

  // KYC re-upload state
  const [kycFile, setKycFile] = useState(null);
  const [kycFileName, setKycFileName] = useState('');

  // Status variables
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchStats();
    fetchHistory();
    fetchComplaints();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/vendor/stats', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/wallet/history?limit=20', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await response.json();
      if (data.success) {
        setTransactions(data.transactions);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchComplaints = async () => {
    try {
      const response = await fetch('/api/complaints', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await response.json();
      if (data.success) {
        setComplaints(data.complaints);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Complaint Submission
  const handleComplaintSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const formData = new FormData();
    formData.append('title', compTitle);
    formData.append('description', compDesc);
    if (compFile) formData.append('screenshot', compFile);

    try {
      const response = await fetch('/api/complaints', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('Support ticket registered successfully!');
        setCompTitle('');
        setCompDesc('');
        setCompFile(null);
        setCompFileName('');
        fetchComplaints();
        setTimeout(() => setSuccess(''), 2000);
      } else {
        setError(data.error || 'Failed to file ticket');
      }
    } catch (err) {
      setError('Connection failed');
    } finally {
      setLoading(false);
    }
  };

  // Redeem balance
  const handleRedeemEarnings = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!redeemMpin || redeemMpin.length !== 4) {
      setError('Please enter your 4-digit Transaction MPIN');
      return;
    }
    setLoading(true);

    try {
      const response = await fetch('/api/vendor/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ amount: redeemAmount, mpin: redeemMpin }),
      });

      const data = await response.json();
      if (data.success) {
        setSuccess(`Redemption request of ₹${redeemAmount} settled successfully!`);
        setRedeemAmount('');
        setRedeemMpin('');
        fetchStats();
        fetchHistory();
        setTimeout(() => setSuccess(''), 2000);
      } else {
        setError(data.error || 'Redemption failed');
      }
    } catch (err) {
      setError('Connection error processing redemption');
    } finally {
      setLoading(false);
    }
  };

  // Send money to student (refund)
  const handleSendMoneyToStudent = async (e) => {
    e.preventDefault();
    setSendError('');
    setSendSuccess('');
    if (!sendMpin || sendMpin.length !== 4) {
      setSendError('Please enter your 4-digit Transaction MPIN');
      return;
    }
    setSendLoading(true);

    try {
      const response = await fetch('/api/vendor/refund-student', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          studentEmail: sendStudentEmail,
          amount: sendStudentAmount,
          mpin: sendMpin,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSendSuccess(`Successfully refunded ₹${sendStudentAmount} to ${sendStudentEmail}!`);
        setSendStudentEmail('');
        setSendStudentAmount('');
        setSendMpin('');
        fetchStats();
        fetchHistory();
        setTimeout(() => setSendSuccess(''), 4000);
      } else {
        setSendError(data.error || 'Refund failed');
      }
    } catch (err) {
      setSendError('Connection error processing refund');
    } finally {
      setSendLoading(false);
    }
  };

  // Generate QR bill
  const handleGenerateQrBill = (e) => {
    e.preventDefault();
    if (!billAmount || parseFloat(billAmount) <= 0) return;

    setGeneratedBill({
      vendorName: user?.name,
      vendorEmail: user?.email,
      amount: parseFloat(billAmount),
      description: billNote || 'Campus pay bill',
      timestamp: Date.now(),
    });
  };

  // Update bank credentials
  const handleUpdateBank = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch('/api/vendor/bank-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ bankName, accountNo, ifsc }),
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('Bank details registered successfully!');
        fetchStats();
        setTimeout(() => setSuccess(''), 2000);
      } else {
        setError(data.error || 'Failed to update bank details');
      }
    } catch (err) {
      setError('Network communication failed');
    } finally {
      setLoading(false);
    }
  };

  // Re-upload KYC
  const handleKycUpload = async (e) => {
    e.preventDefault();
    if (!kycFile) return;
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('kycDocument', kycFile);

      const response = await fetch('/api/vendor/upload-kyc', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('KYC documents submitted. Approval pending.');
        setKycFile(null);
        setKycFileName('');
        fetchStats();
        setTimeout(() => setSuccess(''), 2000);
      } else {
        setError(data.error || 'KYC Upload failed');
      }
    } catch (err) {
      setError('Connection failure uploading document');
    } finally {
      setLoading(false);
    }
  };

  // Extract variables
  const kycStatus = 'approved';
  const totalEarnings = stats?.totalEarnings || 0;
  const currentBalance = stats?.walletBalance || 0;

  return (
    <div className="mobile-app-container">
      <div className="mobile-app-shell overflow-hidden">
        <div className="mobile-notch"></div>
        
        {/* Sleek Premium Vendor Header */}
        <header className="px-4 pt-7 pb-4 bg-[#0e091c]/80 backdrop-blur-md text-white flex items-center justify-between border-b border-white/5 relative z-30 shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setNewName(user?.name || '');
                setShowEditModal(true);
              }}
              className="focus:outline-none relative group action-tap-feedback cursor-pointer"
            >
              {user?.profileImage ? (
                <img src={getImageUrl(user.profileImage)} alt="Profile" className="w-9 h-9 rounded-full object-cover border border-blue-500/35" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#2563eb] to-[#1d4ed8] text-white font-bold flex items-center justify-center border border-white/10 text-xs shadow-inner">
                  {user?.name?.charAt(0)}
                </div>
              )}
            </button>
            <div>
              <h4 className="font-black text-[10px] tracking-widest uppercase text-blue-300">Merchant Terminal</h4>
              <p className="text-[10px] text-white font-bold flex items-center gap-1.5">
                {user?.name}
                <span className="text-white/20">&bull;</span>
                <span className="text-emerald-400 font-extrabold flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Active
                </span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => user?.kycStatus === 'approved' ? setActiveTab('notifications') : null}
              style={{ opacity: user?.kycStatus === 'approved' ? 1 : 0.35 }}
              title={user?.kycStatus !== 'approved' ? 'KYC verification required' : 'Notifications'}
              className="p-2 hover:bg-white/5 rounded-xl transition-all relative cursor-pointer border border-white/5 bg-[#120d22]"
            >
              <Bell size={15} />
              {notifications.filter((n) => !n.isRead).length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border border-[#0f0a1c] animate-pulse"></span>
              )}
            </button>
            <button
              onClick={logout}
              className="p-2 hover:bg-white/5 rounded-xl transition-all cursor-pointer border border-white/5 bg-[#120d22]"
              title="Logout"
            >
              <LogOut size={15} />
            </button>
          </div>
        </header>

        {/* Mobile Viewport Content */}
        <div className="mobile-content bg-[#070a14] p-4 pb-24">
          
          {/* TAB 1: Earnings & Withdrawals */}
          {activeTab === 'earnings' && (
            <div className="space-y-4.5 animate-fade-in">
              {/* Premium Earnings Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#120d22] border border-white/5 rounded-2xl p-4.5 shadow-md text-white relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-full blur-xl"></div>
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest pl-0.5">Sales Volume</span>
                  <h3 className="text-base font-black text-white mt-1.5 pl-0.5">₹{totalEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
                  <div className="text-[9px] text-emerald-400 mt-2 flex items-center gap-1 font-semibold pl-0.5"><TrendingUp size={10} /> Cumulative</div>
                </div>

                <div className="bg-[#120d22] border border-white/5 rounded-2xl p-4.5 shadow-md text-white relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-full blur-xl"></div>
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest pl-0.5">Settlement Bal</span>
                  <h3 className="text-base font-black text-white mt-1.5 pl-0.5">₹{currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
                  <div className="text-[9px] text-blue-300 mt-2 flex items-center gap-1 font-semibold pl-0.5"><Landmark size={10} /> Redeemable</div>
                </div>
              </div>

              {/* Settle to Bank withdrawal Form */}
              <div className="bg-[#120d22] border border-white/5 rounded-2xl p-4.5 shadow-md space-y-3.5">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-300/80 pl-0.5">Settle Earnings to Bank</h4>
                
                {error && <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-300 text-[10px] rounded-xl font-medium">{error}</div>}
                {success && <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 text-emerald-300 text-[10px] rounded-xl font-medium">{success}</div>}

                <form onSubmit={handleRedeemEarnings} className="space-y-3">
                  <div className="flex gap-2.5">
                    <div className="flex-1">
                      <input
                        type="number"
                        required
                        value={redeemAmount}
                        onChange={(e) => setRedeemAmount(e.target.value)}
                        placeholder="Amount (₹)"
                        className="premium-input w-full py-3 px-3 text-xs focus:outline-none"
                      />
                    </div>
                    <div className="w-24">
                      <input
                        type="password"
                        required
                        maxLength={4}
                        value={redeemMpin}
                        onChange={(e) => setRedeemMpin(e.target.value.replace(/\D/g, ''))}
                        placeholder="MPIN"
                        className="premium-input w-full py-3 px-3 text-xs text-center focus:outline-none font-bold"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="premium-button w-full py-3 px-5 rounded-xl text-xs font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    {loading ? <Loader2 className="animate-spin" size={14} /> : <span>Request Settlement</span>}
                  </button>
                </form>
                {stats?.bankDetails ? (
                  <p className="text-[9px] text-gray-500 font-medium pl-0.5">
                    Settle to: <strong className="text-gray-300">{stats.bankDetails.bankName} (A/C *{stats.bankDetails.accountNo.slice(-4)})</strong>
                  </p>
                ) : (
                  <p className="text-[9px] text-amber-400/80 font-medium pl-0.5">
                    * Setup settlement bank details in the Settlement tab.
                  </p>
                )}
              </div>

              {/* Send Money/Earnings to Student Card */}
              <div className="bg-[#120d22] border border-white/5 rounded-2xl p-4.5 shadow-md space-y-3.5 animate-fade-in">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-300/80 pl-0.5 flex items-center gap-1.5">
                  <Send size={12} className="text-purple-400" /> Send Money to Student (Refund)
                </h4>

                {sendError && <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-300 text-[10px] rounded-xl font-medium">{sendError}</div>}
                {sendSuccess && <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 text-emerald-300 text-[10px] rounded-xl font-medium">{sendSuccess}</div>}

                <form onSubmit={handleSendMoneyToStudent} className="space-y-3">
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="col-span-2">
                      <input
                        type="email"
                        required
                        value={sendStudentEmail}
                        onChange={(e) => setSendStudentEmail(e.target.value)}
                        placeholder="Student Email"
                        className="premium-input w-full py-3 px-3 text-xs focus:outline-none"
                      />
                    </div>
                    <div className="col-span-1">
                      <input
                        type="number"
                        required
                        value={sendStudentAmount}
                        onChange={(e) => setSendStudentAmount(e.target.value)}
                        placeholder="Amount"
                        className="premium-input w-full py-3 px-3 text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      maxLength={4}
                      value={sendMpin}
                      onChange={(e) => setSendMpin(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter 4-Digit Security MPIN to Authorize"
                      className="premium-input w-full py-3 px-3 text-xs text-center focus:outline-none tracking-widest font-black"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={sendLoading}
                    className="premium-button w-full py-3 px-5 rounded-xl text-xs font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    {sendLoading ? <Loader2 className="animate-spin" size={14} /> : (
                      <>
                        <Send size={12} />
                        <span>Send Money</span>
                      </>
                    )}
                  </button>
                </form>
                <p className="text-[9px] text-gray-500 font-medium pl-0.5 leading-relaxed">
                  * Funds will be sent directly to the student's college wallet (added to institute balance) and their cumulative spent spending will be reduced.
                </p>
              </div>

              {/* Recent Activity */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5 pl-1">
                  <History size={14} className="text-blue-400" /> Recent Sales & Payouts
                </h3>
                <div className="bg-[#120d22] border border-white/5 rounded-2xl divide-y divide-white/5 overflow-hidden shadow-md">
                  {transactions.slice(0, 4).length === 0 ? (
                    <div className="p-6 text-center text-gray-500 text-xs">No transactions recorded.</div>
                  ) : (
                    transactions.slice(0, 4).map((txn) => {
                      const isRedeem = txn.type === 'redeem';
                      const isRefund = txn.type === 'refund';
                      return (
                        <div key={txn._id} className="p-3 flex items-center justify-between hover:bg-white/2 transition-colors gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`p-2 rounded-xl border shrink-0 ${
                              isRedeem ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                              isRefund ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' :
                              'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            }`}>
                              {isRedeem ? <ArrowRight size={14} /> :
                               isRefund ? <Send size={14} /> :
                               <ArrowDownLeft size={14} />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-white truncate">
                                {isRedeem ? 'Settlement to Bank' :
                                 isRefund ? `Refund to: ${txn.receiver?.name || 'Student'}` :
                                 `From: ${txn.sender?.name || 'Student'}`}
                              </p>
                              <span className="text-[8px] text-gray-500 block mt-0.5 truncate">{new Date(txn.createdAt).toLocaleDateString()} &bull; "{txn.description}"</span>
                            </div>
                          </div>
                          <span className={`font-bold text-xs shrink-0 ${
                            isRedeem ? 'text-blue-400' :
                            isRefund ? 'text-purple-400' :
                            'text-emerald-400'
                          }`}>
                            {isRedeem || isRefund ? '-' : '+'} ₹{txn.amount.toFixed(2)}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Generate payment QR Code bill */}
          {activeTab === 'qr' && (
            <div className="space-y-4 animate-fade-in max-w-sm mx-auto">
              <div className="bg-[#120d22] border border-white/5 rounded-3xl p-4 space-y-3.5 shadow-md">
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5"><QrCode size={16} className="text-blue-400" /> Create Payment QR Bill</h3>
                <form onSubmit={handleGenerateQrBill} className="space-y-3">
                  <div>
                    <label className="block text-[9px] font-bold uppercase text-gray-500 mb-1">Billing Amount (₹)</label>
                    <input
                      type="number"
                      required
                      value={billAmount}
                      onChange={(e) => setBillAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold uppercase text-gray-500 mb-1">Item Details / Bill Note</label>
                    <input
                      type="text"
                      value={billNote}
                      onChange={(e) => setBillNote(e.target.value)}
                      placeholder="e.g. Lunch meal token"
                      className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
                  >
                    <QrCode size={14} />
                    <span>Generate Bill QR Code</span>
                  </button>
                </form>
              </div>

              {/* QR Code display stand */}
              <div className="flex flex-col items-center justify-center">
                {showSuccess ? (
                  <div className="bg-[#120d22] border border-emerald-500/20 p-5 rounded-3xl text-center space-y-4 shadow-xl w-full">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                      <CheckCircle2 size={24} />
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-bold text-white text-sm">Payment Successful!</h3>
                      <p className="text-xl font-extrabold text-emerald-400">₹{successTxn?.amount?.toFixed(2)}</p>
                      <p className="text-[10px] text-gray-400">"{successTxn?.description}"</p>
                    </div>

                    <div className="border-t border-white/5 pt-3 text-left text-[10px] space-y-1 text-gray-400">
                      <div className="flex justify-between">
                        <span>Paid By:</span>
                        <span className="text-white font-semibold">{successTxn?.sender?.name || 'Student'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Email:</span>
                        <span className="text-white font-mono">{successTxn?.sender?.email || 'N/A'}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setShowSuccess(false);
                        setSuccessTxn(null);
                        setBillAmount('');
                        setBillNote('');
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl text-xs cursor-pointer transition-all"
                    >
                      New QR Bill
                    </button>
                  </div>
                ) : generatedBill ? (
                  <div className="bg-[#120d22] border border-blue-500/20 p-5 rounded-3xl text-center space-y-4 shadow-xl w-full">
                    <span className="text-[9px] text-blue-400 font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping"></span> Live terminal Stand
                    </span>
                    <div className="bg-white p-3 rounded-2xl inline-block shadow-inner">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&color=0b0f19&data=${encodeURIComponent(
                          JSON.stringify({
                            appName: 'CAMPUS-PAY-App',
                            email: generatedBill.vendorEmail,
                            amount: generatedBill.amount,
                            item: generatedBill.description,
                          })
                        )}`}
                        alt="Bill QR Code"
                        className="w-[150px] h-[150px]"
                      />
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-bold text-white text-base">₹{generatedBill.amount.toFixed(2)}</h4>
                      <p className="text-[10px] text-gray-400">"{generatedBill.description}"</p>
                    </div>

                    <div className="py-1 px-2.5 bg-slate-900 border border-white/5 rounded-xl inline-flex items-center gap-1.5 text-[10px] mx-auto">
                      <Clock size={12} className="text-blue-400" />
                      <span className="text-gray-400 font-medium">Expires in:</span>
                      <span className="text-white font-bold">
                        {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setGeneratedBill(null);
                        setBillAmount('');
                        setBillNote('');
                      }}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-gray-300 py-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer"
                    >
                      Cancel / Create New
                    </button>
                  </div>
                ) : isExpired ? (
                  <div className="bg-[#120d22] border border-red-500/20 p-5 rounded-3xl text-center space-y-3 shadow-xl w-full">
                    <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400">
                      <Clock size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs">QR Code Expired</h4>
                      <p className="text-[9px] text-gray-400 mt-1">The billing session has timed out.</p>
                    </div>
                    <button
                      onClick={() => {
                        setIsExpired(false);
                        setBillAmount('');
                        setBillNote('');
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-xl text-xs cursor-pointer transition-all"
                    >
                      Generate New QR
                    </button>
                  </div>
                ) : (
                  <div className="bg-[#120d22] border border-white/5 rounded-2xl p-6 text-center text-gray-500 text-xs w-full space-y-1.5">
                    <QrCode size={32} className="mx-auto text-gray-700 animate-pulse" />
                    <p>Terminal QR Bill Stand will render here.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Settling accounts & Redemption Logs */}
          {activeTab === 'bank' && (
            <div className="space-y-4 animate-fade-in max-w-sm mx-auto">
              <div className="bg-[#120d22] border border-white/5 rounded-3xl p-4 space-y-3.5 shadow-md">
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5"><Landmark size={16} className="text-[#9b51e0]" /> Settlement bank</h3>

                {error && <div className="p-2 bg-red-950/20 border border-red-500/20 text-red-400 text-[10px] rounded-xl">{error}</div>}
                {success && <div className="p-2 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-[10px] rounded-xl">{success}</div>}

                <form onSubmit={handleUpdateBank} className="space-y-3">
                  <div>
                    <label className="block text-[9px] font-bold uppercase text-gray-500 mb-1">Bank Name</label>
                    <input
                      type="text"
                      required
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. HDFC Bank"
                      className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-[#7b33d4]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold uppercase text-gray-500 mb-1">Account Number</label>
                      <input
                        type="text"
                        required
                        value={accountNo}
                        onChange={(e) => setAccountNo(e.target.value)}
                        placeholder="e.g. 501002345678"
                        className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-[#7b33d4]"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold uppercase text-gray-500 mb-1">IFSC Code</label>
                      <input
                        type="text"
                        required
                        value={ifsc}
                        onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                        placeholder="e.g. HDFC0000123"
                        className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-[#7b33d4]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <span>Update Bank Account</span>
                  </button>
                </form>
              </div>

              {/* Settlement History List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5 pl-1">
                  <History size={12} className="text-blue-400" /> Settlement Log
                </h4>
                <div className="bg-[#120d22] border border-white/5 rounded-2xl p-3 max-h-[220px] overflow-y-auto space-y-2 shadow-md">
                  {transactions.filter(txn => txn.type === 'redeem').length > 0 ? (
                    transactions
                      .filter(txn => txn.type === 'redeem')
                      .map((txn) => (
                        <div key={txn._id} className="border-b border-white/5 pb-2 last:border-b-0 last:pb-0 flex justify-between items-center text-[10px]">
                          <div>
                            <span className="font-mono text-gray-500 text-[9px]">{txn.transaction_id || txn._id.slice(-8).toUpperCase()}</span>
                            <span className="text-gray-300 block text-[9px] mt-0.5">{txn.description}</span>
                            <span className="text-gray-400 block text-[8px]">{new Date(txn.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-blue-300">₹{txn.amount.toFixed(2)}</span>
                            <span className={`block text-[8px] uppercase font-bold text-emerald-400`}>{txn.status || 'success'}</span>
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="py-4 text-center text-gray-500 text-[10px]">No settlement transfers found.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Sales Ledger History */}
          {activeTab === 'sales' && (
            <div className="space-y-3 animate-fade-in">
              <div className="bg-[#120d22] border border-white/5 rounded-3xl p-4 space-y-3.5 shadow-md">
                <div className="border-b border-white/5 pb-3 space-y-2">
                  <div>
                    <h3 className="text-xs font-bold text-white flex items-center gap-1.5 pl-1">
                      <History size={16} className="text-[#9b51e0]" /> Sales Ledger
                    </h3>
                    <p className="text-[9px] text-gray-500 mt-0.5">Filter received payments from students.</p>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-950/60 border border-white/5 rounded-xl px-2.5 py-1.5 w-full">
                    <Search size={12} className="text-gray-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Search student or item..."
                      value={salesSearch}
                      onChange={(e) => setSalesSearch(e.target.value)}
                      className="bg-transparent border-none outline-none text-[10px] text-white placeholder-gray-500 w-full"
                    />
                  </div>
                </div>

                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                  {(() => {
                    const filtered = transactions.filter((txn) => {
                      const isPay = txn.type === 'pay';
                      if (!isPay) return false;
                      if (!salesSearch) return true;
                      const searchLower = salesSearch.toLowerCase();
                      return (
                        txn.sender?.name?.toLowerCase().includes(searchLower) ||
                        txn.sender?.email?.toLowerCase().includes(searchLower) ||
                        txn.description?.toLowerCase().includes(searchLower)
                      );
                    });

                    return filtered.length > 0 ? (
                      filtered.map((txn) => (
                        <div key={txn._id} className="border border-white/5 bg-gray-950/20 rounded-2xl p-3 flex justify-between items-center hover:border-white/10 transition-colors">
                          <div className="min-w-0">
                            <h4 className="font-bold text-xs text-white truncate">{txn.sender?.name || 'Student'}</h4>
                            <span className="text-[8px] text-gray-500 font-mono block mt-0.5 truncate">{new Date(txn.createdAt).toLocaleString()} &bull; "{txn.description}"</span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-bold text-xs text-emerald-400">+ ₹{txn.amount.toFixed(2)}</span>
                            <span className="text-[8px] text-gray-500 block">success</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-6 text-center text-gray-500 text-xs">
                        {salesSearch ? 'No matching sales records found.' : 'No sales logs recorded.'}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Raise Support Ticket */}
          {activeTab === 'support' && (
            <div className="space-y-4 animate-fade-in max-w-sm mx-auto">
              {/* KYC Verification Banner */}
              {user?.kycStatus !== 'approved' && (
                <div className="p-3.5 bg-red-950/20 border border-red-500/20 rounded-2xl flex items-start gap-3">
                  <ShieldAlert className="text-red-400 mt-0.5 shrink-0" size={18} />
                  <div>
                    <h5 className="font-bold text-red-300 text-[11px] uppercase tracking-wider">KYC Verification Required</h5>
                    <p className="text-[9px] text-red-400/80 mt-1 leading-relaxed">
                      Your KYC is pending admin review. All merchant features (QR Billing, Sales, Payouts) are locked. You may only raise support tickets or view complaint history until verification is complete.
                    </p>
                  </div>
                </div>
              )}
              <div className="bg-[#120d22] border border-white/5 rounded-3xl p-4 space-y-3 shadow-md">
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5"><MessageSquare size={16} className="text-[#9b51e0]" /> File support claim</h3>

                {error && <div className="p-2 bg-red-950/20 border border-red-500/20 text-red-400 text-[10px] rounded-xl">{error}</div>}
                {success && <div className="p-2 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-[10px] rounded-xl">{success}</div>}

                <form onSubmit={handleComplaintSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[9px] font-bold uppercase text-gray-500 mb-1">Subject</label>
                    <input
                      type="text"
                      required
                      value={compTitle}
                      onChange={(e) => setCompTitle(e.target.value)}
                      placeholder="e.g. Settlement delayed"
                      className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-[#7b33d4]"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold uppercase text-gray-500 mb-1">Details</label>
                    <textarea
                      required
                      rows={3}
                      value={compDesc}
                      onChange={(e) => setCompDesc(e.target.value)}
                      placeholder="Describe your issue..."
                      className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-[#7b33d4] resize-none"
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold uppercase text-gray-500 mb-1">Attachment</label>
                    <label className="flex items-center gap-2 bg-gray-950/60 hover:bg-gray-950/80 border border-white/5 rounded-xl py-2 px-3 cursor-pointer text-xs text-gray-400 hover:text-white transition-all">
                      <Upload size={12} className="shrink-0" />
                      <span className="truncate text-[10px]">{compFileName || 'Upload image'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setCompFile(file);
                            setCompFileName(file.name);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> : <span>File Ticket</span>}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 5b: Complaint History */}
          {activeTab === 'complaint-history' && (
            <div className="space-y-3 animate-fade-in max-w-sm mx-auto">
              {/* KYC Warning Banner */}
              {user?.kycStatus !== 'approved' && (
                <div className="p-3.5 bg-red-950/20 border border-red-500/20 rounded-2xl flex items-start gap-3">
                  <ShieldAlert className="text-red-400 mt-0.5 shrink-0" size={18} />
                  <div>
                    <h5 className="font-bold text-red-300 text-[11px] uppercase tracking-wider">KYC Verification Required</h5>
                    <p className="text-[9px] text-red-400/80 mt-1 leading-relaxed">
                      All merchant features are locked until your KYC is approved. You can still view your complaint history here.
                    </p>
                  </div>
                </div>
              )}
              <div className="bg-[#120d22] border border-white/5 rounded-3xl p-4 space-y-3 shadow-md">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <History size={14} className="text-blue-400" /> Complaint History
                  </h3>
                  <span className="text-[9px] text-gray-500 font-semibold">{complaints.length} ticket{complaints.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Search bar */}
                <div className="flex items-center gap-2 bg-gray-950/60 border border-white/5 rounded-xl px-2.5 py-1.5">
                  <Search size={12} className="text-gray-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search tickets..."
                    value={complaintsSearch}
                    onChange={(e) => setComplaintsSearch(e.target.value)}
                    className="bg-transparent border-none outline-none text-[10px] text-white placeholder-gray-500 w-full"
                  />
                </div>

                {/* Ticket Stats */}
                <div className="grid grid-cols-3 gap-2">
                  {[{label:'Total', val: complaints.length, color:'text-white'}, {label:'Open', val: complaints.filter(t=>t.status==='open').length, color:'text-amber-400'}, {label:'Resolved', val: complaints.filter(t=>t.status==='resolved').length, color:'text-emerald-400'}].map(stat => (
                    <div key={stat.label} className="bg-gray-950/40 border border-white/5 rounded-xl p-2 text-center">
                      <p className={`text-base font-black ${stat.color}`}>{stat.val}</p>
                      <p className="text-[8px] text-gray-500 uppercase font-bold tracking-wide">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Ticket List */}
                <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                  {(() => {
                    const filtered = complaints.filter(c => {
                      if (!complaintsSearch) return true;
                      const q = complaintsSearch.toLowerCase();
                      return c.title?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q) || c.status?.toLowerCase().includes(q);
                    });
                    return filtered.length === 0 ? (
                      <div className="py-6 text-center text-gray-500 text-[10px]">
                        {complaintsSearch ? 'No matching tickets.' : 'No support claims raised yet.'}
                      </div>
                    ) : (
                      filtered.map((ticket) => (
                        <div key={ticket._id} className="border border-white/5 bg-gray-950/30 rounded-2xl p-3 space-y-1.5 hover:border-white/10 transition-all">
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-white text-[10px] truncate max-w-[140px]">{ticket.title}</span>
                            <span className={`px-1.5 py-0.5 rounded-full font-bold text-[7px] uppercase border ${
                              ticket.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                              ticket.status === 'in-progress' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}>{ticket.status}</span>
                          </div>
                          <p className="text-[9px] text-gray-400 italic leading-relaxed">"{ticket.description}"</p>
                          <p className="text-[8px] text-gray-600">{new Date(ticket.createdAt).toLocaleDateString()} at {new Date(ticket.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                          {ticket.status === 'resolved' && ticket.response && (
                            <div className="bg-emerald-950/10 border border-emerald-500/10 p-2 rounded-xl text-[8px] text-gray-300">
                              <span className="text-[7px] text-emerald-400 font-bold block uppercase tracking-wider mb-0.5">Admin Response</span>
                              "{ticket.response}"
                            </div>
                          )}
                        </div>
                      ))
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: Notifications Grouped Feed */}
          {activeTab === 'notifications' && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5 pl-1">
                    <Bell size={14} className="text-blue-400" /> Notifications
                  </h3>
                </div>
                {notifications.length > 0 && (
                  <button
                    onClick={markAllNotificationsRead}
                    className="text-[9px] font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-600 hover:text-white px-2.5 py-1 rounded-xl transition-all cursor-pointer"
                  >
                    Read All
                  </button>
                )}
              </div>

              <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                {notifications.length === 0 ? (
                  <div className="bg-[#120d22] border border-white/5 p-6 text-center text-gray-500 text-xs rounded-2xl">
                    No notifications.
                  </div>
                ) : (
                  Object.entries(getGroupedNotifications()).map(([groupName, groupNotifs]) => {
                    if (groupNotifs.length === 0) return null;
                    const groupTitles = {
                      today: 'Today',
                      yesterday: 'Yesterday',
                      thisWeek: 'This Week',
                      older: 'Older'
                    };
                    return (
                      <div key={groupName} className="space-y-2">
                        <h4 className="text-[9px] font-extrabold text-blue-300 uppercase tracking-wider pl-1">
                          {groupTitles[groupName]}
                        </h4>
                        <div className="bg-[#120d22] border border-white/5 rounded-2xl p-3 divide-y divide-white/5 space-y-2.5 shadow-md">
                          {groupNotifs.map((notif) => (
                            <div
                              key={notif._id}
                              onClick={() => !notif.isRead && markNotificationRead(notif._id)}
                              className={`pt-2.5 first:pt-0 flex items-start justify-between gap-3 group transition-all rounded-lg cursor-pointer ${
                                notif.isRead ? 'opacity-60' : ''
                              }`}
                            >
                              <div className="flex gap-2.5 min-w-0">
                                <div className={`p-2 rounded-xl border shrink-0 flex items-center justify-center h-8 w-8 ${
                                  notif.type === 'transaction' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                  notif.type === 'kyc' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                                  notif.type === 'complaint' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                  'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                }`}>
                                  <Bell size={12} />
                                </div>
                                <div className="min-w-0 space-y-0.5">
                                  <h5 className="font-bold text-xs text-white truncate">{notif.title}</h5>
                                  <p className="text-[10px] text-gray-400 leading-normal pr-1">{notif.message}</p>
                                  <span className="text-[8px] text-gray-500 block mt-1">
                                    {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={(e) => deleteNotification(notif._id, e)}
                                className="text-gray-500 hover:text-rose-400 p-1 transition-all cursor-pointer shrink-0"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Smartphone Bottom Navigation */}
        <nav className="mobile-bottom-nav">
          <button
            onClick={() => user?.kycStatus === 'approved' ? setActiveTab('earnings') : null}
            style={{ opacity: user?.kycStatus === 'approved' ? 1 : 0.35 }}
            title={user?.kycStatus !== 'approved' ? 'KYC verification required' : 'Earnings'}
            className={`flex flex-col items-center gap-1 cursor-pointer transition-all focus:outline-none ${
              activeTab === 'earnings' ? 'text-[#b983ff]' : 'text-gray-500'
            }`}
          >
            <TrendingUp size={16} />
            <span className="text-[8px] font-extrabold uppercase tracking-wide">Home</span>
          </button>
          
          <button
            onClick={() => user?.kycStatus === 'approved' ? setActiveTab('qr') : null}
            style={{ opacity: user?.kycStatus === 'approved' ? 1 : 0.35 }}
            title={user?.kycStatus !== 'approved' ? 'KYC verification required' : 'QR Bill'}
            className={`flex flex-col items-center gap-1 cursor-pointer transition-all focus:outline-none ${
              activeTab === 'qr' ? 'text-[#b983ff]' : 'text-gray-500'
            }`}
          >
            <QrCode size={16} />
            <span className="text-[8px] font-extrabold uppercase tracking-wide">QR Bill</span>
          </button>
          
          <button
            onClick={() => user?.kycStatus === 'approved' ? setActiveTab('sales') : null}
            style={{ opacity: user?.kycStatus === 'approved' ? 1 : 0.35 }}
            title={user?.kycStatus !== 'approved' ? 'KYC verification required' : 'Sales'}
            className={`flex flex-col items-center gap-1 cursor-pointer transition-all focus:outline-none ${
              activeTab === 'sales' ? 'text-[#b983ff]' : 'text-gray-500'
            }`}
          >
            <History size={16} />
            <span className="text-[8px] font-extrabold uppercase tracking-wide">Sales</span>
          </button>

          <button
            onClick={() => user?.kycStatus === 'approved' ? setActiveTab('bank') : null}
            style={{ opacity: user?.kycStatus === 'approved' ? 1 : 0.35 }}
            title={user?.kycStatus !== 'approved' ? 'KYC verification required' : 'Payouts'}
            className={`flex flex-col items-center gap-1 cursor-pointer transition-all focus:outline-none ${
              activeTab === 'bank' ? 'text-[#b983ff]' : 'text-gray-500'
            }`}
          >
            <Landmark size={16} />
            <span className="text-[8px] font-extrabold uppercase tracking-wide">Payouts</span>
          </button>

          <button
            onClick={() => setActiveTab('support')}
            className={`flex flex-col items-center gap-1 cursor-pointer transition-all focus:outline-none ${
              activeTab === 'support' ? 'text-[#b983ff]' : 'text-gray-500'
            }`}
          >
            <MessageSquare size={16} />
            <span className="text-[8px] font-extrabold uppercase tracking-wide">Support</span>
          </button>

          <button
            onClick={() => setActiveTab('complaint-history')}
            className={`flex flex-col items-center gap-1 cursor-pointer transition-all focus:outline-none ${
              activeTab === 'complaint-history' ? 'text-[#b983ff]' : 'text-gray-500'
            }`}
          >
            <Search size={16} />
            <span className="text-[8px] font-extrabold uppercase tracking-wide">Tickets</span>
          </button>
        </nav>
      </div>

      {/* MODAL: Edit Profile Settings */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm glass-panel border border-white/5 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                <Settings size={16} className="text-indigo-400" /> Edit Profile Settings
              </h3>
              <button onClick={() => { setShowEditModal(false); setEditError(''); setEditSuccess(''); setAvatarPreview(''); setNewAvatar(null); }} className="text-gray-500 hover:text-white text-sm font-semibold cursor-pointer">&times;</button>
            </div>

            {editError && <div className="p-2.5 bg-red-950/20 border border-red-500/20 text-red-400 text-xs rounded-xl">{editError}</div>}
            {editSuccess && <div className="p-2.5 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl">{editSuccess}</div>}

            <form onSubmit={handleEditProfileSubmit} className="space-y-4">
              {/* Profile Avatar Update */}
              <div className="flex flex-col items-center">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Change Profile Photo</label>
                <div className="relative w-20 h-20 rounded-full bg-gray-950/60 border border-white/10 overflow-hidden flex items-center justify-center cursor-pointer hover:border-indigo-500 transition-all">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : user?.profileImage ? (
                    <img src={getImageUrl(user.profileImage)} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <Upload className="text-gray-500" size={24} />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setNewAvatar(file);
                        setAvatarPreview(URL.createObjectURL(file));
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
                <span className="text-[10px] text-gray-500 mt-1">Tap circle to browse</span>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Canteen Manager"
                  className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={editLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {editLoading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorDashboard;
