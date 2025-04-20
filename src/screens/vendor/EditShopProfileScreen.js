import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { TextInput, Button, HelperText } from 'react-native-paper';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';

const EditShopProfileScreen = ({ route, navigation }) => {
  const { shopProfile } = route.params || {};
  const { currentUser } = useAuth();
  
  const [name, setName] = useState(shopProfile?.name || '');
  const [location, setLocation] = useState(shopProfile?.location || '');
  const [description, setDescription] = useState(shopProfile?.description || '');
  const [openingTime, setOpeningTime] = useState(shopProfile?.openingTime || '8:00 AM');
  const [closingTime, setClosingTime] = useState(shopProfile?.closingTime || '6:00 PM');
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

  const handleSave = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const shopData = {
        name,
        location,
        description,
        openingTime,
        closingTime,
        isOpen: shopProfile?.isOpen || false,
        updatedAt: new Date().toISOString(),
      };
      
      // If it's a new shop profile, add some default fields
      if (!shopProfile || !shopProfile.name) {
        shopData.ownerId = currentUser.uid;
        shopData.createdAt = new Date().toISOString();
      }
      
      await setDoc(doc(db, 'shops', currentUser.uid), shopData, { merge: true });
      
      Alert.alert('Success', 'Shop profile updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error updating shop profile:', error);
      Alert.alert('Error', 'Failed to update shop profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
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
        />
        {errors.closingTime && <HelperText type="error">{errors.closingTime}</HelperText>}
        
        <Button
          mode="contained"
          onPress={handleSave}
          style={styles.saveButton}
          contentStyle={styles.buttonContent}
          buttonColor="#ff8c00"
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="white" /> : 'Save Profile'}
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
    backgroundColor: '#f5f5f5',
  },
  formContainer: {
    padding: 16,
  },
  input: {
    marginBottom: 12,
    backgroundColor: 'white',
  },
  saveButton: {
    marginTop: 20,
    marginBottom: 12,
  },
  cancelButton: {
    borderColor: '#ccc',
  },
  buttonContent: {
    height: 48,
  },
});

export default EditShopProfileScreen; 