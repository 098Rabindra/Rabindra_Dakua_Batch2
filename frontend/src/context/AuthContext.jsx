import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../utils/api';
import { deriveKey } from '../utils/crypto';

/** @type {React.Context<any>} */
const AuthContext = createContext(null);

/**
 * @param {{ children: React.ReactNode }} props
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('vault_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState(() => localStorage.getItem('vault_token') || null);
  const [encryptionKey, setEncryptionKey] = useState(/** @type {any} */ (null));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(/** @type {any} */ (null));

  // Clear session state
  const logout = () => {
    setUser(null);
    setToken(null);
    setEncryptionKey(null);
    localStorage.removeItem('vault_user');
    localStorage.removeItem('vault_token');
  };

  /**
   * @param {string} email
   * @param {string} password
   */
  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authApi.login({ email, password });
      
      // Derive AES key from master password and user salt
      const derivedKey = await deriveKey(password, data.userSalt);

      const userData = {
        id: data.id,
        username: data.username,
        email: data.email,
        userSalt: data.userSalt,
      };

      return { userData, token: data.token, derivedKey };
    } catch (err) {
      const msg = err instanceof Error ? err.message : (err && typeof err === 'object' && 'message' in err ? String(/** @type {any} */ (err).message) : 'Login failed');
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * @param {{ userData: any, token: string, derivedKey: any }} param0
   */
  const completeLogin = ({ userData, token, derivedKey }) => {
    setEncryptionKey(derivedKey);
    setUser(userData);
    setToken(token);
    localStorage.setItem('vault_user', JSON.stringify(userData));
    localStorage.setItem('vault_token', token);
  };

  /**
   * @param {string} username
   * @param {string} email
   * @param {string} password
   */
  const register = async (username, email, password) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authApi.register({ username, email, password });
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : (err && typeof err === 'object' && 'message' in err ? String(/** @type {any} */ (err).message) : 'Registration failed');
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * @param {string} masterPassword
   */
  const unlockVault = async (masterPassword) => {
    if (!user || !user.userSalt) return false;
    try {
      const key = await deriveKey(masterPassword, user.userSalt);
      setEncryptionKey(key);
      return true;
    } catch (e) {
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        encryptionKey,
        loading,
        error,
        login,
        completeLogin,
        register,
        logout,
        unlockVault,
        isAuthenticated: !!token && !!user,
        isVaultUnlocked: !!encryptionKey,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
