import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from "firebase/auth";
import { Capacitor } from "@capacitor/core";
import firebaseConfig from "../firebase-applet-config.json";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";
const GOOGLE_ACCESS_TOKEN_KEY = "layer_google_access_token";

const provider = new GoogleAuthProvider();
provider.addScope(GOOGLE_CALENDAR_SCOPE);

let isSigningIn = false;
let cachedAccessToken: string | null = sessionStorage.getItem(GOOGLE_ACCESS_TOKEN_KEY);

const setGoogleAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  if (token) {
    sessionStorage.setItem(GOOGLE_ACCESS_TOKEN_KEY, token);
  } else {
    sessionStorage.removeItem(GOOGLE_ACCESS_TOKEN_KEY);
  }
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onAuthSuccess) onAuthSuccess(user, '');
      }
    } else {
      setGoogleAccessToken(null);
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;

    if (Capacitor.isNativePlatform()) {
      const { FirebaseAuthentication } = await import("@capacitor-firebase/authentication");
      const googleResult = await FirebaseAuthentication.signInWithGoogle({
        skipNativeAuth: true,
        scopes: ["profile", "email", GOOGLE_CALENDAR_SCOPE],
        useCredentialManager: false,
      });
      const idToken = googleResult.credential?.idToken;
      const accessToken = googleResult.credential?.accessToken;
      if (!idToken || !accessToken) {
        throw new Error("Google sign-in did not return the required tokens");
      }
      const credential = GoogleAuthProvider.credential(idToken, accessToken);
      const result = await signInWithCredential(auth, credential);
      setGoogleAccessToken(accessToken);
      return { user: result.user, accessToken };
    } else {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) throw new Error("Failed to get access token");
      setGoogleAccessToken(credential.accessToken);
      return { user: result.user, accessToken: cachedAccessToken };
    }
  } catch (error: any) {
    console.error("Sign in error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logoutUser = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      const { FirebaseAuthentication } = await import("@capacitor-firebase/authentication");
      await FirebaseAuthentication.signOut();
    } catch {}
  }
  await signOut(auth);
  setGoogleAccessToken(null);
};
