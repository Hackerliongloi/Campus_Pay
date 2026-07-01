import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Landmark, ArrowDownLeft, TrendingUp, History, QrCode, FileText, CheckCircle2,
  AlertCircle, Clock, LogOut, ArrowRight, Loader2, Settings, Upload, MessageSquare, Search, Bell, Trash2
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
    return path.startsWith('http') ? path : `http://localhost:5001${path}`;
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
    setLoading(true);

    try {
      const response = await fetch('/api/vendor/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ amount: redeemAmount }),
      });

      const data = await response.json();
      if (data.success) {
        setSuccess(`Redemption request of ₹${redeemAmount} settled successfully!`);
        setRedeemAmount('');
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
    <div className="min-h-screen bg-[#0B0F19] text-gray-200">
      {/* Navbar Banner */}
      <header className="glass-panel border-b border-white/5 sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-600/20 text-emerald-400 font-bold flex items-center justify-center border border-emerald-500/20">
            {user?.name.charAt(0)}
          </div>
          <div>
            <h4 className="font-bold text-white text-sm">{user?.name}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Vendor</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Header notifications bell removed per user request */}

          <button
            onClick={() => {
              setNewName(user?.name || '');
              setShowEditModal(true);
            }}
            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/5 py-2 px-3 rounded-xl transition-all cursor-pointer"
          >
            <Settings size={14} />
            <span>Edit Profile</span>
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/5 py-2 px-3 rounded-xl transition-all cursor-pointer"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Section */}
      <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Left Sidebar tabs */}
        <div className="md:col-span-1 space-y-3">
          <button
            onClick={() => setActiveTab('earnings')}
            className={`w-full text-left py-3 px-4 rounded-xl flex items-center gap-3 font-semibold text-sm transition-all cursor-pointer ${
              activeTab === 'earnings' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <TrendingUp size={18} />
            <span>Earnings & Redeem</span>
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`w-full text-left py-3 px-4 rounded-xl flex items-center gap-3 font-semibold text-sm transition-all cursor-pointer ${
              activeTab === 'qr' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <QrCode size={18} />
            <span>Generate QR Bill</span>
          </button>
          <button
            onClick={() => setActiveTab('bank')}
            className={`w-full text-left py-3 px-4 rounded-xl flex items-center gap-3 font-semibold text-sm transition-all cursor-pointer ${
              activeTab === 'bank' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Landmark size={18} />
            <span>Settlement Bank Details</span>
          </button>
          <button
            onClick={() => setActiveTab('redemptions')}
            className={`w-full text-left py-3 px-4 rounded-xl flex items-center gap-3 font-semibold text-sm transition-all cursor-pointer ${
              activeTab === 'redemptions' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <History size={18} />
            <span>Redemption History</span>
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            className={`w-full text-left py-3 px-4 rounded-xl flex items-center gap-3 font-semibold text-sm transition-all cursor-pointer ${
              activeTab === 'sales' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <History size={18} />
            <span>Sales History</span>
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`w-full text-left py-3 px-4 rounded-xl flex items-center justify-between font-semibold text-sm transition-all cursor-pointer ${
              activeTab === 'notifications' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-3">
              <Bell size={18} />
              <span>Notifications Feed</span>
            </div>
            {notifications.filter((n) => !n.isRead).length > 0 && (
              <span className="bg-rose-500 text-white font-extrabold text-[10px] px-1.5 py-0.5 rounded-full animate-pulse">
                {notifications.filter((n) => !n.isRead).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('support')}
            className={`w-full text-left py-3 px-4 rounded-xl flex items-center gap-3 font-semibold text-sm transition-all cursor-pointer ${
              activeTab === 'support' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <MessageSquare size={18} />
            <span>File a Complaint</span>
          </button>
          <button
            onClick={() => setActiveTab('complaint-history')}
            className={`w-full text-left py-3 px-4 rounded-xl flex items-center gap-3 font-semibold text-sm transition-all cursor-pointer ${
              activeTab === 'complaint-history' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <History size={18} />
            <span>Complaint History</span>
          </button>
        </div>

        {/* Right Content Panels */}
        <div className="md:col-span-3">
          {/* TAB 1: Earnings Statistics and Withdrawal Form */}
          {activeTab === 'earnings' && (
            <div className="space-y-8 animate-fade-in">
              {/* Earnings Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cumulative Sales Volume */}
                <div className="glass-panel border border-white/5 p-6 rounded-2xl flex justify-between items-center shadow-lg">
                  <div>
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Cumulative Earnings</span>
                    <h2 className="text-3xl font-extrabold text-white mt-1">₹{totalEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h2>
                  </div>
                  <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
                    <TrendingUp size={24} />
                  </div>
                </div>

                {/* Redeemable Balance */}
                <div className="glass-panel border border-white/5 p-6 rounded-2xl flex justify-between items-center shadow-lg">
                  <div>
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Redeemable Balance</span>
                    <h2 className="text-3xl font-extrabold text-white mt-1">₹{currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h2>
                  </div>
                  <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
                    <Landmark size={24} />
                  </div>
                </div>
              </div>

              {/* Bank Withdrawal Form */}
              <div className="glass-panel border border-white/5 p-6 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5"><Landmark size={18} className="text-indigo-400" /> Settle Earnings to Bank</h3>

                {error && <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-400 text-xs rounded-xl">{error}</div>}
                {success && <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl">{success}</div>}

                <form onSubmit={handleRedeemEarnings} className="flex gap-4">
                  <div className="flex-1">
                    <input
                      type="number"
                      required
                      value={redeemAmount}
                      onChange={(e) => setRedeemAmount(e.target.value)}
                      placeholder="Enter amount to withdraw (₹)"
                      className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-3 px-4 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-6 rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer shadow-lg shadow-indigo-600/10"
                  >
                    {loading ? <Loader2 className="animate-spin" size={14} /> : <><span>Transfer to Bank</span><ArrowRight size={14} /></>}
                  </button>
                </form>
                <p className="text-[10px] text-gray-500">
                  Funds will be settled to: <strong>{stats?.bankDetails?.bankName} (A/C *{stats?.bankDetails?.accountNo.slice(-4)})</strong>
                </p>
              </div>

              {/* Transactions list */}
              <div className="space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <History size={18} className="text-indigo-400" /> Recent Sales & Settlements
                </h3>
                <div className="glass-panel rounded-2xl divide-y divide-white/5 overflow-hidden">
                  {transactions.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-sm">No transaction records found.</div>
                  ) : (
                    transactions.map((txn) => {
                      const isRedeem = txn.type === 'redeem';
                      return (
                        <div key={txn._id} className="p-4 flex items-center justify-between hover:bg-white/2 transition-colors flex-wrap sm:flex-nowrap gap-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl border ${
                              isRedeem ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            }`}>
                              {isRedeem ? <ArrowRight size={18} /> : <ArrowDownLeft size={18} />}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-white">
                                {isRedeem ? (
                                  <span>Redemption Settlement</span>
                                ) : (
                                  <span>Received from {txn.sender?.name || 'Student'}</span>
                                )}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[10px] text-gray-500">
                                <span>{new Date(txn.createdAt).toLocaleString()}</span>
                                <span>&bull;</span>
                                <span className="text-indigo-400 font-medium">"{txn.description || 'Payment'}"</span>
                                {!isRedeem && txn.sender?.email && (
                                  <>
                                    <span>&bull;</span>
                                    <span className="font-mono text-gray-400">{txn.sender.email}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                            <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full uppercase ${
                              txn.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              txn.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse' :
                              'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                              {txn.status || 'success'}
                            </span>
                            <span className={`font-bold text-sm ${isRedeem ? 'text-indigo-400' : 'text-emerald-400'}`}>
                              {isRedeem ? '-' : '+'} ₹{txn.amount.toFixed(2)}
                            </span>
                          </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
              {/* Form Input fields */}
              <div className="glass-panel border border-white/5 rounded-2xl p-6 space-y-4 h-fit">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5"><QrCode size={18} className="text-indigo-400" /> Create Payment QR Bill</h3>
                <form onSubmit={handleGenerateQrBill} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Billing Amount (₹)</label>
                    <input
                      type="number"
                      required
                      value={billAmount}
                      onChange={(e) => setBillAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-3 px-4 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Item Details / Bill Note</label>
                    <input
                      type="text"
                      value={billNote}
                      onChange={(e) => setBillNote(e.target.value)}
                      placeholder="e.g. Plate Idli + Tea"
                      className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-3 px-4 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <QrCode size={16} />
                    <span>Generate Bill QR Code</span>
                  </button>
                </form>
              </div>

              {/* QR Code display */}
              <div className="flex flex-col items-center justify-center">
                {showSuccess ? (
                  /* Success Overlay Card */
                  <div className="glass-panel border border-emerald-500/30 p-8 rounded-2xl text-center space-y-5 shadow-2xl max-w-sm w-full animate-glow-emerald bg-emerald-950/10">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 animate-bounce">
                      <CheckCircle2 size={36} />
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-bold text-white text-lg">Transaction Successful!</h3>
                      <p className="text-2xl font-extrabold text-emerald-400">₹{successTxn?.amount?.toFixed(2)}</p>
                      <p className="text-xs text-gray-400">"{successTxn?.description}"</p>
                    </div>

                    <div className="border-t border-white/5 pt-4 text-left text-xs space-y-2 text-gray-400">
                      <div className="flex justify-between">
                        <span>Paid By:</span>
                        <span className="text-white font-semibold">{successTxn?.sender?.name || 'Student'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Email:</span>
                        <span className="text-white font-mono">{successTxn?.sender?.email || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Date/Time:</span>
                        <span className="text-white">{successTxn?.createdAt ? new Date(successTxn.createdAt).toLocaleTimeString() : ''}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setShowSuccess(false);
                        setSuccessTxn(null);
                        setBillAmount('');
                        setBillNote('');
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer transition-all"
                    >
                      Generate New QR
                    </button>
                  </div>
                ) : generatedBill ? (
                  /* Active QR Code with Timer Display */
                  <div className="glass-panel border border-white/5 p-6 rounded-2xl text-center space-y-4 shadow-xl max-w-sm w-full">
                    <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 animate-pulse">
                      <span className="w-2 h-2 bg-indigo-500 rounded-full animate-ping"></span> Live QR Terminal
                    </span>
                    <div className="bg-white p-4 rounded-xl inline-block shadow-inner">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=0b0f19&data=${encodeURIComponent(
                          JSON.stringify({
                            appName: 'CAMPUS-PAY-App',
                            email: generatedBill.vendorEmail,
                            amount: generatedBill.amount,
                            item: generatedBill.description,
                          })
                        )}`}
                        alt="Bill QR Code"
                        className="w-[180px] h-[180px]"
                      />
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-bold text-white text-base">₹{generatedBill.amount.toFixed(2)}</h4>
                      <p className="text-xs text-gray-400">"{generatedBill.description}"</p>
                    </div>

                    <div className="py-1.5 px-3 bg-slate-900 border border-white/5 rounded-xl inline-flex items-center gap-1.5 text-xs mx-auto">
                      <Clock size={14} className="text-indigo-400" />
                      <span className="text-gray-400 font-medium">Expires in:</span>
                      <span className="text-white font-bold">
                        {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                      </span>
                    </div>

                    <div className="p-2.5 bg-indigo-950/20 border border-indigo-500/10 rounded-xl text-[10px] text-indigo-300">
                      Students can scan this bill by entering the vendor email: <strong>{generatedBill.vendorEmail}</strong>
                    </div>

                    <button
                      onClick={() => {
                        setGeneratedBill(null);
                        setBillAmount('');
                        setBillNote('');
                      }}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-gray-300 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Cancel / Create New QR
                    </button>
                  </div>
                ) : isExpired ? (
                  /* Expired QR Session Layout */
                  <div className="glass-panel border border-red-500/20 p-8 rounded-2xl text-center space-y-4 shadow-xl max-w-sm w-full bg-red-950/5">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400 animate-pulse">
                      <Clock size={24} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-white text-sm">QR Code Expired</h4>
                      <p className="text-xs text-gray-400">The 5 minutes billing session has expired.</p>
                    </div>
                    <button
                      onClick={() => {
                        setIsExpired(false);
                        setBillAmount('');
                        setBillNote('');
                      }}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer transition-all"
                    >
                      Generate New QR
                    </button>
                  </div>
                ) : (
                  /* Standard Default Setup */
                  <div className="glass-panel border border-white/5 rounded-2xl p-8 text-center text-gray-500 text-sm max-w-xs space-y-2">
                    <QrCode size={40} className="mx-auto text-gray-700 animate-pulse" />
                    <p>Enter the bill details and click generate to view the terminal QR code.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Settling accounts */}
          {activeTab === 'bank' && (
            <div className="max-w-xl mx-auto w-full animate-fade-in">
              {/* Register bank details form */}
              <div className="glass-panel border border-white/5 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5"><Landmark size={18} className="text-indigo-400" /> Settlement Bank Details</h3>

                {error && <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-400 text-xs rounded-xl">{error}</div>}
                {success && <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl">{success}</div>}

                <form onSubmit={handleUpdateBank} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Bank Name</label>
                    <input
                      type="text"
                      required
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. HDFC Bank"
                      className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Account Number</label>
                      <input
                        type="text"
                        required
                        value={accountNo}
                        onChange={(e) => setAccountNo(e.target.value)}
                        placeholder="e.g. 501002345678"
                        className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">IFSC Code</label>
                      <input
                        type="text"
                        required
                        value={ifsc}
                        onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                        placeholder="e.g. HDFC0000123"
                        className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Update Bank Account</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 4: Redemption History */}
          {activeTab === 'redemptions' && (
            <div className="space-y-6 animate-fade-in">
              <div className="glass-panel border border-white/5 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <History size={18} className="text-indigo-400" /> Bank Settlement Logs
                  </h3>
                  <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full font-bold">
                    Redemption Transactions
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-gray-500 font-semibold uppercase text-[10px]">
                        <th className="pb-3">Reference ID</th>
                        <th className="pb-3">Settlement Date</th>
                        <th className="pb-3">Transfer Details</th>
                        <th className="pb-3 text-right">Settled Amount</th>
                        <th className="pb-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {transactions.filter(txn => txn.type === 'redeem').length > 0 ? (
                        transactions
                          .filter(txn => txn.type === 'redeem')
                          .map((txn) => (
                            <tr key={txn._id} className="text-gray-300 hover:bg-white/5 transition-colors">
                              <td className="py-3.5 font-mono text-[10px] text-gray-500">{txn.transaction_id || txn._id.slice(-8).toUpperCase()}</td>
                              <td className="py-3.5">{new Date(txn.createdAt).toLocaleString('en-IN')}</td>
                              <td className="py-3.5 text-gray-400">{txn.description}</td>
                              <td className="py-3.5 text-right font-bold text-indigo-400">₹{txn.amount.toFixed(2)}</td>
                              <td className="py-3.5 text-center">
                                <span className={`px-2.5 py-0.5 text-[9px] font-bold rounded-full uppercase ${
                                  txn.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                  txn.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse' :
                                  'bg-red-500/10 text-red-400 border border-red-500/20'
                                }`}>
                                  {txn.status || 'success'}
                                </span>
                              </td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-500">
                            No redemption transactions logged yet. Use the 'Earnings & Redeem' panel to settle earnings.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: Sales History */}
          {activeTab === 'sales' && (
            <div className="space-y-6 animate-fade-in">
              <div className="glass-panel border border-white/5 rounded-2xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <History size={18} className="text-indigo-400" /> Sales Ledger
                    </h3>
                    <p className="text-[10px] text-gray-500 mt-0.5">Comprehensive list of student payments received by your terminal.</p>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-950/60 border border-white/5 rounded-xl px-3 py-1.5 w-full sm:w-64">
                    <Search size={14} className="text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search name, email, or item..."
                      value={salesSearch}
                      onChange={(e) => setSalesSearch(e.target.value)}
                      className="bg-transparent border-none outline-none text-xs text-white placeholder-gray-500 w-full"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-gray-500 font-semibold uppercase text-[10px]">
                        <th className="pb-3">Transaction ID</th>
                        <th className="pb-3">Date & Time</th>
                        <th className="pb-3">Student Name</th>
                        <th className="pb-3">Student Email</th>
                        <th className="pb-3">Item / Description</th>
                        <th className="pb-3 text-right">Amount</th>
                        <th className="pb-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
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
                            <tr key={txn._id} className="text-gray-300 hover:bg-white/5 transition-colors">
                              <td className="py-3.5 font-mono text-[10px] text-gray-500">{txn.transaction_id || txn._id.slice(-8).toUpperCase()}</td>
                              <td className="py-3.5">{new Date(txn.createdAt).toLocaleString('en-IN')}</td>
                              <td className="py-3.5 font-semibold text-white">{txn.sender?.name || 'Student'}</td>
                              <td className="py-3.5 font-mono text-gray-400">{txn.sender?.email || 'N/A'}</td>
                              <td className="py-3.5 italic text-gray-400">"{txn.description}"</td>
                              <td className="py-3.5 text-right font-bold text-emerald-400">₹{txn.amount.toFixed(2)}</td>
                              <td className="py-3.5 text-center">
                                <span className={`px-2.5 py-0.5 text-[9px] font-bold rounded-full uppercase ${
                                  txn.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                  'bg-red-500/10 text-red-400 border border-red-500/20'
                                }`}>
                                  {txn.status || 'success'}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="7" className="py-8 text-center text-gray-500">
                              {salesSearch ? 'No matching sales records found.' : 'No sales payments logged yet.'}
                            </td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Raise Support Ticket */}
          {activeTab === 'support' && (
            <div className="max-w-xl mx-auto animate-fade-in">
              <div className="glass-panel border border-white/5 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5"><MessageSquare size={18} className="text-indigo-400" /> Raise Support Ticket</h3>
                <p className="text-[10px] text-gray-500">File a complaint/issue (e.g. settlement delay, wrong QR billing) directly to the college administration.</p>

                {error && <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-400 text-xs rounded-xl">{error}</div>}
                {success && <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl">{success}</div>}

                <form onSubmit={handleComplaintSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Issue Subject / Title</label>
                    <input
                      type="text"
                      required
                      value={compTitle}
                      onChange={(e) => setCompTitle(e.target.value)}
                      placeholder="e.g. Bank settlement delay"
                      className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Problem Description</label>
                    <textarea
                      required
                      rows={4}
                      value={compDesc}
                      onChange={(e) => setCompDesc(e.target.value)}
                      placeholder="Explain details of the issue..."
                      className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Optional Screenshot</label>
                    <label className="flex flex-col items-center justify-center border border-dashed border-white/10 hover:border-indigo-500/50 hover:bg-gray-950/60 rounded-xl p-4 cursor-pointer transition-all">
                      <Upload className="text-gray-500 mb-1" size={20} />
                      <span className="text-[10px] text-gray-400 font-semibold">{compFileName || 'Select image'}</span>
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
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {loading ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <span>File Ticket</span>
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 7: Vendor Complaint History with Search Bar */}
          {activeTab === 'complaint-history' && (
            <div className="space-y-6 animate-fade-in">
              <div className="glass-panel border border-white/5 rounded-2xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <MessageSquare size={18} className="text-indigo-400" /> Support Tickets History
                    </h3>
                    <p className="text-[10px] text-gray-500 mt-0.5">Track and search the progress of your submitted support tickets.</p>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-950/60 border border-white/5 rounded-xl px-3 py-1.5 w-full sm:w-64">
                    <Search size={14} className="text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search tickets by title, description..."
                      value={complaintsSearch}
                      onChange={(e) => setComplaintsSearch(e.target.value)}
                      className="bg-transparent border-none outline-none text-xs text-white placeholder-gray-500 w-full"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  {(() => {
                    const filtered = complaints.filter((ticket) => {
                      if (!complaintsSearch) return true;
                      const query = complaintsSearch.toLowerCase();
                      return (
                        ticket.title?.toLowerCase().includes(query) ||
                        ticket.description?.toLowerCase().includes(query) ||
                        ticket.status?.toLowerCase().includes(query)
                      );
                    });

                    return filtered.length > 0 ? (
                      filtered.map((ticket) => (
                        <div key={ticket._id} className="p-4 bg-gray-950/40 border border-white/5 rounded-xl space-y-3 hover:border-white/10 transition-colors">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-sm text-white">{ticket.title}</h4>
                              <p className="text-[10px] text-gray-500 mt-0.5">Submitted on: {new Date(ticket.createdAt).toLocaleString('en-IN')}</p>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase border ${
                              ticket.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                              ticket.status === 'in-progress' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}>
                              {ticket.status}
                            </span>
                          </div>

                          <p className="text-xs text-gray-400">"{ticket.description}"</p>

                          {ticket.screenshot && (
                            <a href={getImageUrl(ticket.screenshot)} target="_blank" rel="noreferrer" className="inline-block text-[10px] text-indigo-400 hover:underline">
                              View uploaded screenshot attachment
                            </a>
                          )}

                          {ticket.status === 'resolved' && ticket.response && (
                            <div className="bg-emerald-950/20 border border-emerald-500/10 p-3 rounded-xl space-y-1 text-[11px] mt-2">
                              <div className="flex justify-between items-center text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-1">
                                <span>College Resolution Response</span>
                                {ticket.resolvedBy && (
                                  <span>Resolved by: {ticket.resolvedBy.name} ({ticket.resolvedBy.role === 'admin' ? 'Super Admin' : 'Sub Admin'})</span>
                                )}
                              </div>
                              <p className="text-gray-300 italic">"{ticket.response}"</p>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-gray-500 text-sm">
                        {complaintsSearch ? 'No matching support tickets found.' : 'No support tickets raised yet.'}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: Notifications Grouped Feed */}
          {activeTab === 'notifications' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Bell size={20} className="text-indigo-400" /> Notifications Feed
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">Keep track of payments received and redemption settlement status updates.</p>
                </div>
                {notifications.length > 0 && (
                  <button
                    onClick={markAllNotificationsRead}
                    className="text-xs font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-600 hover:text-white px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/5"
                  >
                    Mark All as Read
                  </button>
                )}
              </div>

              <div className="space-y-6">
                {notifications.length === 0 ? (
                  <div className="glass-panel border border-white/5 p-8 text-center text-gray-500 text-sm rounded-2xl shadow-xl">
                    No notifications yet.
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
                      <div key={groupName} className="space-y-3">
                        <h4 className="text-xs font-extrabold text-indigo-300 uppercase tracking-wider pl-1">
                          {groupTitles[groupName]}
                        </h4>
                        <div className="glass-panel border border-white/5 rounded-2xl p-4 divide-y divide-white/5 space-y-3 shadow-xl">
                          {groupNotifs.map((notif) => (
                            <div
                              key={notif._id}
                              onClick={() => !notif.isRead && markNotificationRead(notif._id)}
                              className={`pt-3 first:pt-0 flex items-start justify-between gap-4 group transition-all rounded-lg cursor-pointer ${
                                notif.isRead ? 'opacity-65' : ''
                              }`}
                            >
                              <div className="flex gap-3">
                                <div className={`p-2.5 rounded-xl border shrink-0 flex items-center justify-center ${
                                  notif.type === 'transaction' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                  notif.type === 'kyc' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' :
                                  notif.type === 'complaint' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                  'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                }`}>
                                  <Bell size={16} />
                                </div>
                                <div className="space-y-1">
                                  <h5 className="font-bold text-sm text-white">{notif.title}</h5>
                                  <p className="text-xs text-gray-400 leading-relaxed pr-3">{notif.message}</p>
                                  <span className="text-[10px] text-gray-500 block mt-1.5">
                                    {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; {new Date(notif.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={(e) => deleteNotification(notif._id, e)}
                                className="text-gray-500 hover:text-rose-400 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                              >
                                <Trash2 size={14} />
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
      </main>

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
