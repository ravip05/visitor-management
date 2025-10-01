// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCv8JALe0RGBiT6iNLmL4RqVk6HKcitqb0",
  authDomain: "visitor-mangement-system-197f2.firebaseapp.com",
  projectId: "visitor-mangement-system-197f2",
  storageBucket: "visitor-mangement-system-197f2.firebasestorage.app",
  messagingSenderId: "403944214785",
  appId: "1:403944214785:web:334d6bbbe541d691c74b00",
  measurementId: "G-SVQQFBV2X0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);