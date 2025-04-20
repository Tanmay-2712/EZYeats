import { auth, db, rtdb } from '../../firebase/config.js';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { ref, set } from 'firebase/database';

// Vendor data (5 vendors with unique emails)
export const vendors = [
  {
    email: 'vendor1@ezyeats.com',
    password: 'password123',
    name: 'Rahul Sharma',
    role: 'vendor',
    phone: '+91 9876543210'
  },
  {
    email: 'vendor2@ezyeats.com',
    password: 'password123',
    name: 'Priya Patel',
    role: 'vendor',
    phone: '+91 9876543211'
  },
  {
    email: 'vendor3@ezyeats.com',
    password: 'password123',
    name: 'Amit Singh',
    role: 'vendor',
    phone: '+91 9876543212'
  },
  {
    email: 'vendor4@ezyeats.com',
    password: 'password123',
    name: 'Neha Gupta',
    role: 'vendor',
    phone: '+91 9876543213'
  },
  {
    email: 'vendor5@ezyeats.com',
    password: 'password123',
    name: 'Vikram Reddy',
    role: 'vendor',
    phone: '+91 9876543214'
  }
];

// Shop data (one shop per vendor)
export const shops = [
  {
    name: 'Dhaba Express',
    description: 'Authentic North Indian cuisine served fresh daily. Famous for our butter chicken and naan.',
    location: 'North Campus, Near Library',
    openingTime: '8:00 AM',
    closingTime: '10:00 PM',
    isOpen: true,
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=500',
    averageRating: 4.5,
    ratingCount: 32,
    ratingTotal: 144
  },
  {
    name: 'South Spice',
    description: 'Delicious South Indian food - best dosas, idlis, and vadas on campus!',
    location: 'Engineering Block, Ground Floor',
    openingTime: '7:30 AM',
    closingTime: '9:00 PM',
    isOpen: true,
    image: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?q=80&w=500',
    averageRating: 4.2,
    ratingCount: 28,
    ratingTotal: 117.6
  },
  {
    name: 'Chaiwala & Co',
    description: 'Premium tea, coffee, and snacks. The perfect stop between classes.',
    location: 'Central Courtyard',
    openingTime: '7:00 AM',
    closingTime: '8:00 PM',
    isOpen: true,
    image: 'https://images.unsplash.com/photo-1547825407-2d060104b7f8?q=80&w=500',
    averageRating: 4.7,
    ratingCount: 45,
    ratingTotal: 211.5
  },
  {
    name: 'Rolls & Bowls',
    description: 'Fast, tasty rolls, bowls, and wraps with a variety of fillings and flavors.',
    location: 'Sports Complex',
    openingTime: '9:00 AM',
    closingTime: '9:30 PM',
    isOpen: true,
    image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?q=80&w=500',
    averageRating: 4.0,
    ratingCount: 22,
    ratingTotal: 88
  },
  {
    name: 'Campus Pizza Hub',
    description: 'Fusion pizzas with Indian flavors. Student favorites include Paneer Tikka and Tandoori Chicken pizzas.',
    location: 'Arts Block, First Floor',
    openingTime: '10:00 AM',
    closingTime: '11:00 PM',
    isOpen: true,
    image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?q=80&w=500',
    averageRating: 4.3,
    ratingCount: 37,
    ratingTotal: 159.1
  }
];

