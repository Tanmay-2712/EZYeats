import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { TextInput, Button, HelperText, Switch, Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { collection, addDoc, doc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';

const AddEditMenuItemScreen = ({ route, navigation }) => {
  const { item } = route.params || {};
  const isEditing = !!item;
  const { currentUser } = useAuth();
  const [shopId, setShopId] = useState(item?.shopId || null);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [name, setName] = useState(item?.name || '');
  const [description, setDescription] = useState(item?.description || '');
  const [price, setPrice] = useState(item?.price ? item.price.toString() : '');
  const [category, setCategory] = useState(item?.category || '');
  const [imageUrl, setImageUrl] = useState(item?.imageUrl || '');
  const [available, setAvailable] = useState(item?.available !== false); // Default to true for new items
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Fetch shop info on mount if not provided
  useEffect(() => {
    async function fetchFirstShop() {
      try {
        const shopsRef = collection(db, 'shops');
        const q = query(shopsRef, where('ownerId', '==', currentUser.uid));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const shopDoc = querySnapshot.docs[0];
          setShopId(shopDoc.id);
        } else {
          Alert.alert(
            'No Shop Found', 
            'You need to create a shop first before adding menu items.',
            [{ text: 'OK', onPress: () => navigation.navigate('ProfileTab') }]
          );
        }
      } catch (error) {
        console.error('Error fetching shop:', error);
        Alert.alert('Error', 'Could not fetch shop information.');
      } finally {
        setLoading(false);
      }
    }
    
    // If we already have a shopId from the item, we don't need to fetch
    if (!shopId) {
      fetchFirstShop();
    } else {
      setLoading(false);
    }
  }, []);

  const validateForm = () => {
    const newErrors = {};
    
    if (!name.trim()) {
      newErrors.name = 'Item name is required';
    }
    
    if (!price.trim()) {
      newErrors.price = 'Price is required';
    } else if (isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      newErrors.price = 'Price must be a valid positive number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    if (!shopId) {
      Alert.alert('Error', 'No shop found. Please create a shop first.');
      return;
    }
    
    setFormSubmitting(true);
    
    try {
      const menuItemData = {
        name,
        description,
        price: parseFloat(parseFloat(price).toFixed(2)), // Convert to number with 2 decimal places
        category: category.trim() || 'Other',
        imageUrl: imageUrl.trim() || null,
        available,
        shopId: shopId,
        updatedAt: new Date().toISOString(),
      };
      
      if (isEditing) {
        // Update existing item
        await updateDoc(doc(db, 'menuItems', item.id), menuItemData);
        Alert.alert('Success', 'Menu item updated successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        // Add new item
        menuItemData.createdAt = new Date().toISOString();
        await addDoc(collection(db, 'menuItems'), menuItemData);
        Alert.alert('Success', 'Menu item added successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('Error saving menu item:', error);
      Alert.alert('Error', 'Failed to save menu item. Please try again.');
    } finally {
      setFormSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff8c00" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.formContainer}>
        <TextInput
          label="Item Name"
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
          label="Price"
          value={price}
          onChangeText={setPrice}
          style={styles.input}
          mode="outlined"
          keyboardType="decimal-pad"
          outlineColor="#ccc"
          activeOutlineColor="#ff8c00"
          error={!!errors.price}
          left={<TextInput.Affix text="₹" />}
        />
        {errors.price && <HelperText type="error">{errors.price}</HelperText>}
        
        <TextInput
          label="Category (optional)"
          value={category}
          onChangeText={setCategory}
          style={styles.input}
          mode="outlined"
          outlineColor="#ccc"
          activeOutlineColor="#ff8c00"
        />
        
        <TextInput
          label="Image URL (optional)"
          value={imageUrl}
          onChangeText={setImageUrl}
          style={styles.input}
          mode="outlined"
          outlineColor="#ccc"
          activeOutlineColor="#ff8c00"
        />
        
        {imageUrl ? (
          <View style={styles.imagePreviewContainer}>
            <Text style={styles.previewText}>Image Preview:</Text>
            <Image 
              source={{ uri: imageUrl }} 
              style={styles.imagePreview}
              resizeMode="cover"
              onError={() => Alert.alert('Error', 'Invalid image URL')}
            />
          </View>
        ) : (
          <View style={styles.noImageContainer}>
            <MaterialIcons name="image" size={40} color="#ddd" />
            <Text style={styles.noImageText}>No image preview available</Text>
          </View>
        )}
        
        <View style={styles.availabilityContainer}>
          <Text style={styles.availabilityText}>
            Available for ordering:
          </Text>
          <Switch
            value={available}
            onValueChange={setAvailable}
            color="#ff8c00"
          />
        </View>
        
        <Button
          mode="contained"
          onPress={handleSave}
          style={styles.saveButton}
          contentStyle={styles.buttonContent}
          buttonColor="#ff8c00"
          disabled={formSubmitting}
        >
          {formSubmitting ? (
            <ActivityIndicator color="white" />
          ) : (
            isEditing ? 'Update Item' : 'Add Item'
          )}
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
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  formContainer: {
    padding: 16,
  },
  input: {
    marginBottom: 12,
    backgroundColor: 'white',
  },
  availabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 12,
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  availabilityText: {
    fontSize: 16,
  },
  imagePreviewContainer: {
    marginVertical: 12,
  },
  previewText: {
    marginBottom: 8,
    color: '#666',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  noImageContainer: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
  },
  noImageText: {
    marginTop: 8,
    color: '#888',
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

export default AddEditMenuItemScreen; 