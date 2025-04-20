/**
 * Firebase Initialization Script
 * 
 * This script helps initialize the necessary collections and documents in Firebase.
 * Run this script when setting up a fresh Firebase project for EZY Eats.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, writeBatch, getDoc, query, where, getDocs } from 'firebase/firestore';
import { createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword } from 'firebase/auth';

// Firebase configuration (same as in src/firebase/config.js)
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
const db = getFirestore(app);
const auth = getAuth(app);

/**
 * Initialize Sample Users
 * This function creates sample customer and vendor accounts
 * 
 * Note: This initialization logic bypasses security rules since it's running client-side
 * In production, you might want to use Firebase Functions to handle user creation.
 */
export const initializeSampleUsers = async () => {
  const sampleUsers = [
    {
      email: 'customer@example.com',
      password: 'password123',
      role: 'customer',
    },
    {
      email: 'vendor@example.com',
      password: 'password123',
      role: 'vendor',
    }
  ];

  try {
    for (const user of sampleUsers) {
      try {
        console.log(`Creating user: ${user.email}`);
        
        // Create user account through Authentication
        const userCredential = await createUserWithEmailAndPassword(
          auth, 
          user.email, 
          user.password
        );
        
        const uid = userCredential.user.uid;
        console.log(`User created with UID: ${uid}`);
        
        // Save user data to Firestore
        await setDoc(doc(db, 'users', uid), {
          email: user.email,
          role: user.role,
          createdAt: new Date().toISOString(),
        });

        console.log(`User data saved to Firestore: ${user.email} (${user.role})`);
        
        // For vendor, also create a shop profile
        if (user.role === 'vendor') {
          console.log(`Creating shop for vendor: ${uid}`);
          
          // Create the shop document
          await setDoc(doc(db, 'shops', uid), {
            name: 'Sample Canteen',
            location: 'Main Campus Building',
            description: 'This is a sample canteen for demonstration purposes.',
            openingTime: '8:00 AM',
            closingTime: '6:00 PM',
            isOpen: true,
            ownerId: uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          
          console.log('Sample shop created successfully');
          
          // Add sample menu items
          await initializeSampleMenuItems(uid);
        }
      } catch (error) {
        // Skip if user already exists
        console.log(`Error creating user ${user.email}: ${error.message}`);
        
        // If the error is because the user already exists, try to proceed with shop creation
        if (error.code === 'auth/email-already-in-use') {
          console.log(`User ${user.email} already exists, trying to sign in`);
          
          try {
            // Try to sign in and continue with shop creation
            const userCredential = await signInWithEmailAndPassword(auth, user.email, user.password);
            const uid = userCredential.user.uid;
            
            // For vendor, check if shop exists and create if not
            if (user.role === 'vendor') {
              console.log(`Checking shop for existing vendor: ${uid}`);
              
              const shopDoc = await getDoc(doc(db, 'shops', uid));
              
              if (!shopDoc.exists()) {
                console.log(`Shop doesn't exist for ${uid}, creating now`);
                
                await setDoc(doc(db, 'shops', uid), {
                  name: 'Sample Canteen',
                  location: 'Main Campus Building',
                  description: 'This is a sample canteen for demonstration purposes.',
                  openingTime: '8:00 AM',
                  closingTime: '6:00 PM',
                  isOpen: true,
                  ownerId: uid,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                });
                
                console.log('Sample shop created for existing vendor');
                
                // Add sample menu items
                await initializeSampleMenuItems(uid);
              } else {
                console.log('Shop already exists for this vendor');
              }
            }
          } catch (signinError) {
            console.log(`Error signing in existing user: ${signinError.message}`);
          }
        }
      }
    }
    
    console.log('Sample users initialization complete');
  } catch (error) {
    console.error('Error initializing sample users:', error);
  }
};

/**
 * Initialize Sample Menu Items
 * This function creates sample menu items for a given shop
 */
export const initializeSampleMenuItems = async (shopId) => {
  console.log(`Creating sample menu items for shop: ${shopId}`);
  
  const sampleMenuItems = [
    {
      name: 'Chicken Burger',
      description: 'Juicy chicken patty with lettuce, tomato, and special sauce',
      price: 8.99,
      category: 'Burgers',
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?ixlib=rb-4.0.3',
    },
    {
      name: 'Vegetable Wrap',
      description: 'Fresh vegetables with hummus in a whole wheat wrap',
      price: 6.99,
      category: 'Wraps',
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1542444256-9dd3e45c9b81?ixlib=rb-4.0.3',
    },
    {
      name: 'French Fries',
      description: 'Crispy golden fries with seasoning',
      price: 3.99,
      category: 'Sides',
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1576107232684-1279f390859f?ixlib=rb-4.0.3',
    },
    {
      name: 'Chocolate Milkshake',
      description: 'Creamy chocolate milkshake topped with whipped cream',
      price: 4.99,
      category: 'Beverages',
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?ixlib=rb-4.0.3',
    },
  ];
  
  try {
    // Check for existing menu items first
    const menuRef = collection(db, 'menuItems');
    const q = query(menuRef, where('shopId', '==', shopId));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      console.log(`Menu items already exist for shop ${shopId}, skipping creation`);
      return;
    }
    
    console.log(`No existing menu items found, creating new ones`);
    const batch = writeBatch(db);
    
    for (const item of sampleMenuItems) {
      const menuItemRef = doc(collection(db, 'menuItems'));
      console.log(`Adding menu item: ${item.name}`);
      
      batch.set(menuItemRef, {
        ...item,
        shopId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    
    await batch.commit();
    console.log(`${sampleMenuItems.length} sample menu items created successfully`);
  } catch (error) {
    console.error('Error creating sample menu items:', error);
  }
};

/**
 * How to use this script:
 * 
 * Import this script in a temporary component and call the functions when needed,
 * or you can create a separate initialization screen for admin purposes.
 * 
 * Example:
 * ```
 * import { initializeSampleUsers } from '../scripts/firebaseInit';
 * 
 * // Later in your component:
 * const handleInitialize = async () => {
 *   await initializeSampleUsers();
 * };
 * ```
 */

// Export functions for external use
export { db, auth }; 