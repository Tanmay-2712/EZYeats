# Firebase Setup Instructions

This document contains instructions to set up your Firebase project for the EZY Eats application.

## Deploying Firestore Security Rules

The `src/scripts/firestore.rules` file contains security rules for your Firestore database. To deploy these rules:

### Option 1: Using Firebase Console (Easiest)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (ezy-eats-v2)
3. Navigate to Firestore Database from the left menu
4. Click on the "Rules" tab
5. Copy the contents of `src/scripts/firestore.rules` file
6. Paste the rules into the editor
7. Click "Publish" to deploy the rules

### Option 2: Using Firebase CLI (For Developers)

1. Install Firebase CLI if you haven't already:
   ```
   npm install -g firebase-tools
   ```

2. Log in to Firebase:
   ```
   firebase login
   ```

3. Initialize Firebase in your project (if not already done):
   ```
   firebase init
   ```
   - Select Firestore when prompted
   - Choose your project
   - Accept the default file locations

4. Copy the `src/scripts/firestore.rules` file to the root of your project as `firestore.rules`

5. Deploy the rules:
   ```
   firebase deploy --only firestore:rules
   ```

## Initializing Sample Data

The app includes an admin screen to help you initialize sample data for testing:

1. Launch the app
2. On the welcome screen, tap the "EZY EATS" logo text 5 times
3. On the admin screen, tap "Initialize Sample Data"
4. After initialization, you can use these credentials:
   - Customer: customer@example.com / password123
   - Vendor: vendor@example.com / password123

## Firestore Data Structure

The application uses the following collections:

- **users**: Stores user accounts and roles
  - Fields: email, role, createdAt

- **shops**: Stores vendor shop profiles
  - Fields: name, location, description, openingTime, closingTime, isOpen, ownerId, createdAt

- **menuItems**: Stores menu items for each shop
  - Fields: name, description, price, category, available, imageUrl, shopId, createdAt, updatedAt

- **orders**: Stores customer orders
  - Fields: customerId, shopId, shopName, items, totalAmount, status, pickupTime, specialInstructions, createdAt, updatedAt

## Security Rules Overview

The Firestore security rules implement the following policies:

1. **Public Access**:
   - Anyone can read shop and menu item data
   - This allows customers to browse shops without logging in

2. **User Data**:
   - Users can only read and update their own profile data
   - User creation is handled by authentication functions
   - User role information is protected but accessible for authorization

3. **Shop Management**:
   - Only vendors can create and update their own shop
   - Shop data cannot be deleted through client-side code

4. **Menu Management**:
   - Only vendors can create, update, and delete menu items for their own shop
   - Customers can view all menu items

5. **Order Management**:
   - Customers can only view their own orders
   - Vendors can only view orders for their shop
   - Customers can create orders and cancel them if still pending
   - Vendors can update order status through well-defined states

These rules ensure proper data access and modification controls while allowing the application to function as expected. 