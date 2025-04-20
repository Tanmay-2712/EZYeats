import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDJyVwaX8uwaGTHkT5b6ct4cxiMUm94OBs",
  authDomain: "ezy-eats-v2.firebaseapp.com",
  databaseURL: "https://ezy-eats-v2-default-rtdb.firebaseio.com",
  projectId: "ezy-eats-v2",
  storageBucket: "ezy-eats-v2.firebasestorage.app",
  messagingSenderId: "1080764604854",
  appId: "1:1080764604854:web:1dd1b0a1a7a9efc579a117",
  measurementId: "G-DSBT05GFKF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication with AsyncStorage persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

// Initialize Realtime Database and get a reference to the service
const rtdb = getDatabase(app);

// Initialize Cloud Storage and get a reference to the service
const storage = getStorage(app);

export { auth, db, rtdb, storage }; 