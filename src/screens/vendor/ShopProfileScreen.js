import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Button, Card, Divider, Avatar, List } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';

const ShopProfileScreen = ({ navigation }) => {
  const { currentUser, logout } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  // Add a focus listener to refresh data when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchUserData();
    });

    return unsubscribe;
  }, [navigation]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      // Fetch user profile
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data());
      }
      
      // Fetch all shops for this user (just to know if they have shops)
      const shopsRef = collection(db, 'shops');
      const q = query(shopsRef, where('ownerId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      
      const shopsList = [];
      querySnapshot.forEach((doc) => {
        shopsList.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log(`Fetched ${shopsList.length} shops for vendor profile: ${currentUser.uid}`);
      setShops(shopsList);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setLoading(false);
    }
  };

  const handleEditProfile = () => {
    // This should navigate to a user profile edit screen, not shop
    Alert.alert('Coming Soon', 'User profile editing will be available soon.');
  };

  const handleManageShops = () => {
    if (shops.length === 0) {
      navigation.navigate('CreateShop');
    } else {
      navigation.navigate('MyShops');
    }
  };

  const handleChangePassword = () => {
    Alert.alert('Coming Soon', 'Password change functionality will be available soon.');
  };

  const handleHelp = () => {
    Alert.alert('Help & Support', 'Contact us at support@example.com for assistance.');
  };

  const handleLogout = async () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: async () => {
            try {
              await logout();
              // Navigation handled by AppNavigator
            } catch (error) {
              console.error('Error logging out:', error);
              Alert.alert('Error', 'Failed to log out. Please try again.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff8c00" />
        <Text style={{ marginTop: 10 }}>Loading profile...</Text>
      </View>
    );
  }

  // No shops setup yet, but we'll show the profile anyway with a notice
  const hasNoShops = shops.length === 0;

  return (
    <ScrollView style={styles.container}>
      {/* User Profile Section */}
      <View style={styles.header}>
        <View style={styles.profileImageContainer}>
          {userProfile?.photoURL ? (
            <Avatar.Image source={{ uri: userProfile.photoURL }} size={80} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <MaterialIcons name="person" size={60} color="white" />
            </View>
          )}
        </View>
        <Text style={styles.userName}>{userProfile?.displayName || 'Shop Owner'}</Text>
        <Text style={styles.userEmail}>{currentUser.email}</Text>
        
        <Button
          mode="outlined"
          onPress={handleEditProfile}
          style={styles.editButton}
          buttonColor="white"
          textColor="#ff8c00"
          icon="pencil"
        >
          Edit Profile
        </Button>
      </View>

      {/* Shop Notice (if no shops) */}
      {hasNoShops && (
        <Card style={styles.noticeCard}>
          <Card.Content>
            <View style={styles.noticeContent}>
              <MaterialIcons name="info" size={24} color="#ff8c00" />
              <Text style={styles.noticeText}>
                You haven't set up any shops yet. Create your first shop to start receiving orders.
              </Text>
            </View>
            
            <Button
              mode="contained"
              onPress={() => navigation.navigate('CreateShop')}
              style={styles.setupButton}
              buttonColor="#ff8c00"
            >
              Create New Shop
            </Button>
          </Card.Content>
        </Card>
      )}

      {/* Account Settings */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Account Settings</Text>
          
          <List.Item
            title="Manage Shops"
            left={() => <List.Icon icon="store" color="#666" />}
            right={() => <MaterialIcons name="chevron-right" size={24} color="#ccc" />}
            onPress={handleManageShops}
            style={styles.listItem}
          />
          
          <Divider />
          
          <List.Item
            title="Change Password"
            left={() => <List.Icon icon="lock" color="#666" />}
            right={() => <MaterialIcons name="chevron-right" size={24} color="#ccc" />}
            onPress={handleChangePassword}
            style={styles.listItem}
          />
          
          <Divider />
          
          <List.Item
            title="Help & Support"
            left={() => <List.Icon icon="help-circle" color="#666" />}
            right={() => <MaterialIcons name="chevron-right" size={24} color="#ccc" />}
            onPress={handleHelp}
            style={styles.listItem}
          />
        </Card.Content>
      </Card>

      <Button
        mode="outlined"
        onPress={handleLogout}
        style={styles.logoutButton}
        textColor="#f44336"
        icon="logout"
      >
        Logout
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    backgroundColor: '#ff8c00',
    padding: 24,
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 30,
  },
  profileImageContainer: {
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 16,
  },
  editButton: {
    borderColor: 'white',
    borderWidth: 1,
  },
  card: {
    margin: 16,
    borderRadius: 8,
    elevation: 2,
  },
  noticeCard: {
    margin: 16,
    borderRadius: 8,
    backgroundColor: '#fff9e6',
    borderLeftWidth: 4,
    borderLeftColor: '#ff8c00',
  },
  noticeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  noticeText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#666',
  },
  setupButton: {
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  listItem: {
    paddingVertical: 8,
  },
  logoutButton: {
    margin: 16,
    marginTop: 8,
    borderColor: '#f5f5f5',
    borderRadius: 4,
  },
});

export default ShopProfileScreen; 