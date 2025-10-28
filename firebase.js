// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

// TODO: Add your own Firebase configuration here
const firebaseConfig = {
  apiKey: "AIzaSyD70vqTEpkDoxHrA1b0C3uJhESLti8k0uI",
  authDomain: "dashboard-baines.firebaseapp.com",
  projectId: "dashboard-baines",
  storageBucket: "dashboard-baines.firebasestorage.app",
  messagingSenderId: "490088692843",
  appId: "1:490088692843:web:87523298f218fa3570c52e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
