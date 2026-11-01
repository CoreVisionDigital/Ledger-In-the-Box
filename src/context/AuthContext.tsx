import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  fbSignOut, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  onAuthStateChanged,
  User,
  testFirestoreConnection
} from '../lib/firebase';
import { useNotification } from './NotificationContext';

import { SUPER_ADMIN_EMAIL } from '../types';

export interface AuthUserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  isDemoUser?: boolean;
  isSuperAdmin?: boolean;
}

interface AuthContextType {
  user: AuthUserProfile | null;
  firebaseUser: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  loginAsDemoUser: (role?: string) => void;
  loginAsSuperAdmin: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [demoUser, setDemoUser] = useState<AuthUserProfile | null>(() => {
    const cached = localStorage.getItem('bizledger_demo_user');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.warn('Cache parse error');
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const { success, error, info } = useNotification();

  useEffect(() => {
    // Boot check Firestore connection
    testFirestoreConnection().catch(err => console.warn('Init Firestore check:', err));

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setFirebaseUser(currentUser);
      if (currentUser) {
        setDemoUser(null);
        localStorage.removeItem('bizledger_demo_user');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
      success('Logged In', 'Welcome back to BizLedger!');
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      // If popup blocked or domain issues, inform user clearly
      error('Authentication Failed', err.message || 'Could not authenticate with Google.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, pass);
      success('Signed In Successfully', `Welcome back, ${email}`);
    } catch (err: any) {
      console.error('Email Login Error:', err);
      let msg = err.message || 'Invalid email or password.';
      if (err.code === 'auth/operation-not-allowed') {
        msg = 'Email/password authentication is not enabled in Firebase console. You can use Google Sign-in or BizLedger Demo Sandbox.';
      }
      error('Login Failed', msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const registerWithEmail = async (email: string, pass: string, name: string) => {
    try {
      setLoading(true);
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      // In Firebase client, we can store user display name in context or firestore
      success('Account Created', `Welcome to BizLedger, ${name}!`);
    } catch (err: any) {
      console.error('Registration Error:', err);
      let msg = err.message || 'Could not create account.';
      if (err.code === 'auth/operation-not-allowed') {
        msg = 'Email/password registration is not enabled in this Firebase project. Please use Google Sign In or Quick Demo Account.';
      }
      error('Registration Failed', msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const sendPasswordReset = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      success('Password Reset Sent', `Check inbox at ${email} for password recovery instructions.`);
    } catch (err: any) {
      console.error('Reset Error:', err);
      error('Password Reset Failed', err.message || 'Could not send reset email.');
      throw err;
    }
  };

  const loginAsDemoUser = (role: string = 'Director') => {
    const demoProfile: AuthUserProfile = {
      uid: 'demo_director_ng_001',
      email: 'director@dangote-supplies.ng',
      displayName: `Babajide Adebayo (${role})`,
      photoURL: null,
      isDemoUser: true,
    };
    setDemoUser(demoProfile);
    localStorage.setItem('bizledger_demo_user', JSON.stringify(demoProfile));
    info('Demo Account Active', 'Signed in as Nigerian business managing director for testing.');
  };

  const loginAsSuperAdmin = () => {
    const superAdminProfile: AuthUserProfile = {
      uid: 'super_admin_owner_001',
      email: SUPER_ADMIN_EMAIL,
      displayName: 'Super Admin (Account Owner)',
      photoURL: null,
      isDemoUser: false,
      isSuperAdmin: true,
    };
    setDemoUser(superAdminProfile);
    localStorage.setItem('bizledger_demo_user', JSON.stringify(superAdminProfile));
    success('Super Admin Authenticated', `Signed in as Account Owner (${SUPER_ADMIN_EMAIL}). Full platform & subscriber management active.`);
  };

  const logout = async () => {
    try {
      if (demoUser) {
        setDemoUser(null);
        localStorage.removeItem('bizledger_demo_user');
      }
      await fbSignOut(auth);
      success('Logged Out', 'You have been securely signed out.');
    } catch (err: any) {
      console.error('Logout error:', err);
      error('Logout Failed', err.message);
    }
  };

  const checkIsSuperAdmin = (targetEmail: string | null | undefined): boolean => {
    if (!targetEmail) return false;
    return targetEmail.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
  };

  const effectiveUser: AuthUserProfile | null = firebaseUser
    ? {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || (checkIsSuperAdmin(firebaseUser.email) ? 'Super Admin (Account Owner)' : firebaseUser.email?.split('@')[0]) || 'BizLedger User',
        photoURL: firebaseUser.photoURL,
        isDemoUser: false,
        isSuperAdmin: checkIsSuperAdmin(firebaseUser.email),
      }
    : demoUser
    ? {
        ...demoUser,
        isSuperAdmin: checkIsSuperAdmin(demoUser.email),
      }
    : null;

  return (
    <AuthContext.Provider
      value={{
        user: effectiveUser,
        firebaseUser,
        loading,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        sendPasswordReset,
        loginAsDemoUser,
        loginAsSuperAdmin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
