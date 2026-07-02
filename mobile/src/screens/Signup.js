import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Key, Landmark, Image as ImageIcon, FileText, CheckCircle, User, UserCheck, ChevronRight } from 'lucide-react-native';

export default function Signup({ navigation }) {
  const { signupBasic, verifySignupOtp, completeMobileProfile } = useAuth();
  
  // State Machine Step: 1 = Basic Info, 2 = OTP, 3 = Profile Name & Pic, 4 = KYC & Bank details, 5 = Success
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Basic Registration Info
  const [role, setRole] = useState('student'); // 'student' or 'vendor'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signupToken, setSignupToken] = useState('');

  // Step 2: OTP Verification
  const [otp, setOtp] = useState('');
  const [completeProfileToken, setCompleteProfileToken] = useState('');

  // Step 3: Profile Details
  const [name, setName] = useState('');
  const [profileImageUri, setProfileImageUri] = useState('');

  // Step 4: KYC & Transaction Security
  const [mpin, setMpin] = useState('');
  const [kycUri, setKycUri] = useState('');
  const [kycFileName, setKycFileName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [ifsc, setIfsc] = useState('');

  // Select Profile Image
  const pickProfileImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Denied', 'Permissions are required to choose profile photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setProfileImageUri(result.assets[0].uri);
    }
  };

  // Select KYC Document
  const pickKycDocument = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Denied', 'Permissions are required to upload verification documents.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setKycUri(uri);
      const filename = uri.substring(uri.lastIndexOf('/') + 1);
      setKycFileName(filename);
    }
  };

  // Submit Step 1: Basic Details
  const handleRegisterBasic = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Fields Required', 'Please enter email and passwords.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }
    setLoading(true);
    const res = await signupBasic(email, password, role);
    setLoading(false);
    if (res.success) {
      setSignupToken(res.signupToken);
      Alert.alert('Verification Sent', 'OTP has been dispatched to your email.');
      setStep(2);
    } else {
      Alert.alert('Registration Failed', res.error);
    }
  };

  // Submit Step 2: Verify OTP
  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit OTP code.');
      return;
    }
    setLoading(true);
    const res = await verifySignupOtp(otp, signupToken);
    setLoading(false);
    if (res.success) {
      setCompleteProfileToken(res.completeProfileToken);
      Alert.alert('Verified', 'Email verification complete!');
      setStep(3);
    } else {
      Alert.alert('Verification Failed', res.error);
    }
  };

  // Submit Step 3: Name & Profile Pic
  const handleProceedToKyc = () => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter your full name.');
      return;
    }
    setStep(4);
  };

  // Submit Step 4: Final Complete Profile & Save
  const handleCompleteProfile = async () => {
    if (!mpin || mpin.length !== 4 || isNaN(mpin)) {
      Alert.alert('MPIN Required', 'Set a 4-digit numeric MPIN for transactions.');
      return;
    }

    if (role === 'student') {
      if (!kycUri) {
        Alert.alert('KYC Required', 'Please upload a scan of your Student ID.');
        return;
      }
    } else {
      if (!bankName || !accountNo || !ifsc) {
        Alert.alert('Fields Required', 'Please provide bank details.');
        return;
      }
      if (!kycUri) {
        Alert.alert('KYC Required', 'Please upload your business registration.');
        return;
      }
    }

    setLoading(true);
    const details = {
      name,
      role,
      mpin,
      kycUri,
      profileImageUri,
      bankName,
      accountNo,
      ifsc,
    };
    const res = await completeMobileProfile(completeProfileToken, details);
    setLoading(false);
    if (res.success) {
      setStep(5);
    } else {
      Alert.alert('Setup Failed', res.error);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} style={styles.scroll}>
      <View style={styles.header}>
        <Text style={styles.logoText}>
          CAMPUS<Text style={styles.logoTextPay}>PAY</Text>
        </Text>
        <Text style={styles.subText}>CREATE A SECURE WALLET ACCOUNT</Text>
      </View>

      {/* Step Indicators */}
      {step <= 4 && (
        <View style={styles.stepIndicatorRow}>
          <View style={[styles.stepCircle, step >= 1 && styles.stepCircleActive]}>
            <Text style={[styles.stepCircleText, step >= 1 && styles.stepCircleTextActive]}>1</Text>
          </View>
          <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
          <View style={[styles.stepCircle, step >= 2 && styles.stepCircleActive]}>
            <Text style={[styles.stepCircleText, step >= 2 && styles.stepCircleTextActive]}>2</Text>
          </View>
          <View style={[styles.stepLine, step >= 3 && styles.stepLineActive]} />
          <View style={[styles.stepCircle, step >= 3 && styles.stepCircleActive]}>
            <Text style={[styles.stepCircleText, step >= 3 && styles.stepCircleTextActive]}>3</Text>
          </View>
          <View style={[styles.stepLine, step >= 4 && styles.stepLineActive]} />
          <View style={[styles.stepCircle, step >= 4 && styles.stepCircleActive]}>
            <Text style={[styles.stepCircleText, step >= 4 && styles.stepCircleTextActive]}>4</Text>
          </View>
        </View>
      )}

      {/* STEP 1: Account details */}
      {step === 1 && (
        <View style={styles.formContainer}>
          <Text style={styles.fieldLabel}>I AM REGISTERING AS A</Text>
          <View style={styles.roleContainer}>
            <TouchableOpacity
              style={[styles.roleTab, role === 'student' && styles.roleTabActive]}
              onPress={() => setRole('student')}
            >
              <User size={14} color={role === 'student' ? '#fff' : '#475569'} style={styles.roleIcon} />
              <Text style={[styles.roleTabText, role === 'student' && styles.roleTabTextActive]}>STUDENT</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleTab, role === 'vendor' && styles.roleTabActive]}
              onPress={() => setRole('vendor')}
            >
              <UserCheck size={14} color={role === 'vendor' ? '#fff' : '#475569'} style={styles.roleIcon} />
              <Text style={[styles.roleTabText, role === 'vendor' && styles.roleTabTextActive]}>VENDOR</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>COLLEGE EMAIL ID</Text>
          <View style={styles.inputContainer}>
            <Mail size={16} color="#3b82f6" style={styles.icon} />
            <TextInput
              placeholder="rahul.s@university.edu"
              placeholderTextColor="#64748b"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <Text style={styles.fieldLabel}>PASSWORD</Text>
          <View style={styles.inputContainer}>
            <Lock size={16} color="#3b82f6" style={styles.icon} />
            <TextInput
              placeholder="Create secure password"
              placeholderTextColor="#64748b"
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <Text style={styles.fieldLabel}>CONFIRM PASSWORD</Text>
          <View style={styles.inputContainer}>
            <Lock size={16} color="#3b82f6" style={styles.icon} />
            <TextInput
              placeholder="Re-enter password"
              placeholderTextColor="#64748b"
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity onPress={handleRegisterBasic} style={styles.button} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.btnContent}>
                <Text style={styles.buttonText}>SEND VERIFICATION OTP</Text>
                <ChevronRight size={16} color="#fff" style={styles.chevron} />
              </View>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.footerLink}>
            <Text style={styles.footerLinkText}>
              Already have an account? <Text style={styles.footerLinkTextBlue}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* STEP 2: OTP Verification */}
      {step === 2 && (
        <View style={styles.formContainer}>
          <Text style={styles.stepTitle}>EMAIL VERIFICATION</Text>
          <Text style={styles.description}>Enter the 6-digit OTP code sent to your registered campus email.</Text>

          <Text style={styles.fieldLabel}>ENTER OTP CODE</Text>
          <View style={styles.inputContainer}>
            <Key size={16} color="#3b82f6" style={styles.icon} />
            <TextInput
              placeholder="6-Digit OTP Code"
              placeholderTextColor="#64748b"
              style={styles.input}
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>

          <TouchableOpacity onPress={handleVerifyOtp} style={styles.button} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.btnContent}>
                <Text style={styles.buttonText}>VERIFY & PROCEED</Text>
                <ChevronRight size={16} color="#fff" style={styles.chevron} />
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setStep(1)} style={styles.footerLink}>
            <Text style={styles.footerLinkText}>Back to Registration Details</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* STEP 3: Profile Name & Image */}
      {step === 3 && (
        <View style={styles.formContainer}>
          <Text style={styles.stepTitle}>PROFILE DETAILS</Text>

          {/* Profile Photo selector */}
          <View style={styles.photoUploadWrapper}>
            <TouchableOpacity onPress={pickProfileImage} style={styles.photoCircle}>
              {profileImageUri ? (
                <Image source={{ uri: profileImageUri }} style={styles.profileImagePreview} />
              ) : (
                <ImageIcon size={24} color="#3b82f6" />
              )}
            </TouchableOpacity>
            <Text style={styles.uploadInfo}>Choose Profile Photo</Text>
          </View>

          <Text style={styles.fieldLabel}>FULL NAME</Text>
          <View style={styles.inputContainer}>
            <User size={16} color="#3b82f6" style={styles.icon} />
            <TextInput
              placeholder="Full Name"
              placeholderTextColor="#64748b"
              style={styles.input}
              value={name}
              onChangeText={setName}
            />
          </View>

          <TouchableOpacity onPress={handleProceedToKyc} style={styles.button}>
            <View style={styles.btnContent}>
              <Text style={styles.buttonText}>CONTINUE TO KYC</Text>
              <ChevronRight size={16} color="#fff" style={styles.chevron} />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* STEP 4: KYC & Final Setup */}
      {step === 4 && (
        <View style={styles.formContainer}>
          <Text style={styles.stepTitle}>KYC VERIFICATION</Text>

          {role === 'student' ? (
            /* Student-Specific KYC details */
            <View style={styles.kycWrapper}>
              <Text style={styles.fieldLabel}>TRANSACTION MPIN</Text>
              <View style={styles.inputContainer}>
                <Key size={16} color="#3b82f6" style={styles.icon} />
                <TextInput
                  placeholder="Set 4-digit MPIN"
                  placeholderTextColor="#64748b"
                  style={styles.input}
                  value={mpin}
                  onChangeText={setMpin}
                  secureTextEntry
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>

              <Text style={styles.fieldLabel}>STUDENT ID CARD</Text>
              <TouchableOpacity onPress={pickKycDocument} style={styles.documentUploadBox}>
                <FileText size={20} color="#2563eb" />
                <Text style={styles.documentUploadText} numberOfLines={1}>
                  {kycFileName || 'Upload Student ID Card'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Vendor-Specific Bank & KYC Details */
            <View style={styles.kycWrapper}>
              <Text style={styles.subTitle}>Bank Settlement Account</Text>

              <Text style={styles.fieldLabel}>BANK NAME</Text>
              <View style={styles.inputContainer}>
                <Landmark size={16} color="#3b82f6" style={styles.icon} />
                <TextInput
                  placeholder="Bank Name"
                  placeholderTextColor="#64748b"
                  style={styles.input}
                  value={bankName}
                  onChangeText={setBankName}
                />
              </View>

              <Text style={styles.fieldLabel}>ACCOUNT NUMBER</Text>
              <View style={styles.inputContainer}>
                <Landmark size={16} color="#3b82f6" style={styles.icon} />
                <TextInput
                  placeholder="Account Number"
                  placeholderTextColor="#64748b"
                  style={styles.input}
                  value={accountNo}
                  onChangeText={setAccountNo}
                  keyboardType="number-pad"
                />
              </View>

              <Text style={styles.fieldLabel}>IFSC CODE</Text>
              <View style={styles.inputContainer}>
                <Landmark size={16} color="#3b82f6" style={styles.icon} />
                <TextInput
                  placeholder="IFSC Code"
                  placeholderTextColor="#64748b"
                  style={styles.input}
                  value={ifsc}
                  onChangeText={setIfsc}
                  autoCapitalize="characters"
                />
              </View>

              <Text style={styles.fieldLabel}>TRANSACTION MPIN</Text>
              <View style={styles.inputContainer}>
                <Key size={16} color="#3b82f6" style={styles.icon} />
                <TextInput
                  placeholder="Set 4-digit MPIN"
                  placeholderTextColor="#64748b"
                  style={styles.input}
                  value={mpin}
                  onChangeText={setMpin}
                  secureTextEntry
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>

              <Text style={styles.fieldLabel}>BUSINESS REGISTRATION / ID</Text>
              <TouchableOpacity onPress={pickKycDocument} style={styles.documentUploadBox}>
                <FileText size={20} color="#2563eb" />
                <Text style={styles.documentUploadText} numberOfLines={1}>
                  {kycFileName || 'Upload Business Registration / ID'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity onPress={handleCompleteProfile} style={styles.button} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.btnContent}>
                <Text style={styles.buttonText}>COMPLETE REGISTRATION</Text>
                <ChevronRight size={16} color="#fff" style={styles.chevron} />
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* STEP 5: Success screen */}
      {step === 5 && (
        <View style={styles.formContainer}>
          <View style={styles.successWrapper}>
            <CheckCircle size={64} color="#10b981" />
            <Text style={styles.successTitle}>Registration Complete!</Text>
            <Text style={styles.successDescription}>
              {role === 'student'
                ? 'Welcome to CampusPay! Your account setup is complete and your student wallet is now active.'
                : 'Your registration was submitted! KYC verification is pending administrative review.'}
            </Text>

            <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.successButton}>
              <Text style={styles.successButtonText}>Sign In Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
    paddingTop: 50,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
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
  stepIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: '#020005',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  stepCircleText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '800',
  },
  stepCircleTextActive: {
    color: '#fff',
  },
  stepLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: '#2563eb',
  },
  formContainer: {
    width: '100%',
  },
  stepTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 1,
  },
  description: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  roleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 5,
    marginBottom: 24,
  },
  roleTab: {
    flex: 1,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    gap: 6,
  },
  roleTabActive: {
    backgroundColor: '#2563eb',
  },
  roleIcon: {
    marginRight: 2,
  },
  roleTabText: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  roleTabTextActive: {
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
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
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  chevron: {
    marginTop: 1,
  },
  footerLink: {
    alignItems: 'center',
    marginTop: 32,
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
  photoUploadWrapper: {
    alignItems: 'center',
    marginBottom: 24,
  },
  photoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 10,
  },
  profileImagePreview: {
    width: '100%',
    height: '100%',
  },
  uploadInfo: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  kycWrapper: {
    marginBottom: 8,
  },
  documentUploadBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 80,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(37, 99, 235, 0.4)',
    borderRadius: 16,
    backgroundColor: 'rgba(37, 99, 235, 0.02)',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  documentUploadText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  subTitle: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 16,
    paddingLeft: 2,
    letterSpacing: 1,
  },
  successWrapper: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  successTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 16,
    marginBottom: 12,
  },
  successDescription: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  successButton: {
    backgroundColor: '#10b981',
    borderRadius: 16,
    height: 54,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  successButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
