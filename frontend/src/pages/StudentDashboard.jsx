import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Wallet, Send, PlusCircle, QrCode, History, MessageSquare, ShieldAlert,
  LogOut, Fingerprint, Upload, AlertCircle, CheckCircle2, ArrowUpRight, ArrowDownLeft, Clock, Settings, FileText, Search, Bell, Trash2
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Html5QrcodeScanner } from 'html5-qrcode';

const StudentDashboard = () => {
  const { user, logout, registerBiometrics, updateProfile } = useAuth();
  const [balance, setBalance] = useState(user?.walletBalance || 0);

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
  const [transactions, setTransactions] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [activeTab, setActiveTab] = useState('wallet'); // 'wallet', 'history', 'complaints', 'biometrics', 'notifications'

  // Modal States
  const [showPayModal, setShowPayModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState(null); // Printable receipt details
  const [complaintsSearch, setComplaintsSearch] = useState('');

  // Form Fields
  const [payEmail, setPayEmail] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMpin, setPayMpin] = useState('');
  const [payDescription, setPayDescription] = useState('');

  const [scanning, setScanning] = useState(false);

  const [sendEmail, setSendEmail] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendMpin, setSendMpin] = useState('');

  // Complaint form fields
  const [complaintTitle, setComplaintTitle] = useState('');
  const [complaintDesc, setComplaintDesc] = useState('');
  const [complaintFile, setComplaintFile] = useState(null);
  const [complaintFileName, setComplaintFileName] = useState('');

  // Status indicators
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [bioMock, setBioMock] = useState(true);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  
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

  const downloadPDFStatement = async () => {
    if (downloadingPDF) return;
    setDownloadingPDF(true);
    setError('');
    
    try {
      // 1. Fetch all transactions (limit=1000) so we have a full history
      const response = await fetch('/api/wallet/history?limit=1000', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch transaction logs');
      }

      const allTxns = data.transactions || [];

      // 2. Initialize jsPDF
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      // Colors
      const primaryColor = [79, 70, 229]; // Indigo
      const secondaryColor = [31, 41, 55]; // Dark Grey
      const accentColor = [225, 29, 72]; // Rose/Red for frozen tag
      const lightGrey = [243, 244, 246]; // Light Grey fill
      const borderGrey = [229, 231, 235]; // Table border line

      // Page dimensions
      const pageWidth = doc.internal.pageSize.width; // 210mm
      const pageHeight = doc.internal.pageSize.height; // 297mm

      // Draw Header Band
      doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.rect(0, 0, pageWidth, 40, 'F');

      // Header Text
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('CAMPUS PAY', 15, 18);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(199, 210, 254); // Light indigo text
      doc.text('Secure Smart Campus Payment System', 15, 24);

      // Statement Metadata
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('TRANSACTION STATEMENT', pageWidth - 15, 18, { align: 'right' });
      
      const todayStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(199, 210, 254);
      doc.text(`Generated: ${todayStr}`, pageWidth - 15, 24, { align: 'right' });
      
      const txnRef = 'CP-' + Math.floor(100000 + Math.random() * 900000);
      doc.text(`Ref: ${txnRef}`, pageWidth - 15, 29, { align: 'right' });

      // User Information Box (under header)
      let y = 50;

      // Draw box for profile details
      doc.setFillColor(lightGrey[0], lightGrey[1], lightGrey[2]);
      doc.rect(15, y, pageWidth - 30, 32, 'F');
      doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
      doc.rect(15, y, pageWidth - 30, 32, 'D');

      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Account Information', 20, y + 8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Name: ${user?.name || 'N/A'}`, 20, y + 16);
      doc.text(`Email: ${user?.email || 'N/A'}`, 20, y + 24);

      doc.text(`Current Balance: INR ${user?.walletBalance?.toFixed(2) || '0.00'}`, pageWidth - 20, y + 16, { align: 'right' });
      
      // Frozen Tag
      doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.rect(pageWidth - 55, y + 20, 35, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('ACCOUNT FROZEN', pageWidth - 37.5, y + 24.2, { align: 'center' });

      // Reset text style for table
      y += 45;

      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Transaction Logs', 15, y);
      y += 6;

      // Table Header Row
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(15, y, pageWidth - 30, 8, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Date', 18, y + 5.5);
      doc.text('Type', 45, y + 5.5);
      doc.text('Description / Party', 70, y + 5.5);
      doc.text('Status', 145, y + 5.5);
      doc.text('Amount', pageWidth - 18, y + 5.5, { align: 'right' });

      y += 8;

      // Reset font for table contents
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(55, 65, 81); // Text grey

      let debitsTotal = 0;
      let creditsTotal = 0;

      if (allTxns.length === 0) {
        doc.text('No transactions found.', 20, y + 8);
        y += 12;
      } else {
        allTxns.forEach((txn) => {
          // Check page boundary
          if (y > pageHeight - 30) {
            // Footer on current page
            doc.setFontSize(8);
            doc.setTextColor(156, 163, 175);
            doc.text('Campus Pay Statement - Page ' + doc.internal.getNumberOfPages(), pageWidth / 2, pageHeight - 10, { align: 'center' });

            doc.addPage();
            y = 20;

            // Draw mini header on new page
            doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
            doc.rect(0, 0, pageWidth, 15, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text('CAMPUS PAY - TRANSACTION STATEMENT', 15, 9.5);
            doc.setFont('helvetica', 'normal');

            // Redraw Table Headers on new page
            y += 5;
            doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.rect(15, y, pageWidth - 30, 8, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text('Date', 18, y + 5.5);
            doc.text('Type', 45, y + 5.5);
            doc.text('Description / Party', 70, y + 5.5);
            doc.text('Status', 145, y + 5.5);
            doc.text('Amount', pageWidth - 18, y + 5.5, { align: 'right' });
            y += 8;
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(55, 65, 81);
          }

          const isSend = txn.sender?._id === user?.id || (txn.sender && typeof txn.sender === 'string' && txn.sender === user?.id);
          const isAdd = txn.type === 'add';

          // Format Date
          const txnDate = new Date(txn.createdAt).toLocaleDateString('en-IN');

          // Format Type and Description
          let typeStr = '';
          let partyStr = '';
          if (isAdd) {
            typeStr = 'CREDIT (Reload)';
            partyStr = txn.description || 'Wallet Reload';
            creditsTotal += txn.amount;
          } else if (isSend) {
            typeStr = 'DEBIT (Transfer)';
            partyStr = txn.description || `Paid to ${txn.receiver?.name || txn.receiverEmail || 'Vendor'}`;
            debitsTotal += txn.amount;
          } else {
            typeStr = 'CREDIT (Received)';
            partyStr = txn.description || `From ${txn.sender?.name || 'Student'}`;
            creditsTotal += txn.amount;
          }

          // Truncate description if too long
          if (partyStr.length > 38) {
            partyStr = partyStr.substring(0, 35) + '...';
          }

          // Row background alternating colors
          doc.setFillColor(255, 255, 255);
          doc.rect(15, y, pageWidth - 30, 7.5, 'F');
          // bottom border line
          doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
          doc.line(15, y + 7.5, pageWidth - 15, y + 7.5);

          doc.setFontSize(8.5);
          doc.text(txnDate, 18, y + 5);
          doc.text(typeStr, 45, y + 5);
          doc.text(partyStr, 70, y + 5);
          doc.text(txn.status?.toUpperCase() || 'SUCCESS', 145, y + 5);
          
          if (isSend) {
            doc.setTextColor(190, 24, 74); // Rose color for debit
            doc.text(`- INR ${txn.amount.toFixed(2)}`, pageWidth - 18, y + 5, { align: 'right' });
          } else {
            doc.setTextColor(4, 120, 87); // Emerald color for credit
            doc.text(`+ INR ${txn.amount.toFixed(2)}`, pageWidth - 18, y + 5, { align: 'right' });
          }
          doc.setTextColor(55, 65, 81); // Reset to grey

          y += 7.5;
        });
      }

      // Summary Card
      if (y > pageHeight - 55) {
        // Add page if summary doesn't fit
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text('Campus Pay Statement - Page ' + doc.internal.getNumberOfPages(), pageWidth / 2, pageHeight - 10, { align: 'center' });

        doc.addPage();
        y = 20;
      }

      y += 10;
      // Draw Box for Summary
      doc.setFillColor(lightGrey[0], lightGrey[1], lightGrey[2]);
      doc.rect(pageWidth - 105, y, 90, 25, 'F');
      doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
      doc.rect(pageWidth - 105, y, 90, 25, 'D');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(75, 85, 99);
      doc.text('Total Debited (Payments):', pageWidth - 100, y + 7);
      doc.text(`INR ${debitsTotal.toFixed(2)}`, pageWidth - 20, y + 7, { align: 'right' });

      doc.text('Total Credited (Reloads):', pageWidth - 100, y + 14);
      doc.text(`INR ${creditsTotal.toFixed(2)}`, pageWidth - 20, y + 14, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text('Current Wallet Balance:', pageWidth - 100, y + 21);
      doc.text(`INR ${user?.walletBalance?.toFixed(2) || '0.00'}`, pageWidth - 20, y + 21, { align: 'right' });

      // Official Disclaimer Footer
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      const disclaimer = 'This is an official computer-generated statement of transactions from your Campus Pay Account. ' +
        'Since this account is currently frozen, outgoing transactions are suspended. ' +
        'For disputes, activation requests, or support, write to support@campuspay.com.';
      
      // Wrap text in width
      const splitDisclaimer = doc.splitTextToSize(disclaimer, pageWidth - 30);
      doc.text(splitDisclaimer, 15, pageHeight - 25);

      // Page numbers at the bottom of last page
      doc.text('Campus Pay Statement - Page ' + doc.internal.getNumberOfPages() + ' of ' + doc.internal.getNumberOfPages(), pageWidth / 2, pageHeight - 10, { align: 'center' });

      // Save PDF
      doc.save(`campus_pay_statement_${user?.name.replace(/\s+/g, '_') || 'student'}.pdf`);

      setSuccess('PDF Statement downloaded successfully!');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to generate PDF Statement.');
      setTimeout(() => setError(''), 4000);
    } finally {
      setDownloadingPDF(false);
    }
  };

  // Load transaction history & complaints on mount
  useEffect(() => {
    fetchHistory();
    fetchComplaints();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/wallet/history?limit=10', {
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

  // Scanner Lifecycle Control
  useEffect(() => {
    let scanner = null;
    if (showPayModal && scanning) {
      // Initialize scanner after modal DOM mounts
      scanner = new Html5QrcodeScanner("qr-reader", {
        fps: 10,
        qrbox: { width: 180, height: 180 },
        aspectRatio: 1.0
      }, false);

      scanner.render((decodedText) => {
        try {
          let parsed = null;
          if (decodedText.trim().startsWith('{') && decodedText.trim().endsWith('}')) {
            parsed = JSON.parse(decodedText);
          }

          if (parsed && parsed.appName === 'CAMPUS-PAY-App') {
            if (parsed.email) setPayEmail(parsed.email);
            if (parsed.amount) setPayAmount(parsed.amount.toString());
            if (parsed.item) setPayDescription(parsed.item);
            setSuccess('Campus Pay QR Code scanned successfully!');
            setError('');
            setScanning(false);
            scanner.clear();
          } else {
            setError('Invalid QR Code. Please scan a valid Campus Pay Vendor QR.');
            setTimeout(() => setError(''), 3000);
          }
        } catch (e) {
          setError('Failed to read QR Code data.');
          setTimeout(() => setError(''), 3000);
        }
      }, (error) => {
        // ignore scan noise
      });
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(err => console.warn("Scanner shutdown error:", err));
      }
    };
  }, [showPayModal, scanning]);

  // Handle Scan & Pay (to vendor) / Peer Transfer
  const handleWalletTransfer = async (e, type) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const emailInput = type === 'pay' ? payEmail : sendEmail;
    const amountInput = type === 'pay' ? payAmount : sendAmount;
    const mpinInput = type === 'pay' ? payMpin : sendMpin;

    // Validate MPIN locally first
    if (!mpinInput || mpinInput.length !== 4) {
      setError('Please enter a valid 4-digit MPIN');
      setLoading(false);
      return;
    }

    try {
      // Send transfer request with MPIN verification handled atomically on the backend
      const response = await fetch('/api/wallet/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          receiverEmail: emailInput,
          amount: amountInput,
          description: type === 'pay' ? (payDescription || 'Scan & Pay') : 'Peer Transfer',
          mpin: mpinInput,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.error || 'Transaction failed');
        setLoading(false);
        return;
      }

      setSuccess(`Payment of ₹${amountInput} processed successfully!`);
      setBalance(data.balance);

      // Reset forms
      setPayEmail(''); setPayAmount(''); setPayMpin(''); setPayDescription('');
      setSendEmail(''); setSendAmount(''); setSendMpin('');

      fetchHistory();
      setTimeout(() => {
        setSuccess('');
        setShowPayModal(false);
        setShowSendModal(false);
      }, 1500);
    } catch (err) {
      setError('Network communication failed');
    } finally {
      setLoading(false);
    }
  };

  // Submit Complaint
  const handleRaiseComplaint = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('title', complaintTitle);
      formData.append('description', complaintDesc);
      if (complaintFile) {
        formData.append('screenshot', complaintFile);
      }

      const response = await fetch('/api/complaints', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('Complaint registered successfully! Admin will review it shortly.');
        setComplaintTitle('');
        setComplaintDesc('');
        setComplaintFile(null);
        setComplaintFileName('');
        fetchComplaints();
        setTimeout(() => setSuccess(''), 2000);
      } else {
        setError(data.error || 'Failed to file complaint');
      }
    } catch (err) {
      setError('Network error submitting complaint');
    } finally {
      setLoading(false);
    }
  };

  // Register Biometrics Handler
  const handleEnrollBiometrics = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    const res = await registerBiometrics(bioMock);
    if (res.success) {
      setSuccess('Biometrics registered successfully! You can now log in using Passkeys.');
      setTimeout(() => setSuccess(''), 2000);
    } else {
      setError(res.error || 'Biometric enrollment failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-gray-200">
      {/* Top Banner Navigation */}
      <header className="glass-panel border-b border-white/5 sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {user?.profileImage ? (
            <img src={getImageUrl(user.profileImage)} alt="Profile" className="w-10 h-10 rounded-full object-cover border border-indigo-500/30" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-indigo-600/20 text-indigo-400 font-bold flex items-center justify-center border border-indigo-500/20">
              {user?.name.charAt(0)}
            </div>
          )}
          <div>
            <h4 className="font-bold text-white text-sm">{user?.name}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] uppercase font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">Student</span>
              {user?.kycStatus === 'approved' && (
                <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-0.5">
                  <CheckCircle2 size={10} /> Verified
                </span>
              )}
              {user?.kycStatus === 'pending' && (
                <span className="text-[9px] font-bold text-amber-400 flex items-center gap-0.5">
                  <Clock size={10} /> KYC Pending
                </span>
              )}
              {user?.kycStatus === 'rejected' && (
                <span className="text-[9px] font-bold text-red-400 flex items-center gap-0.5">
                  <AlertCircle size={10} /> KYC Rejected
                </span>
              )}
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

      {/* Main container */}
      <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Left Sidebar Menu */}
        <div className="md:col-span-1 space-y-3">
          <button
            onClick={() => setActiveTab('wallet')}
            className={`w-full text-left py-3 px-4 rounded-xl flex items-center gap-3 font-semibold text-sm transition-all cursor-pointer ${
              activeTab === 'wallet' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/15' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Wallet size={18} />
            <span>My Wallet</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`w-full text-left py-3 px-4 rounded-xl flex items-center gap-3 font-semibold text-sm transition-all cursor-pointer ${
              activeTab === 'history' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/15' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <History size={18} />
            <span>Transaction Logs</span>
          </button>
          <button
            onClick={() => setActiveTab('complaints')}
            className={`w-full text-left py-3 px-4 rounded-xl flex items-center gap-3 font-semibold text-sm transition-all cursor-pointer ${
              activeTab === 'complaints' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/15' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <MessageSquare size={18} />
            <span>File a Complaint</span>
          </button>
          <button
            onClick={() => setActiveTab('complaint-history')}
            className={`w-full text-left py-3 px-4 rounded-xl flex items-center gap-3 font-semibold text-sm transition-all cursor-pointer ${
              activeTab === 'complaint-history' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/15' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <History size={18} />
            <span>Complaint History</span>
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`w-full text-left py-3 px-4 rounded-xl flex items-center justify-between font-semibold text-sm transition-all cursor-pointer ${
              activeTab === 'notifications' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/15' : 'text-gray-400 hover:text-white hover:bg-white/5'
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
            onClick={() => setActiveTab('biometrics')}
            className={`w-full text-left py-3 px-4 rounded-xl flex items-center gap-3 font-semibold text-sm transition-all cursor-pointer ${
              activeTab === 'biometrics' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/15' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Fingerprint size={18} />
            <span>Biometric Link</span>
          </button>
        </div>

        {/* Right Dashboard Body */}
        <div className="md:col-span-3">
          {/* TAB 1: Wallet Balance and quick actions */}
          {activeTab === 'wallet' && (
            <div className="space-y-8 animate-fade-in">
              {/* Alert banner for Frozen Account status */}
              {user?.status === 'frozen' && (
                <div className="p-5 bg-rose-950/20 border border-rose-500/30 rounded-2xl flex items-start gap-4 shadow-lg shadow-rose-950/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl"></div>
                  <ShieldAlert className="text-rose-400 mt-0.5 shrink-0 animate-pulse" size={24} />
                  <div className="space-y-3 z-10">
                    <div>
                      <h5 className="font-bold text-rose-300 text-sm">Your Account Has Been Frozen</h5>
                      <p className="text-xs text-rose-400/80 mt-1 leading-relaxed">
                        Your institute wallet is frozen by the administrator. Outgoing transfers and scanner payments have been suspended. If you need a record of your transactions, you can generate a signed statement below.
                      </p>
                    </div>
                    <button
                      onClick={downloadPDFStatement}
                      disabled={downloadingPDF}
                      className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs py-2 px-4 rounded-xl transition-all shadow-md shadow-rose-950/50 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FileText size={14} />
                      <span>{downloadingPDF ? 'Generating Statement...' : 'Generate Statement (PDF)'}</span>
                    </button>
                  </div>
                </div>
              )}
              {/* Alert flags for unverified KYC status */}
              {user?.kycStatus === 'pending' && (
                <div className="p-4 bg-amber-950/20 border border-amber-500/25 rounded-2xl flex items-start gap-3">
                  <Clock className="text-amber-400 mt-0.5" size={20} />
                  <div>
                    <h5 className="font-bold text-amber-300 text-sm">KYC Verification Pending</h5>
                    <p className="text-xs text-amber-400/80 mt-1">
                      Your uploaded Student ID Card is currently being verified. You cannot transfer funds or pay vendors until verified by Admin.
                    </p>
                  </div>
                </div>
              )}
              {user?.kycStatus === 'rejected' && (
                <div className="p-4 bg-red-950/20 border border-red-500/25 rounded-2xl flex items-start gap-3">
                  <AlertCircle className="text-red-400 mt-0.5" size={20} />
                  <div>
                    <h5 className="font-bold text-red-300 text-sm">Student KYC Document Rejected</h5>
                    <p className="text-xs text-red-400/80 mt-1">
                      Your Student ID Card verification was rejected. Please raise a ticket with a clean screenshot of your ID card for manual resolution.
                    </p>
                  </div>
                </div>
              )}
              {/* Card component */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 border border-indigo-500/20 p-8 shadow-xl">
                {/* Decorative chips */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                  <div className="flex justify-between items-start md:border-r md:border-white/10 pr-6">
                    <div>
                      <span className="text-xs text-indigo-300 font-semibold uppercase tracking-wider">Institute Wallet Balance</span>
                      <h1 className="text-4xl font-extrabold text-white mt-2">₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h1>
                    </div>
                    <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-indigo-400 animate-glow">
                      <Wallet size={24} />
                    </div>
                  </div>

                  <div className="flex justify-between items-start pl-0 md:pl-6">
                    <div>
                      <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Total Funds Spent</span>
                      <h1 className="text-4xl font-extrabold text-rose-400 mt-2">
                        ₹{transactions
                          .filter((t) => t.sender?._id === user?.id || (t.sender && typeof t.sender === 'string' && t.sender === user?.id))
                          .reduce((sum, t) => sum + t.amount, 0)
                          .toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </h1>
                    </div>
                    <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-rose-400">
                      <ArrowUpRight size={24} />
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap gap-4">
                  <button
                    onClick={() => {
                      if (user?.status === 'frozen') {
                        setError('Your account is frozen. Outgoing payments are disabled.');
                        setTimeout(() => setError(''), 4000);
                        return;
                      }
                      setShowPayModal(true);
                      setScanning(true);
                    }}
                    disabled={user?.status === 'frozen'}
                    className={`flex-1 min-w-[140px] font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      user?.status === 'frozen'
                        ? 'bg-slate-800/50 text-slate-500 border border-white/5 cursor-not-allowed opacity-60'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:-translate-y-0.5 shadow-lg shadow-indigo-600/20'
                    }`}
                  >
                    <QrCode size={18} />
                    <span>Scan & Pay</span>
                  </button>
                  <button
                    onClick={() => {
                      if (user?.status === 'frozen') {
                        setError('Your account is frozen. Outgoing transfers are disabled.');
                        setTimeout(() => setError(''), 4000);
                        return;
                      }
                      setShowSendModal(true);
                    }}
                    disabled={user?.status === 'frozen'}
                    className={`flex-1 min-w-[140px] font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      user?.status === 'frozen'
                        ? 'bg-slate-800/50 text-slate-500 border border-white/5 cursor-not-allowed opacity-60'
                        : 'bg-slate-800 hover:bg-slate-700 border border-white/5 text-white hover:-translate-y-0.5'
                    }`}
                  >
                    <Send size={18} />
                    <span>Pay Vendor (Email)</span>
                  </button>
                </div>
              </div>

              {/* Recent Activity List */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <History size={20} className="text-indigo-400" /> Recent Activity
                </h3>
                <div className="glass-panel rounded-2xl divide-y divide-white/5 overflow-hidden">
                  {transactions.slice(0, 5).length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-sm">No transaction records found.</div>
                  ) : (
                    transactions.slice(0, 5).map((txn) => {
                      const isSend = txn.sender?._id === user?.id;
                      const isAdd = txn.type === 'add';
                      return (
                        <div key={txn._id} className="p-4 flex items-center justify-between hover:bg-white/2 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl border ${
                              isAdd ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                              isSend ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                            }`}>
                              {isAdd ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-white">
                                {isAdd ? 'Wallet Reload' : isSend ? `Transfer to ${txn.receiver?.name || 'Bank'}` : `Payment from ${txn.sender?.name}`}
                              </p>
                              <span className="text-[10px] text-gray-500">{new Date(txn.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <span className={`font-bold text-sm ${isAdd || !isSend ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isAdd || !isSend ? '+' : '-'} ₹{txn.amount}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Full Transaction History */}
          {activeTab === 'history' && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <History size={20} className="text-indigo-400" /> Transaction History
              </h3>
              <div className="glass-panel rounded-2xl divide-y divide-white/5 overflow-hidden">
                {transactions.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 text-sm">No transaction records found.</div>
                ) : (
                  transactions.map((txn) => {
                    const isSend = txn.sender?._id === user?.id;
                    const isAdd = txn.type === 'add';
                    return (
                      <div key={txn._id} className="p-4 flex items-center justify-between hover:bg-white/2 transition-colors flex-wrap sm:flex-nowrap gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl border ${
                            isAdd ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                            isSend ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                          }`}>
                            {isAdd ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {isAdd ? 'Wallet Reload' : isSend ? `Transfer to ${txn.receiver?.name || 'Bank'}` : `Payment from ${txn.sender?.name}`}
                            </p>
                            <span className="text-[10px] text-gray-500">
                              {new Date(txn.createdAt).toLocaleDateString()} &bull; {txn.description}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                          <span className={`font-bold text-sm ${isAdd || !isSend ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isAdd || !isSend ? '+' : '-'} ₹{txn.amount}
                          </span>
                          <button
                            onClick={() => setActiveReceipt(txn)}
                            className="py-1 px-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                          >
                            Generate Bill
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Student Support Tickets */}
          {activeTab === 'complaints' && (
            <div className="max-w-xl mx-auto animate-fade-in">
              <div className="glass-panel border border-white/5 rounded-2xl p-6 space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldAlert size={18} className="text-indigo-400" /> File a Complaint
                </h3>
                <p className="text-[10px] text-gray-500">File a complaint/issue regarding transactions or platform access. It will be reviewed by administrators.</p>

                {error && <div className="p-2.5 bg-red-950/20 border border-red-500/20 text-red-400 text-xs rounded-xl">{error}</div>}
                {success && <div className="p-2.5 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl">{success}</div>}

                <form onSubmit={handleRaiseComplaint} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Issue Title</label>
                    <input
                      type="text"
                      required
                      value={complaintTitle}
                      onChange={(e) => setComplaintTitle(e.target.value)}
                      placeholder="e.g. Double debit canteen payment"
                      className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Details / Description</label>
                    <textarea
                      rows={4}
                      required
                      value={complaintDesc}
                      onChange={(e) => setComplaintDesc(e.target.value)}
                      placeholder="Explain details of your transaction issue..."
                      className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Upload Screenshot</label>
                    <label className="flex items-center gap-2 bg-gray-950/60 hover:bg-gray-950/80 border border-white/5 rounded-xl py-2.5 px-3 cursor-pointer text-xs text-gray-400 hover:text-white transition-all">
                      <Upload size={14} />
                      <span className="truncate">{complaintFileName || 'Choose receipt screenshot'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setComplaintFile(file);
                            setComplaintFileName(file.name);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Submit Complaint</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 8: Student Complaint History with Search Bar */}
          {activeTab === 'complaint-history' && (
            <div className="space-y-6 animate-fade-in">
              <div className="glass-panel border border-white/5 rounded-2xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <MessageSquare size={18} className="text-indigo-400" /> Complaint Status & Logs
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
                    const filtered = complaints.filter((comp) => {
                      if (!complaintsSearch) return true;
                      const query = complaintsSearch.toLowerCase();
                      return (
                        comp.title?.toLowerCase().includes(query) ||
                        comp.description?.toLowerCase().includes(query) ||
                        comp.status?.toLowerCase().includes(query)
                      );
                    });

                    return filtered.length === 0 ? (
                      <div className="p-8 text-center text-gray-500 text-sm">
                        {complaintsSearch ? 'No matching support tickets found.' : 'No support tickets raised yet.'}
                      </div>
                    ) : (
                      filtered.map((comp) => (
                        <div key={comp._id} className="border border-white/5 bg-gray-950/20 rounded-2xl p-5 space-y-3 hover:border-white/10 transition-all">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-sm text-white">{comp.title}</h4>
                              <span className="text-[9px] text-gray-500 font-mono">ID: {comp._id} &bull; {new Date(comp.createdAt).toLocaleString()}</span>
                            </div>
                            <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${
                              comp.status === 'open' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}>
                              {comp.status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 bg-gray-950/40 p-3 rounded-xl">"{comp.description}"</p>
                          {comp.screenshot && (
                            <a href={getImageUrl(comp.screenshot)} target="_blank" rel="noreferrer" className="inline-block text-[10px] text-indigo-400 hover:underline">
                              View uploaded screenshot attachment
                            </a>
                          )}
                          {comp.status === 'resolved' && comp.response && (
                            <div className="bg-emerald-950/20 border border-emerald-500/10 p-3 rounded-xl space-y-1 text-[11px] mt-2">
                              <div className="flex justify-between items-center text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-1">
                                <span>College Resolution Response</span>
                                {comp.resolvedBy && (
                                  <span>Resolved by: {comp.resolvedBy.name} ({comp.resolvedBy.role === 'admin' ? 'Super Admin' : 'Sub Admin'})</span>
                                )}
                              </div>
                              <p className="text-gray-300 italic">"{comp.response}"</p>
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

          {/* TAB 4: Biometric Enrollment Controls */}
          {activeTab === 'biometrics' && (
            <div className="max-w-md glass-panel border border-white/5 rounded-2xl p-8 space-y-6 animate-fade-in mx-auto">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center p-3.5 bg-indigo-500/10 text-indigo-400 rounded-xl animate-glow">
                  <Fingerprint size={32} />
                </div>
                <h3 className="text-lg font-bold text-white">Enroll Fingerprint / Biometric Logins</h3>
                <p className="text-xs text-gray-400 px-4">
                  Link your local machine credentials (Touch ID, Face ID or Windows Hello) to sign in to Campus Pay instantly next time.
                </p>
              </div>

              {error && <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-400 text-xs rounded-xl text-center">{error}</div>}
              {success && <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl text-center">{success}</div>}

              <div className="flex items-center justify-between p-3 bg-indigo-950/20 border border-indigo-500/10 rounded-xl">
                <span className="text-xs text-indigo-300 font-semibold">Simulated Biometric fallback</span>
                <input
                  type="checkbox"
                  checked={bioMock}
                  onChange={(e) => setBioMock(e.target.checked)}
                  className="w-4 h-4 cursor-pointer"
                />
              </div>

              <button
                onClick={handleEnrollBiometrics}
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/15"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Fingerprint size={16} />
                    <span>Register Biometrics</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 6: Notifications Grouped Feed */}
          {activeTab === 'notifications' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Bell size={20} className="text-indigo-400" /> Notifications Feed
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">Keep track of your transaction history, complaints, and security updates.</p>
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

      {/* ==========================================================================
         MODAL WINDOWS
         ========================================================================== */}

      {/* MODAL 1: Scan & Pay (to vendor) */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm glass-panel border border-white/5 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5"><QrCode size={16} className="text-indigo-400" /> Scan & Pay Vendor</h3>
              <button onClick={() => { setShowPayModal(false); setScanning(false); setError(''); setPayDescription(''); }} className="text-gray-500 hover:text-white text-sm font-semibold cursor-pointer">&times;</button>
            </div>

            {error && <div className="p-2.5 bg-red-950/20 border border-red-500/20 text-red-400 text-xs rounded-xl">{error}</div>}
            {success && <div className="p-2.5 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl">{success}</div>}

            {scanning ? (
              <div className="space-y-4">
                <p className="text-[10px] text-gray-400 text-center">Center the Vendor QR Code in the scanner box</p>
                <div id="qr-reader" className="w-full rounded-xl overflow-hidden border border-white/10 bg-gray-950"></div>
                <button
                  type="button"
                  onClick={() => setScanning(false)}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2 rounded-xl text-xs cursor-pointer animate-fade-in"
                >
                  Cancel Scanner
                </button>
              </div>
            ) : (
              <form onSubmit={(e) => handleWalletTransfer(e, 'pay')} className="space-y-4">
                <div className="flex justify-between items-center bg-indigo-950/20 p-2.5 border border-indigo-500/10 rounded-xl">
                  <span className="text-[10px] text-gray-400 font-medium">Scan vendor QR code?</span>
                  <button
                    type="button"
                    onClick={() => { setScanning(true); setError(''); setSuccess(''); }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <QrCode size={12} /> Launch Scanner
                  </button>
                </div>

                {payDescription && (
                  <div className="p-3 bg-indigo-950/40 border border-indigo-500/25 rounded-2xl flex items-start gap-2.5">
                    <FileText className="text-indigo-400 mt-0.5" size={18} />
                    <div>
                      <h5 className="font-bold text-indigo-300 text-xs">Scanned Bill Details</h5>
                      <p className="text-[10px] text-indigo-400/80 mt-0.5">
                        Product: <strong>{payDescription}</strong>
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Vendor Email ID</label>
                  <input
                    type="email"
                    required
                    value={payEmail}
                    onChange={(e) => setPayEmail(e.target.value)}
                    placeholder="vendor@canteen.com"
                    className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Bill Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Enter 4-Digit MPIN</label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    value={payMpin}
                    onChange={(e) => setPayMpin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-2.5 px-3 text-center text-base tracking-widest font-bold focus:outline-none focus:border-indigo-500 text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Authorize Payment</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: Add Funds */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm glass-panel border border-white/5 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5"><PlusCircle size={16} className="text-emerald-400" /> Add Funds to Wallet</h3>
              <button onClick={() => { setShowAddModal(false); setError(''); }} className="text-gray-500 hover:text-white text-sm font-semibold">&times;</button>
            </div>

            {error && <div className="p-2.5 bg-red-950/20 border border-red-500/20 text-red-400 text-xs rounded-xl">{error}</div>}
            {success && <div className="p-2.5 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl">{success}</div>}

            <form onSubmit={handleAddFunds} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Enter Amount (₹)</label>
                <input
                  type="number"
                  required
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  placeholder="500"
                  className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Proceed to Load Funds</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Direct Pay to Vendor */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm glass-panel border border-white/5 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5"><Send size={16} className="text-indigo-400" /> Direct Pay to Vendor</h3>
              <button onClick={() => { setShowSendModal(false); setError(''); }} className="text-gray-500 hover:text-white text-sm font-semibold">&times;</button>
            </div>

            {error && <div className="p-2.5 bg-red-950/20 border border-red-500/20 text-red-400 text-xs rounded-xl">{error}</div>}
            {success && <div className="p-2.5 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl">{success}</div>}

            <form onSubmit={(e) => handleWalletTransfer(e, 'send')} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Vendor's College Email ID</label>
                <input
                  type="email"
                  required
                  value={sendEmail}
                  onChange={(e) => setSendEmail(e.target.value)}
                  placeholder="vendor@college.edu"
                  className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[9px] text-gray-500 mt-1.5 leading-relaxed">
                  * Direct transfers are restricted to approved canteen vendors only (for cases where scanning the vendor QR terminal fails).
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Amount to Transfer (₹)</label>
                <input
                  type="number"
                  required
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Enter 4-Digit MPIN</label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  value={sendMpin}
                  onChange={(e) => setSendMpin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full bg-gray-950/60 border border-white/5 rounded-xl py-2.5 px-3 text-center text-base tracking-widest font-bold focus:outline-none focus:border-indigo-500 text-white"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Send Funds</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Edit Profile Settings */}
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

      {/* Printable Receipt Modal */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <style>{`
            @media print {
              body * {
                visibility: hidden;
              }
              #printable-receipt, #printable-receipt * {
                visibility: visible;
              }
              #printable-receipt {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                background: white !important;
                color: #000000 !important;
                padding: 40px;
              }
            }
          `}</style>
          <div className="w-full max-w-sm bg-[#111827] border border-white/10 rounded-3xl p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setActiveReceipt(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white text-lg font-semibold cursor-pointer"
            >
              &times;
            </button>

            {/* Printable Area */}
            <div id="printable-receipt" className="text-center space-y-4 print:text-black">
              <div className="border-b border-dashed border-white/10 pb-4 print:border-black/20">
                <h2 className="font-extrabold text-white text-lg tracking-wider print:text-black">CAMPUS PAY</h2>
                <p className="text-[10px] text-indigo-400 uppercase font-bold tracking-widest mt-0.5 print:text-indigo-600">Official Payment Receipt</p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-gray-500 uppercase font-bold">Transaction Amount</span>
                <h1 className="text-3xl font-extrabold text-white print:text-black">₹{activeReceipt.amount.toFixed(2)}</h1>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full uppercase border border-emerald-500/20 font-bold print:border-black print:text-black">
                  SUCCESSFUL
                </span>
              </div>

              <div className="border-t border-b border-dashed border-white/10 py-4 text-left text-xs space-y-2 text-gray-400 print:text-black print:border-black/20">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-500 print:text-black">Receipt No:</span>
                  <span className="text-white font-mono text-[10px] print:text-black">{activeReceipt.transaction_id || activeReceipt._id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-500 print:text-black">Paid By:</span>
                  <span className="text-white print:text-black">{activeReceipt.sender?.name || 'External / Admin'}</span>
                </div>
                <div className="flex justify-between flex-wrap gap-1">
                  <span className="font-semibold text-gray-500 print:text-black">Sender Email:</span>
                  <span className="text-white font-mono text-[11px] print:text-black">{activeReceipt.sender?.email || 'N/A'}</span>
                </div>
                <div className="border-t border-white/5 my-2 print:border-black/10"></div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-500 print:text-black">Paid To:</span>
                  <span className="text-white print:text-black">{activeReceipt.receiver?.name || 'Wallet Load / Card'}</span>
                </div>
                <div className="flex justify-between flex-wrap gap-1">
                  <span className="font-semibold text-gray-500 print:text-black">Receiver Email:</span>
                  <span className="text-white font-mono text-[11px] print:text-black">{activeReceipt.receiver?.email || 'N/A'}</span>
                </div>
                <div className="border-t border-white/5 my-2 print:border-black/10"></div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-500 print:text-black">Date & Time:</span>
                  <span className="text-white print:text-black">{new Date(activeReceipt.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-500 print:text-black">Item Description:</span>
                  <span className="text-white print:text-black">"{activeReceipt.description}"</span>
                </div>
              </div>

              <div className="text-[10px] text-gray-500 italic">
                Thank you for using Campus Pay!
              </div>
            </div>

            {/* Print Action button */}
            <button
              onClick={() => window.print()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg hover:shadow-indigo-500/20 transition-all"
            >
              <FileText size={14} /> Print Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
