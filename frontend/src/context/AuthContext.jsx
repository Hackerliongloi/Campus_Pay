import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [loading, setLoading] = useState(true);

  // Set Authorization Header utility
  const getHeaders = () => {
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  // Fetch current user details
  const fetchMe = async (currentToken = token) => {
    if (!currentToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setUser(data.user);
      } else {
        // Token invalid/expired
        logout();
      }
    } catch (err) {
      console.error('Error fetching user info:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  // Sync token changes
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      fetchMe(token);
    } else {
      localStorage.removeItem('token');
      setUser(null);
      setLoading(false);
    }
  }, [token]);

  // Login with Password
  const login = async (email, password) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (data.success) {
        setToken(data.token);
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (err) {
      return { success: false, error: 'Network error. Please try again later.' };
    }
  };

  // Login with MPIN
  const loginMpin = async (email, mpin) => {
    try {
      const response = await fetch('/api/auth/login-mpin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, mpin }),
      });

      const data = await response.json();
      if (data.success) {
        setToken(data.token);
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Invalid MPIN' };
      }
    } catch (err) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  // Register WebAuthn (Biometrics)
  const registerBiometrics = async (useMock = false) => {
    try {
      // 1. Fetch challenge and registration options from backend
      const optionsResponse = await fetch('/api/auth/webauthn/register-options', {
        method: 'POST',
        headers: getHeaders(),
      });

      if (!optionsResponse.ok) {
        const errorData = await optionsResponse.json();
        return { success: false, error: errorData.error || 'Failed to get biometric options' };
      }

      const options = await optionsResponse.json();

      let credentialResponse;

      if (useMock) {
        // Simulated credential registration for environments without active biometric hardware
        credentialResponse = {
          id: 'mock_bio_credential_' + Math.random().toString(36).substr(2, 9),
          rawId: 'mock_raw_id_data',
          type: 'public-key',
          response: {
            clientDataJSON: 'mock_client_data',
            attestationObject: 'mock_attestation_object',
          },
        };
      } else {
        // Trigger browser native Passkey / WebAuthn interface
        if (!navigator.credentials || !navigator.credentials.create) {
          return { success: false, error: 'WebAuthn (Passkeys) not supported on this browser/device' };
        }

        // Convert base64 challenge to array buffer
        const challengeBuffer = Uint8Array.from(atob(options.challenge.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
        const userIdBuffer = new TextEncoder().encode(options.user.id);

        const credential = await navigator.credentials.create({
          publicKey: {
            ...options,
            challenge: challengeBuffer,
            user: {
              ...options.user,
              id: userIdBuffer,
            },
            excludeCredentials: options.excludeCredentials.map(c => ({
              ...c,
              id: Uint8Array.from(atob(c.id.replace(/-/g, '+').replace(/_/g, '/')), char => char.charCodeAt(0)),
            })),
          },
        });

        // Parse credentials for transmitting to backend
        credentialResponse = {
          id: credential.id,
          rawId: credential.id,
          type: credential.type,
          response: {
            clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(credential.response.clientDataJSON))),
            attestationObject: btoa(String.fromCharCode(...new Uint8Array(credential.response.attestationObject))),
            transports: credential.response.getTransports ? credential.response.getTransports() : [],
          },
        };
      }

      // 2. Transmit to backend for verification
      const verifyResponse = await fetch('/api/auth/webauthn/register-verify', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ credentialResponse, mock: useMock }),
      });

      const verifyData = await verifyResponse.json();
      if (verifyData.success) {
        // Refresh profile state to update biometric enrollment indicators
        await fetchMe();
        return { success: true, message: verifyData.message };
      } else {
        return { success: false, error: verifyData.error || 'Biometric validation failed' };
      }
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message || 'Biometric registration failed' };
    }
  };

  // Login with WebAuthn (Biometrics)
  const loginBiometrics = async (email, useMock = false) => {
    try {
      if (!email) {
        return { success: false, error: 'Please enter your email to login with biometrics' };
      }

      // 1. Fetch authentication options
      const optionsResponse = await fetch('/api/auth/webauthn/login-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!optionsResponse.ok) {
        const errorData = await optionsResponse.json();
        return { success: false, error: errorData.error || 'Failed to retrieve biometric login options' };
      }

      const options = await optionsResponse.json();

      let credentialResponse;

      if (useMock) {
        credentialResponse = {
          id: 'mock_bio_credential_id',
          rawId: 'mock_raw_id_data',
          type: 'public-key',
          response: {
            clientDataJSON: 'mock_client_data',
            authenticatorData: 'mock_auth_data',
            signature: 'mock_signature',
          },
        };
      } else {
        if (!navigator.credentials || !navigator.credentials.get) {
          return { success: false, error: 'WebAuthn is not supported on this browser' };
        }

        const challengeBuffer = Uint8Array.from(atob(options.challenge.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

        const credential = await navigator.credentials.get({
          publicKey: {
            challenge: challengeBuffer,
            rpId: options.rpId,
            allowCredentials: options.allowCredentials.map(c => ({
              ...c,
              id: Uint8Array.from(atob(c.id.replace(/-/g, '+').replace(/_/g, '/')), char => char.charCodeAt(0)),
            })),
            userVerification: options.userVerification,
          },
        });

        credentialResponse = {
          id: credential.id,
          rawId: credential.id,
          type: credential.type,
          response: {
            clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(credential.response.clientDataJSON))),
            authenticatorData: btoa(String.fromCharCode(...new Uint8Array(credential.response.authenticatorData))),
            signature: btoa(String.fromCharCode(...new Uint8Array(credential.response.signature))),
            userHandle: credential.response.userHandle ? btoa(String.fromCharCode(...new Uint8Array(credential.response.userHandle))) : null,
          },
        };
      }

      // 2. Verify with backend
      const verifyResponse = await fetch('/api/auth/webauthn/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, credentialResponse, mock: useMock }),
      });

      const verifyData = await verifyResponse.json();
      if (verifyData.success) {
        setToken(verifyData.token);
        setUser(verifyData.user);
        return { success: true };
      } else {
        return { success: false, error: verifyData.error || 'Biometric authentication failed' };
      }
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message || 'Biometric authentication failed' };
    }
  };

  // Update Profile Name / Picture
  const updateProfile = async (formData) => {
    try {
      const response = await fetch('/api/auth/update-profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setUser(data.user);
        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.error || 'Failed to update profile' };
      }
    } catch (err) {
      return { success: false, error: 'Network error. Please try again later.' };
    }
  };

  // Logout
  const logout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        loginMpin,
        loginBiometrics,
        registerBiometrics,
        logout,
        fetchMe,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
