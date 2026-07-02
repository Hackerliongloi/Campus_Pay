import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, FlatList } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import { LogOut, Coins, Users, Landmark, MessageSquare, Shield, Bell, ArrowLeft, Search, PlusCircle, UserCheck } from 'lucide-react-native';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('menu'); // 'menu', 'treasury', 'users', 'kyc', 'complaints', 'subadmins', 'notifications'
  
  // Data lists
  const [analytics, setAnalytics] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [kycPendingList, setKycPendingList] = useState([]);
  const [complaintsList, setComplaintsList] = useState([]);
  const [subadminsList, setSubadminsList] = useState([]);
  const [notificationsLog, setNotificationsLog] = useState([]);

  // Loaders
  const [loading, setLoading] = useState(false);

  // Search parameters
  const [userSearch, setUserSearch] = useState('');
  const [notifSearch, setNotifSearch] = useState('');
  const [treasurySearch, setTreasurySearch] = useState('');

  // Treasury Load Form
  const [loadAmount, setLoadAmount] = useState('');
  const [loadDesc, setLoadDesc] = useState('');
  const [treasuryHistory, setTreasuryHistory] = useState([]);

  useEffect(() => {
    fetchAnalytics();
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'kyc') fetchKycPending();
    if (activeTab === 'complaints') fetchComplaints();
    if (activeTab === 'subadmins') fetchSubadmins();
    if (activeTab === 'notifications') fetchNotificationsLog();
    if (activeTab === 'treasury') fetchTreasuryHistory();
  }, [activeTab]);

  const fetchAnalytics = async () => {
    try {
      const response = await apiFetch('/admin/analytics');
      const data = await response.json();
      if (data.success) {
        setAnalytics(data.analytics);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let url = `/admin/users`;
      if (userSearch) url += `?search=${encodeURIComponent(userSearch)}`;
      const response = await apiFetch(url);
      const data = await response.json();
      if (data.success) {
        setUsersList(data.users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchKycPending = async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/admin/users');
      const data = await response.json();
      if (data.success) {
        const pending = data.users.filter(u => u.kycStatus === 'pending');
        setKycPendingList(pending);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/admin/complaints');
      const data = await response.json();
      if (data.success) {
        setComplaintsList(data.complaints || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubadmins = async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/admin/users?role=subadmin');
      const data = await response.json();
      if (data.success) {
        setSubadminsList(data.users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotificationsLog = async () => {
    setLoading(true);
    try {
      let url = `/admin/notifications`;
      if (notifSearch) url += `?search=${encodeURIComponent(notifSearch)}`;
      const response = await apiFetch(url);
      const data = await response.json();
      if (data.success) {
        setNotificationsLog(data.notifications || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTreasuryHistory = async () => {
    setLoading(true);
    try {
      let url = '/admin/institute-funds/history';
      if (treasurySearch) url += `?search=${encodeURIComponent(treasurySearch)}`;
      const response = await apiFetch(url);
      const data = await response.json();
      if (data.success) {
        setTreasuryHistory(data.history || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadTreasury = async () => {
    if (!loadAmount || parseFloat(loadAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch('/admin/add-institute-funds', {
        method: 'POST',
        body: JSON.stringify({
          amount: parseFloat(loadAmount),
          description: loadDesc || 'Load Central Funds',
        }),
      });
      const data = await response.json();
      setLoading(false);
      if (data.success) {
        Alert.alert('Treasury Funded', `Deposited ₹${loadAmount} successfully!`);
        setLoadAmount('');
        setLoadDesc('');
        fetchAnalytics();
        fetchTreasuryHistory();
      } else {
        Alert.alert('Deposit Failed', data.error);
      }
    } catch (err) {
      Alert.alert('Error', 'Deposit transaction failed.');
      setLoading(false);
    }
  };

  const handleKycAction = async (userId, action) => {
    try {
      const response = await apiFetch('/admin/kyc/action', {
        method: 'POST',
        body: JSON.stringify({
          vendorId: userId,
          action: action, // 'approve' or 'reject'
        }),
      });
      const data = await response.json();
      if (data.success) {
        Alert.alert('KYC Verified', `KYC verification status is updated.`);
        fetchKycPending();
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to submit verification action.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.topHeader}>
        {activeTab !== 'menu' ? (
          <TouchableOpacity onPress={() => setActiveTab('menu')} style={styles.backBtn}>
            <ArrowLeft size={18} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View />
        )}
        <Text style={styles.headerTitle}>
          {activeTab === 'menu' ? 'Admin Treasury' : activeTab.toUpperCase()}
        </Text>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <LogOut size={16} color="#f43f5e" />
        </TouchableOpacity>
      </View>

      {activeTab === 'menu' && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Analytics Stats Dashboard */}
          <Text style={styles.sectionTitle}>Overview Analytics</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricsCard}>
              <Text style={styles.metricLabel}>Central Treasury</Text>
              <Text style={styles.metricValue}>₹{analytics?.instituteBalance?.toFixed(2) || '0.00'}</Text>
            </View>
            <View style={styles.metricsCard}>
              <Text style={styles.metricLabel}>Students Enrolled</Text>
              <Text style={styles.metricValue}>{analytics?.users?.students || 0}</Text>
            </View>
            <View style={styles.metricsCard}>
              <Text style={styles.metricLabel}>Verified Canteens</Text>
              <Text style={styles.metricValue}>{analytics?.users?.vendors || 0}</Text>
            </View>
          </View>

          {/* Vertical Menu Buttons */}
          <Text style={styles.sectionTitle}>Administrative Functions</Text>

          <TouchableOpacity onPress={() => setActiveTab('treasury')} style={styles.menuItem}>
            <Coins size={20} color="#34d399" />
            <Text style={styles.menuItemText}>Central Treasury Control</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setActiveTab('users')} style={styles.menuItem}>
            <Users size={20} color="#60a5fa" />
            <Text style={styles.menuItemText}>Students & Vendors Directory</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setActiveTab('kyc')} style={styles.menuItem}>
            <UserCheck size={20} color="#fbbf24" />
            <Text style={styles.menuItemText}>KYC Identity Approvals</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setActiveTab('complaints')} style={styles.menuItem}>
            <MessageSquare size={20} color="#a78bfa" />
            <Text style={styles.menuItemText}>Support Complaints Desk</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setActiveTab('subadmins')} style={styles.menuItem}>
            <Shield size={20} color="#f472b6" />
            <Text style={styles.menuItemText}>Manage Sub-Administrators</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setActiveTab('notifications')} style={styles.menuItem}>
            <Bell size={20} color="#38bdf8" />
            <Text style={styles.menuItemText}>System Notification Logs</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* TREASURY TAB SUB-VIEW */}
      {activeTab === 'treasury' && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Current Treasury balance */}
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Central Institute Balance</Text>
            <Text style={styles.infoValue}>₹{analytics?.instituteBalance?.toFixed(2) || '0.00'}</Text>
          </View>

          {/* Load central funds */}
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Load Treasury Funds</Text>
            <TextInput
              placeholder="Amount to Add (₹)"
              placeholderTextColor="#64748b"
              style={styles.input}
              value={loadAmount}
              onChangeText={setLoadAmount}
              keyboardType="numeric"
            />
            <TextInput
              placeholder="Description (e.g. FY26 Grant Allocation)"
              placeholderTextColor="#64748b"
              style={styles.input}
              value={loadDesc}
              onChangeText={setLoadDesc}
            />
            <TouchableOpacity onPress={handleLoadTreasury} style={styles.panelButton} disabled={loading}>
              <Text style={styles.panelButtonText}>Add Central Funds</Text>
            </TouchableOpacity>
          </View>

          {/* Load History logs search */}
          <View style={styles.searchRow}>
            <TextInput
              placeholder="Search history by desc, admin, date..."
              placeholderTextColor="#64748b"
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              value={treasurySearch}
              onChangeText={setTreasurySearch}
              onSubmitEditing={fetchTreasuryHistory}
            />
            <TouchableOpacity onPress={fetchTreasuryHistory} style={styles.searchBtn}>
              <Search size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginTop: 20 }} color="#2563eb" />
          ) : (
            treasuryHistory.map((item) => (
              <View key={item._id} style={styles.logItem}>
                <Text style={styles.logDesc}>{item.description}</Text>
                <Text style={styles.logMeta}>Admin: {item.sender?.name || 'System'}</Text>
                <Text style={styles.logDate}>{new Date(item.createdAt).toLocaleString()}</Text>
                <Text style={styles.logAmount}>+₹{item.amount.toFixed(2)}</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* STUDENTS DIRECTORY TAB SUB-VIEW */}
      {activeTab === 'users' && (
        <View style={styles.subContainer}>
          <View style={styles.searchRow}>
            <TextInput
              placeholder="Search student or vendor by name/email..."
              placeholderTextColor="#64748b"
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              value={userSearch}
              onChangeText={setUserSearch}
              onSubmitEditing={fetchUsers}
            />
            <TouchableOpacity onPress={fetchUsers} style={styles.searchBtn}>
              <Search size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginTop: 20 }} color="#2563eb" />
          ) : (
            <FlatList
              data={usersList}
              keyExtractor={(item) => item._id}
              contentContainerStyle={{ paddingBottom: 20 }}
              renderItem={({ item }) => (
                <View style={styles.userRow}>
                  <Text style={styles.userName}>{item.name}</Text>
                  <Text style={styles.userEmail}>{item.email} ({item.role})</Text>
                  <Text style={styles.userStatus}>Status: {item.status.toUpperCase()}</Text>
                </View>
              )}
            />
          )}
        </View>
      )}

      {/* KYC APPROVALS TAB SUB-VIEW */}
      {activeTab === 'kyc' && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {kycPendingList.length === 0 ? (
            <Text style={styles.emptyText}>No pending identity files to approve.</Text>
          ) : (
            kycPendingList.map((item) => (
              <View key={item._id} style={styles.kycRow}>
                <Text style={styles.kycName}>{item.name}</Text>
                <Text style={styles.kycMeta}>{item.email} ({item.role})</Text>
                <View style={styles.kycActions}>
                  <TouchableOpacity onPress={() => handleKycAction(item._id, 'approve')} style={styles.kycApprove}>
                    <Text style={styles.kycActionText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleKycAction(item._id, 'reject')} style={styles.kycReject}>
                    <Text style={styles.kycActionText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* COMPLAINTS TAB SUB-VIEW */}
      {activeTab === 'complaints' && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {complaintsList.filter(c => c.status === 'open').length === 0 ? (
            <Text style={styles.emptyText}>Complaints desk is clear!</Text>
          ) : (
            complaintsList.filter(c => c.status === 'open').map((item) => (
              <View key={item._id} style={styles.complaintRow}>
                <Text style={styles.complaintTitle}>{item.title}</Text>
                <Text style={styles.complaintDesc}>{item.description}</Text>
                <Text style={styles.complaintMeta}>User: {item.student?.name || 'Unknown'}</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* SUBADMINS TAB SUB-VIEW */}
      {activeTab === 'subadmins' && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {subadminsList.map((item) => (
            <View key={item._id} style={styles.userRow}>
              <Text style={styles.userName}>{item.name}</Text>
              <Text style={styles.userEmail}>{item.email}</Text>
              <View style={styles.subadminStats}>
                <Text style={styles.statsTag}>KYC Verified: {item.kycVerifiedCount || 0}</Text>
                <Text style={styles.statsTag}>Complaints Solved: {item.complaintsSolvedCount || 0}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* SYSTEM NOTIFICATION AUDIT LOG */}
      {activeTab === 'notifications' && (
        <View style={styles.subContainer}>
          <View style={styles.searchRow}>
            <TextInput
              placeholder="Search notifications log..."
              placeholderTextColor="#64748b"
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              value={notifSearch}
              onChangeText={setNotifSearch}
              onSubmitEditing={fetchNotificationsLog}
            />
            <TouchableOpacity onPress={fetchNotificationsLog} style={styles.searchBtn}>
              <Search size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginTop: 20 }} color="#2563eb" />
          ) : (
            <FlatList
              data={notificationsLog}
              keyExtractor={(item) => item._id}
              contentContainerStyle={{ paddingBottom: 20 }}
              renderItem={({ item }) => (
                <View style={styles.logItem}>
                  <Text style={styles.logDesc}>{item.title}</Text>
                  <Text style={styles.logMeta}>{item.message}</Text>
                  <Text style={styles.logDate}>To: {item.recipient?.name || 'Unknown'} | Date: {new Date(item.createdAt).toLocaleString()}</Text>
                </View>
              )}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050811',
  },
  subContainer: {
    flex: 1,
    padding: 20,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 45,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  logoutButton: {
    padding: 6,
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderRadius: 10,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  sectionTitle: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 12,
    marginTop: 10,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    padding: 16,
  },
  metricLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 6,
  },
  metricValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#020005',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: '#2563eb',
  },
  tabButtonText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
  },
  tabButtonTextActive: {
    color: '#fff',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  menuItemText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 12,
  },
  infoCard: {
    backgroundColor: 'rgba(52, 211, 153, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.15)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  infoLabel: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  infoValue: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
    marginTop: 4,
  },
  panel: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  panelTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#020005',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    color: '#fff',
    fontSize: 12,
    marginBottom: 12,
  },
  panelButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  panelButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  searchBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  logDesc: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  logMeta: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 4,
  },
  logDate: {
    color: '#64748b',
    fontSize: 9,
    marginTop: 2,
  },
  logAmount: {
    color: '#34d399',
    fontSize: 13,
    fontWeight: '800',
    position: 'absolute',
    right: 14,
    top: 14,
  },
  userRow: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  userName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  userEmail: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  userStatus: {
    color: '#3b82f6',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 6,
  },
  subadminStats: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  statsTag: {
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    color: '#3b82f6',
    fontSize: 9,
    fontWeight: '700',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  kycRow: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  kycName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  kycMeta: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  kycActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  kycApprove: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  kycReject: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  kycActionText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  complaintRow: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  complaintTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  complaintDesc: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 4,
  },
  complaintMeta: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 6,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 40,
  },
});
