"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import type { UserProfile } from "./types";

// ─── Friendly Firebase error mapping ───
function friendlyFirebaseError(err: unknown): string {
  if (!(err instanceof Error)) return "An unexpected error occurred.";
  const code = (err as { code?: string }).code ?? "";
  switch (code) {
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/user-disabled":
      return "This account has been disabled. Contact your admin.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    case "auth/popup-closed-by-user":
      return "Sign-in popup was closed. Please try again.";
    case "auth/network-request-failed":
      return "Network error. Check your internet connection.";
    case "auth/email-already-in-use":
      return "This email is already associated with another account.";
    default:
      return err.message || "Sign in failed.";
  }
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const profileDoc = await getDoc(doc(db, "users", user.uid));
          const profile = profileDoc.exists()
            ? ({ uid: user.uid, ...profileDoc.data() } as UserProfile)
            : null;
          setState({ user, profile, loading: false, error: null });
        } catch {
          setState({ user, profile: null, loading: false, error: "Failed to load profile" });
        }
      } else {
        setState({ user: null, profile: null, loading: false, error: null });
      }
    });
    return unsubscribe;
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: friendlyFirebaseError(err),
      }));
    }
  };

  const signInWithGoogle = async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: friendlyFirebaseError(err),
      }));
    }
  };

  const sendPasswordReset = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      throw new Error(friendlyFirebaseError(err));
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{ ...state, signInWithEmail, signInWithGoogle, signOut, sendPasswordReset }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
