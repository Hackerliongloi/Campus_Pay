import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '../services/api';
import { API_BASE_URL } from '../config';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState('');
  const [loading, setLoading] = useState(true);

  // Load token from storage on mount
  useEffect(() => {
    const loadToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        if (storedToken) {
          setTokenState(storedToken);
          await fetchMe(storedToken);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    loadToken();
  }, []);

  const fetchMe = async (currentToken = token) => {
    if (!currentToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await apiFetch('/auth/me');
      const data = await response.json();
      if (data.success) {
        setUser(data.user);
      } else {
        await logout();
      }
    } catch (err) {
      console.error('Error fetching user info:', err);
      await logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (data.success) {
        await AsyncStorage.setItem('token', data.token);
        setTokenState(data.token);
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, error: `Network error: ${err.message || err.toString()}` };
    }
  };

  const loginMpin = async (email, mpin) => {
    try {
      const response = await apiFetch('/auth/login-mpin', {
        method: 'POST',
        body: JSON.stringify({ email, mpin }),
      });

      const data = await response.json();
      if (data.success) {
        await AsyncStorage.setItem('token', data.token);
        setTokenState(data.token);
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Invalid MPIN' };
      }
    } catch (err) {
      console.error('Login MPIN error:', err);
      return { success: false, error: `Network error: ${err.message || err.toString()}` };
    }
  };

  const signupBasic = async (email, password, role) => {
    try {
      const response = await apiFetch('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, role }),
      });

      const data = await response.json();
      if (data.success) {
        return { success: true, signupToken: data.signupToken };
      } else {
        return { success: false, error: data.error || 'Signup failed' };
      }
    } catch (err) {
      console.error('Signup basic error:', err);
      return { success: false, error: `Network error: ${err.message || err.toString()}` };
    }
  };

  const verifySignupOtp = async (otp, signupToken) => {
    try {
      const response = await apiFetch('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ otp, signupToken }),
      });

      const data = await response.json();
      if (data.success) {
        return { success: true, completeProfileToken: data.token };
      } else {
        return { success: false, error: data.error || 'Verification failed' };
      }
    } catch (err) {
      console.error('Verify OTP error:', err);
      return { success: false, error: `Network error: ${err.message || err.toString()}` };
    }
  };

  const completeMobileProfile = async (completeProfileToken, details) => {
    try {
      const formData = new FormData();
      formData.append('name', details.name);

      if (details.role === 'student') {
        formData.append('mpin', details.mpin);
      } else if (details.role === 'vendor') {
        formData.append('mpin', details.mpin);
        formData.append('bankName', details.bankName);
        formData.append('accountNo', details.accountNo);
        formData.append('ifsc', details.ifsc);
      }

      if (details.kycUri) {
        let blob = null;
        let fileType = 'jpg';
        let mimeType = 'image/jpeg';

        if (Platform.OS === 'web') {
          const res = await fetch(details.kycUri);
          const rawBlob = await res.blob();
          mimeType = rawBlob.type || 'image/jpeg';
          
          // Validate and fallback MIME types for backend multer
          const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
          if (!allowedTypes.includes(mimeType)) {
            mimeType = 'image/jpeg';
          }
          
          const parts = mimeType.split('/');
          fileType = parts[parts.length - 1] === 'pdf' ? 'pdf' : parts[parts.length - 1] || 'jpg';
          blob = new Blob([rawBlob], { type: mimeType });
        } else {
          const uriParts = details.kycUri.split('.');
          fileType = uriParts[uriParts.length - 1] || 'jpg';
          mimeType = fileType === 'pdf' ? 'application/pdf' : `image/${fileType}`;
        }

        const fileName = `kyc_doc_${Date.now()}.${fileType}`;

        if (Platform.OS === 'web') {
          formData.append('kycDocument', blob, fileName);
        } else {
          formData.append('kycDocument', {
            uri: details.kycUri,
            name: fileName,
            type: mimeType,
          });
        }
      }

      if (details.profileImageUri) {
        let blob = null;
        let fileType = 'jpg';
        let mimeType = 'image/jpeg';

        if (Platform.OS === 'web') {
          const res = await fetch(details.profileImageUri);
          const rawBlob = await res.blob();
          mimeType = rawBlob.type || 'image/jpeg';
          
          // Validate and fallback MIME types for backend multer
          const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
          if (!allowedTypes.includes(mimeType)) {
            mimeType = 'image/jpeg';
          }
          
          const parts = mimeType.split('/');
          fileType = parts[parts.length - 1] || 'jpg';
          blob = new Blob([rawBlob], { type: mimeType });
        } else {
          const uriParts = details.profileImageUri.split('.');
          fileType = uriParts[uriParts.length - 1] || 'jpg';
          mimeType = `image/${fileType}`;
        }

        const fileName = `profile_pic_${Date.now()}.${fileType}`;

        if (Platform.OS === 'web') {
          formData.append('profileImage', blob, fileName);
        } else {
          formData.append('profileImage', {
            uri: details.profileImageUri,
            name: fileName,
            type: mimeType,
          });
        }
      }

      const response = await fetch(`${API_BASE_URL}/auth/complete-profile`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${completeProfileToken}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        await AsyncStorage.setItem('token', data.token);
        setTokenState(data.token);
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Profile completion failed' };
      }
    } catch (err) {
      console.error('Complete profile error:', err);
      return { success: false, error: `Network error: ${err.message || err.toString()}` };
    }
  };

  const updateProfile = async (name, profileImageUri) => {
    try {
      const formData = new FormData();
      if (name) {
        formData.append('name', name);
      }

      if (profileImageUri) {
        let blob = null;
        let fileType = 'jpg';
        let mimeType = 'image/jpeg';

        if (Platform.OS === 'web') {
          const res = await fetch(profileImageUri);
          const rawBlob = await res.blob();
          mimeType = rawBlob.type || 'image/jpeg';
          
          const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
          if (!allowedTypes.includes(mimeType)) {
            mimeType = 'image/jpeg';
          }
          
          const parts = mimeType.split('/');
          fileType = parts[parts.length - 1] || 'jpg';
          blob = new Blob([rawBlob], { type: mimeType });
        } else {
          const uriParts = profileImageUri.split('.');
          fileType = uriParts[uriParts.length - 1] || 'jpg';
          mimeType = `image/${fileType}`;
        }

        const fileName = `profile_pic_${Date.now()}.${fileType}`;

        if (Platform.OS === 'web') {
          formData.append('profileImage', blob, fileName);
        } else {
          formData.append('profileImage', {
            uri: profileImageUri,
            name: fileName,
            type: mimeType,
          });
        }
      }

      const response = await fetch(`${API_BASE_URL}/auth/update-profile`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Failed to update profile' };
      }
    } catch (err) {
      console.error('Update profile error:', err);
      return { success: false, error: `Network error: ${err.message || err.toString()}` };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      setTokenState('');
      setUser(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, loginMpin, signupBasic, verifySignupOtp, completeMobileProfile, updateProfile, logout, fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
};
