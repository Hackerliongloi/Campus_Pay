import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal, Platform, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import { API_BASE_URL } from '../config';
import {
  LogOut, QrCode, UploadCloud, History, Send, ShieldAlert, ShieldCheck,
  Wallet, MessageSquare, Bell, Trash2, User, FileText, ArrowUpRight,
  ArrowDownLeft, X, ChevronRight, Image as ImageIcon, Settings, Check, CheckCircle2, Search,
  Landmark, TrendingUp, Coins, ArrowLeft
} from 'lucide-react-native';

export default function VendorDashboard() {
  const { user, fetchMe, logout, updateProfile } = useAuth();
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  // Tab State: 'home', 'sales', 'payouts', 'support'
  const [activeTab, setActiveTab] = useState('home');
  // Sub-view within HOME tab: 'dashboard', 'qrbill', 'redeem'
  const [activeSubView, setActiveSubView] = useState('dashboard');

  // Settlement states
  const [settleAmount, setSettleAmount] = useState('');
  const [settleMpin, setSettleMpin] = useState('');
  const [settling, setSettling] = useState(false);
  const [settleError, setSettleError] = useState('');

  // Refund / Send money to student states
  const [refundStudentEmail, setRefundStudentEmail] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundMpin, setRefundMpin] = useState('');
  const [refunding, setRefunding] = useState(false);
  const [refundError, setRefundError] = useState('');

  // Bank Form config details
  const [bankName, setBankName] = useState(user?.bankDetails?.bankName || '');
  const [accountNo, setAccountNo] = useState(user?.bankDetails?.accountNo || '');
  const [ifsc, setIfsc] = useState(user?.bankDetails?.ifsc || '');
  const [savingBank, setSavingBank] = useState(false);

  // KYC Upload State
  const [kycUploading, setKycUploading] = useState(false);

  // Dynamic QR Bill Generator State
  const [billAmount, setBillAmount] = useState('');
  const [billNote, setBillNote] = useState('');
  const [generatedBill, setGeneratedBill] = useState(null);

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Support Claims / Complaints States
  const [complaints, setComplaints] = useState([]);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [complaintTitle, setComplaintTitle] = useState('');
  const [complaintDesc, setComplaintDesc] = useState('');
  const [complaintFileUri, setComplaintFileUri] = useState('');
  const [raisingComplaint, setRaisingComplaint] = useState(false);
  const [ticketsSearch, setTicketsSearch] = useState('');

  // Edit Profile States
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editAvatarUri, setEditAvatarUri] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Transaction Receipt Modal State
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Search & Filters for Sales list
  const [salesSearch, setSalesSearch] = useState('');

  useEffect(() => {
    fetchVendorStats();
    fetchHistory();
    fetchComplaints();
    fetchNotifications();

    const interval = setInterval(() => {
      fetchMe();
      fetchVendorStats();
      fetchHistory();
      fetchComplaints();
      fetchNotifications();
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  // Update form inputs when user details are loaded/modified
  useEffect(() => {
    if (user?.bankDetails) {
      setBankName(user.bankDetails.bankName || '');
      setAccountNo(user.bankDetails.accountNo || '');
      setIfsc(user.bankDetails.ifsc || '');
    }
  }, [user]);

  // Enforce KYC restriction: redirect to support tab if KYC not approved
  useEffect(() => {
    if (user && user.kycStatus !== 'approved') {
      const allowedTabs = ['support'];
      if (!allowedTabs.includes(activeTab)) {
        setActiveTab('support');
      }
    }
  }, [user, activeTab]);

  // Helper to resolve URLs
  const getImageUrl = (path) => {
    if (!path) return '';
    return path.startsWith('http') ? path : `${API_BASE_URL.replace('/api', '')}${path}`;
  };

  // 1. Fetch Vendor Stats
  const fetchVendorStats = async () => {
    try {
      const response = await apiFetch('/vendor/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Fetch stats error:', err);
    }
  };

  // 2. Fetch History (Payments received & Redemptions)
  const fetchHistory = async () => {
    try {
      const response = await apiFetch('/wallet/history');
      const data = await response.json();
      if (data.success) {
        setHistory(data.transactions || []);
      }
    } catch (err) {
      console.error('Fetch history error:', err);
    }
  };

  // 3. Fetch Support Tickets
  const fetchComplaints = async () => {
    try {
      const response = await apiFetch('/complaints');
      const data = await response.json();
      if (data.success) {
        setComplaints(data.complaints || []);
      }
    } catch (err) {
      console.error('Fetch complaints error:', err);
    }
  };

  // 4. Fetch Notifications
  const fetchNotifications = async () => {
    try {
      const response = await apiFetch('/notifications');
      const data = await response.json();
      if (data.success) {
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('Fetch notifications error:', err);
    }
  };

  // Mark all notifications read
  const markAllNotificationsRead = async () => {
    try {
      const response = await apiFetch('/notifications/read', { method: 'PUT' });
      const data = await response.json();
      if (data.success) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete notification
  const deleteNotification = async (id) => {
    try {
      const response = await apiFetch(`/notifications/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        setNotifications(prev => prev.filter(n => n._id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save bank details (POST /api/vendor/bank-details)
  const handleSaveBank = async () => {
    if (!bankName || !accountNo || !ifsc) {
      Alert.alert('Fields Required', 'Please fill account number, IFSC, and bank name.');
      return;
    }

    setSavingBank(true);
    try {
      const response = await apiFetch('/vendor/bank-details', {
        method: 'POST',
        body: JSON.stringify({ bankName, accountNo, ifsc }),
      });
      const data = await response.json();
      setSavingBank(false);
      if (data.success) {
        Alert.alert('Success', 'Settlement bank account details updated successfully.');
        fetchMe();
        fetchVendorStats();
      } else {
        Alert.alert('Update Failed', data.error);
      }
    } catch (err) {
      Alert.alert('Error', 'Connection failed.');
      setSavingBank(false);
    }
  };

  // Upload Vendor KYC
  const handleKycUpload = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Denied', 'Media library permissions are required to upload KYC verification documents.');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (pickerResult.canceled) return;

    const uri = pickerResult.assets[0].uri;
    const uriParts = uri.split('.');
    const fileType = uriParts[uriParts.length - 1];

    const formData = new FormData();
    const fileName = `kyc_doc_${Date.now()}.${fileType}`;
    const mimeType = `image/${fileType}`;

    if (Platform.OS === 'web') {
      const res = await fetch(uri);
      const blob = await res.blob();
      formData.append('kycDocument', blob, fileName);
    } else {
      formData.append('kycDocument', {
        uri,
        name: fileName,
        type: mimeType,
      });
    }

    setKycUploading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/vendor/upload-kyc`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        Alert.alert('Upload Successful', 'KYC Document submitted. The administration will review it shortly.');
        fetchMe();
        fetchVendorStats();
      } else {
        Alert.alert('Upload Failed', data.error);
      }
    } catch (err) {
      Alert.alert('Network Error', 'Connection failed during upload.');
    } finally {
      setKycUploading(false);
    }
  };

  // Request Settlement/Redeem
  const handleSettlement = async () => {
    setSettleError('');
    if (!settleAmount || parseFloat(settleAmount) <= 0) {
      setSettleError('Please enter a valid amount.');
      return;
    }
    if (!settleMpin || settleMpin.length !== 4 || isNaN(settleMpin)) {
      setSettleError('Please enter your 4-digit numeric security MPIN.');
      return;
    }
    if (!user?.bankDetails?.accountNo) {
      setSettleError('Please register your bank account details first.');
      return;
    }

    setSettling(true);
    try {
      const response = await apiFetch('/vendor/redeem', {
        method: 'POST',
        body: JSON.stringify({ amount: parseFloat(settleAmount), mpin: settleMpin }),
      });
      const data = await response.json();
      setSettling(false);
      if (data.success) {
        Alert.alert('Request Submitted', `Redeem request of ₹${settleAmount} has been logged and is pending admin approval.`);
        setSettleAmount('');
        setSettleMpin('');
        setSettleError('');
        fetchMe();
        fetchVendorStats();
        fetchHistory();
      } else {
        setSettleError(data.error || 'Failed to submit settlement.');
      }
    } catch (err) {
      setSettleError('Connection failure. Try again.');
      setSettling(false);
    }
  };

  // Send money to student (refund)
  const handleSendToStudent = async () => {
    setRefundError('');
    if (!refundStudentEmail) {
      setRefundError('Please enter the student email.');
      return;
    }
    if (!refundAmount || parseFloat(refundAmount) <= 0) {
      setRefundError('Please enter a valid amount.');
      return;
    }
    if (!refundMpin || refundMpin.length !== 4 || isNaN(refundMpin)) {
      setRefundError('Please enter your 4-digit numeric security MPIN.');
      return;
    }

    setRefunding(true);
    try {
      const response = await apiFetch('/vendor/refund-student', {
        method: 'POST',
        body: JSON.stringify({
          studentEmail: refundStudentEmail,
          amount: parseFloat(refundAmount),
          mpin: refundMpin,
        }),
      });
      const data = await response.json();
      setRefunding(false);
      if (data.success) {
        Alert.alert('Transfer Successful', `Successfully refunded ₹${refundAmount} to student ${refundStudentEmail}.`);
        setRefundStudentEmail('');
        setRefundAmount('');
        setRefundMpin('');
        setRefundError('');
        fetchMe();
        fetchVendorStats();
        fetchHistory();
        setActiveSubView('dashboard');
      } else {
        setRefundError(data.error || 'Failed to complete refund.');
      }
    } catch (err) {
      setRefundError('Connection failure. Try again.');
      setRefunding(false);
    }
  };

  // Generate dynamic QR Bill
  const handleGenerateQrBill = () => {
    if (!billAmount || parseFloat(billAmount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a positive amount to bill.');
      return;
    }
    setGeneratedBill({
      vendorName: user?.name,
      vendorEmail: user?.email,
      amount: parseFloat(billAmount),
      description: billNote || 'Campus pay bill',
      timestamp: Date.now(),
    });
  };

  const clearQrBill = () => {
    setBillAmount('');
    setBillNote('');
    setGeneratedBill(null);
  };

  // Raise support ticket
  const handleRaiseComplaint = async () => {
    if (!complaintTitle.trim() || !complaintDesc.trim()) {
      Alert.alert('Fields Required', 'Please enter a title and description.');
      return;
    }

    setRaisingComplaint(true);
    try {
      const formData = new FormData();
      formData.append('title', complaintTitle);
      formData.append('description', complaintDesc);

      if (complaintFileUri) {
        const uriParts = complaintFileUri.split('.');
        const fileType = uriParts[uriParts.length - 1] || 'jpg';
        const fileName = `screenshot_${Date.now()}.${fileType}`;
        const mimeType = fileType === 'pdf' ? 'application/pdf' : `image/${fileType}`;

        if (Platform.OS === 'web') {
          const res = await fetch(complaintFileUri);
          const blob = await res.blob();
          const finalBlob = new Blob([blob], { type: mimeType });
          formData.append('screenshot', finalBlob, fileName);
        } else {
          formData.append('screenshot', {
            uri: complaintFileUri,
            name: fileName,
            type: mimeType,
          });
        }
      }

      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/complaints`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        Alert.alert('Ticket Raised', 'Support ticket has been raised successfully.');
        setComplaintTitle('');
        setComplaintDesc('');
        setComplaintFileUri('');
        setShowComplaintModal(false);
        fetchComplaints();
      } else {
        Alert.alert('Failed', data.error || 'Failed to raise complaint.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Network Error', 'Connection failed raising ticket.');
    } finally {
      setRaisingComplaint(false);
    }
  };

  const pickComplaintFile = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Denied', 'Permissions are required to browse photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setComplaintFileUri(result.assets[0].uri);
    }
  };

  // Edit profile update
  const handleUpdateProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Name Required', 'Please enter your name.');
      return;
    }

    setUpdatingProfile(true);
    try {
      const res = await updateProfile(editName, editAvatarUri);
      if (res.success) {
        Alert.alert('Profile Saved', 'Your profile details have been saved.');
        setShowEditProfileModal(false);
        setEditAvatarUri('');
        fetchMe();
      } else {
        Alert.alert('Update Failed', res.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingProfile(false);
    }
  };

  const pickProfileAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Denied', 'Permissions are required to select photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setEditAvatarUri(result.assets[0].uri);
    }
  };

  // Format static QR Code
  const staticQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(user?.email || '')}`;
  // Format dynamic bill QR Code
  const dynamicQrUrl = generatedBill
    ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(JSON.stringify(generatedBill))}`
    : '';

  // Render tab contents
  const renderTabContent = () => {
    if (activeTab === 'home') {
      const recentSales = history.filter(t => t.type === 'pay' || t.type === 'refund').slice(0, 4);

      if (activeSubView === 'qrbill') {
        return (
          <ScrollView style={styles.tabScroll} contentContainerStyle={styles.tabContent}>
            {/* Back Header */}
            <View style={styles.subViewHeader}>
              <TouchableOpacity onPress={() => setActiveSubView('dashboard')} style={styles.subViewBackButton}>
                <ArrowLeft size={16} color="#3b82f6" style={{ marginRight: 6 }} />
                <Text style={styles.subViewBackText}>Back to Terminal</Text>
              </TouchableOpacity>
            </View>

            {/* Create Payment QR Bill Card */}
            <View style={styles.settleFormCard}>
              <View style={styles.qrHeaderRow}>
                <QrCode size={20} color="#3b82f6" style={{ marginRight: 8 }} />
                <Text style={styles.qrFormTitle}>Create Payment QR Bill</Text>
              </View>

              <Text style={styles.qrFormLabel}>BILLING AMOUNT (₹)</Text>
              <TextInput
                placeholder="0.00"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                value={billAmount}
                onChangeText={setBillAmount}
                style={styles.qrFormInput}
              />

              <Text style={styles.qrFormLabel}>ITEM DETAILS / BILL NOTE</Text>
              <TextInput
                placeholder="e.g. Lunch meal token"
                placeholderTextColor="#64748b"
                value={billNote}
                onChangeText={setBillNote}
                style={styles.qrFormInput}
              />

              <TouchableOpacity
                onPress={handleGenerateQrBill}
                style={styles.qrFormButton}
              >
                <QrCode size={16} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.qrFormButtonText}>Generate Bill QR Code</Text>
              </TouchableOpacity>
            </View>

            {/* Terminal QR Bill Stand Card */}
            <View style={styles.qrDisplayStandCard}>
              {generatedBill ? (
                <View style={styles.qrStandActiveContent}>
                  <Text style={styles.qrStandTitle}>SCAN TO PAY TERMINAL</Text>
                  <View style={styles.qrStandImageFrame}>
                    <Image
                      source={{ uri: dynamicQrUrl }}
                      style={styles.qrStandImage}
                    />
                  </View>
                  <Text style={styles.qrStandAmount}>₹{generatedBill.amount.toFixed(2)}</Text>
                  <Text style={styles.qrStandNote}>"{generatedBill.description}"</Text>
                  <TouchableOpacity onPress={clearQrBill} style={styles.clearStandButton}>
                    <Text style={styles.clearStandButtonText}>Clear Dynamic Bill</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.qrStandPlaceholderContent}>
                  <QrCode size={48} color="#334155" style={{ marginBottom: 12 }} />
                  <Text style={styles.qrStandPlaceholderText}>Terminal QR Bill Stand will render here.</Text>
                </View>
              )}
            </View>
          </ScrollView>
        );
      }

      if (activeSubView === 'redeem') {
        return (
          <ScrollView style={styles.tabScroll} contentContainerStyle={styles.tabContent}>
            {/* Back Header */}
            <View style={styles.subViewHeader}>
              <TouchableOpacity onPress={() => setActiveSubView('dashboard')} style={styles.subViewBackButton}>
                <ArrowLeft size={16} color="#3b82f6" style={{ marginRight: 6 }} />
                <Text style={styles.subViewBackText}>Back to Terminal</Text>
              </TouchableOpacity>
            </View>

            {/* Main Redeem Request Card */}
            <View style={styles.settleFormCard}>
              <View style={styles.qrHeaderRow}>
                <Coins size={20} color="#3b82f6" style={{ marginRight: 8 }} />
                <Text style={styles.qrFormTitle}>Request Bank Settlement</Text>
              </View>

              <View style={styles.redeemWalletBalanceBlock}>
                <Text style={styles.redeemWalletLabel}>REDEEMABLE BALANCE</Text>
                <Text style={styles.redeemWalletAmount}>
                  ₹{user?.walletBalance ? user.walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                </Text>
              </View>

              {settleError ? (
                <View style={styles.inlineErrorBlock}>
                  <Text style={styles.inlineErrorText}>{settleError}</Text>
                </View>
              ) : null}

              <Text style={styles.qrFormLabel}>ENTER REDEMPTION AMOUNT (₹)</Text>
              <TextInput
                placeholder="0.00"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                value={settleAmount}
                onChangeText={(val) => {
                  setSettleAmount(val);
                  setSettleError('');
                }}
                style={styles.qrFormInput}
              />

              <Text style={styles.qrFormLabel}>ENTER SECURITY MPIN</Text>
              <TextInput
                placeholder="••••"
                placeholderTextColor="#64748b"
                secureTextEntry
                keyboardType="number-pad"
                maxLength={4}
                value={settleMpin}
                onChangeText={(val) => {
                  setSettleMpin(val.replace(/\D/g, ''));
                  setSettleError('');
                }}
                style={[styles.qrFormInput, { letterSpacing: 8, textAlign: 'center', fontWeight: 'bold' }]}
              />

              <TouchableOpacity
                onPress={handleSettlement}
                disabled={settling}
                style={styles.qrFormButton}
              >
                {settling ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Coins size={16} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.qrFormButtonText}>Confirm Redemption Request</Text>
                  </>
                )}
              </TouchableOpacity>

              {user?.bankDetails?.accountNo ? (
                <Text style={styles.settleToText}>
                  Settle to: <Text style={{ color: '#fff' }}>{user.bankDetails.bankName} (A/C *{user.bankDetails.accountNo.slice(-4)})</Text>
                </Text>
              ) : (
                <Text style={styles.settleWarnText}>
                  * No settlement bank account registered. Open the Payouts tab to configure.
                </Text>
              )}
            </View>

            {/* KYC Status banner if not approved */}
            {user?.kycStatus !== 'approved' && (
              <View style={styles.kycWarningCard}>
                <View style={styles.kycWarningHeader}>
                  <ShieldAlert size={20} color="#f59e0b" />
                  <Text style={styles.kycWarningTitle}>KYC Verification Required</Text>
                </View>
                <Text style={styles.kycWarningText}>
                  Settlements are blocked until your KYC documents are approved.
                </Text>
              </View>
            )}
          </ScrollView>
        );
      }

      if (activeSubView === 'refund') {
        return (
          <ScrollView style={styles.tabScroll} contentContainerStyle={styles.tabContent}>
            {/* Back Header */}
            <View style={styles.subViewHeader}>
              <TouchableOpacity onPress={() => setActiveSubView('dashboard')} style={styles.subViewBackButton}>
                <ArrowLeft size={16} color="#a855f7" style={{ marginRight: 6 }} />
                <Text style={[styles.subViewBackText, { color: '#a855f7' }]}>Back to Terminal</Text>
              </TouchableOpacity>
            </View>

            {/* Main Refund Card */}
            <View style={[styles.settleFormCard, { borderColor: 'rgba(168, 85, 247, 0.15)' }]}>
              <View style={styles.qrHeaderRow}>
                <Send size={20} color="#a855f7" style={{ marginRight: 8 }} />
                <Text style={styles.qrFormTitle}>Send Money to Student (Refund)</Text>
              </View>

              {refundError ? (
                <View style={styles.inlineErrorBlock}>
                  <Text style={styles.inlineErrorText}>{refundError}</Text>
                </View>
              ) : null}

              <Text style={styles.qrFormLabel}>STUDENT EMAIL ADDRESS</Text>
              <TextInput
                placeholder="student@college.edu"
                placeholderTextColor="#64748b"
                autoCapitalize="none"
                keyboardType="email-address"
                value={refundStudentEmail}
                onChangeText={(val) => {
                  setRefundStudentEmail(val);
                  setRefundError('');
                }}
                style={styles.qrFormInput}
              />

              <Text style={styles.qrFormLabel}>AMOUNT TO SEND (₹)</Text>
              <TextInput
                placeholder="0.00"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                value={refundAmount}
                onChangeText={(val) => {
                  setRefundAmount(val);
                  setRefundError('');
                }}
                style={styles.qrFormInput}
              />

              <Text style={styles.qrFormLabel}>ENTER SECURITY MPIN</Text>
              <TextInput
                placeholder="••••"
                placeholderTextColor="#64748b"
                secureTextEntry
                keyboardType="number-pad"
                maxLength={4}
                value={refundMpin}
                onChangeText={(val) => {
                  setRefundMpin(val.replace(/\D/g, ''));
                  setRefundError('');
                }}
                style={[styles.qrFormInput, { letterSpacing: 8, textAlign: 'center', fontWeight: 'bold' }]}
              />

              <TouchableOpacity
                onPress={handleSendToStudent}
                disabled={refunding}
                style={[styles.qrFormButton, { backgroundColor: '#a855f7' }]}
              >
                {refunding ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Send size={16} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.qrFormButtonText}>Confirm Refund Transfer</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.settleToText}>
                * This will deduct from your earnings, credit the central institute fund balance, and record a refund transaction reducing the student's spent spending.
              </Text>
            </View>
          </ScrollView>
        );
      }

      // Default sub-view: Terminal Dashboard Overview
      return (
        <ScrollView style={styles.tabScroll} contentContainerStyle={styles.tabContent}>
          {/* KYC Status block (if not approved) */}
          {user?.kycStatus !== 'approved' && (
            <View style={styles.kycWarningCard}>
              <View style={styles.kycWarningHeader}>
                <ShieldAlert size={20} color="#f59e0b" />
                <Text style={styles.kycWarningTitle}>KYC Verification Pending</Text>
              </View>
              <Text style={styles.kycWarningText}>
                {user?.kycStatus === 'pending'
                  ? 'Your business documents are undergoing administration audit. Settlements are blocked until approved.'
                  : 'Please configure and upload your Business Registration or ID proof document to receive settlements.'}
              </Text>
              {user?.kycStatus !== 'pending' && (
                <TouchableOpacity
                  onPress={handleKycUpload}
                  disabled={kycUploading}
                  style={styles.kycUploadButton}
                >
                  {kycUploading ? (
                    <ActivityIndicator size="small" color="#030712" />
                  ) : (
                    <>
                      <UploadCloud size={15} color="#030712" style={{ marginRight: 6 }} />
                      <Text style={styles.kycUploadButtonText}>Upload KYC Documents</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Double Stats Cards Row */}
          <View style={styles.doubleStatsRow}>
            <View style={styles.statCardHalf}>
              <View style={styles.statIconFrameGreen}>
                <TrendingUp size={18} color="#10b981" />
              </View>
              <Text style={styles.statLabelHalf}>SALES VOLUME</Text>
              <Text style={styles.statValueHalf}>
                ₹{stats?.totalEarnings ? stats.totalEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
              </Text>
              <Text style={styles.statSubTextHalfGreen}>Cumulative</Text>
            </View>

            <View style={styles.statCardHalf}>
              <View style={styles.statIconFrameBlue}>
                <Landmark size={16} color="#3b82f6" />
              </View>
              <Text style={styles.statLabelHalf}>SETTLEMENT BAL</Text>
              <Text style={styles.statValueHalf}>
                ₹{user?.walletBalance ? user.walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
              </Text>
              <Text style={styles.statSubTextHalfBlue}>Redeemable</Text>
            </View>
          </View>

          {/* Quick Actions Grid */}
          <Text style={styles.servicesSectionHeader}>QUICK TERMINAL ACTIONS</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              onPress={() => {
                setSettleError('');
                setActiveSubView('qrbill');
              }}
              style={styles.quickActionBtnBlue}
            >
              <View style={styles.quickActionIconFrameBlue}>
                <QrCode size={18} color="#3b82f6" />
              </View>
              <Text style={styles.quickActionBtnTitle}>Create Bill QR</Text>
              <Text style={styles.quickActionBtnDesc}>Invoice dynamic amount</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setSettleError('');
                setActiveSubView('redeem');
              }}
              style={styles.quickActionBtnGreen}
            >
              <View style={styles.quickActionIconFrameGreen}>
                <Coins size={18} color="#10b981" />
              </View>
              <Text style={styles.quickActionBtnTitle}>Redeem Earnings</Text>
              <Text style={styles.quickActionBtnDesc}>Settle cash to bank</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setRefundError('');
                setActiveSubView('refund');
              }}
              style={styles.quickActionBtnPurple}
            >
              <View style={styles.quickActionIconFramePurple}>
                <Send size={18} color="#a855f7" />
              </View>
              <Text style={styles.quickActionBtnTitle}>Send to Student</Text>
              <Text style={styles.quickActionBtnDesc}>Refund earnings to user</Text>
            </TouchableOpacity>
          </View>

          {/* Recent Activity sales list */}
          <View style={styles.recentTxSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.servicesSectionHeader}>RECENT SALES TIMELINE</Text>
              <TouchableOpacity onPress={() => setActiveTab('sales')}>
                <Text style={styles.viewAllText}>View Sales</Text>
              </TouchableOpacity>
            </View>

            {recentSales.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No sales recorded yet.</Text>
              </View>
            ) : (
              recentSales.map((txn) => {
                const isRefund = txn.type === 'refund';
                return (
                  <TouchableOpacity
                    key={txn._id}
                    onPress={() => {
                      setSelectedTxn(txn);
                      setShowReceiptModal(true);
                    }}
                    style={styles.txRow}
                  >
                    <View style={styles.txRowLeft}>
                      <View style={[
                        styles.txIndicatorCircle,
                        isRefund ? { backgroundColor: 'rgba(168, 85, 247, 0.08)' } : styles.txCircleCredit
                      ]}>
                        {isRefund ? (
                          <Send size={14} color="#a855f7" />
                        ) : (
                          <ArrowDownLeft size={16} color="#34d399" />
                        )}
                      </View>
                      <View>
                        <Text style={styles.txName} numberOfLines={1}>
                          {isRefund ? `Refund to: ${txn.receiver?.name || 'Student'}` : (txn.sender?.name || 'Student Payment')}
                        </Text>
                        <Text style={styles.txMeta}>{new Date(txn.createdAt).toLocaleDateString()}</Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[
                        styles.txAmountText,
                        isRefund ? { color: '#a855f7' } : styles.txAmountCredit
                      ]}>
                        {isRefund ? '-' : '+'}₹{txn.amount.toFixed(2)}
                      </Text>
                      {txn.description && (
                        <Text style={styles.txDescriptionDesc} numberOfLines={1}>
                          {txn.description}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </ScrollView>
      );
    } else if (activeTab === 'sales') {
      const studentPayments = history.filter(t => {
        if (t.type !== 'pay' && t.type !== 'refund') return false;
        
        const senderName = t.sender?.name || '';
        const senderEmail = t.sender?.email || '';
        const receiverName = t.receiver?.name || '';
        const receiverEmail = t.receiver?.email || '';
        const notes = t.description || '';
        return (
          senderName.toLowerCase().includes(salesSearch.toLowerCase()) ||
          senderEmail.toLowerCase().includes(salesSearch.toLowerCase()) ||
          receiverName.toLowerCase().includes(salesSearch.toLowerCase()) ||
          receiverEmail.toLowerCase().includes(salesSearch.toLowerCase()) ||
          notes.toLowerCase().includes(salesSearch.toLowerCase())
        );
      });

      return (
        <View style={styles.historyTabContainer}>
          {/* Header Search bar */}
          <View style={styles.searchBarRow}>
            <View style={styles.searchContainer}>
              <Search size={16} color="#64748b" style={{ marginRight: 8 }} />
              <TextInput
                placeholder="Search student, reference note..."
                placeholderTextColor="#64748b"
                value={salesSearch}
                onChangeText={setSalesSearch}
                style={styles.searchInput}
              />
            </View>
          </View>

          <ScrollView style={styles.tabScroll} contentContainerStyle={styles.tabContent}>
            <Text style={styles.servicesSectionHeader}>SALES LOGS ({studentPayments.length})</Text>
            
            {studentPayments.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No sales transactions found.</Text>
              </View>
            ) : (
              studentPayments.map((txn) => {
                const isRefund = txn.type === 'refund';
                return (
                  <TouchableOpacity
                    key={txn._id}
                    onPress={() => {
                      setSelectedTxn(txn);
                      setShowReceiptModal(true);
                    }}
                    style={styles.txRow}
                  >
                    <View style={styles.txRowLeft}>
                      <View style={[
                        styles.txIndicatorCircle,
                        isRefund ? { backgroundColor: 'rgba(168, 85, 247, 0.08)' } : styles.txCircleCredit
                      ]}>
                        {isRefund ? (
                          <Send size={16} color="#a855f7" />
                        ) : (
                          <ArrowDownLeft size={16} color="#34d399" />
                        )}
                      </View>
                      <View>
                        <Text style={styles.txName}>
                          {isRefund ? `Refund to: ${txn.receiver?.name || 'Student'}` : (txn.sender?.name || 'Student User')}
                        </Text>
                        <Text style={styles.txMeta}>{new Date(txn.createdAt).toLocaleString()}</Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[
                        styles.txAmountText,
                        isRefund ? { color: '#a855f7' } : styles.txAmountCredit
                      ]}>
                        {isRefund ? '-' : '+'}₹{txn.amount.toFixed(2)}
                      </Text>
                      {txn.description && (
                        <Text style={styles.txDescriptionDesc} numberOfLines={1}>
                          {txn.description}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      );
    } else if (activeTab === 'payouts') {
      const redemptions = history.filter(t => t.type === 'redeem');

      return (
        <ScrollView style={styles.tabScroll} contentContainerStyle={styles.tabContent}>
          {/* Configure bank account */}
          <View style={styles.settleFormCard}>
            <Text style={styles.settleHeaderTitle}>SETTLEMENT BANK ACCOUNT DETAILS</Text>
            
            <TextInput
              placeholder="Bank Name (e.g. HDFC Bank)"
              placeholderTextColor="#64748b"
              value={bankName}
              onChangeText={setBankName}
              style={styles.modalInput}
            />

            <TextInput
              placeholder="Account Number"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={accountNo}
              onChangeText={setAccountNo}
              style={styles.modalInput}
            />

            <TextInput
              placeholder="IFSC Code"
              placeholderTextColor="#64748b"
              autoCapitalize="characters"
              value={ifsc}
              onChangeText={setIfsc}
              style={styles.modalInput}
            />

            <TouchableOpacity
              onPress={handleSaveBank}
              disabled={savingBank}
              style={styles.generateBillSubmitButton}
            >
              {savingBank ? (
                <ActivityIndicator size="small" color="#030712" />
              ) : (
                <>
                  <Check size={16} color="#030712" style={{ marginRight: 6 }} />
                  <Text style={styles.generateBillSubmitButtonText}>Save Bank Credentials</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Payout History logs */}
          <View style={styles.recentTxSection}>
            <Text style={styles.servicesSectionHeader}>BANK SETTLEMENT LOGS ({redemptions.length})</Text>
            
            {redemptions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No redemption logs found.</Text>
              </View>
            ) : (
              redemptions.map((txn) => (
                <TouchableOpacity
                  key={txn._id}
                  onPress={() => {
                    setSelectedTxn(txn);
                    setShowReceiptModal(true);
                  }}
                  style={styles.txRow}
                >
                  <View style={styles.txRowLeft}>
                    <View style={[styles.txIndicatorCircle, styles.txCircleDebit]}>
                      <ArrowUpRight size={16} color="#f43f5e" />
                    </View>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.txName} numberOfLines={1}>Bank Payout Settle</Text>
                      {txn.description && (
                        <Text style={[styles.txMeta, { color: '#94a3b8', fontSize: 10, marginTop: 1, marginBottom: 1 }]} numberOfLines={1}>
                          {txn.description}
                        </Text>
                      )}
                      <Text style={styles.txMeta}>{new Date(txn.createdAt).toLocaleString()}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.txAmountText, styles.txAmountDebit]}>
                      -₹{txn.amount.toFixed(2)}
                    </Text>
                    <View style={[
                      styles.ticketStatusTag,
                      txn.status === 'success' ? styles.statusTagResolved : txn.status === 'rejected' ? styles.statusTagOpen : { backgroundColor: 'rgba(245, 158, 11, 0.1)' }
                    ]}>
                      <Text style={[
                        styles.ticketStatusTagText,
                        txn.status === 'success' ? styles.statusTagResolvedText : txn.status === 'rejected' ? { color: '#ef4444' } : { color: '#fbbf24' }
                      ]}>
                        {txn.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      );
    } else if (activeTab === 'support') {
      const filteredComplaints = complaints.filter(ticket =>
        ticket.title.toLowerCase().includes(ticketsSearch.toLowerCase()) ||
        ticket.description.toLowerCase().includes(ticketsSearch.toLowerCase())
      );

      const openTicketsCount = complaints.filter(t => t.status === 'open').length;
      const resolvedTicketsCount = complaints.filter(t => t.status === 'resolved').length;

      return (
        <View style={styles.historyTabContainer}>
          {/* KYC Warning Banner */}
          {user?.kycStatus !== 'approved' && (
            <View style={styles.kycWarningCard}>
              <View style={styles.kycWarningHeader}>
                <ShieldAlert size={18} color="#ef4444" />
                <Text style={[styles.kycWarningTitle, { color: '#ef4444' }]}>KYC Verification Required</Text>
              </View>
              <Text style={styles.kycWarningText}>
                Your KYC is pending admin review. All merchant features (Home, Sales, Payouts) are locked. You may only raise support tickets or view complaint history until your KYC is approved.
              </Text>
            </View>
          )}

          {/* Ticket Stats */}
          <View style={styles.ticketsHeaderCard}>
            <View style={styles.ticketStatsRow}>
              <View style={styles.ticketStatCol}>
                <Text style={styles.ticketStatCount}>{complaints.length}</Text>
                <Text style={styles.ticketStatLabel}>Total Tickets</Text>
              </View>
              <View style={styles.ticketStatCol}>
                <Text style={[styles.ticketStatCount, { color: '#fbbf24' }]}>{openTicketsCount}</Text>
                <Text style={styles.ticketStatLabel}>Open</Text>
              </View>
              <View style={styles.ticketStatCol}>
                <Text style={[styles.ticketStatCount, { color: '#34d399' }]}>{resolvedTicketsCount}</Text>
                <Text style={styles.ticketStatLabel}>Resolved</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setShowComplaintModal(true)}
              style={styles.raiseTicketButton}
            >
              <MessageSquare size={16} color="#030712" style={{ marginRight: 6 }} />
              <Text style={styles.raiseTicketButtonText}>Raise Support Ticket</Text>
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={styles.searchBarRow}>
            <View style={styles.searchContainer}>
              <Search size={16} color="#64748b" style={{ marginRight: 8 }} />
              <TextInput
                placeholder="Search ticket title, details..."
                placeholderTextColor="#64748b"
                value={ticketsSearch}
                onChangeText={setTicketsSearch}
                style={styles.searchInput}
              />
            </View>
          </View>

          <ScrollView style={styles.tabScroll} contentContainerStyle={styles.tabContent}>
            {filteredComplaints.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No support tickets filed.</Text>
              </View>
            ) : (
              filteredComplaints.map((ticket) => (
                <View key={ticket._id} style={styles.ticketCard}>
                  <View style={styles.ticketCardHeader}>
                    <Text style={styles.ticketTitleText} numberOfLines={1}>{ticket.title}</Text>
                    <View style={[
                      styles.ticketStatusTag,
                      ticket.status === 'resolved' ? styles.statusTagResolved : styles.statusTagOpen
                    ]}>
                      <Text style={[
                        styles.ticketStatusTagText,
                        ticket.status === 'resolved' ? styles.statusTagResolvedText : styles.statusTagOpenText
                      ]}>
                        {ticket.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.ticketDescText}>{ticket.description}</Text>
                  
                  {ticket.screenshot && (
                    <View style={styles.attachmentLinkRow}>
                      <ImageIcon size={12} color="#3b82f6" style={{ marginRight: 4 }} />
                      <Text style={styles.attachmentLinkText} numberOfLines={1}>Attachment uploaded</Text>
                    </View>
                  )}

                  <View style={styles.ticketFooter}>
                    <Text style={styles.ticketDateText}>{new Date(ticket.createdAt).toLocaleDateString()} at {new Date(ticket.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                    {ticket.status === 'resolved' && ticket.resolvedBy && (
                      <Text style={styles.resolvedByText}>By {ticket.resolvedBy.name}</Text>
                    )}
                  </View>

                  {ticket.status === 'resolved' && ticket.response && (
                    <View style={{ backgroundColor: 'rgba(16,185,129,0.05)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.1)', borderRadius: 10, padding: 10, marginTop: 6 }}>
                      <Text style={{ fontSize: 8, color: '#34d399', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Admin Response</Text>
                      <Text style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>"{ticket.response}"</Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      );
    }
  };

  return (
    <View style={styles.screenBg}>
      {/* Top Header Appbar */}
      <View style={styles.topAppBar}>
        <TouchableOpacity
          onPress={() => {
            setEditName(user?.name || '');
            setShowEditProfileModal(true);
          }}
          style={styles.profileAvatarButton}
        >
          {user?.profileImage ? (
            <Image source={{ uri: getImageUrl(user.profileImage) }} style={styles.profileAvatarImage} />
          ) : (
            <View style={styles.defaultAvatarCircle}>
              <Text style={styles.defaultAvatarText}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'M'}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerSubtitle}>MERCHANT TERMINAL</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.headerMainTitle}>{user?.name || 'Karthik'}</Text>
            <View style={styles.headerKycDotDivider} />
            <Text style={[styles.headerKycText, user?.kycStatus === 'approved' ? { color: '#34d399' } : { color: '#fbbf24' }]}>
              {user?.kycStatus === 'approved' ? 'Active' : 'Pending KYC'}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setShowNotifications(true)}
            style={styles.headerIconButton}
          >
            <Bell size={18} color="#fff" />
            {notifications.filter(n => !n.isRead).length > 0 && (
              <View style={styles.notificationsBadge} />
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={logout} style={styles.headerIconButton}>
            <LogOut size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Tab Area */}
      <View style={styles.bodyContainer}>
        {renderTabContent()}
      </View>

      {/* Bottom Tab Bar */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity
          onPress={() => {
            if (user?.kycStatus !== 'approved') return;
            setActiveTab('home');
            setActiveSubView('dashboard');
          }}
          style={[styles.tabBarItem, user?.kycStatus !== 'approved' && { opacity: 0.35 }]}
        >
          <TrendingUp size={20} color={activeTab === 'home' ? '#3b82f6' : '#64748b'} />
          <Text style={[styles.tabBarLabel, activeTab === 'home' && styles.tabBarLabelActive]}>HOME</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => { if (user?.kycStatus !== 'approved') return; setActiveTab('sales'); }}
          style={[styles.tabBarItem, user?.kycStatus !== 'approved' && { opacity: 0.35 }]}
        >
          <History size={20} color={activeTab === 'sales' ? '#3b82f6' : '#64748b'} />
          <Text style={[styles.tabBarLabel, activeTab === 'sales' && styles.tabBarLabelActive]}>SALES</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => { if (user?.kycStatus !== 'approved') return; setActiveTab('payouts'); }}
          style={[styles.tabBarItem, user?.kycStatus !== 'approved' && { opacity: 0.35 }]}
        >
          <Landmark size={20} color={activeTab === 'payouts' ? '#3b82f6' : '#64748b'} />
          <Text style={[styles.tabBarLabel, activeTab === 'payouts' && styles.tabBarLabelActive]}>PAYOUTS</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('support')}
          style={styles.tabBarItem}
        >
          <MessageSquare size={20} color={activeTab === 'support' ? '#3b82f6' : '#64748b'} />
          <Text style={[styles.tabBarLabel, activeTab === 'support' && styles.tabBarLabelActive]}>SUPPORT</Text>
        </TouchableOpacity>
      </View>

      {/* EDIT PROFILE CONFIG MODAL */}
      <Modal visible={showEditProfileModal} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Merchant Profile Settings</Text>

            <TouchableOpacity onPress={pickProfileAvatar} style={styles.avatarSelectContainer}>
              {editAvatarUri ? (
                <Image source={{ uri: editAvatarUri }} style={styles.avatarEditPreview} />
              ) : user?.profileImage ? (
                <Image source={{ uri: getImageUrl(user.profileImage) }} style={styles.avatarEditPreview} />
              ) : (
                <View style={styles.avatarPlaceholderCircle}>
                  <ImageIcon size={32} color="#64748b" />
                </View>
              )}
              <Text style={styles.avatarPickerLabel}>Change Photo</Text>
            </TouchableOpacity>

            <TextInput
              placeholder="Merchant / Company Name"
              placeholderTextColor="#64748b"
              style={styles.modalInput}
              value={editName}
              onChangeText={setEditName}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowEditProfileModal(false)} style={styles.modalCancel}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleUpdateProfile} style={styles.modalSubmit} disabled={updatingProfile}>
                {updatingProfile ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSubmitText}>Save Changes</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* NOTIFICATIONS MODAL */}
      <Modal visible={showNotifications} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalContentWide}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitleLeft}>Notifications</Text>
              <TouchableOpacity
                onPress={() => {
                  markAllNotificationsRead();
                  setShowNotifications(false);
                }}
                style={styles.markReadButton}
              >
                <Text style={styles.markReadText}>Mark Read & Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400, marginTop: 12 }}>
              {notifications.length === 0 ? (
                <Text style={styles.emptyNotificationsText}>No notifications logged.</Text>
              ) : (
                notifications.map((n) => (
                  <View key={n._id} style={[styles.notificationCard, !n.isRead && styles.unreadNotificationCard]}>
                    <View style={styles.notifRowTop}>
                      <Text style={styles.notifTitle}>{n.title}</Text>
                      <TouchableOpacity onPress={() => deleteNotification(n._id)}>
                        <Trash2 size={14} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.notifMessage}>{n.message}</Text>
                    <Text style={styles.notifDate}>{new Date(n.createdAt).toLocaleDateString()} at {new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                  </View>
                ))
              )}
            </ScrollView>

            <TouchableOpacity onPress={() => setShowNotifications(false)} style={styles.closeFullModalButton}>
              <Text style={styles.closeFullModalButtonText}>Close Drawer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* FILE CLAIM/SUPPORT TICKET MODAL */}
      <Modal visible={showComplaintModal} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>File support ticket / claim</Text>

            <TextInput
              placeholder="Title (e.g. Settlement issue, Billing query)"
              placeholderTextColor="#64748b"
              style={styles.modalInput}
              value={complaintTitle}
              onChangeText={setComplaintTitle}
            />

            <TextInput
              placeholder="Provide exact details of your query..."
              placeholderTextColor="#64748b"
              style={[styles.modalInput, { height: 100, textAlignVertical: 'top' }]}
              multiline={true}
              numberOfLines={4}
              value={complaintDesc}
              onChangeText={setComplaintDesc}
            />

            <TouchableOpacity onPress={pickComplaintFile} style={styles.filePickerButton}>
              <ImageIcon size={16} color="#3b82f6" style={{ marginRight: 8 }} />
              <Text style={styles.filePickerButtonText}>
                {complaintFileUri ? 'Screenshot selected ✓' : 'Attach supporting image'}
              </Text>
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowComplaintModal(false)} style={styles.modalCancel}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleRaiseComplaint} style={styles.modalSubmit} disabled={raisingComplaint}>
                {raisingComplaint ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSubmitText}>File Claim</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DETAILED RECEIPT MODAL */}
      <Modal visible={showReceiptModal} animationType="fade" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalContentReceipt}>
            <View style={styles.receiptHeader}>
              <View style={styles.receiptCheckCircle}>
                <CheckCircle2 size={40} color={selectedTxn?.status === 'rejected' ? '#ef4444' : '#10b981'} />
              </View>
              <Text style={styles.receiptTitle}>
                {selectedTxn?.type === 'redeem' ? 'Settlement Invoice' : selectedTxn?.type === 'refund' ? 'Refund Invoice' : 'Sale Transaction Invoice'}
              </Text>
              <Text style={styles.receiptAmount}>₹{selectedTxn?.amount?.toFixed(2)}</Text>
              <Text style={[
                styles.receiptStatusText,
                selectedTxn?.status === 'rejected' ? { color: '#ef4444' } : selectedTxn?.status === 'pending' ? { color: '#fbbf24' } : { color: '#10b981' }
              ]}>
                {selectedTxn?.status?.toUpperCase()}
              </Text>
            </View>

            <View style={styles.receiptDivider} />

            <View style={styles.receiptDetailsContainer}>
              <View style={styles.receiptDetailRow}>
                <Text style={styles.receiptDetailLabel}>Transaction ID</Text>
                <Text style={styles.receiptDetailValue} numberOfLines={1}>{selectedTxn?._id}</Text>
              </View>
              <View style={styles.receiptDetailRow}>
                <Text style={styles.receiptDetailLabel}>Date & Time</Text>
                <Text style={styles.receiptDetailValue}>{selectedTxn ? new Date(selectedTxn.createdAt).toLocaleString() : ''}</Text>
              </View>
              <View style={styles.receiptDetailRow}>
                <Text style={styles.receiptDetailLabel}>
                  {selectedTxn?.type === 'redeem' ? 'Requester Merchant' : selectedTxn?.type === 'refund' ? 'Sender Merchant' : 'Sender Student'}
                </Text>
                <Text style={styles.receiptDetailValue}>
                  {selectedTxn?.type === 'redeem' ? user?.name : selectedTxn?.type === 'refund' ? user?.name : selectedTxn?.sender?.name}
                </Text>
              </View>
              {selectedTxn?.type !== 'redeem' && (
                <View style={styles.receiptDetailRow}>
                  <Text style={styles.receiptDetailLabel}>
                    {selectedTxn?.type === 'refund' ? 'Recipient Student' : 'Recipient Merchant'}
                  </Text>
                  <Text style={styles.receiptDetailValue}>
                    {selectedTxn?.type === 'refund' ? selectedTxn?.receiver?.name : user?.name}
                  </Text>
                </View>
              )}
              <View style={styles.receiptDetailRow}>
                <Text style={styles.receiptDetailLabel}>Description</Text>
                <Text style={styles.receiptDetailValue}>{selectedTxn?.description || 'N/A'}</Text>
              </View>
            </View>

            <View style={styles.receiptDivider} />

            <View style={styles.receiptFooter}>
              <Text style={styles.receiptFooterText}>CAMPUSPAY merchant billing secure audit</Text>
            </View>

            <TouchableOpacity
              onPress={() => setShowReceiptModal(false)}
              style={styles.receiptCloseButton}
            >
              <Text style={styles.receiptCloseButtonText}>Close Invoice</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenBg: {
    flex: 1,
    backgroundColor: '#050811',
  },
  topAppBar: {
    height: 75,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0d17',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    paddingTop: 15,
  },
  profileAvatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  profileAvatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  defaultAvatarCircle: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1e3a8a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerSubtitle: {
    color: '#3b82f6',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerMainTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  headerKycDotDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#475569',
    marginHorizontal: 6,
  },
  headerKycText: {
    fontSize: 10,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationsBadge: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  bodyContainer: {
    flex: 1,
  },
  tabScroll: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
    paddingBottom: 32,
  },
  kycWarningCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  kycWarningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  kycWarningTitle: {
    color: '#f59e0b',
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 8,
  },
  kycWarningText: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 12,
  },
  kycUploadButton: {
    backgroundColor: '#fbbf24',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    height: 36,
  },
  kycUploadButtonText: {
    color: '#030712',
    fontSize: 11,
    fontWeight: '800',
  },
  doubleStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCardHalf: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.015)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    padding: 16,
  },
  statIconFrameGreen: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statIconFrameBlue: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statLabelHalf: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  statValueHalf: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    marginVertical: 4,
  },
  statSubTextHalfGreen: {
    color: '#10b981',
    fontSize: 9,
    fontWeight: '800',
  },
  statSubTextHalfBlue: {
    color: '#3b82f6',
    fontSize: 9,
    fontWeight: '800',
  },
  settleFormCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.015)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    padding: 20,
    marginBottom: 24,
  },
  settleHeaderTitle: {
    color: '#3b82f6',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  settleFormRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  settleInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#020005',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 12,
    color: '#fff',
    fontSize: 13,
  },
  settleConfirmButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settleConfirmButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '850',
    letterSpacing: 0.3,
  },
  settleToText: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 10,
  },
  settleWarnText: {
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 10,
  },
  recentTxSection: {
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  servicesSectionHeader: {
    color: '#3b82f6',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  viewAllText: {
    color: '#3b82f6',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyContainer: {
    paddingVertical: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 12,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  txRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  txIndicatorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txCircleDebit: {
    backgroundColor: 'rgba(244, 63, 94, 0.08)',
  },
  txCircleCredit: {
    backgroundColor: 'rgba(52, 211, 153, 0.08)',
  },
  txName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  txMeta: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 2,
  },
  txAmountText: {
    fontSize: 14,
    fontWeight: '800',
  },
  txAmountDebit: {
    color: '#f43f5e',
  },
  txAmountCredit: {
    color: '#34d399',
  },
  txDescriptionDesc: {
    color: '#64748b',
    fontSize: 9,
    marginTop: 2,
    maxWidth: 120,
  },
  redeemStatusLabelMini: {
    fontSize: 8,
    fontWeight: '850',
    marginTop: 2,
  },
  qrCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.015)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  qrCardTitle: {
    color: '#3b82f6',
    fontSize: 10,
    fontWeight: '850',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  qrImageBorder: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 18,
    shadowColor: '#3b82f6',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
  },
  qrImage: {
    width: 180,
    height: 180,
  },
  qrAccountText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 14,
  },
  qrHelperLabel: {
    color: '#64748b',
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
    marginTop: 14,
  },
  activeBillDetailsBlock: {
    width: '100%',
    alignItems: 'center',
    marginTop: 14,
    padding: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderRadius: 14,
  },
  activeBillAmount: {
    color: '#10b981',
    fontSize: 24,
    fontWeight: '900',
  },
  activeBillNote: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  clearBillButton: {
    marginTop: 10,
    height: 30,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearBillButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  generateBillSubmitButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 42,
    borderRadius: 12,
    marginTop: 6,
  },
  generateBillSubmitButtonText: {
    color: '#030712',
    fontSize: 11,
    fontWeight: '850',
  },
  bottomTabBar: {
    height: 64,
    flexDirection: 'row',
    backgroundColor: '#0a0d17',
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    paddingBottom: Platform.OS === 'ios' ? 12 : 6,
    paddingTop: 8,
  },
  tabBarItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBarLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 4,
  },
  tabBarLabelActive: {
    color: '#3b82f6',
  },
  historyTabContainer: {
    flex: 1,
  },
  searchBarRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchContainer: {
    height: 42,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 12,
    height: '100%',
  },
  ticketsHeaderCard: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.015)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 20,
    padding: 16,
  },
  ticketStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  ticketStatCol: {
    alignItems: 'center',
  },
  ticketStatCount: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  ticketStatLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  raiseTicketButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 40,
    borderRadius: 12,
  },
  raiseTicketButtonText: {
    color: '#030712',
    fontSize: 12,
    fontWeight: '800',
  },
  ticketCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.015)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  ticketCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ticketTitleText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
    marginRight: 12,
  },
  ticketStatusTag: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  statusTagOpen: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
  },
  statusTagResolved: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  ticketStatusTagText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  statusTagOpenText: {
    color: '#fbbf24',
  },
  statusTagResolvedText: {
    color: '#34d399',
  },
  ticketDescText: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 10,
  },
  attachmentLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.04)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  attachmentLinkText: {
    color: '#3b82f6',
    fontSize: 9,
    fontWeight: '700',
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    paddingTop: 8,
  },
  ticketDateText: {
    color: '#64748b',
    fontSize: 9,
  },
  resolvedByText: {
    color: '#34d399',
    fontSize: 9,
    fontWeight: '700',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#080c18',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24,
    padding: 24,
  },
  modalContentWide: {
    backgroundColor: '#080c18',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalTitleLeft: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  markReadButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 8,
  },
  markReadText: {
    color: '#3b82f6',
    fontSize: 10,
    fontWeight: '700',
  },
  modalInput: {
    backgroundColor: '#020005',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 14,
    color: '#fff',
    height: 46,
    fontSize: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  modalCancel: {
    flex: 1,
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalCancelText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  modalSubmit: {
    flex: 1,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSubmitText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  avatarSelectContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarEditPreview: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  avatarPlaceholderCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPickerLabel: {
    color: '#3b82f6',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
  },
  notificationCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.015)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  unreadNotificationCard: {
    borderColor: 'rgba(59, 130, 246, 0.2)',
    backgroundColor: 'rgba(59, 130, 246, 0.02)',
  },
  notifRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notifTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
    marginRight: 10,
  },
  notifMessage: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 4,
    lineHeight: 15,
  },
  notifDate: {
    color: '#64748b',
    fontSize: 9,
    marginTop: 6,
  },
  emptyNotificationsText: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 32,
  },
  closeFullModalButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  closeFullModalButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  filePickerButton: {
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.15)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  filePickerButtonText: {
    color: '#3b82f6',
    fontSize: 11,
    fontWeight: '700',
  },
  modalContentReceipt: {
    backgroundColor: '#080c18',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  receiptHeader: {
    alignItems: 'center',
    marginTop: 8,
  },
  receiptCheckCircle: {
    marginBottom: 12,
  },
  receiptTitle: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  receiptAmount: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
    marginVertical: 6,
  },
  receiptStatusText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  receiptDivider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 18,
    borderStyle: 'dashed',
    borderRadius: 1,
  },
  receiptDetailsContainer: {
    width: '100%',
    gap: 12,
  },
  receiptDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptDetailLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
  },
  receiptDetailValue: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    maxWidth: '60%',
    textAlign: 'right',
  },
  receiptFooter: {
    alignItems: 'center',
    marginBottom: 8,
  },
  receiptFooterText: {
    color: '#475569',
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  receiptCloseButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    height: 44,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  receiptCloseButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  inlineErrorBlock: {
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  inlineErrorText: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
    textAlign: 'center',
  },
  qrHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  qrFormTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  qrFormLabel: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  qrFormInput: {
    backgroundColor: '#020005',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    color: '#fff',
    height: 46,
    fontSize: 13,
  },
  qrFormButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 46,
    borderRadius: 12,
    marginTop: 4,
  },
  qrFormButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  qrDisplayStandCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.015)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 24,
    padding: 24,
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  qrStandPlaceholderContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrStandPlaceholderText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  qrStandActiveContent: {
    alignItems: 'center',
    width: '100%',
  },
  qrStandTitle: {
    color: '#3b82f6',
    fontSize: 10,
    fontWeight: '850',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  qrStandImageFrame: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 18,
    shadowColor: '#3b82f6',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
  },
  qrStandImage: {
    width: 180,
    height: 180,
  },
  qrStandAmount: {
    color: '#10b981',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 16,
  },
  qrStandNote: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 16,
  },
  clearStandButton: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    height: 36,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearStandButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  homeSettleShortcutCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.15)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  shortcutTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  shortcutDesc: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  redeemWalletBalanceBlock: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  redeemWalletLabel: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '850',
    letterSpacing: 0.5,
  },
  redeemWalletAmount: {
    color: '#10b981',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 4,
  },
  subViewHeader: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  subViewBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.12)',
    borderRadius: 10,
  },
  subViewBackText: {
    color: '#3b82f6',
    fontSize: 11,
    fontWeight: '700',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickActionBtnBlue: {
    flex: 1,
    backgroundColor: 'rgba(59, 130, 246, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.15)',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
  },
  quickActionBtnGreen: {
    flex: 1,
    backgroundColor: 'rgba(16, 185, 129, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
  },
  quickActionBtnPurple: {
    flex: 1,
    backgroundColor: 'rgba(168, 85, 247, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.15)',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
  },
  quickActionIconFrameBlue: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickActionIconFrameGreen: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickActionIconFramePurple: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(168, 85, 247, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickActionBtnTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  quickActionBtnDesc: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
});