// Menu items for each shop
export const menuItems = {
  'Dhaba Express': [
    {
      name: 'Butter Chicken',
      description: 'Tender chicken pieces in a rich, creamy tomato gravy.',
      price: 220,
      category: 'Main Course',
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?q=80&w=500'
    },
    {
      name: 'Paneer Tikka',
      description: 'Marinated cottage cheese cubes, grilled to perfection with spices.',
      price: 180,
      category: 'Starters',
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?q=80&w=500'
    },
    {
      name: 'Dal Makhani',
      description: 'Black lentils simmered overnight with cream and spices.',
      price: 150,
      category: 'Main Course',
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=500'
    },
    {
      name: 'Naan',
      description: 'Traditional tandoor-baked flatbread.',
      price: 40,
      category: 'Breads',
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?q=80&w=500'
    },
    {
      name: 'Jeera Rice',
      description: 'Fragrant basmati rice tempered with cumin seeds.',
      price: 120,
      category: 'Rice',
      available: true,
      imageUrl: 'https://plus.unsplash.com/premium_photo-1664472697012-0e4170a6c1b2?q=80&w=500'
    }
  ],
  'South Spice': [
    {
      name: 'Masala Dosa',
      description: 'Crispy rice crepe filled with spiced potato filling.',
      price: 120,
      category: 'Breakfast',
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f86762b1?q=80&w=500'
    },
    {
      name: 'Idli Sambar',
      description: 'Steamed rice cakes served with lentil soup and coconut chutney.',
      price: 80,
      category: 'Breakfast',
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1626196340532-5dd9734c2358?q=80&w=500'
    },
    {
      name: 'Medu Vada',
      description: 'Crispy lentil fritters served with chutney.',
      price: 70,
      category: 'Snacks',
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?q=80&w=500'
    },
    {
      name: 'Vegetable Biryani',
      description: 'Fragrant rice cooked with mixed vegetables and spices.',
      price: 160,
      category: 'Main Course',
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?q=80&w=500'
    },
    {
      name: 'Filter Coffee',
      description: 'Strong, aromatic South Indian coffee served frothy.',
      price: 40,
      category: 'Beverages',
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?q=80&w=500'
    }
  ],
  'Chaiwala & Co': [
    {
      name: 'Masala Chai',
      description: 'Spiced Indian tea with ginger and cardamom.',
      price: 30,
      category: 'Beverages',
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1571939228382-b2f2b585ce15?q=80&w=500'
    },
    {
      name: 'Cold Coffee',
      description: 'Refreshing cold coffee with ice cream.',
      price: 60,
      category: 'Beverages',
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1592663527359-cf6642f54cff?q=80&w=500'
    },
    {
      name: 'Samosa',
      description: 'Crispy pastry filled with spiced potatoes and peas.',
      price: 25,
      category: 'Snacks',
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=500'
    },
    {
      name: 'Vada Pav',
      description: 'Mumbai-style potato fritter in a bun with chutneys.',
      price: 35,
      category: 'Snacks',
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1523358526791-2abc29be0583?q=80&w=500'
    },
    {
      name: 'Bread Pakora',
      description: 'Bread slices dipped in spiced gram flour batter and fried.',
      price: 30,
      category: 'Snacks',
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?q=80&w=500'
    }
  ],
  'Rolls & Bowls': [
    {
      name: 'Paneer Kathi Roll',
      description: 'Flaky paratha with spiced paneer filling and chutneys.',
      price: 120,
      category: 'Rolls',
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?q=80&w=500'
    },
    {
      name: 'Chicken Tikka Roll',
      description: 'Grilled chicken tikka pieces wrapped in paratha with mint chutney.',
      price: 140,
      category: 'Rolls',
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1576168056864-a3902a154f67?q=80&w=500'
    },
    {
      name: 'Rajma Chawal Bowl',
      description: 'Kidney bean curry served over steamed rice.',
      price: 110,
      category: 'Bowls',
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1585215702861-d2b6c46b9acd?q=80&w=500'
    },
    {
      name: 'Chana Bowl',
      description: 'Spiced chickpea curry with rice and pickle.',
      price: 100,
      category: 'Bowls',
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1627662056950-b8629fa0db9f?q=80&w=500'
    },
    {
      name: 'Chicken Biryani Bowl',
      description: 'Aromatic basmati rice cooked with chicken and spices.',
      price: 160,
      category: 'Bowls',
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1644364935906-792b2245a2c0?q=80&w=500'
    }
  ],
  'Campus Pizza Hub': [
    {
      name: 'Paneer Tikka Pizza',
      description: 'Tandoori spiced paneer with bell peppers on a thin crust.',
      price: 280,
      category: 'Pizzas',
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1569698170091-22f9c77e4380?q=80&w=500'
    },
    {
      name: 'Tandoori Chicken Pizza',
      description: 'Spicy tandoori chicken with onions and peppers.',
      price: 320,
      category: 'Pizzas',
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1584365685547-9a5fb6f3a70c?q=80&w=500'
    },
    {
      name: 'Cheese Garlic Bread',
      description: 'Crispy garlic bread topped with melted mozzarella.',
      price: 150,
      category: 'Sides',
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1651439000241-a793b5f4452e?q=80&w=500'
    },
    {
      name: 'Masala Fries',
      description: 'French fries tossed with Indian spices.',
      price: 120,
      category: 'Sides',
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1576100246629-857395eb1f0e?q=80&w=500'
    },
    {
      name: 'Cold Coffee',
      description: 'Refreshing cold coffee with chocolate drizzle.',
      price: 80,
      category: 'Beverages',
      available: true,
      imageUrl: 'https://images.unsplash.com/photo-1525992506793-28393e208f98?q=80&w=500'
    }
  ]
};

