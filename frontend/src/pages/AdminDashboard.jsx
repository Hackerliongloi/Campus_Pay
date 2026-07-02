import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Users, Landmark, MessageSquare, ShieldAlert, TrendingUp, Settings,
  LogOut, Shield, ShieldCheck, XCircle, Ban, Check, Eye, UserPlus, HelpCircle, Upload, Search, History, Bell, Trash2, PlusCircle, Megaphone,
  Coins
} from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Register ChartJS modules
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const AdminDashboard = () => {
  const { user, logout, updateProfile } = useAuth();

  // Edit Profile States
  const [showEditModal, setShowEditModal] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');
  const [newAvatar, setNewAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  // Navigation Panel
  const [activePanel, setActivePanel] = useState(user?.role === 'subadmin' ? 'users' : 'analytics'); // 'analytics', 'users', 'kyc', 'complaints', 'subadmins', 'transactions'

  // Data States
  const [analytics, setAnalytics] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [complaintsList, setComplaintsList] = useState([]);
  const [redeemRequests, setRedeemRequests] = useState([]);

  // Transaction Logs States
  const [transactionsList, setTransactionsList] = useState([]);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [transactionsTotalPages, setTransactionsTotalPages] = useState(1);
  const [transactionsSearch, setTransactionsSearch] = useState('');
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  // Notification States
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Broadcast Alert Form States
  const [broadcastGroup, setBroadcastGroup] = useState('all');
  const [broadcastEmail, setBroadcastEmail] = useState('');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastType, setBroadcastType] = useState('system');
  const [broadcastLoading, setBroadcastLoading] = useState(false);

  const fetchNotifications = async () => {
    if (user?.role === 'admin') {
      setNotifications([]);
      return;
    }
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

  // Filter States
  const [roleFilter, setRoleFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [complaintsSearch, setComplaintsSearch] = useState('');
  const [complaintRoleFilter, setComplaintRoleFilter] = useState('');

  // Modals / Input Fields
  const [showMpinModal, setShowMpinModal] = useState(false);
  const [targetUser, setTargetUser] = useState(null);
  const [newMpin, setNewMpin] = useState('');



  // Inspect Modal & Institute Funds state
  const [inspectUser, setInspectUser] = useState(null);
  const [showInspectModal, setShowInspectModal] = useState(false);
  const [instituteFundsHistory, setInstituteFundsHistory] = useState([]);
  const [instituteFundsLoading, setInstituteFundsLoading] = useState(false);
  const [addFundsAmount, setAddFundsAmount] = useState('');
  const [addFundsDescription, setAddFundsDescription] = useState('');
  const [instituteFundsSearch, setInstituteFundsSearch] = useState('');

  // Notifications Log state
  const [notificationsLog, setNotificationsLog] = useState([]);
  const [notificationsLogSearch, setNotificationsLogSearch] = useState('');
  const [notificationsLogLoading, setNotificationsLogLoading] = useState(false);

  const [showSubadminModal, setShowSubadminModal] = useState(false);
  const [subName, setSubName] = useState('');
  const [subEmail, setSubEmail] = useState('');
  const [subPassword, setSubPassword] = useState('');

  const [showResolveModal, setShowResolveModal] = useState(false);
  const [targetComplaint, setTargetComplaint] = useState(null);
  const [resolutionText, setResolutionText] = useState('');

  // Action status indicators
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Path helper to resolve local uploads or Cloudinary URLs
  const getImageUrl = (path) => {
    if (!path) return '';
    return path.startsWith('http') ? path : `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}${path}`;
  };

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

  // Load database entities
  useEffect(() => {
    fetchAnalytics();
    fetchComplaints();
    fetchRedeemRequests();
  }, [activePanel]);

  // Fetch users when activePanel or roleFilter changes
  useEffect(() => {
    fetchUsers();
    if (activePanel === 'institute-funds') {
      fetchInstituteFundsHistory();
    }
    if (activePanel === 'notifications-log') {
      fetchNotificationsLog();
    }
  }, [activePanel, roleFilter]);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/admin/analytics', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (data.success) {
        setAnalytics(data.analytics);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      let url = `/api/admin/users`;
      const params = [];
      const activeRoleFilter = activePanel === 'subadmins'
        ? 'subadmin'
        : (activePanel === 'kyc' ? '' : (user?.role === 'subadmin' ? 'student' : roleFilter));
      if (activeRoleFilter) params.push(`role=${activeRoleFilter}`);
      if (searchQuery) params.push(`search=${searchQuery}`);
      if (params.length) url += `?${params.join('&')}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (data.success) {
        setUsersList(data.users);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchComplaints = async () => {
    try {
      const res = await fetch('/api/admin/complaints', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (data.success) {
        setComplaintsList(data.complaints);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRedeemRequests = async () => {
    try {
      const res = await fetch('/api/admin/redeem-requests', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (data.success) {
        setRedeemRequests(data.requests);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchInstituteFundsHistory = async () => {
    try {
      setInstituteFundsLoading(true);
      let url = '/api/admin/institute-funds/history';
      if (instituteFundsSearch) {
        url += `?search=${encodeURIComponent(instituteFundsSearch)}`;
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (data.success) {
        setInstituteFundsHistory(data.history);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setInstituteFundsLoading(false);
    }
  };

  const handleAddInstituteFundsSubmit = async (e) => {
    e.preventDefault();
    if (!addFundsAmount) return;
    setError('');
    setSuccess('');
    setInstituteFundsLoading(true);

    try {
      const res = await fetch('/api/admin/add-institute-funds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          amount: addFundsAmount,
          description: addFundsDescription,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(`Successfully loaded ₹${parseFloat(addFundsAmount).toFixed(2)} to central Institute Balance!`);
        setAddFundsAmount('');
        setAddFundsDescription('');
        fetchAnalytics(); // Refresh analytics card balance
        fetchInstituteFundsHistory(); // Refresh history log
        setTimeout(() => setSuccess(''), 2500);
      } else {
        setError(data.error || 'Failed to add institute funds');
      }
    } catch (err) {
      setError('Network communication failed');
    } finally {
      setInstituteFundsLoading(false);
    }
  };

  const fetchNotificationsLog = async () => {
    try {
      setNotificationsLogLoading(true);
      let url = `/api/admin/notifications`;
      if (notificationsLogSearch) {
        url += `?search=${encodeURIComponent(notificationsLogSearch)}`;
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (data.success) {
        setNotificationsLog(data.notifications || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setNotificationsLogLoading(false);
    }
  };

  const fetchTransactions = async () => {
    setTransactionsLoading(true);
    try {
      const searchParam = transactionsSearch ? `&search=${encodeURIComponent(transactionsSearch)}` : '';
      const res = await fetch(`/api/wallet/history?page=${transactionsPage}&limit=10${searchParam}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (data.success) {
        setTransactionsList(data.transactions || []);
        setTransactionsTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTransactionsLoading(false);
    }
  };

  useEffect(() => {
    if (activePanel === 'transactions') {
      fetchTransactions();
    }
  }, [activePanel, transactionsPage, transactionsSearch]);

  const handleRedeemRequest = async (transactionId, action) => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/redeem-approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ transactionId, action }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(data.message);
        fetchRedeemRequests();
        fetchAnalytics();
        setTimeout(() => setSuccess(''), 2000);
      } else {
        setError(data.error || 'Failed to process redeem request');
      }
    } catch (err) {
      setError('Network communication failed');
    } finally {
      setLoading(false);
    }
  };

  // Change Account Status (Freeze/Suspend/Activate)
  const handleStatusChange = async (userId, status) => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/users/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ userId, status }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(data.message);
        fetchUsers();
        setTimeout(() => setSuccess(''), 2000);
      } else {
        setError(data.error || 'Failed to modify account status');
      }
    } catch (err) {
      setError('Connection failure updating status');
    }
  };

  // Submit MPIN Reset
  const handleResetMpinSubmit = async (e) => {
    e.preventDefault();
    if (!targetUser || !newMpin || newMpin.length !== 4) return;
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/users/reset-mpin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ userId: targetUser._id, newMpin }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`MPIN reset successfully for ${targetUser.name}`);
        setNewMpin('');
        setShowMpinModal(false);
        setTargetUser(null);
        setTimeout(() => setSuccess(''), 2000);
      } else {
        setError(data.error || 'Failed to reset MPIN');
      }
    } catch (err) {
      setError('Network communication failed');
    } finally {
      setLoading(false);
    }
  };



  const handleRemoveSubadmin = async (subadminId) => {
    if (!window.confirm('Are you sure you want to permanently delete this sub-admin account?')) return;
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/admin/subadmins/${subadminId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(data.message);
        setUsersList((prev) => prev.filter((u) => u._id !== subadminId));
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to remove sub-admin');
      }
    } catch (err) {
      setError('Network communication failed');
    }
  };

  const handleBroadcastSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setBroadcastLoading(true);
    try {
      const res = await fetch('/api/admin/broadcast-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          targetGroup: broadcastGroup,
          targetEmail: broadcastEmail,
          title: broadcastTitle,
          message: broadcastMessage,
          type: broadcastType,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(data.message);
        setBroadcastTitle('');
        setBroadcastMessage('');
        setBroadcastEmail('');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to broadcast notification');
      }
    } catch (err) {
      setError('Network communication failed');
    } finally {
      setBroadcastLoading(false);
    }
  };

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

  // Approve / Reject Vendor KYC
  const handleKycApproval = async (vendorId, action) => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/kyc-approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ vendorId, action }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(data.message);
        fetchUsers();
        setTimeout(() => setSuccess(''), 2000);
      } else {
        setError(data.error || 'Failed to process KYC response');
      }
    } catch (err) {
      setError('Connection failure processing request');
    }
  };

  // Resolve Student Complaint Ticket
  const handleResolveComplaintSubmit = async (e) => {
    e.preventDefault();
    if (!targetComplaint || !resolutionText) return;
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/complaints/${targetComplaint._id}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ response: resolutionText }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Complaint resolved successfully!');
        setResolutionText('');
        setShowResolveModal(false);
        setTargetComplaint(null);
        fetchComplaints();
        setTimeout(() => setSuccess(''), 2000);
      } else {
        setError(data.error || 'Failed to resolve ticket');
      }
    } catch (err) {
      setError('Server request failed');
    } finally {
      setLoading(false);
    }
  };

  // Create Sub-Admin
  const handleCreateSubadmin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/subadmins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ name: subName, email: subEmail, password: subPassword }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess('Sub-admin account created successfully!');
        setSubName(''); setSubEmail(''); setSubPassword('');
        setShowSubadminModal(false);
        fetchUsers();
        setTimeout(() => setSuccess(''), 2000);
      } else {
        setError(data.error || 'Failed to create subadmin');
      }
    } catch (err) {
      setError('Network communication failed');
    } finally {
      setLoading(false);
    }
  };

  // Render Charts Data
  const getChartData = () => {
    const defaultLabels = ['pay', 'send', 'add', 'redeem'];
    const distribution = analytics?.financials?.distribution || [];
    const values = defaultLabels.map((type) => {
      const match = distribution.find((d) => d._id === type);
      return match ? match.volume : 0;
    });

    return {
      labels: ['Payments (Vendors)', 'Transfers (Friends)', 'Deposits (Loads)', 'Redemptions (Banks)'],
      datasets: [
        {
          label: 'Transaction Volume (₹)',
          data: values,
          backgroundColor: 'rgba(99, 102, 241, 0.65)',
          borderColor: '#6366F1',
          borderWidth: 1.5,
          borderRadius: 8,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#9CA3AF', font: { family: 'Inter', size: 10 } },
      },
      x: {
        grid: { display: false },
        ticks: { color: '#9CA3AF', font: { family: 'Inter', size: 10 } },
      },
    },
  };

  // Filter lists helper
  const pendingKycUsers = usersList.filter((u) => (u.role === 'student' || u.role === 'vendor') && u.kycStatus === 'pending');

  return (
    <div className="min-h-screen bg-[#0B0F19] text-gray-200">
      {/* Top Navigation */}
      <header className="glass-panel border-b border-white/5 sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {user?.profileImage ? (
            <img src={getImageUrl(user.profileImage)} alt="Profile" className="w-10 h-10 rounded-full object-cover border border-indigo-500/30" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-indigo-600/20 text-indigo-400 font-bold flex items-center justify-center border border-indigo-500/20 animate-glow">
              {user?.name?.charAt(0) || 'A'}
            </div>
          )}
          <div>
            <h4 className="font-bold text-white text-sm">{user?.name || 'System Administration'}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] uppercase font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                {user?.role === 'admin' ? 'Super Admin' : 'Sub Admin'}
              </span>
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

      {/* Main View Area */}
      <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Left Side Navigation Panel */}
        <div className="md:col-span-1 space-y-3">
          {user?.role !== 'subadmin' && (
            <button
              onClick={() => setActivePanel('analytics')}
              className={`w-full text-left py-3 px-4 rounded-xl flex items-center gap-3 font-semibold text-sm transition-all cursor-pointer border ${
                activePanel === 'analytics'
                  ? 'bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white shadow-lg shadow-[#1d4ed8]/20 border-white/10'
                  : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'
              }`}
            >
              <TrendingUp size={18} />
              <span>Dashboard Analytics</span>
            </button>
          )}
          <button
            onClick={() => setActivePanel('users')}
            className={`w-full text-left py-3 px-4 rounded-xl flex items-center gap-3 font-semibold text-sm transition-all cursor-pointer border ${
              activePanel === 'users'
                ? 'bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white shadow-lg shadow-[#1d4ed8]/20 border-white/10'
                : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'
            }`}
          >
            <Users size={18} />
            <span>{user?.role === 'subadmin' ? 'Student Directory' : 'Students & Vendors'}</span>
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => setActivePanel('institute-funds')}
              className={`w-full text-left py-3 px-4 rounded-xl flex items-center gap-3 font-semibold text-sm transition-all cursor-pointer border ${
                activePanel === 'institute-funds'
                  ? 'bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white shadow-lg shadow-[#1d4ed8]/20 border-white/10'
                  : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'
              }`}
            >
              <Coins size={18} />
              <span>Institute Funds</span>
            </button>
          )}
          <button
            onClick={() => {
              setTransactionsPage(1);
              setActivePanel('transactions');
            }}
            className={`w-full text-left py-3 px-4 rounded-xl flex items-center gap-3 font-semibold text-sm transition-all cursor-pointer border ${
              activePanel === 'transactions'
                ? 'bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white shadow-lg shadow-[#1d4ed8]/20 border-white/10'
                : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'
            }`}
          >
            <History size={18} />
            <span>Transaction Logs</span>
          </button>
          <button
            onClick={() => setActivePanel('kyc')}
            className={`w-full text-left py-3 px-4 rounded-xl flex items-center justify-between font-semibold text-sm transition-all cursor-pointer border ${
              activePanel === 'kyc'
                ? 'bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white shadow-lg shadow-[#1d4ed8]/20 border-white/10'
                : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-3">
              <Landmark size={18} />
              <span>KYC Approvals</span>
            </div>
            {pendingKycUsers.length > 0 && (
              <span className="bg-amber-500 text-slate-950 font-extrabold text-[10px] px-1.5 py-0.5 rounded-full">
                {pendingKycUsers.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActivePanel('complaints')}
            className={`w-full text-left py-3 px-4 rounded-xl flex items-center justify-between font-semibold text-sm transition-all cursor-pointer border ${
              activePanel === 'complaints'
                ? 'bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white shadow-lg shadow-[#1d4ed8]/20 border-white/10'
                : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-3">
              <MessageSquare size={18} />
              <span>Complaints Desk</span>
            </div>
            {complaintsList.filter((c) => c.status === 'open').length > 0 && (
              <span className="bg-indigo-500 text-white font-extrabold text-[10px] px-1.5 py-0.5 rounded-full">
                {complaintsList.filter((c) => c.status === 'open').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActivePanel('complaints-history')}
            className={`w-full text-left py-3 px-4 rounded-xl flex items-center justify-between font-semibold text-sm transition-all cursor-pointer border ${
              activePanel === 'complaints-history'
                ? 'bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white shadow-lg shadow-[#1d4ed8]/20 border-white/10'
                : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-3">
              <History size={18} />
              <span>Complaint History</span>
            </div>
            {complaintsList.filter((c) => c.status === 'resolved').length > 0 && (
              <span className="bg-indigo-500/10 text-indigo-400 font-extrabold text-[10px] px-1.5 py-0.5 rounded-full border border-indigo-500/20">
                {complaintsList.filter((c) => c.status === 'resolved').length}
              </span>
            )}
          </button>

          {user?.role !== 'subadmin' && (
            <button
              onClick={() => setActivePanel('redemptions')}
              className={`w-full text-left py-3 px-4 rounded-xl flex items-center justify-between font-semibold text-sm transition-all cursor-pointer border ${
                activePanel === 'redemptions'
                  ? 'bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white shadow-lg shadow-[#1d4ed8]/20 border-white/10'
                  : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <Landmark size={18} />
                <span>Redeem Requests</span>
              </div>
              {redeemRequests.length > 0 && (
                <span className="bg-amber-500 text-slate-950 font-extrabold text-[10px] px-1.5 py-0.5 rounded-full">
                  {redeemRequests.length}
                </span>
              )}
            </button>
          )}

          {user?.role === 'admin' && (
            <button
              onClick={() => setActivePanel('broadcast-hub')}
              className={`w-full text-left py-3 px-4 rounded-xl flex items-center gap-3 font-semibold text-sm transition-all cursor-pointer border ${
                activePanel === 'broadcast-hub'
                  ? 'bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white shadow-lg shadow-[#1d4ed8]/20 border-white/10'
                  : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'
              }`}
            >
              <Megaphone size={18} />
              <span>Broadcast Alerts</span>
            </button>
          )}

          {user?.role === 'subadmin' && (
            <button
              onClick={() => setActivePanel('notifications-hub')}
              className={`w-full text-left py-3 px-4 rounded-xl flex items-center justify-between font-semibold text-sm transition-all cursor-pointer border ${
                activePanel === 'notifications-hub'
                  ? 'bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white shadow-lg shadow-[#1d4ed8]/20 border-white/10'
                  : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'
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
          )}

          {/* Subadmin panel display restricted to main admin */}
          {user?.role === 'admin' && (
            <button
              onClick={() => setActivePanel('subadmins')}
              className={`w-full text-left py-3 px-4 rounded-xl flex items-center gap-3 font-semibold text-sm transition-all cursor-pointer border ${
                activePanel === 'subadmins'
                  ? 'bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white shadow-lg shadow-[#1d4ed8]/20 border-white/10'
                  : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'
              }`}
            >
              <Settings size={18} />
              <span>Manage Sub-Admins</span>
            </button>
          )}
          {user?.role === 'admin' && (
            <button
              onClick={() => setActivePanel('notifications-log')}
              className={`w-full text-left py-3 px-4 rounded-xl flex items-center justify-between font-semibold text-sm transition-all cursor-pointer border ${
                activePanel === 'notifications-log'
                  ? 'bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white shadow-lg shadow-[#1d4ed8]/20 border-white/10'
                  : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <Bell size={18} />
                <span>Notification Logs</span>
              </div>
            </button>
          )}
        </div>

        {/* Right Dashboard panel */}
        <div className="md:col-span-3">
          {/* Notification status banner */}
          {error && <div className="mb-4 p-3 bg-red-950/20 border border-red-500/20 text-red-400 text-xs rounded-xl">{error}</div>}
          {success && <div className="mb-4 p-3 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl">{success}</div>}

          {/* PANEL 1: Analytics & Metrics */}
          {activePanel === 'analytics' && user?.role !== 'subadmin' && (
            <div className="space-y-8 animate-fade-in">
              {/* Summary Stats count */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="glass-panel border border-white/5 p-4 rounded-2xl">
                  <span className="text-[10px] text-gray-500 font-bold uppercase">Students Enrolled</span>
                  <h3 className="text-2xl font-extrabold text-white mt-1">{analytics?.users?.students || 0}</h3>
                </div>
                {user?.role !== 'subadmin' && (
                  <div className="glass-panel border border-white/5 p-4 rounded-2xl">
                    <span className="text-[10px] text-gray-500 font-bold uppercase">Verified Vendors</span>
                    <h3 className="text-2xl font-extrabold text-white mt-1">{analytics?.users?.vendors || 0}</h3>
                  </div>
                )}
                <div className="glass-panel border border-white/5 p-4 rounded-2xl">
                  <span className="text-[10px] text-gray-500 font-bold uppercase">Institute Balance</span>
                  <h3 className="text-2xl font-extrabold text-emerald-400 mt-1">₹{analytics?.instituteBalance || 0}</h3>
                </div>
                <div className="glass-panel border border-white/5 p-4 rounded-2xl">
                  <span className="text-[10px] text-gray-500 font-bold uppercase">Transaction Volume</span>
                  <h3 className="text-2xl font-extrabold text-indigo-400 mt-1">₹{analytics?.financials?.totalVolume || 0}</h3>
                </div>
                <div className="glass-panel border border-white/5 p-4 rounded-2xl">
                  <span className="text-[10px] text-gray-500 font-bold uppercase">Pending Tickets</span>
                  <h3 className="text-2xl font-extrabold text-amber-400 mt-1">{analytics?.pendingTasks?.complaints || 0}</h3>
                </div>
              </div>

              {/* Volume Breakdown chart removed per user request */}

              {/* Recent System Transaction Logs */}
              <div className="space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">Recent transactions log</h3>
                <div className="glass-panel rounded-2xl divide-y divide-white/5 overflow-hidden">
                  {analytics?.recentTransactions?.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-xs">No records found.</div>
                  ) : (
                    analytics?.recentTransactions?.map((txn) => (
                      <div key={txn._id} className="p-4 flex items-center justify-between text-xs hover:bg-white/2 transition-colors">
                        <div className="space-y-1">
                          <p className="font-semibold text-white">
                            {txn.sender ? txn.sender.name : 'Load'} &rarr; {txn.receiver ? txn.receiver.name : 'Bank'}
                          </p>
                          <p className="text-[10px] text-gray-500">Type: {txn.type.toUpperCase()} &bull; Date: {new Date(txn.createdAt).toLocaleDateString()}</p>
                        </div>
                        <span className="font-extrabold text-white">₹{txn.amount}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PANEL 2: User directory management */}
          {activePanel === 'users' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-950/60 p-4 border border-white/5 rounded-2xl">
                <div className="flex gap-2">
                  {user?.role !== 'subadmin' ? (
                    <>
                      <button
                        onClick={() => { setRoleFilter(''); }}
                        className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          roleFilter === '' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        All Accounts
                      </button>
                      <button
                        onClick={() => { setRoleFilter('student'); }}
                        className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          roleFilter === 'student' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Students
                      </button>
                      <button
                        onClick={() => { setRoleFilter('vendor'); }}
                        className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          roleFilter === 'vendor' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Vendors
                      </button>
                    </>
                  ) : (
                    <span className="text-xs bg-indigo-500/10 text-indigo-400 px-3 py-1.5 border border-indigo-500/20 rounded-xl font-bold">
                      Student Accounts Directory
                    </span>
                  )}
                </div>

                <div className="w-full sm:w-auto flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name / email..."
                    className="bg-gray-900 border border-white/5 rounded-xl py-1.5 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 w-full"
                  />
                  <button onClick={fetchUsers} className="bg-slate-800 hover:bg-slate-700 py-1.5 px-3 rounded-xl text-xs font-semibold cursor-pointer">Filter</button>
                </div>
              </div>

              {/* Users Directory Table */}
              <div className="glass-panel border border-white/5 rounded-2xl overflow-x-auto shadow-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-950/40 border-b border-white/5 text-gray-400 uppercase tracking-wider">
                      <th className="p-4 font-bold">User Name</th>
                      <th className="p-4 font-bold">Email / Role</th>
                      <th className="p-4 font-bold">Balance</th>
                      <th className="p-4 font-bold">Status</th>
                      <th className="p-4 font-bold text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {usersList.filter(usr => {
                      const isOwn = usr._id === user?.id;
                      const isAdmin = usr.role === 'admin' || usr.role === 'subadmin';
                      const isRoleMatch = !roleFilter || usr.role === roleFilter;
                      if (user?.role === 'subadmin') {
                        return !isOwn && !isAdmin && usr.role === 'student';
                      }
                      return !isOwn && !isAdmin && isRoleMatch;
                    }).length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-gray-500">No matching user accounts.</td>
                      </tr>
                    ) : (
                      usersList
                        .filter(usr => {
                          const isOwn = usr._id === user?.id;
                          const isAdmin = usr.role === 'admin' || usr.role === 'subadmin';
                          const isRoleMatch = !roleFilter || usr.role === roleFilter;
                          if (user?.role === 'subadmin') {
                            return !isOwn && !isAdmin && usr.role === 'student';
                          }
                          return !isOwn && !isAdmin && isRoleMatch;
                        })
                        .map((usr) => (
                        <tr key={usr._id} className="hover:bg-white/2">
                          <td className="p-4 font-semibold text-white">{usr.name}</td>
                          <td className="p-4 space-y-0.5">
                            <div>{usr.email}</div>
                            <div className={`text-[10px] uppercase font-bold ${
                              usr.role === 'student' ? 'text-indigo-400' : 'text-emerald-400'
                            }`}>{usr.role}</div>
                          </td>
                          <td className="p-4 font-bold">
                            <span className="text-[9px] text-gray-500 font-normal block uppercase tracking-wider">
                              {usr.role === 'student' ? 'Wallet' : 'Earnings'}
                            </span>
                            ₹{usr.role === 'student' ? (usr.walletBalance || 0) : (usr.totalEarnings || 0)}
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                              usr.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' :
                              usr.status === 'suspended' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
                            }`}>
                              {usr.status}
                            </span>
                          </td>
                          <td className="p-4 flex gap-2 justify-center items-center">
                            {/* Inspect Details */}
                            <button
                              onClick={() => { setInspectUser(usr); setShowInspectModal(true); }}
                              title="Inspect Profile"
                              className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white rounded-lg transition-colors cursor-pointer"
                            >
                              <Eye size={14} />
                            </button>

                            {/* Freeze / Suspend actions */}
                            {usr.status === 'active' ? (
                              <>
                                <button
                                  onClick={() => handleStatusChange(usr._id, 'suspended')}
                                  title="Suspend Login"
                                  className="p-1.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors cursor-pointer"
                                >
                                  <Ban size={14} />
                                </button>
                                <button
                                  onClick={() => handleStatusChange(usr._id, 'frozen')}
                                  title="Freeze Wallet"
                                  className="p-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-white rounded-lg transition-colors cursor-pointer animate-glow"
                                >
                                  <ShieldAlert size={14} />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleStatusChange(usr._id, 'active')}
                                title="Reactivate Account"
                                className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg transition-colors cursor-pointer"
                              >
                                <ShieldCheck size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PANEL 2.5: Institute Funds Management */}
          {activePanel === 'institute-funds' && user?.role === 'admin' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                    <Coins size={18} className="text-emerald-400 animate-pulse" /> Institute Treasury
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-0.5">Manage and allocate centralized funds for the entire campus.</p>
                </div>
              </div>

              {/* Grid: Balance Card & Load Funds Form */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Balance Card */}
                <div className="md:col-span-1 glass-panel border border-white/5 p-6 rounded-2xl flex flex-col justify-between space-y-4">
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Current Institute Balance</span>
                    <h2 className="text-3xl font-extrabold text-white mt-1">₹{analytics?.instituteBalance?.toFixed(2) || '0.00'}</h2>
                  </div>
                  <div className="text-[10px] text-gray-400 leading-relaxed bg-white/2 p-3 rounded-xl border border-white/5">
                    Students do not maintain individual balances. When they make purchases, funds are deducted directly from this central balance.
                  </div>
                </div>

                {/* Load Funds Form */}
                <div className="md:col-span-2 glass-panel border border-white/5 p-6 rounded-2xl">
                  <h4 className="font-bold text-sm text-white mb-3">Load Institute Funds</h4>
                  <form onSubmit={handleAddInstituteFundsSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Amount to Add (₹)</label>
                        <input
                          type="number"
                          required
                          value={addFundsAmount}
                          onChange={(e) => setAddFundsAmount(e.target.value)}
                          placeholder="e.g. 100000"
                          className="w-full bg-gray-950 border border-white/5 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Fund Description / Reference</label>
                        <input
                          type="text"
                          required
                          value={addFundsDescription}
                          onChange={(e) => setAddFundsDescription(e.target.value)}
                          placeholder="e.g. FY26 Grant Allocation"
                          className="w-full bg-gray-950 border border-white/5 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={instituteFundsLoading}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                    >
                      <PlusCircle size={14} /> {instituteFundsLoading ? 'Loading...' : 'Add Treasury Funds'}
                    </button>
                  </form>
                </div>
              </div>

              {/* History Table */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h4 className="font-bold text-sm text-white">Institute Funds Add History</h4>
                  <div className="flex items-center gap-2 bg-gray-950/60 border border-white/5 rounded-xl px-3 py-1.5 w-full sm:w-80">
                    <Search size={14} className="text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by desc, admin, ID, or date (e.g. 01/07/2026)..."
                      value={instituteFundsSearch}
                      onChange={(e) => setInstituteFundsSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') fetchInstituteFundsHistory();
                      }}
                      className="bg-transparent border-none outline-none text-xs text-white placeholder-gray-500 w-full"
                    />
                    <button
                      onClick={fetchInstituteFundsHistory}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-1 px-3 rounded-lg text-[10px] cursor-pointer"
                    >
                      Filter
                    </button>
                  </div>
                </div>
                <div className="glass-panel border border-white/5 rounded-2xl overflow-x-auto shadow-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-950/40 border-b border-white/5 text-gray-400 uppercase tracking-wider font-bold">
                        <th className="p-4">Date</th>
                        <th className="p-4">Transaction ID</th>
                        <th className="p-4">Added By (Admin)</th>
                        <th className="p-4">Description</th>
                        <th className="p-4 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-gray-300">
                      {instituteFundsLoading && instituteFundsHistory.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="p-8 text-center text-gray-500">Loading history logs...</td>
                        </tr>
                      ) : instituteFundsHistory.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="p-8 text-center text-gray-500">No load records found.</td>
                        </tr>
                      ) : (
                        instituteFundsHistory.map((log) => {
                          const dateStr = new Date(log.createdAt).toLocaleString('en-IN');
                          return (
                            <tr key={log._id} className="hover:bg-white/2">
                              <td className="p-4 whitespace-nowrap">{dateStr}</td>
                              <td className="p-4 font-mono text-[10px] text-indigo-400">{log.transaction_id}</td>
                              <td className="p-4">
                                <div className="font-semibold text-white">{log.sender?.name || 'System'}</div>
                                <div className="text-[10px] text-gray-500">{log.sender?.email || '-'}</div>
                              </td>
                              <td className="p-4">{log.description || '-'}</td>
                              <td className="p-4 text-right font-extrabold text-emerald-400">
                                +₹{log.amount.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* PANEL 2.7: System Notification Logs */}
          {activePanel === 'notifications-log' && user?.role === 'admin' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                    <Bell size={18} className="text-indigo-400" /> Notification Audit Log
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-0.5">Audit log of system-generated and admin-broadcasted notifications.</p>
                </div>
                <div className="flex items-center gap-2 bg-gray-950/60 border border-white/5 rounded-xl px-3 py-1.5 w-full sm:w-80">
                  <Search size={14} className="text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by title, message, or user..."
                    value={notificationsLogSearch}
                    onChange={(e) => setNotificationsLogSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') fetchNotificationsLog();
                    }}
                    className="bg-transparent border-none outline-none text-xs text-white placeholder-gray-500 w-full"
                  />
                  <button
                    onClick={fetchNotificationsLog}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-1 px-3 rounded-lg text-[10px] cursor-pointer"
                  >
                    Filter
                  </button>
                </div>
              </div>

              {/* Table of notification logs */}
              <div className="glass-panel border border-white/5 rounded-2xl overflow-x-auto shadow-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-950/40 border-b border-white/5 text-gray-400 uppercase tracking-wider font-bold">
                      <th className="p-4">Timestamp</th>
                      <th className="p-4">Recipient</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">Title / Message</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    {notificationsLogLoading && notificationsLog.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="p-8 text-center text-gray-500">Loading audit logs...</td>
                      </tr>
                    ) : notificationsLog.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="p-8 text-center text-gray-500">No matching notifications found.</td>
                      </tr>
                    ) : (
                      notificationsLog.map((notif) => {
                        const dateStr = new Date(notif.createdAt).toLocaleString('en-IN');
                        return (
                          <tr key={notif._id} className="hover:bg-white/2 align-top">
                            <td className="p-4 whitespace-nowrap text-gray-400 font-medium">
                              {dateStr}
                            </td>
                            <td className="p-4 min-w-[150px]">
                              {notif.recipient ? (
                                <>
                                  <div className="font-semibold text-white">{notif.recipient.name}</div>
                                  <div className="text-[10px] text-gray-500">{notif.recipient.email}</div>
                                  <span className={`text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded inline-block mt-1 ${
                                    notif.recipient.role === 'student'
                                      ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                      : notif.recipient.role === 'vendor'
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  }`}>
                                    {notif.recipient.role}
                                  </span>
                                </>
                              ) : (
                                <span className="text-red-400 italic">Unknown recipient</span>
                              )}
                            </td>
                            <td className="p-4">
                              <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full inline-block ${
                                notif.type === 'system' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                                notif.type === 'kyc' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                notif.type === 'transaction' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}>
                                {notif.type}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="font-bold text-white text-xs">{notif.title}</div>
                              <p className="text-gray-400 text-[11px] mt-1 leading-relaxed max-w-lg break-words">
                                {notif.message}
                              </p>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PANEL 3: KYC Approvals */}
          {activePanel === 'kyc' && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-base font-bold text-white">Pending KYC Approvals</h3>
              <div className="space-y-4">
                {pendingKycUsers.length === 0 ? (
                  <div className="glass-panel rounded-2xl p-8 text-center text-gray-500 text-sm">
                    No pending KYC documents to approve.
                  </div>
                ) : (
                  pendingKycUsers.map((usr) => (
                    <div key={usr._id} className="glass-panel border border-white/5 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-white">{usr.name}</h4>
                          <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            usr.role === 'student' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {usr.role}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">Email: {usr.email}</p>
                        {usr.kycDocument && (
                          <a
                            href={getImageUrl(usr.kycDocument)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-indigo-400 hover:underline border border-indigo-500/10 bg-indigo-500/5 px-2.5 py-1 rounded-lg"
                          >
                            <Eye size={12} /> Inspect Uploaded ID Document
                          </a>
                        )}
                      </div>
 
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleKycApproval(usr._id, 'approve')}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 px-4 rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Check size={14} /> Approve KYC
                        </button>
                        <button
                          onClick={() => handleKycApproval(usr._id, 'reject')}
                          className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/20 font-semibold py-2 px-4 rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <XCircle size={14} /> Reject KYC
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* PANEL 4: Student Complaints list */}
          {activePanel === 'complaints' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                    <MessageSquare size={18} className="text-indigo-400 animate-pulse" /> Active Support Desk
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-0.5">Manage and resolve open support tickets.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  {user?.role === 'admin' && (
                    <select
                      value={complaintRoleFilter}
                      onChange={(e) => setComplaintRoleFilter(e.target.value)}
                      className="bg-gray-950 border border-white/10 rounded-xl py-1.5 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="">All Roles</option>
                      <option value="student">Students</option>
                      <option value="vendor">Vendors</option>
                    </select>
                  )}
                  <div className="flex items-center gap-2 bg-gray-950/60 border border-white/5 rounded-xl px-3 py-1.5 w-full sm:w-64">
                    <Search size={14} className="text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search name, email, title..."
                      value={complaintsSearch}
                      onChange={(e) => setComplaintsSearch(e.target.value)}
                      className="bg-transparent border-none outline-none text-xs text-white placeholder-gray-500 w-full"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {(() => {
                  const filtered = complaintsList.filter((comp) => {
                    const isOpen = comp.status === 'open';
                    const isRoleMatch = user?.role !== 'subadmin' || comp.student?.role === 'student';
                    const isFilterMatch = !complaintRoleFilter || comp.student?.role === complaintRoleFilter;
                    if (!isOpen || !isRoleMatch || !isFilterMatch) return false;

                    if (!complaintsSearch) return true;
                    const query = complaintsSearch.toLowerCase();
                    return (
                      comp.title?.toLowerCase().includes(query) ||
                      comp.description?.toLowerCase().includes(query) ||
                      comp.student?.name?.toLowerCase().includes(query) ||
                      comp.student?.email?.toLowerCase().includes(query)
                    );
                  });

                  return filtered.length === 0 ? (
                    <div className="glass-panel rounded-2xl p-8 text-center text-gray-500 text-sm">
                      {complaintsSearch || complaintRoleFilter ? 'No matching open support tickets found.' : 'No open support tickets pending.'}
                    </div>
                  ) : (
                    filtered.map((comp) => (
                      <div key={comp._id} className="glass-panel border border-white/5 rounded-2xl p-5 space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-sm text-white">{comp.title}</h4>
                            <div className="flex items-center gap-2 flex-wrap mt-0.5">
                              <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                comp.student?.role === 'vendor' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                              }`}>
                                {comp.student?.role || 'student'}
                              </span>
                              <span className="text-[10px] text-gray-500">Name: {comp.student?.name} &bull; {comp.student?.email} &bull; {new Date(comp.createdAt).toLocaleString()}</span>
                            </div>
                          </div>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full animate-pulse">
                            {comp.status}
                          </span>
                        </div>

                        <p className="text-xs text-gray-400 bg-gray-950/40 p-3 rounded-xl">"{comp.description}"</p>

                        {comp.screenshot && (
                          <div>
                            <a
                              href={getImageUrl(comp.screenshot)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] text-indigo-400 hover:underline border border-indigo-500/10 bg-indigo-500/5 px-2.5 py-1 rounded-lg"
                            >
                              <Eye size={12} /> View Screenshot attachment
                            </a>
                          </div>
                        )}

                        <button
                          onClick={() => { setTargetComplaint(comp); setShowResolveModal(true); }}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-1.5 px-4 rounded-xl text-xs cursor-pointer"
                        >
                          Resolve Ticket
                        </button>
                      </div>
                    ))
                  );
                })()}
              </div>
            </div>
          )}

          {/* PANEL 7: Student & Vendor Complaints History */}
          {activePanel === 'complaints-history' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                    <History size={18} className="text-indigo-400" /> Resolved Tickets History
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-0.5">Archive log of all resolved support tickets and administrative responses.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  {user?.role === 'admin' && (
                    <select
                      value={complaintRoleFilter}
                      onChange={(e) => setComplaintRoleFilter(e.target.value)}
                      className="bg-gray-950 border border-white/10 rounded-xl py-1.5 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="">All Roles</option>
                      <option value="student">Students</option>
                      <option value="vendor">Vendors</option>
                    </select>
                  )}
                  <div className="flex items-center gap-2 bg-gray-950/60 border border-white/5 rounded-xl px-3 py-1.5 w-full sm:w-64">
                    <Search size={14} className="text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search name, email, title, response..."
                      value={complaintsSearch}
                      onChange={(e) => setComplaintsSearch(e.target.value)}
                      className="bg-transparent border-none outline-none text-xs text-white placeholder-gray-500 w-full"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {(() => {
                  const filtered = complaintsList.filter((comp) => {
                    const isResolved = comp.status === 'resolved';
                    const isRoleMatch = user?.role !== 'subadmin' || comp.student?.role === 'student';
                    const isFilterMatch = !complaintRoleFilter || comp.student?.role === complaintRoleFilter;
                    if (!isResolved || !isRoleMatch || !isFilterMatch) return false;

                    if (!complaintsSearch) return true;
                    const query = complaintsSearch.toLowerCase();
                    return (
                      comp.title?.toLowerCase().includes(query) ||
                      comp.description?.toLowerCase().includes(query) ||
                      comp.response?.toLowerCase().includes(query) ||
                      comp.student?.name?.toLowerCase().includes(query) ||
                      comp.student?.email?.toLowerCase().includes(query)
                    );
                  });

                  return filtered.length === 0 ? (
                    <div className="glass-panel rounded-2xl p-8 text-center text-gray-500 text-sm">
                      {complaintsSearch || complaintRoleFilter ? 'No matching history tickets found.' : 'No resolved complaints logged yet.'}
                    </div>
                  ) : (
                    filtered.map((comp) => (
                      <div key={comp._id} className="glass-panel border border-white/5 rounded-2xl p-5 space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-sm text-white">{comp.title}</h4>
                            <div className="flex items-center gap-2 flex-wrap mt-0.5">
                              <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                comp.student?.role === 'vendor' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                              }`}>
                                {comp.student?.role || 'student'}
                              </span>
                              <span className="text-[10px] text-gray-500">Name: {comp.student?.name} &bull; {comp.student?.email} &bull; Date: {new Date(comp.createdAt).toLocaleString()}</span>
                            </div>
                          </div>
                          <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                            {comp.status}
                          </span>
                        </div>

                        <p className="text-xs text-gray-400 bg-gray-950/40 p-3 rounded-xl">"{comp.description}"</p>

                        {comp.screenshot && (
                          <div>
                            <a
                              href={getImageUrl(comp.screenshot)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] text-indigo-400 hover:underline border border-indigo-500/10 bg-indigo-500/5 px-2.5 py-1 rounded-lg"
                            >
                              <Eye size={12} /> View Screenshot attachment
                            </a>
                          </div>
                        )}

                        <div className="bg-emerald-950/20 border border-emerald-500/10 p-3 rounded-xl space-y-1 text-xs">
                          <div className="flex justify-between items-center text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-1">
                            <span>Resolution response logged</span>
                            {comp.resolvedBy && (
                              <span>Resolved by: {comp.resolvedBy.name} ({comp.resolvedBy.role === 'admin' ? 'Super Admin' : 'Sub Admin'})</span>
                            )}
                          </div>
                          <p className="text-gray-300 italic">"{comp.response}"</p>
                        </div>
                      </div>
                    ))
                  );
                })()}
              </div>
            </div>
          )}

          {/* PANEL 5: Subadmin profiles management */}
          {activePanel === 'subadmins' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-white">System Sub-Admins</h3>
                <button
                  onClick={() => setShowSubadminModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus size={14} /> Create Sub-Admin
                </button>
              </div>

              {/* Lists all sub-admins */}
              <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-950/40 border-b border-white/5 text-gray-400 uppercase">
                      <th className="p-4">Name</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Created Date</th>
                      <th className="p-4">Role permissions</th>
                      {user?.role === 'admin' && <th className="p-4 text-center">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {usersList.filter((u) => u.role === 'subadmin').length === 0 ? (
                      <tr>
                        <td colSpan="4" className="p-8 text-center text-gray-500">No sub-admin accounts created.</td>
                      </tr>
                    ) : (
                      usersList
                        .filter((u) => u.role === 'subadmin')
                        .map((sub) => (
                           <tr key={sub._id} className="hover:bg-white/2">
                             <td className="p-4 font-semibold text-white">{sub.name}</td>
                             <td className="p-4">{sub.email}</td>
                             <td className="p-4">{new Date(sub.createdAt).toLocaleDateString()}</td>
                             <td className="p-4">
                               <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full text-[9px] uppercase font-bold">
                                 KYC Approval, Complaints resolve
                               </span>
                             </td>
                             {user?.role === 'admin' && (
                                <td className="p-4 text-center flex gap-2 justify-center items-center">
                                  <button
                                    onClick={() => { setInspectUser(sub); setShowInspectModal(true); }}
                                    title="Inspect Sub-admin"
                                    className="px-2.5 py-1 bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600 hover:text-white font-bold rounded-lg cursor-pointer transition-colors text-[9px]"
                                  >
                                    Inspect
                                  </button>
                                  <button
                                    onClick={() => handleRemoveSubadmin(sub._id)}
                                    title="Remove Sub-admin"
                                    className="px-2 py-1 bg-red-600/10 border border-red-500/20 text-red-400 hover:bg-red-600 hover:text-white font-bold rounded-lg cursor-pointer transition-colors text-[9px]"
                                  >
                                    Remove
                                  </button>
                                </td>
                              )}
                           </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PANEL 6: Redeem Requests from Canteen Vendors */}
          {activePanel === 'redemptions' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                  <Landmark size={18} className="text-indigo-400" /> Pending Vendor Redeem Requests
                </h3>
              </div>

              <div className="glass-panel border border-white/5 rounded-2xl overflow-x-auto shadow-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-950/40 border-b border-white/5 text-gray-400 uppercase tracking-wider">
                      <th className="p-4 font-bold">Vendor Name</th>
                      <th className="p-4 font-bold">Settlement Details</th>
                      <th className="p-4 font-bold">Request Date</th>
                      <th className="p-4 font-bold text-right">Amount</th>
                      <th className="p-4 font-bold text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {redeemRequests.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-gray-500">No pending redeem requests from vendors.</td>
                      </tr>
                    ) : (
                      redeemRequests.map((req) => (
                        <tr key={req._id} className="hover:bg-white/2 text-gray-300">
                          <td className="p-4 font-semibold text-white">
                            <div>{req.sender?.name}</div>
                            <div className="text-[10px] text-gray-500 font-mono">{req.sender?.email}</div>
                          </td>
                          <td className="p-4 max-w-xs">
                            <div className="font-semibold text-indigo-300">{req.sender?.bankDetails?.bankName || 'N/A'}</div>
                            <div className="text-[10px] text-gray-400 font-medium">A/C: {req.sender?.bankDetails?.accountNo || 'N/A'}</div>
                            <div className="text-[9px] text-gray-500 font-mono">IFSC: {req.sender?.bankDetails?.ifsc || 'N/A'}</div>
                            <div className="text-[9px] text-gray-500 italic mt-0.5">({req.description})</div>
                          </td>
                          <td className="p-4">{new Date(req.createdAt).toLocaleString()}</td>
                          <td className="p-4 text-right font-bold text-indigo-400">₹{req.amount.toFixed(2)}</td>
                          <td className="p-4 flex gap-2 justify-center items-center h-full">
                            <button
                              onClick={() => handleRedeemRequest(req._id, 'approve')}
                              disabled={loading}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg cursor-pointer transition-colors text-[10px]"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRedeemRequest(req._id, 'reject')}
                              disabled={loading}
                              className="px-3 py-1.5 bg-red-600/10 border border-red-500/20 text-red-400 hover:bg-red-600 hover:text-white font-bold rounded-lg cursor-pointer transition-colors text-[10px]"
                            >
                              Reject
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PANEL 7: All Transactions Log (for Admins / Sub-admins) */}
          {activePanel === 'transactions' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                    <History size={18} className="text-indigo-400" /> Transaction Audit Log
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-0.5">Track and audit payments, transfers, and wallet reloads.</p>
                </div>
                <div className="flex items-center gap-2 bg-gray-950/60 border border-white/5 rounded-xl px-3 py-1.5 w-full sm:w-64">
                  <Search size={14} className="text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search sender/receiver..."
                    value={transactionsSearch}
                    onChange={(e) => {
                      setTransactionsSearch(e.target.value);
                      setTransactionsPage(1);
                    }}
                    className="bg-transparent border-none outline-none text-xs text-white placeholder-gray-500 w-full"
                  />
                </div>
              </div>

              <div className="glass-panel border border-white/5 rounded-2xl overflow-x-auto shadow-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-950/40 border-b border-white/5 text-gray-400 uppercase tracking-wider font-bold">
                      <th className="p-4">Date</th>
                      <th className="p-4">Sender Details</th>
                      <th className="p-4">Receiver Details</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">Description</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    {transactionsLoading ? (
                      <tr>
                        <td colSpan="7" className="p-8 text-center text-gray-500">Loading transaction logs...</td>
                      </tr>
                    ) : transactionsList.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="p-8 text-center text-gray-500">No transactions recorded.</td>
                      </tr>
                    ) : (
                      transactionsList.map((txn) => {
                        const dateStr = new Date(txn.createdAt).toLocaleString('en-IN');
                        return (
                          <tr key={txn._id} className="hover:bg-white/2">
                            <td className="p-4 whitespace-nowrap">
                              <div>{dateStr}</div>
                              {txn.transaction_id && (
                                <div className="text-[9px] text-indigo-400 font-mono mt-0.5">{txn.transaction_id}</div>
                              )}
                            </td>
                            <td className="p-4 font-semibold text-white">
                              {txn.sender ? (
                                <>
                                  <div>{txn.sender.name}</div>
                                  <div className="text-[10px] text-gray-500 font-mono">{txn.sender.email}</div>
                                  <span className="text-[8px] uppercase tracking-wider font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 px-1 py-0.2 rounded mt-0.5 inline-block">
                                    {txn.sender.role}
                                  </span>
                                </>
                              ) : (
                                <span className="text-gray-500">System (Load)</span>
                              )}
                            </td>
                            <td className="p-4 font-semibold text-white">
                              {txn.receiver ? (
                                <>
                                  <div>{txn.receiver.name}</div>
                                  <div className="text-[10px] text-gray-500 font-mono">{txn.receiver.email}</div>
                                  <span className="text-[8px] uppercase tracking-wider font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-1 py-0.2 rounded mt-0.5 inline-block">
                                    {txn.receiver.role}
                                  </span>
                                </>
                              ) : (
                                <span className="text-gray-500">System (Bank)</span>
                              )}
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                txn.type === 'pay' ? 'bg-indigo-500/10 text-indigo-400' :
                                txn.type === 'send' ? 'bg-rose-500/10 text-rose-400' :
                                txn.type === 'add' ? 'bg-emerald-500/10 text-emerald-400' :
                                'bg-amber-500/10 text-amber-400'
                              }`}>
                                {txn.type.toUpperCase()}
                              </span>
                            </td>
                            <td className="p-4 max-w-xs truncate">{txn.description || '-'}</td>
                            <td className="p-4 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                txn.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' :
                                txn.status === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                                'bg-red-500/10 text-red-400'
                              }`}>
                                {txn.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="p-4 text-right font-extrabold text-white">
                              ₹{txn.amount.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              {transactionsTotalPages > 1 && (
                <div className="flex justify-between items-center bg-gray-950/40 p-4 border border-white/5 rounded-2xl">
                  <span className="text-xs text-gray-500">
                    Page {transactionsPage} of {transactionsTotalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTransactionsPage((prev) => Math.max(prev - 1, 1))}
                      disabled={transactionsPage === 1}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setTransactionsPage((prev) => Math.min(prev + 1, transactionsTotalPages))}
                      disabled={transactionsPage === transactionsTotalPages}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PANEL 8: Broadcast Hub (for Super Admin only) */}
          {activePanel === 'broadcast-hub' && (
            <div className="max-w-xl mx-auto animate-fade-in">
              <div className="glass-panel border border-white/5 rounded-2xl p-6 space-y-4 shadow-xl">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Megaphone size={18} className="text-indigo-400" /> Send Broadcast Announcement
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-0.5">Publish an announcement to a segment or direct email.</p>
                </div>

                <form onSubmit={handleBroadcastSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[9px] font-bold uppercase text-gray-500 mb-1">Target Group</label>
                    <select
                      value={broadcastGroup}
                      onChange={(e) => setBroadcastGroup(e.target.value)}
                      className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="all">All Accounts (All)</option>
                      <option value="students">Students Only</option>
                      <option value="vendors">Vendors Only</option>
                      <option value="subadmins">Sub-Admins Only</option>
                      <option value="specific">Specific User Email</option>
                    </select>
                  </div>

                  {broadcastGroup === 'specific' && (
                    <div className="animate-fade-in">
                      <label className="block text-[9px] font-bold uppercase text-gray-500 mb-1">Target Email</label>
                      <input
                        type="email"
                        required
                        value={broadcastEmail}
                        onChange={(e) => setBroadcastEmail(e.target.value)}
                        placeholder="user@campuspay.com"
                        className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[9px] font-bold uppercase text-gray-500 mb-1">Announcement Title</label>
                    <input
                      type="text"
                      required
                      value={broadcastTitle}
                      onChange={(e) => setBroadcastTitle(e.target.value)}
                      placeholder="e.g. Server Maintenance Notice"
                      className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold uppercase text-gray-500 mb-1">Alert Message</label>
                    <textarea
                      required
                      rows={4}
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      placeholder="Type the message body here..."
                      className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold uppercase text-gray-500 mb-1">Alert Type</label>
                    <select
                      value={broadcastType}
                      onChange={(e) => setBroadcastType(e.target.value)}
                      className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="system">System Warning / Info</option>
                      <option value="transaction">Wallet Transaction Alert</option>
                      <option value="kyc">KYC verification alert</option>
                      <option value="complaint">Complaint Status alert</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={broadcastLoading}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/20"
                  >
                    {broadcastLoading ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <span>Broadcast Alert</span>
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* PANEL 9: Notifications Feed (for Sub-Admin only) */}
          {activePanel === 'notifications-hub' && (
            <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                    <Bell size={18} className="text-indigo-400" /> Notifications Feed
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-0.5">Logs of support tickets and KYC submissions.</p>
                </div>
                {notifications.length > 0 && (
                  <button
                    onClick={markAllNotificationsRead}
                    className="text-xs font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-600 hover:text-white px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/5"
                  >
                    Mark All Read
                  </button>
                )}
              </div>

              <div className="space-y-6">
                {notifications.length === 0 ? (
                  <div className="glass-panel border border-white/5 p-8 text-center text-gray-500 text-xs rounded-2xl shadow-xl">
                    No notifications recorded yet.
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
                        <h4 className="text-[10px] font-extrabold text-indigo-300 uppercase tracking-wider pl-1">
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
                                  <h5 className="font-bold text-xs text-white">{notif.title}</h5>
                                  <p className="text-[11px] text-gray-400 leading-relaxed pr-3">{notif.message}</p>
                                  <span className="text-[9px] text-gray-500 block mt-1.5 font-medium">
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

      {/* ==========================================================================
         MODAL DIALOGS
         ========================================================================== */}

      {/* MODAL 1: Reset Student MPIN */}
      {showMpinModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm glass-panel border border-white/5 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="font-bold text-sm text-white">Reset Security MPIN</h3>
              <button onClick={() => { setShowMpinModal(false); setTargetUser(null); }} className="text-gray-500 hover:text-white text-sm font-semibold">&times;</button>
            </div>

            <form onSubmit={handleResetMpinSubmit} className="space-y-4">
              <p className="text-xs text-gray-400">
                You are resetting the transaction MPIN for <strong>{targetUser?.name}</strong>.
              </p>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Enter New 4-Digit MPIN</label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  value={newMpin}
                  onChange={(e) => setNewMpin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-2 px-3 text-center text-base tracking-widest font-bold focus:outline-none focus:border-indigo-500 text-white"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-xs cursor-pointer"
              >
                <span>Save New MPIN</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1: Add Institute Balance */}
      {/* MODAL 1: Inspect User Profile */}
      {showInspectModal && inspectUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel border border-white/5 rounded-2xl p-6 space-y-4 shadow-2xl animate-fade-in text-xs">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                <Shield size={16} className="text-indigo-400" /> Inspect User Account
              </h3>
              <button
                onClick={() => { setShowInspectModal(false); setInspectUser(null); }}
                className="text-gray-500 hover:text-white text-sm font-semibold cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Profile Content */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-3.5 bg-white/2 p-3.5 border border-white/5 rounded-xl">
                {inspectUser.profileImage ? (
                  <img
                    src={getImageUrl(inspectUser.profileImage)}
                    alt="Profile"
                    className="w-14 h-14 rounded-full object-cover border border-indigo-500/20"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 font-bold text-lg">
                    {inspectUser.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h4 className="font-extrabold text-sm text-white">{inspectUser.name}</h4>
                  <p className="text-[10px] text-gray-500">{inspectUser.email}</p>
                  <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full inline-block mt-1 ${
                    inspectUser.role === 'student'
                      ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      : inspectUser.role === 'vendor'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {inspectUser.role}
                  </span>
                </div>
              </div>

              {/* Data Table */}
              <div className="divide-y divide-white/5 bg-slate-950/40 border border-white/5 rounded-xl px-4 py-2">
                <div className="py-2.5 flex justify-between">
                  <span className="text-gray-500 font-medium">Account Status</span>
                  <span className={`font-bold uppercase ${
                    inspectUser.status === 'active' ? 'text-emerald-400' :
                    inspectUser.status === 'suspended' ? 'text-red-400' : 'text-amber-400'
                  }`}>{inspectUser.status}</span>
                </div>

                {inspectUser.role !== 'subadmin' && (
                  <div className="py-2.5 flex justify-between items-start">
                    <span className="text-gray-500 font-medium">KYC Status</span>
                    <div className="text-right space-y-1">
                      <span className={`font-bold uppercase block ${
                        inspectUser.kycStatus === 'approved' ? 'text-emerald-400' :
                        inspectUser.kycStatus === 'pending' ? 'text-amber-400' : 'text-red-400'
                      }`}>{inspectUser.kycStatus || 'Not Started'}</span>
                      {inspectUser.kycDocument && (
                        <a
                          href={getImageUrl(inspectUser.kycDocument)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-0.5 text-[9px] text-indigo-400 hover:underline bg-indigo-500/5 border border-indigo-500/10 px-1.5 py-0.5 rounded cursor-pointer"
                        >
                          View ID Document
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {inspectUser.role === 'subadmin' && (
                  <>
                    <div className="py-2.5 flex justify-between">
                      <span className="text-gray-500 font-medium">Students KYC Verified</span>
                      <span className="font-bold text-white text-right">
                        {inspectUser.kycVerifiedCount || 0} users
                      </span>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <span className="text-gray-500 font-medium">Complaints Resolved</span>
                      <span className="font-bold text-white text-right">
                        {inspectUser.complaintsSolvedCount || 0} tickets
                      </span>
                    </div>
                  </>
                )}

                {inspectUser.role === 'vendor' && (
                  <div className="py-2.5 flex justify-between">
                    <span className="text-gray-500 font-medium">Total Earnings</span>
                    <span className="font-bold text-white">
                      ₹{(inspectUser.totalEarnings || 0).toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="py-2.5 flex justify-between">
                  <span className="text-gray-500 font-medium">Member Since</span>
                  <span className="text-gray-300 font-medium">
                    {new Date(inspectUser.createdAt).toLocaleDateString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Vendor Bank Details */}
              {inspectUser.role === 'vendor' && inspectUser.bankDetails && (
                <div className="bg-slate-950/40 border border-white/5 rounded-xl p-4 space-y-2">
                  <h5 className="font-bold uppercase tracking-wider text-indigo-400 text-[10px]">Canteen Bank Account Details</h5>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-gray-500 block">Bank Name</span>
                      <span className="text-white font-semibold">{inspectUser.bankDetails.bankName || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Account Number</span>
                      <span className="text-white font-mono">{inspectUser.bankDetails.accountNo || 'N/A'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500 block">IFSC Code</span>
                      <span className="text-white font-mono uppercase">{inspectUser.bankDetails.ifsc || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => { setShowInspectModal(false); setInspectUser(null); }}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-xs cursor-pointer text-center"
            >
              Close Profile View
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: Create Sub-Admin */}
      {showSubadminModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm glass-panel border border-white/5 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5"><UserPlus size={16} className="text-indigo-400" /> Create Sub-Admin Account</h3>
              <button onClick={() => setShowSubadminModal(false)} className="text-gray-500 hover:text-white text-sm font-semibold">&times;</button>
            </div>

            <form onSubmit={handleCreateSubadmin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  placeholder="e.g. Amit Kumar"
                  className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Email ID</label>
                <input
                  type="email"
                  required
                  value={subEmail}
                  onChange={(e) => setSubEmail(e.target.value)}
                  placeholder="e.g. amit.admin@college.edu"
                  className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Temporary Password</label>
                <input
                  type="password"
                  required
                  value={subPassword}
                  onChange={(e) => setSubPassword(e.target.value)}
                  placeholder="Create password"
                  className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-xs cursor-pointer flex items-center justify-center"
              >
                <span>Initialize Account</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Resolve Complaint Ticket */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel border border-white/5 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="font-bold text-sm text-white">Resolve Complaint</h3>
              <button onClick={() => { setShowResolveModal(false); setTargetComplaint(null); }} className="text-gray-500 hover:text-white text-sm font-semibold">&times;</button>
            </div>

            <form onSubmit={handleResolveComplaintSubmit} className="space-y-4">
              <div className="text-xs text-gray-400 space-y-1">
                <span className="font-semibold">Ticket Subject:</span>
                <p className="text-white">"{targetComplaint?.title}"</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Resolution Response Message</label>
                <textarea
                  rows={4}
                  required
                  value={resolutionText}
                  onChange={(e) => setResolutionText(e.target.value)}
                  placeholder="Enter resolution notes, refund confirmation, transaction transaction details etc."
                  className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-xs cursor-pointer flex items-center justify-center"
              >
                <span>Submit Resolution Response</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Edit Profile Settings */}
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
                  placeholder="e.g. Karthik"
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

export default AdminDashboard;
