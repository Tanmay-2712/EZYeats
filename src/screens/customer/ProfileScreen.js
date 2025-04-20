import React from 'react';
import { StyleSheet, View, Text, ScrollView, Alert, Image } from 'react-native';
import { Button, Card, List, Divider } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

const ProfileScreen = () => {
  const { currentUser, logout } = useAuth();

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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileImageContainer}>
          <MaterialIcons name="person" size={80} color="white" />
        </View>
        <Text style={styles.nameText}>Customer Account</Text>
        <Text style={styles.emailText}>{currentUser?.email}</Text>
      </View>
      
      <Card style={styles.card}>
        <Card.Content>
          <List.Section>
            <List.Item
              title="Account Settings"
              left={props => <List.Icon {...props} icon="account-cog" color="#ff8c00" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
            />
            <Divider />
            <List.Item
              title="Payment Methods"
              left={props => <List.Icon {...props} icon="credit-card" color="#ff8c00" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
            />
            <Divider />
            <List.Item
              title="Notifications"
              left={props => <List.Icon {...props} icon="bell" color="#ff8c00" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
            />
          </List.Section>
        </Card.Content>
      </Card>
      
      <Card style={styles.card}>
        <Card.Content>
          <List.Section>
            <List.Item
              title="Help & Support"
              left={props => <List.Icon {...props} icon="help-circle" color="#ff8c00" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
            />
            <Divider />
            <List.Item
              title="About Ezy Eats"
              left={props => <List.Icon {...props} icon="information" color="#ff8c00" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
            />
            <Divider />
            <List.Item
              title="Terms & Privacy Policy"
              left={props => <List.Icon {...props} icon="file-document" color="#ff8c00" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
            />
          </List.Section>
        </Card.Content>
      </Card>
      
      <Button
        mode="outlined"
        onPress={handleLogout}
        style={styles.logoutButton}
        textColor="#f44336"
        icon="logout"
      >
        Sign Out
      </Button>
      
      <Text style={styles.versionText}>Version 1.0.0</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#ff8c00',
    padding: 30,
    alignItems: 'center',
  },
  profileImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  nameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  emailText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    elevation: 2,
  },
  logoutButton: {
    marginHorizontal: 16,
    marginTop: 24,
    borderColor: '#f44336',
    borderWidth: 2,
  },
  versionText: {
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 32,
    color: '#888',
    fontSize: 14,
  },
});

export default ProfileScreen;