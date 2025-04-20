import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import AuthNavigator from './AuthNavigator';
import CustomerNavigator from './CustomerNavigator';
import VendorNavigator from './VendorNavigator';
import RoleSelectionScreen from '../screens/auth/RoleSelectionScreen';
import { useAuth } from '../context/AuthContext';

const Stack = createStackNavigator();

const AppNavigator = () => {
  const { currentUser, userRole, loading } = useAuth();

  // Don't render anything while loading
  if (loading) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!currentUser ? (
          // Auth screens
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : !userRole ? (
          // Role selection if user doesn't have role yet
          <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
        ) : userRole === 'customer' ? (
          // Customer screens
          <Stack.Screen name="CustomerApp" component={CustomerNavigator} />
        ) : (
          // Vendor screens
          <Stack.Screen name="VendorApp" component={VendorNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 