import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuth } from '../context/AuthContext';
import { Shield, Mail, Lock, Key, Eye, EyeOff } from 'lucide-react-native';

export default function Login({ navigation }) {
  const { login, loginMpin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mpin, setMpin] = useState('');
  const [loading, setLoading] = useState(false);
  const [useMpin, setUseMpin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Biometrics setup
  const [hasBiometrics, setHasBiometrics] = useState(false);

  useEffect(() => {
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setHasBiometrics(compatible && enrolled);
    } catch (err) {
      console.log('Biometrics error:', err);
    }
  };

  const handlePasswordLogin = async () => {
    if (!email || !password) {
      Alert.alert('Fields Required', 'Please enter both email and password.');
      return;
    }
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (!res.success) {
      Alert.alert('Login Failed', res.error);
    }
  };

  const handleMpinLogin = async () => {
    if (!email || !mpin) {
      Alert.alert('Fields Required', 'Please enter email and MPIN.');
      return;
    }
    if (mpin.length !== 4) {
      Alert.alert('Invalid MPIN', 'MPIN must be a 4-digit code.');
      return;
    }
    setLoading(true);
    const res = await loginMpin(email, mpin);
    setLoading(false);
    if (!res.success) {
      Alert.alert('Login Failed', res.error);
    }
  };

  const handleBiometricAuth = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Sign in to CampusPay',
        fallbackLabel: 'Use Password',
      });
      if (result.success) {
        Alert.alert('Biometrics Verified', 'Biometrics verification successful.');
      }
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} style={styles.scroll}>
      <View style={styles.header}>
        <View style={styles.logoCard}>
          <Shield size={32} color="#06b6d4" />
        </View>
        <Text style={styles.logoText}>
          CAMPUS<Text style={styles.logoTextPay}>PAY</Text>
        </Text>
        <Text style={styles.subText}>SECURE CAMPUS WALLET & MERCHANT PORTAL</Text>
      </View>

      <View style={styles.formContainer}>
        {/* Horizontal Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, !useMpin && styles.tabButtonActive]}
            onPress={() => setUseMpin(false)}
          >
            <Text style={[styles.tabButtonText, !useMpin && styles.tabButtonTextActive]}>PASSWORD</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, useMpin && styles.tabButtonActive]}
            onPress={() => setUseMpin(true)}
          >
            <Text style={[styles.tabButtonText, useMpin && styles.tabButtonTextActive]}>MPIN</Text>
          </TouchableOpacity>
        </View>

        {/* Email Field */}
        <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
        <View style={styles.inputContainer}>
          <Mail size={16} color="#3b82f6" style={styles.icon} />
          <TextInput
            placeholder="admin@campuspay.com"
            placeholderTextColor="#64748b"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        {/* Password / MPIN Field */}
        <View style={styles.fieldLabelRow}>
          <Text style={styles.fieldLabel}>{useMpin ? 'TRANSACTION MPIN' : 'PASSWORD'}</Text>
          {!useMpin && (
            <TouchableOpacity onPress={() => Alert.alert('Reset Password', 'Please contact your college administrator to reset your password.')}>
              <Text style={styles.forgotText}>Forgot?</Text>
            </TouchableOpacity>
          )}
        </View>

        {useMpin ? (
          <View style={styles.inputContainer}>
            <Key size={16} color="#3b82f6" style={styles.icon} />
            <TextInput
              placeholder="••••"
              placeholderTextColor="#64748b"
              style={styles.input}
              value={mpin}
              onChangeText={setMpin}
              secureTextEntry
              keyboardType="number-pad"
              maxLength={4}
            />
          </View>
        ) : (
          <View style={styles.inputContainer}>
            <Lock size={16} color="#3b82f6" style={styles.icon} />
            <TextInput
              placeholder="•••••••••"
              placeholderTextColor="#64748b"
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              {showPassword ? <EyeOff size={16} color="#94a3b8" /> : <Eye size={16} color="#94a3b8" />}
            </TouchableOpacity>
          </View>
        )}

        {/* Action Button */}
        <TouchableOpacity
          onPress={useMpin ? handleMpinLogin : handlePasswordLogin}
          style={styles.button}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>SIGN IN</Text>
          )}
        </TouchableOpacity>

        {/* Biometrics Action (Optional) */}
        {hasBiometrics && (
          <TouchableOpacity onPress={handleBiometricAuth} style={styles.biometricButton}>
            <Text style={styles.biometricButtonText}>Use Biometric Face/Fingerprint</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Footer Link */}
      <TouchableOpacity onPress={() => navigation.navigate('Signup')} style={styles.footerLink}>
        <Text style={styles.footerLinkText}>
          New to Campus Pay? <Text style={styles.footerLinkTextBlue}>Create an Account</Text>
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#050811',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCard: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  logoText: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  logoTextPay: {
    color: '#06b6d4',
  },
  subText: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 8,
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 5,
    marginBottom: 28,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  tabButtonActive: {
    backgroundColor: '#2563eb',
  },
  tabButtonText: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  tabButtonTextActive: {
    color: '#fff',
  },
  fieldLabel: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 8,
    paddingLeft: 4,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  forgotText: {
    color: '#3b82f6',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingRight: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 20,
    height: 54,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    paddingVertical: 8,
  },
  eyeIcon: {
    padding: 4,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  biometricButton: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
  },
  biometricButtonText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
  },
  footerLink: {
    alignItems: 'center',
    marginTop: 36,
  },
  footerLinkText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  footerLinkTextBlue: {
    color: '#3b82f6',
    fontWeight: '800',
  },
});
