import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import IdleSessionManager from './components/IdleSessionManager';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import ReceiveShareModal from './components/ReceiveShareModal';

function AppContent() {
  const { isAuthenticated } = useAuth();
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register' | 'forgot-password'
  const [loginEmail, setLoginEmail] = useState('');
  const [shareHash, setShareHash] = useState('');

  useEffect(() => {
    const checkShareHash = () => {
      const hash = window.location.hash;
      if (hash && hash.includes('share=')) {
        setShareHash(hash);
      } else {
        setShareHash('');
      }
    };

    checkShareHash();
    window.addEventListener('hashchange', checkShareHash);
    return () => window.removeEventListener('hashchange', checkShareHash);
  }, []);

  const handleCloseShareModal = () => {
    setShareHash('');
    // Remove #share from location without refreshing page
    if (window.history.pushState) {
      window.history.pushState('', document.title, window.location.pathname + window.location.search);
    } else {
      window.location.hash = '';
    }
  };

  const renderMainContent = () => {
    if (!isAuthenticated) {
      if (authMode === 'register') {
        return <RegisterPage onSwitchToLogin={() => setAuthMode('login')} />;
      }
      if (authMode === 'forgot-password') {
        return (
          <ForgotPasswordPage
            onSwitchToLogin={(email = '') => {
              if (email) setLoginEmail(email);
              setAuthMode('login');
            }}
          />
        );
      }
      return (
        <LoginPage
          initialEmail={loginEmail}
          onSwitchToRegister={() => setAuthMode('register')}
          onSwitchToForgotPassword={() => setAuthMode('forgot-password')}
        />
      );
    }

    return <DashboardPage />;
  };

  return (
    <>
      {renderMainContent()}

      {shareHash && (
        <ReceiveShareModal
          rawHash={shareHash}
          onClose={handleCloseShareModal}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <IdleSessionManager>
        <AppContent />
      </IdleSessionManager>
    </AuthProvider>
  );
}
