import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal, Platform, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Camera, CameraView } from 'expo-camera';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import { API_BASE_URL } from '../config';
import {
  LogOut, QrCode, UploadCloud, History, Send, ShieldAlert, ShieldCheck,
  Wallet, MessageSquare, Bell, Trash2, User, FileText, ArrowUpRight,
  ArrowDownLeft, X, ChevronRight, Image as ImageIcon, Settings, Check, CheckCircle2, Search
} from 'lucide-react-native';

export default function StudentDashboard() {
  const { user, fetchMe, logout, updateProfile } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [kycUploading, setKycUploading] = useState(false);

  // Tab State: 'home', 'history', 'tickets'
  const [activeTab, setActiveTab] = useState('home');

  // Scanner State
  const [showScanner, setShowScanner] = useState(false);
  const [scannerPermission, setScannerPermission] = useState(null);

  // Payment states
  const [showPayModal, setShowPayModal] = useState(false);
  const [vendorEmail, setVendorEmail] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMpin, setPaymentMpin] = useState('');
  const [paymentDesc, setPaymentDesc] = useState('');
  const [paying, setPaying] = useState(false);

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Edit Profile States
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editAvatarUri, setEditAvatarUri] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Complaints / Support Tickets States
  const [complaints, setComplaints] = useState([]);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [complaintTitle, setComplaintTitle] = useState('');
  const [complaintDesc, setComplaintDesc] = useState('');
  const [complaintFileUri, setComplaintFileUri] = useState('');
  const [raisingComplaint, setRaisingComplaint] = useState(false);
  const [ticketsSearch, setTicketsSearch] = useState('');

  // Transaction Receipt Modal State
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // History search and filter states
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState('all'); // 'all', 'debit', 'credit'

  // Fetch data on mount & set up automatic polling
  useEffect(() => {
    fetchHistory();
    fetchComplaints();
    fetchNotifications();
    
    const interval = setInterval(() => {
      fetchMe();
      fetchHistory();
      fetchComplaints();
      fetchNotifications();
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  // Helper to resolve URLs (Cloudinary vs Local uplods)
  const getImageUrl = (path) => {
    if (!path) return '';
    return path.startsWith('http') ? path : `${API_BASE_URL.replace('/api', '')}${path}`;
  };

  // 1. Fetch History
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

  // 2. Fetch Complaints/Tickets
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

  // 3. Fetch Notifications
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

  // Raise Support Claim/Ticket
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
        Alert.alert('Ticket Submitted', 'Your support ticket has been filed successfully.');
        setComplaintTitle('');
        setComplaintDesc('');
        setComplaintFileUri('');
        setShowComplaintModal(false);
        fetchComplaints();
      } else {
        Alert.alert('Submission Failed', data.error || 'Failed to file claim.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Connection failure during claim submission.');
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

  // Edit Profile Update
  const handleUpdateProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Name Required', 'Please enter your name.');
      return;
    }

    setUpdatingProfile(true);
    try {
      const res = await updateProfile(editName, editAvatarUri);
      if (res.success) {
        Alert.alert('Profile Updated', 'Your profile details have been saved.');
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
      Alert.alert('Permission Denied', 'Permissions are required to choose photos.');
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

  // KYC Upload
  const handleKycUpload = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Denied', 'Media library permissions are required to upload verification documents.');
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
      formData.append('document', blob, fileName);
    } else {
      formData.append('document', {
        uri,
        name: fileName,
        type: mimeType,
      });
    }

    setKycUploading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/wallet/kyc-upload`, {
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
      } else {
        Alert.alert('Upload Failed', data.error);
      }
    } catch (err) {
      Alert.alert('Network Error', 'Connection failed during upload.');
    } finally {
      setKycUploading(false);
    }
  };

  // Barcode / QR Scanner handlers
  const startScanner = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setScannerPermission(status === 'granted');
    if (status === 'granted') {
      setShowScanner(true);
    } else {
      Alert.alert('Camera Permission', 'Camera permissions are required to scan transaction QR codes.');
    }
  };

  const handleBarCodeScanned = ({ data }) => {
    setShowScanner(false);
    try {
      let parsedEmail = data;
      if (data.startsWith('{')) {
        const parsed = JSON.parse(data);
        parsedEmail = parsed.email || parsed.vendorEmail || data;
      }
      setVendorEmail(parsedEmail);
      setShowPayModal(true);
    } catch (e) {
      setVendorEmail(data);
      setShowPayModal(true);
    }
  };

  // Payment Submission
  const handlePaymentSubmit = async () => {
    if (!vendorEmail || !paymentAmount || !paymentMpin) {
      Alert.alert('Fields Required', 'Please fill in vendor, amount, and MPIN.');
      return;
    }

    setPaying(true);
    try {
      const response = await apiFetch('/wallet/transfer', {
        method: 'POST',
        body: JSON.stringify({
          receiverEmail: vendorEmail,
          amount: parseFloat(paymentAmount),
          mpin: paymentMpin,
          description: paymentDesc || 'Canteen Payment',
        }),
      });

      const data = await response.json();
      if (data.success) {
        Alert.alert('Payment Successful', `Sent ₹${paymentAmount} successfully!`);
        setShowPayModal(false);
        setPaymentAmount('');
        setPaymentMpin('');
        setPaymentDesc('');
        setVendorEmail('');
        fetchMe();
        fetchHistory();
      } else {
        Alert.alert('Payment Failed', data.error);
      }
    } catch (err) {
      Alert.alert('Network Error', 'Transaction failed due to connectivity.');
    } finally {
      setPaying(false);
    }
  };

  // Sum total spent
  const calculateTotalSpent = () => {
    return history
      .filter(t => t.sender?._id === user?._id)
      .reduce((sum, t) => sum + t.amount, 0);
  };

  // Render different tabs contents
  const renderTabContent = () => {
    if (activeTab === 'home') {
      return (
        <ScrollView style={styles.tabScroll} contentContainerStyle={styles.tabContent}>
          
          {/* KYC Status Block */}
          {user?.kycStatus !== 'approved' && (
            <View style={styles.kycWarningCard}>
              <View style={styles.kycWarningHeader}>
                <ShieldAlert size={20} color="#f59e0b" />
                <Text style={styles.kycWarningTitle}>KYC Verification Pending</Text>
              </View>
              <Text style={styles.kycWarningText}>
                {user?.kycStatus === 'pending'
                  ? 'Your Student ID Card is currently being verified. QR payments and transfers are restricted until approved.'
                  : 'Please upload a scan/photo of your Student ID card to unlock wallet payments.'}
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
                      <Text style={styles.kycUploadButtonText}>Upload Student ID Card</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Smart Card Widget */}
          <View style={styles.smartCardContainer}>
            {/* Styled overlay items to simulate a gradient effect without external deps */}
            <View style={styles.smartCardBackGlow} />
            
            <View style={styles.smartCardHeader}>
              <Text style={styles.smartCardTitle}>CAMPUSPAY SMART CARD</Text>
              <View style={styles.activeBadge}>
                <View style={styles.activeDot} />
                <Text style={styles.activeBadgeText}>Active</Text>
              </View>
            </View>

            {/* Golden Chip */}
            <View style={styles.goldenChip}>
              <View style={styles.goldenChipLines} />
            </View>

            <View style={styles.smartCardBalanceSection}>
              <Text style={styles.balanceLabel}>AVAILABLE INSTITUTE BALANCE</Text>
              <Text style={styles.balanceValue}>
                ₹{user?.walletBalance ? user.walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
              </Text>
            </View>
          </View>

          {/* Total Spent Widget */}
          <View style={styles.spentSummaryCard}>
            <Text style={styles.spentLabel}>TOTAL SPENT</Text>
            <Text style={styles.spentValue}>₹{calculateTotalSpent().toFixed(2)}</Text>
          </View>

          {/* Wallet Services Grid */}
          <View style={styles.servicesSection}>
            <Text style={styles.servicesSectionHeader}>WALLET SERVICES</Text>
            <View style={styles.servicesGrid}>
              
              <TouchableOpacity
                onPress={startScanner}
                disabled={user?.kycStatus !== 'approved'}
                style={[styles.serviceCard, user?.kycStatus !== 'approved' && styles.serviceCardDisabled]}
              >
                <View style={styles.serviceIconFrame}>
                  <QrCode size={24} color="#3b82f6" />
                </View>
                <Text style={styles.serviceLabel}>SCAN QR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowPayModal(true)}
                disabled={user?.kycStatus !== 'approved'}
                style={[styles.serviceCard, user?.kycStatus !== 'approved' && styles.serviceCardDisabled]}
              >
                <View style={styles.serviceIconFrame}>
                  <Send size={20} color="#3b82f6" />
                </View>
                <Text style={styles.serviceLabel}>TRANSFER</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowComplaintModal(true)}
                style={styles.serviceCard}
              >
                <View style={styles.serviceIconFrame}>
                  <ShieldAlert size={22} color="#3b82f6" />
                </View>
                <Text style={styles.serviceLabel}>FILE CLAIM</Text>
              </TouchableOpacity>

            </View>
          </View>

          {/* Recent Transactions Preview */}
          <View style={styles.recentTxSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.servicesSectionHeader}>RECENT TRANSACTIONS</Text>
              <TouchableOpacity onPress={() => setActiveTab('history')}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            {history.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No purchases found.</Text>
              </View>
            ) : (
              history.slice(0, 3).map((txn) => {
                const isDebit = txn.sender?._id === user?._id;
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
                      <View style={[styles.txIndicatorCircle, isDebit ? styles.txCircleDebit : styles.txCircleCredit]}>
                        {isDebit ? (
                          <ArrowUpRight size={16} color="#f43f5e" />
                        ) : (
                          <ArrowDownLeft size={16} color="#34d399" />
                        )}
                      </View>
                      <View>
                        <Text style={styles.txName}>{isDebit ? txn.receiver?.name || 'Canteen' : txn.sender?.name}</Text>
                        <Text style={styles.txMeta}>{new Date(txn.createdAt).toLocaleDateString()}</Text>
                      </View>
                    </View>
                    <Text style={[styles.txAmountText, isDebit ? styles.txAmountDebit : styles.txAmountCredit]}>
                      {isDebit ? '-' : '+'}₹{txn.amount.toFixed(2)}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

        </ScrollView>
      );
    } else if (activeTab === 'history') {
      // Filter transactions
      const filteredHistory = history.filter(txn => {
        const matchesSearch =
          (txn.receiver?.name && txn.receiver.name.toLowerCase().includes(historySearch.toLowerCase())) ||
          (txn.sender?.name && txn.sender.name.toLowerCase().includes(historySearch.toLowerCase())) ||
          (txn.description && txn.description.toLowerCase().includes(historySearch.toLowerCase()));

        if (!matchesSearch) return false;

        const isDebit = txn.sender?._id === user?._id;
        if (historyFilter === 'debit') return isDebit;
        if (historyFilter === 'credit') return !isDebit;
        return true;
      });

      return (
        <View style={styles.historyTabContainer}>
          {/* Header Search & Filter */}
          <View style={styles.searchBarRow}>
            <View style={styles.searchContainer}>
              <Search size={16} color="#64748b" style={{ marginRight: 8 }} />
              <TextInput
                placeholder="Search description, vendor..."
                placeholderTextColor="#64748b"
                value={historySearch}
                onChangeText={setHistorySearch}
                style={styles.searchInput}
              />
            </View>
          </View>

          <View style={styles.filterTabsRow}>
            <TouchableOpacity
              onPress={() => setHistoryFilter('all')}
              style={[styles.filterTabPill, historyFilter === 'all' && styles.filterTabPillActive]}
            >
              <Text style={[styles.filterTabPillText, historyFilter === 'all' && styles.filterTabPillTextActive]}>All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setHistoryFilter('debit')}
              style={[styles.filterTabPill, historyFilter === 'debit' && styles.filterTabPillActive]}
            >
              <Text style={[styles.filterTabPillText, historyFilter === 'debit' && styles.filterTabPillTextActive]}>Spent</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setHistoryFilter('credit')}
              style={[styles.filterTabPill, historyFilter === 'credit' && styles.filterTabPillActive]}
            >
              <Text style={[styles.filterTabPillText, historyFilter === 'credit' && styles.filterTabPillTextActive]}>Refunds</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.tabScroll} contentContainerStyle={styles.tabContent}>
            {filteredHistory.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No matching transactions found.</Text>
              </View>
            ) : (
              filteredHistory.map((txn) => {
                const isDebit = txn.sender?._id === user?._id;
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
                      <View style={[styles.txIndicatorCircle, isDebit ? styles.txCircleDebit : styles.txCircleCredit]}>
                        {isDebit ? (
                          <ArrowUpRight size={16} color="#f43f5e" />
                        ) : (
                          <ArrowDownLeft size={16} color="#34d399" />
                        )}
                      </View>
                      <View>
                        <Text style={styles.txName}>{isDebit ? txn.receiver?.name || 'Canteen' : txn.sender?.name}</Text>
                        <Text style={styles.txMeta}>{new Date(txn.createdAt).toLocaleString()}</Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.txAmountText, isDebit ? styles.txAmountDebit : styles.txAmountCredit]}>
                        {isDebit ? '-' : '+'}₹{txn.amount.toFixed(2)}
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
    } else if (activeTab === 'tickets') {
      const filteredComplaints = complaints.filter(ticket =>
        ticket.title.toLowerCase().includes(ticketsSearch.toLowerCase()) ||
        ticket.description.toLowerCase().includes(ticketsSearch.toLowerCase())
      );

      const openTicketsCount = complaints.filter(t => t.status === 'open').length;
      const resolvedTicketsCount = complaints.filter(t => t.status === 'resolved').length;

      return (
        <View style={styles.historyTabContainer}>
          {/* Raise Support Ticket Header */}
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

          {/* Tickets Search Bar */}
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
                <Text style={styles.emptyText}>No support tickets logged.</Text>
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
      {/* Top Profile Header */}
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
                {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerSubtitle}>CAMPUSPAY WALLET</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.headerMainTitle}>{user?.name || 'Karthik'}</Text>
            <View style={styles.headerKycDotDivider} />
            <Text style={[styles.headerKycText, user?.kycStatus === 'approved' ? { color: '#34d399' } : { color: '#fbbf24' }]}>
              {user?.kycStatus === 'approved' ? 'Verified KYC' : 'Pending KYC'}
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

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity
          onPress={() => setActiveTab('home')}
          style={styles.tabBarItem}
        >
          <Wallet size={20} color={activeTab === 'home' ? '#3b82f6' : '#64748b'} />
          <Text style={[styles.tabBarLabel, activeTab === 'home' && styles.tabBarLabelActive]}>HOME</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('history')}
          style={styles.tabBarItem}
        >
          <History size={20} color={activeTab === 'history' ? '#3b82f6' : '#64748b'} />
          <Text style={[styles.tabBarLabel, activeTab === 'history' && styles.tabBarLabelActive]}>HISTORY</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('tickets')}
          style={styles.tabBarItem}
        >
          <MessageSquare size={20} color={activeTab === 'tickets' ? '#3b82f6' : '#64748b'} />
          <Text style={[styles.tabBarLabel, activeTab === 'tickets' && styles.tabBarLabelActive]}>TICKETS</Text>
        </TouchableOpacity>
      </View>

      {/* EDIT PROFILE MODAL */}
      <Modal visible={showEditProfileModal} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile Settings</Text>

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
              placeholder="Full Name"
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

      {/* NOTIFICATIONS DRAWER MODAL */}
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
                <Text style={styles.emptyNotificationsText}>No notifications found.</Text>
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

      {/* FILE CLAIM MODAL */}
      <Modal visible={showComplaintModal} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Raise a Support Ticket</Text>

            <TextInput
              placeholder="Title (e.g. Double payment debited)"
              placeholderTextColor="#64748b"
              style={styles.modalInput}
              value={complaintTitle}
              onChangeText={setComplaintTitle}
            />

            <TextInput
              placeholder="Provide exact details of your issue..."
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
                {complaintFileUri ? 'Attachment selected ✓' : 'Upload Receipt/Screenshot'}
              </Text>
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowComplaintModal(false)} style={styles.modalCancel}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleRaiseComplaint} style={styles.modalSubmit} disabled={raisingComplaint}>
                {raisingComplaint ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSubmitText}>Submit Ticket</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MANUALLY POPULATED PAY MODAL */}
      <Modal visible={showPayModal} animationType="fade" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Canteen Transfer</Text>

            <TextInput
              placeholder="Vendor Email / ID"
              placeholderTextColor="#64748b"
              style={styles.modalInput}
              value={vendorEmail}
              onChangeText={setVendorEmail}
              autoCapitalize="none"
            />
            <TextInput
              placeholder="Transfer Amount (₹)"
              placeholderTextColor="#64748b"
              style={styles.modalInput}
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              keyboardType="numeric"
            />
            <TextInput
              placeholder="4-digit MPIN"
              placeholderTextColor="#64748b"
              style={styles.modalInput}
              value={paymentMpin}
              onChangeText={setPaymentMpin}
              secureTextEntry
              keyboardType="number-pad"
              maxLength={4}
            />
            <TextInput
              placeholder="Reference description (coke, chips...)"
              placeholderTextColor="#64748b"
              style={styles.modalInput}
              value={paymentDesc}
              onChangeText={setPaymentDesc}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowPayModal(false)} style={styles.modalCancel}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handlePaymentSubmit} style={styles.modalSubmit} disabled={paying}>
                {paying ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSubmitText}>Confirm Payment</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* TRANSACTION RECEIPT MODAL */}
      <Modal visible={showReceiptModal} animationType="fade" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalContentReceipt}>
            <View style={styles.receiptHeader}>
              <View style={styles.receiptCheckCircle}>
                <CheckCircle2 size={40} color="#10b981" />
              </View>
              <Text style={styles.receiptTitle}>Transaction Invoice</Text>
              <Text style={styles.receiptAmount}>₹{selectedTxn?.amount?.toFixed(2)}</Text>
              <Text style={styles.receiptStatusText}>SUCCESS</Text>
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
                <Text style={styles.receiptDetailLabel}>Sender</Text>
                <Text style={styles.receiptDetailValue}>{selectedTxn?.sender?.name}</Text>
              </View>
              <View style={styles.receiptDetailRow}>
                <Text style={styles.receiptDetailLabel}>Recipient</Text>
                <Text style={styles.receiptDetailValue}>{selectedTxn?.receiver?.name || 'Canteen'}</Text>
              </View>
              <View style={styles.receiptDetailRow}>
                <Text style={styles.receiptDetailLabel}>Reference</Text>
                <Text style={styles.receiptDetailValue}>{selectedTxn?.description || 'N/A'}</Text>
              </View>
            </View>

            <View style={styles.receiptDivider} />

            <View style={styles.receiptFooter}>
              <Text style={styles.receiptFooterText}>CAMPUSPAY Safe billing secure transaction</Text>
            </View>

            <TouchableOpacity
              onPress={() => setShowReceiptModal(false)}
              style={styles.receiptCloseButton}
            >
              <Text style={styles.receiptCloseButtonText}>Close Receipt</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* QR CAMERA SCANNER SCREEN MODAL */}
      <Modal visible={showScanner} animationType="slide" transparent={false}>
        <View style={styles.scannerContainer}>
          {scannerPermission && (
            <CameraView
              onBarcodeScanned={handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ["qr"],
              }}
              style={StyleSheet.absoluteFillObject}
            />
          )}
          <View style={styles.scannerOverlay}>
            <Text style={styles.scannerInfo}>Scan Vendor's Static QR Code</Text>
            <TouchableOpacity onPress={() => setShowScanner(false)} style={styles.scannerClose}>
              <Text style={styles.scannerCloseText}>Close Scanner</Text>
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
  smartCardContainer: {
    backgroundColor: '#0a1d37',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: 24,
    height: 180,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 16,
  },
  smartCardBackGlow: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#0d9488',
    opacity: 0.18,
  },
  smartCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  smartCardTitle: {
    color: '#3b82f6',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginRight: 6,
  },
  activeBadgeText: {
    color: '#34d399',
    fontSize: 9,
    fontWeight: '800',
  },
  goldenChip: {
    width: 40,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#d97706',
    position: 'relative',
    opacity: 0.85,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  goldenChipLines: {
    position: 'absolute',
    top: 4,
    left: 8,
    right: 8,
    bottom: 4,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  smartCardBalanceSection: {
    marginTop: 8,
  },
  balanceLabel: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  balanceValue: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '900',
    marginTop: 4,
  },
  spentSummaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.015)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  spentLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '800',
  },
  spentValue: {
    color: '#f43f5e',
    fontSize: 15,
    fontWeight: '800',
  },
  servicesSection: {
    marginBottom: 24,
  },
  servicesSectionHeader: {
    color: '#3b82f6',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  servicesGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  serviceCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceCardDisabled: {
    opacity: 0.35,
  },
  serviceIconFrame: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
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
    maxWidth: 100,
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
  filterTabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterTabPill: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  filterTabPillActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  filterTabPillText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
  },
  filterTabPillTextActive: {
    color: '#3b82f6',
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
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerOverlay: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  scannerInfo: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  scannerClose: {
    backgroundColor: '#f43f5e',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  scannerCloseText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