// Function to create a vendor user
const createVendor = async (vendor) => {
  try {
    // Check if user already exists
    let uid;
    try {
      // Try to create new user
      const userCredential = await createUserWithEmailAndPassword(auth, vendor.email, vendor.password);
      uid = userCredential.user.uid;
      console.log(`Created vendor user: ${vendor.email} with UID: ${uid}`);
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        console.log(`Vendor ${vendor.email} already exists, signing in instead`);
        const userCredential = await signInWithEmailAndPassword(auth, vendor.email, vendor.password);
        uid = userCredential.user.uid;
      } else {
        throw error;
      }
    }
    
    // Save vendor details to Firestore
    await setDoc(doc(db, 'users', uid), {
      email: vendor.email,
      name: vendor.name,
      role: vendor.role,
      phone: vendor.phone,
      createdAt: serverTimestamp()
    });
    
    return uid;
  } catch (error) {
    console.error(`Error creating vendor ${vendor.email}:`, error);
    throw error;
  }
};

// Function to create a shop
const createShop = async (shop, vendorId) => {
  try {
    // Check if vendor already has a shop
    const shopsRef = collection(db, 'shops');
    const q = query(shopsRef, where('ownerId', '==', vendorId));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      console.log(`Vendor ${vendorId} already has a shop, skipping creation`);
      return querySnapshot.docs[0].id;
    }
    
    // Create new shop
    const shopData = {
      ...shop,
      ownerId: vendorId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const shopRef = await addDoc(collection(db, 'shops'), shopData);
    console.log(`Created shop: ${shop.name} with ID: ${shopRef.id}`);
    
    // Initialize shop orders in Realtime Database
    await set(ref(rtdb, `shopOrders/${shopRef.id}/initialized`), true);
    console.log(`Initialized orders structure in Realtime DB for shop: ${shopRef.id}`);
    
    return shopRef.id;
  } catch (error) {
    console.error(`Error creating shop for vendor ${vendorId}:`, error);
    throw error;
  }
};

// Function to create menu items for a shop
const createMenuItems = async (items, shopId) => {
  try {
    // Check if shop already has menu items
    const menuRef = collection(db, 'menuItems');
    const q = query(menuRef, where('shopId', '==', shopId));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      console.log(`Shop ${shopId} already has menu items, skipping creation`);
      return;
    }
    
    // Create menu items
    for (const item of items) {
      const menuItemData = {
        ...item,
        shopId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'menuItems'), menuItemData);
      console.log(`Created menu item: ${item.name} for shop ${shopId}`);
    }
    
    console.log(`Created ${items.length} menu items for shop ${shopId}`);
  } catch (error) {
    console.error(`Error creating menu items for shop ${shopId}:`, error);
    throw error;
  }
};

// Main function to execute the data population
const populateData = async () => {
  try {
    console.log('Starting data population process...');
    
    for (let i = 0; i < vendors.length; i++) {
      const vendor = vendors[i];
      const shop = shops[i];
      
      // Create vendor
      console.log(`Creating vendor ${i+1}/${vendors.length}: ${vendor.email}`);
      const vendorId = await createVendor(vendor);
      
      // Create shop for vendor
      console.log(`Creating shop for vendor ${vendor.email}: ${shop.name}`);
      const shopId = await createShop(shop, vendorId);
      
      // Create menu items for shop
      console.log(`Creating menu items for shop ${shop.name}`);
      await createMenuItems(menuItems[shop.name], shopId);
    }
    
    console.log('Data population completed successfully!');
  } catch (error) {
    console.error('Error populating data:', error);
  }
};

// Execute the data population
populateData();

export default populateData; 