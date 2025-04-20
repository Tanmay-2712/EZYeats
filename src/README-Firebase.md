# Firebase Integration for EZY-eats

This document provides important information about how the application integrates with Firebase services.

## Firebase Services Used

1. **Firebase Authentication**
   - Handles user signup, login, and session management
   - Supports email/password authentication
   - Persistence implemented with AsyncStorage for React Native

2. **Cloud Firestore**
   - Primary database for structured data
   - Stores user profiles, shops, menu items, and orders
   - Used for all CRUD operations with strict security rules

3. **Realtime Database**
   - Used for real-time order updates and notifications
   - Improves performance for live order tracking
   - Synced with Firestore for data consistency

4. **Cloud Storage**
   - Stores media files (menu item images, profile pictures)

## Data Structure

### Firestore Collections

- **users**: Stores user accounts and roles
  - Fields: email, role, createdAt

- **shops**: Stores vendor shop profiles
  - Fields: name, location, description, openingTime, closingTime, isOpen, ownerId, createdAt, updatedAt

- **menuItems**: Stores menu items for each shop
  - Fields: name, description, price, category, available, imageUrl, shopId, createdAt, updatedAt

- **orders**: Stores customer orders
  - Fields: customerId, shopId, shopName, items, totalAmount, status, pickupTime, specialInstructions, createdAt, updatedAt

### Realtime Database Structure

- **shopOrders/{shopId}/{orderId}**: Orders organized by shop for vendor access
  - Contains the same data as Firestore orders

- **customerOrders/{customerId}/{orderId}**: Orders organized by customer for customer access
  - Contains the same data as Firestore orders

## Order Flow and Data Synchronization

1. **Order Creation**:
   - New orders are created in Firestore (primary source of truth)
   - Order data is also written to Realtime Database for real-time updates
   - Data is stored in both `shopOrders/{shopId}/{orderId}` and `customerOrders/{customerId}/{orderId}`

2. **Order Status Updates**:
   - Status changes are written to both Firestore and Realtime Database
   - Firestore serves as the permanent record
   - Realtime Database provides immediate updates to UI

## Security Rules

The application uses two sets of security rules:

1. **Firestore Rules** (`src/scripts/firestore.rules`):
   - Controls access to all collections
   - Enforces proper data validation and access patterns
   - Implements complex authorization checks with helper functions

2. **Realtime Database Rules** (`database.rules.json`):
   - Controls access to real-time order updates
   - Ensures data integrity and proper authorization
   - Limits data access to only authorized users

## Deployment Instructions

### Firestore Rules Deployment

1. Go to Firebase Console > Firestore > Rules
2. Copy the contents of `src/scripts/firestore.rules`
3. Paste and publish

### Realtime Database Rules Deployment

1. Go to Firebase Console > Realtime Database > Rules
2. Copy the contents of `database.rules.json`
3. Paste and publish

## Authentication

The app uses Firebase Authentication with email/password. User profiles are stored in both Auth and Firestore:

- **Auth Profile**: Basic auth information (email, UID)
- **Firestore Profile**: Extended user data (role, preferences, etc.)

## Troubleshooting

### Permission Denied Errors

1. Ensure the user is authenticated
2. Check that the user has the correct role in Firestore (customer or vendor)
3. For vendor operations, verify shop ownership in security rules
4. If using Realtime Database, ensure both RTDB and Firestore rules are properly configured

### Data Synchronization Issues

If real-time updates aren't working:

1. Check network connectivity
2. Verify Realtime Database and Firestore paths are correct
3. Ensure data is written to both databases correctly
4. Check for any error messages in the console logs

## Development Best Practices

1. **Always Keep Data in Sync**:
   - When writing to one database, also write to the other
   - Handle errors appropriately to prevent data inconsistency

2. **Error Handling**:
   - Implement fallback to Firestore if Realtime Database operations fail
   - Add proper error handling for all database operations

3. **Security First**:
   - Never bypass security rules with admin privileges in client code
   - Use Firebase Functions for operations that require elevated privileges 