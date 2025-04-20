import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { TextInput, Button, HelperText, Text } from 'react-native-paper';
import { collection, addDoc } from 'firebase/firestore';
import { ref, set } from 'firebase/database';
import { db, rtdb } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';

const CreateShopScreen = ({ navigation }) => {
  const { currentUser } = useAuth();
  
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [openingTime, setOpeningTime] = useState('8:00 AM');
  const [closingTime, setClosingTime] = useState('6:00 PM');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!name.trim()) {
      newErrors.name = 'Shop name is required';
    }
    
    if (!location.trim()) {
      newErrors.location = 'Location is required';
    }
    
    if (!openingTime.trim()) {
      newErrors.openingTime = 'Opening time is required';
    }
    
    if (!closingTime.trim()) {
      newErrors.closingTime = 'Closing time is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateShop = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const shopData = {
        name,
        location,
        description,
        openingTime,
        closingTime,
        isOpen: false,
        ownerId: currentUser.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // Use addDoc to create a new document with auto-generated ID
      const docRef = await addDoc(collection(db, 'shops'), shopData);
      const shopId = docRef.id;
      
      // Initialize the shop's orders node in the Realtime Database
      // This ensures the shop is properly set up to receive order notifications
      try {
        // Create a simple initialization flag
        await set(ref(rtdb, `shopOrders/${shopId}/initialized`), true);
        console.log(`Initialized order structure for shop ${shopId} in Realtime Database`);
      } catch (rtdbError) {
        console.error('Error initializing shop in Realtime Database:', rtdbError);
        // Continue even if this fails, as Firestore is the primary database
      }
      
      Alert.alert(
        'Success', 
        'Shop created successfully!', 
        [
          { 
            text: 'OK', 
            onPress: () => {
              // First go to ShopDetail to view the newly created shop
              navigation.navigate('ShopDetail', { 
                shopId: shopId, 
                shop: { id: shopId, ...shopData } 
              });
              
              // After a slight delay, refresh the profile screen
              setTimeout(() => {
                console.log('Refreshing shop profile after creation');
                // The focus listener in the profile screen will refresh the data
              }, 500);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error creating shop:', error);
      Alert.alert('Error', 'Failed to create shop. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Create a New Shop</Text>
        <Text style={styles.subtitle}>
          Set up your shop details to start selling your products
        </Text>
      </View>
      
      <View style={styles.formContainer}>
        <TextInput
          label="Shop Name"
          value={name}
          onChangeText={setName}
          style={styles.input}
          mode="outlined"
          outlineColor="#ccc"
          activeOutlineColor="#ff8c00"
          error={!!errors.name}
        />
        {errors.name && <HelperText type="error">{errors.name}</HelperText>}
        
        <TextInput
          label="Location"
          value={location}
          onChangeText={setLocation}
          style={styles.input}
          mode="outlined"
          outlineColor="#ccc"
          activeOutlineColor="#ff8c00"
          error={!!errors.location}
          placeholder="e.g. Main Campus Building, 2nd Floor"
        />
        {errors.location && <HelperText type="error">{errors.location}</HelperText>}
        
        <TextInput
          label="Description (optional)"
          value={description}
          onChangeText={setDescription}
          style={styles.input}
          mode="outlined"
          multiline
          numberOfLines={3}
          outlineColor="#ccc"
          activeOutlineColor="#ff8c00"
          placeholder="Tell customers about your shop"
        />
        
        <TextInput
          label="Opening Time"
          value={openingTime}
          onChangeText={setOpeningTime}
          style={styles.input}
          mode="outlined"
          outlineColor="#ccc"
          activeOutlineColor="#ff8c00"
          error={!!errors.openingTime}
          placeholder="e.g. 8:00 AM"
        />
        {errors.openingTime && <HelperText type="error">{errors.openingTime}</HelperText>}
        
        <TextInput
          label="Closing Time"
          value={closingTime}
          onChangeText={setClosingTime}
          style={styles.input}
          mode="outlined"
          outlineColor="#ccc"
          activeOutlineColor="#ff8c00"
          error={!!errors.closingTime}
          placeholder="e.g. 6:00 PM"
        />
        {errors.closingTime && <HelperText type="error">{errors.closingTime}</HelperText>}
        
        <Button
          mode="contained"
          onPress={handleCreateShop}
          style={styles.createButton}
          contentStyle={styles.buttonContent}
          buttonColor="#ff8c00"
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="white" /> : 'Create Shop'}
        </Button>
        
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.cancelButton}
          contentStyle={styles.buttonContent}
          textColor="#666"
        >
          Cancel
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  formContainer: {
    padding: 20,
  },
  input: {
    marginBottom: 12,
    backgroundColor: 'white',
  },
  createButton: {
    marginTop: 20,
    marginBottom: 12,
    borderRadius: 8,
  },
  cancelButton: {
    borderColor: '#ccc',
    borderRadius: 8,
  },
  buttonContent: {
    height: 48,
  },
});

export default CreateShopScreen; 