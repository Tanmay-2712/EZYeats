import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';

const RoleSelectionScreen = () => {
  const [loading, setLoading] = useState(false);
  const { currentUser } = useAuth();

  const handleRoleSelection = async (role) => {
    if (!currentUser) return;

    setLoading(true);
    try {
      // Update user document with selected role
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, { role });

      // If vendor, also create an empty shop profile
      if (role === 'vendor') {
        await createEmptyShopProfile(currentUser.uid);
      }

      // Auth context will detect the role change and redirect to appropriate navigator
    } catch (error) {
      console.error('Error updating role:', error);
      Alert.alert('Error', 'Failed to set user role. Please try again.');
      setLoading(false);
    }
  };

  const createEmptyShopProfile = async (userId) => {
    try {
      const shopRef = doc(db, 'shops', userId);
      await updateDoc(shopRef, {
        name: '',
        location: '',
        description: '',
        openingTime: '8:00 AM',
        closingTime: '6:00 PM',
        isOpen: false,
        ownerId: userId,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error creating shop profile:', error);
      // Not critical, just log error
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>I am a...</Text>
      <Text style={styles.subtitle}>Select your role to continue</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#ff8c00" style={styles.loader} />
      ) : (
        <View style={styles.rolesContainer}>
          <TouchableOpacity
            style={styles.roleCard}
            onPress={() => handleRoleSelection('customer')}
          >
            <View style={styles.roleIconContainer}>
              <MaterialIcons name="person" size={50} color="#ff8c00" />
            </View>
            <Text style={styles.roleTitle}>Customer</Text>
            <Text style={styles.roleDescription}>
              Order food from campus canteens
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.roleCard}
            onPress={() => handleRoleSelection('vendor')}
          >
            <View style={styles.roleIconContainer}>
              <MaterialIcons name="store" size={50} color="#ff8c00" />
            </View>
            <Text style={styles.roleTitle}>Vendor</Text>
            <Text style={styles.roleDescription}>
              Manage your canteen and receive orders
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 40,
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  rolesContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  roleCard: {
    width: '90%',
    padding: 20,
    borderRadius: 10,
    backgroundColor: 'white',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 20,
  },
  roleIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff8ee',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  roleTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  roleDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  loader: {
    marginTop: 50,
  },
});

export default RoleSelectionScreen; 