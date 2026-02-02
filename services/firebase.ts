
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBCV7YQBgCIC5MBCVyI1AESSriE2k5ePfw",
  authDomain: "imstructure-79386.firebaseapp.com",
  projectId: "imstructure-79386",
  storageBucket: "imstructure-79386.firebasestorage.app",
  messagingSenderId: "747465857424",
  appId: "1:747465857424:web:f387ab93becf74ec1c3b15",
  measurementId: "G-YKNL1K336B"
};

// Initialize Firebase once
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);
