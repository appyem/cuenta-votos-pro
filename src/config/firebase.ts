// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA73ei5aPU7CZjUx1PNstSQwGd_G0Uab0s",
  authDomain: "testigos-pro.firebaseapp.com",
  projectId: "testigos-pro",
  storageBucket: "testigos-pro.firebasestorage.app",
  messagingSenderId: "359125234197",
  appId: "1:359125234197:web:f2bd339a90d58570b8541c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);