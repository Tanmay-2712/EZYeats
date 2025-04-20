import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';

import ShopsScreen from '../screens/customer/ShopsScreen';
import ShopDetailScreen from '../screens/customer/ShopDetailScreen';
import CartScreen from '../screens/customer/CartScreen';
import CheckoutScreen from '../screens/customer/CheckoutScreen';
import OrdersScreen from '../screens/customer/OrdersScreen';
import OrderDetailScreen from '../screens/customer/OrderDetailScreen';
import ProfileScreen from '../screens/customer/ProfileScreen';
import RatingScreen from '../screens/customer/RatingScreen';
import QRScannerScreen from '../screens/customer/QRScannerScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const ShopsStack = () => {
  return (
    <Stack.Navigator
      initialRouteName="Shops"
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
        name="Shops" 
        component={ShopsScreen} 
        options={({ navigation }) => ({ 
          title: 'Campus Canteens',
          headerRight: () => (
            <MaterialIcons 
              name="qr-code-scanner" 
              size={24} 
              color="#fff" 
              style={{ marginRight: 16 }}
              onPress={() => navigation.navigate('QRScanner')} 
            />
          )
        })} 
      />
      <Stack.Screen name="ShopDetail" component={ShopDetailScreen} options={({ route }) => ({ title: route.params.shopName })} />
      <Stack.Screen name="Cart" component={CartScreen} options={{ title: 'My Cart' }} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Checkout' }} />
      <Stack.Screen 
        name="QRScanner" 
        component={QRScannerScreen} 
        options={{ 
          title: 'Scan Shop QR Code',
          headerStyle: {
            backgroundColor: '#000',
          },
        }}
      />
    </Stack.Navigator>
  );
};

const CartStack = () => {
  return (
    <Stack.Navigator
      initialRouteName="CartScreen"
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
      <Stack.Screen name="CartScreen" component={CartScreen} options={{ title: 'My Cart' }} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Checkout' }} />
    </Stack.Navigator>
  );
};

const OrdersStack = () => {
  return (
    <Stack.Navigator
      initialRouteName="OrdersList"
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
      <Stack.Screen name="OrdersList" component={OrdersScreen} options={{ title: 'My Orders' }} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Order Details' }} />
      <Stack.Screen name="RateOrder" component={RatingScreen} options={{ title: 'Rate Your Order' }} />
    </Stack.Navigator>
  );
};

const ProfileStack = () => {
  return (
    <Stack.Navigator
      initialRouteName="ProfileScreen"
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
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} options={{ title: 'My Profile' }} />
    </Stack.Navigator>
  );
};

const CustomerNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#ff8c00',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          height: 60,
          paddingBottom: 10,
        },
        unmountOnBlur: true,
      }}
    >
      <Tab.Screen 
        name="ShopsTab" 
        component={ShopsStack} 
        options={{
          headerShown: false,
          title: 'Shops',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="store" color={color} size={size} />
          ),
        }}
        listeners={({ navigation, route }) => ({
          tabPress: e => {
            const currentRouteName = getFocusedRouteNameFromRoute(route);
            if (currentRouteName && currentRouteName !== 'Shops') {
              e.preventDefault();
              navigation.navigate('ShopsTab', { screen: 'Shops' });
            }
          },
        })}
      />
      <Tab.Screen 
        name="CartTab" 
        component={CartStack} 
        options={{
          headerShown: false,
          title: 'Cart',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="shopping-cart" color={color} size={size} />
          ),
        }}
        listeners={({ navigation, route }) => ({
          tabPress: e => {
            const currentRouteName = getFocusedRouteNameFromRoute(route);
            if (currentRouteName && currentRouteName !== 'CartScreen') {
              e.preventDefault();
              navigation.navigate('CartTab', { screen: 'CartScreen' });
            }
          },
        })}
      />
      <Tab.Screen 
        name="OrdersTab" 
        component={OrdersStack} 
        options={{
          headerShown: false,
          title: 'Orders',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="receipt" color={color} size={size} />
          ),
        }}
        listeners={({ navigation, route }) => ({
          tabPress: e => {
            const currentRouteName = getFocusedRouteNameFromRoute(route);
            if (currentRouteName && currentRouteName !== 'OrdersList') {
              e.preventDefault();
              navigation.navigate('OrdersTab', { screen: 'OrdersList' });
            }
          },
        })}
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
        listeners={({ navigation, route }) => ({
          tabPress: e => {
            const currentRouteName = getFocusedRouteNameFromRoute(route);
            if (currentRouteName && currentRouteName !== 'ProfileScreen') {
              e.preventDefault();
              navigation.navigate('ProfileTab', { screen: 'ProfileScreen' });
            }
          },
        })}
      />
    </Tab.Navigator>
  );
};

export default CustomerNavigator; 