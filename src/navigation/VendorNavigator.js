import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';

import LiveOrdersScreen from '../screens/vendor/LiveOrdersScreen';
import OrderDetailScreen from '../screens/vendor/OrderDetailScreen';
import MenuScreen from '../screens/vendor/MenuScreen';
import AddEditMenuItemScreen from '../screens/vendor/AddEditMenuItemScreen';
import ShopProfileScreen from '../screens/vendor/ShopProfileScreen';
import EditShopProfileScreen from '../screens/vendor/EditShopProfileScreen';
import OrderHistoryScreen from '../screens/vendor/OrderHistoryScreen';
import MyShopsScreen from '../screens/vendor/MyShopsScreen';
import CreateShopScreen from '../screens/vendor/CreateShopScreen';
import ShopDetailScreen from '../screens/vendor/ShopDetailScreen';
import AnalyticsScreen from '../screens/vendor/AnalyticsScreen';
import ShopQRCodeScreen from '../screens/vendor/ShopQRCodeScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const OrdersStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#ff8c00',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="LiveOrders" 
        component={LiveOrdersScreen} 
        options={{ 
          headerShown: true,
          title: 'Live Orders'
        }} 
      />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Order Details' }} />
      <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} options={{ title: 'Order History' }} />
    </Stack.Navigator>
  );
};

const MenuStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#ff8c00',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen name="Menu" component={MenuScreen} options={{ title: 'My Menu' }} />
      <Stack.Screen 
        name="AddEditMenuItem" 
        component={AddEditMenuItemScreen} 
        options={({ route }) => ({ 
          title: route.params?.item ? 'Edit Menu Item' : 'Add Menu Item' 
        })}
      />
      <Stack.Screen 
        name="ShopDetail" 
        component={ShopDetailScreen} 
        options={({ route }) => ({ 
          title: route.params?.shop?.name || 'Shop Details' 
        })}
      />
      <Stack.Screen 
        name="EditShopProfile" 
        component={EditShopProfileScreen} 
        options={{ title: 'Edit Shop' }}
      />
      <Stack.Screen 
        name="ShopQRCode" 
        component={ShopQRCodeScreen} 
        options={{ title: 'Shop QR Code' }}
      />
    </Stack.Navigator>
  );
};

const AnalyticsStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#ff8c00',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen name="AnalyticsDashboard" component={AnalyticsScreen} options={{ title: 'Analytics Dashboard' }} />
    </Stack.Navigator>
  );
};

const ProfileStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#ff8c00',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen name="Profile" component={ShopProfileScreen} options={{ title: 'My Profile' }} />
      <Stack.Screen name="CreateShop" component={CreateShopScreen} options={{ title: 'Create Shop' }} />
      <Stack.Screen name="MyShops" component={MyShopsScreen} options={{ title: 'Manage Shops' }} />
      <Stack.Screen 
        name="ShopDetail" 
        component={ShopDetailScreen} 
        options={({ route }) => ({ 
          title: route.params?.shop?.name || 'Shop Details' 
        })}
      />
      <Stack.Screen 
        name="EditShopProfile" 
        component={EditShopProfileScreen} 
        options={{ title: 'Edit Shop' }}
      />
      <Stack.Screen 
        name="ShopQRCode" 
        component={ShopQRCodeScreen} 
        options={{ title: 'Shop QR Code' }}
      />
    </Stack.Navigator>
  );
};

const VendorNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#ff8c00',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          height: 60,
          paddingBottom: 10,
        },
      }}
    >
      <Tab.Screen 
        name="OrdersTab" 
        component={OrdersStack} 
        options={{
          headerShown: false,
          title: 'Orders',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="receipt-long" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen 
        name="MenuTab" 
        component={MenuStack} 
        options={{
          headerShown: false,
          title: 'Menu',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="restaurant-menu" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen 
        name="AnalyticsTab" 
        component={AnalyticsStack} 
        options={{
          headerShown: false,
          title: 'Analytics',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="insights" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileStack} 
        options={{
          headerShown: false,
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default VendorNavigator; 