import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Switch, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Card, Button, Divider, List, FAB, Portal, Dialog, Paragraph } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';

const ShopDetailScreen = ({ route, navigation }) => {
  const { shopId, shop: initialShopData } = route.params;
  const { currentUser } = useAuth();
  const [shop, setShop] = useState(initialShopData || null);
  const [menuItems, setMenuItems] = useState([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [shopLoading, setShopLoading] = useState(!initialShopData);
  const [isOpen, setIsOpen] = useState(initialShopData?.isOpen || false);
  const [confirmDialogVisible, setConfirmDialogVisible] = useState(false);

  useEffect(() => {
    // Only fetch shop details if we don't have the data already
    if (!shop) {
      fetchShopDetails();
    }
    fetchMenuItems();
  }, [shopId]);

  const fetchShopDetails = async () => {
    if (!shopId) {
      console.error('No shopId provided');
      Alert.alert('Error', 'Shop ID is missing');
      navigation.goBack();
      return;
    }
    
    try {
      setShopLoading(true);
      const shopDoc = await getDoc(doc(db, 'shops', shopId));
      
      if (shopDoc.exists()) {
        const shopData = shopDoc.data();
        setShop(shopData);
        setIsOpen(shopData.isOpen || false);
      } else {
        Alert.alert('Error', 'Shop not found');
        navigation.goBack();
      }
      
      setShopLoading(false);
    } catch (error) {
      console.error('Error fetching shop details:', error);
      setShopLoading(false);
      Alert.alert('Error', 'Failed to load shop details');
    }
  };

  const fetchMenuItems = async () => {
    try {
      setMenuLoading(true);
      const menuRef = collection(db, 'menuItems');
      const q = query(menuRef, where('shopId', '==', shopId));
      const querySnapshot = await getDocs(q);
      
      const menuItemsList = [];
      querySnapshot.forEach((doc) => {
        menuItemsList.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Group items by category
      const groupedItems = menuItemsList.reduce((acc, item) => {
        const category = item.category || 'Other';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(item);
        return acc;
      }, {});
      
      setMenuItems(groupedItems);
      setMenuLoading(false);
    } catch (error) {
      console.error('Error fetching menu items:', error);
      setMenuLoading(false);
    }
  };

  const handleToggleOpen = async (value) => {
    setIsOpen(value);
    
    try {
      await updateDoc(doc(db, 'shops', shopId), {
        isOpen: value,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating shop status:', error);
      setIsOpen(!value); // Revert on error
      Alert.alert('Error', 'Failed to update shop status');
    }
  };

  const handleEditShop = () => {
    navigation.navigate('EditShopProfile', { 
      shopId,
      shopProfile: shop 
    });
  };

  const handleAddMenuItem = () => {
    navigation.navigate('AddEditMenuItem', { shopId });
  };

  const handleEditMenuItem = (item) => {
    navigation.navigate('AddEditMenuItem', { 
      shopId,
      item
    });
  };

  const handleViewQRCode = () => {
    navigation.navigate('ShopQRCode', { shopId });
  };

  const showDeleteConfirmation = () => {
    setConfirmDialogVisible(true);
  };

  const hideDeleteConfirmation = () => {
    setConfirmDialogVisible(false);
  };

  const handleDeleteShop = async () => {
    hideDeleteConfirmation();
    
    // Implement if needed - for safety, consider using admin functions
    Alert.alert('Info', 'Shop deletion must be done by an administrator. Please contact support.');
  };

  const renderMenuItems = () => {
    if (menuLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff8c00" />
        </View>
      );
    }

    if (Object.keys(menuItems).length === 0) {
      return (
        <View style={styles.emptyMenuContainer}>
          <MaterialIcons name="restaurant-menu" size={60} color="#ddd" />
          <Text style={styles.emptyMenuText}>No menu items yet</Text>
          <Text style={styles.emptyMenuSubText}>Start adding items to your menu</Text>
          <Button 
            mode="contained" 
            onPress={handleAddMenuItem}
            style={styles.addItemButton}
            buttonColor="#ff8c00"
          >
            Add First Item
          </Button>
        </View>
      );
    }

    return (
      <View>
        {Object.entries(menuItems).map(([category, items]) => (
          <View key={category}>
            <Text style={styles.categoryTitle}>{category}</Text>
            {items.map(item => (
              <TouchableOpacity 
                key={item.id} 
                onPress={() => handleEditMenuItem(item)}
              >
                <Card style={styles.menuItemCard}>
                  <Card.Content style={styles.menuItemContent}>
                    <View style={styles.menuItemInfo}>
                      <Text style={styles.menuItemName}>{item.name}</Text>
                      <Text style={styles.menuItemDescription} numberOfLines={2}>
                        {item.description || 'No description'}
                      </Text>
                      <Text style={styles.menuItemPrice}>
                        ₹{parseFloat(item.price).toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.menuItemActions}>
                      <View style={[
                        styles.availabilityIndicator,
                        item.available ? styles.availableIndicator : styles.unavailableIndicator
                      ]} />
                      <MaterialIcons name="edit" size={18} color="#666" />
                    </View>
                  </Card.Content>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    );
  };

  if (shopLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff8c00" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.shopName}>{shop?.name || 'Shop'}</Text>
          <Text style={styles.shopLocation}>
            <MaterialIcons name="location-on" size={16} color="#666" />
            {' '}{shop?.location || 'No location set'}
          </Text>
        </View>
        
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.statusContainer}>
              <Text style={styles.statusText}>Shop Status</Text>
              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>{isOpen ? 'Open' : 'Closed'}</Text>
                <Switch
                  value={isOpen}
                  onValueChange={handleToggleOpen}
                  trackColor={{ false: '#f0f0f0', true: '#b2dfdb' }}
                  thumbColor={isOpen ? '#4caf50' : '#f44336'}
                />
              </View>
            </View>
            
            <Divider style={styles.divider} />
            
            <View style={styles.detailsContainer}>
              <Text style={styles.detailTitle}>Shop Hours</Text>
              <Text style={styles.detailText}>
                {shop?.openingTime || '9:00 AM'} - {shop?.closingTime || '5:00 PM'}
              </Text>
            </View>
            
            {shop?.description && (
              <>
                <Divider style={styles.divider} />
                <View style={styles.detailsContainer}>
                  <Text style={styles.detailTitle}>Description</Text>
                  <Text style={styles.detailText}>{shop.description}</Text>
                </View>
              </>
            )}
            
            <Button
              mode="contained"
              onPress={handleEditShop}
              style={styles.editButton}
              buttonColor="#ff8c00"
              icon="pencil"
            >
              Edit Shop Details
            </Button>
            
            <Button
              mode="contained"
              onPress={handleViewQRCode}
              style={[styles.editButton, { marginTop: 10 }]}
              buttonColor="#4caf50"
              icon="qrcode"
            >
              View Shop QR Code
            </Button>
          </Card.Content>
        </Card>
        
        <View style={styles.menuSection}>
          <View style={styles.menuHeader}>
            <Text style={styles.menuTitle}>Menu Items</Text>
            <Button 
              mode="text" 
              onPress={handleAddMenuItem}
              textColor="#ff8c00"
              icon="plus"
            >
              Add Item
            </Button>
          </View>
          
          {renderMenuItems()}
        </View>
        
        <View style={styles.dangerZone}>
          <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
          <Button
            mode="outlined"
            onPress={showDeleteConfirmation}
            style={styles.deleteButton}
            textColor="#f44336"
            icon="delete"
          >
            Delete Shop
          </Button>
        </View>
      </ScrollView>
      
      <Portal>
        <Dialog visible={confirmDialogVisible} onDismiss={hideDeleteConfirmation}>
          <Dialog.Title>Delete Shop?</Dialog.Title>
          <Dialog.Content>
            <Paragraph>
              Are you sure you want to delete this shop? This action cannot be undone.
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={hideDeleteConfirmation}>Cancel</Button>
            <Button onPress={handleDeleteShop} textColor="#f44336">Delete</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      <FAB
        style={styles.fab}
        icon="plus"
        label="Add Menu Item"
        onPress={handleAddMenuItem}
        color="white"
      />
    </View>
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
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  shopName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  shopLocation: {
    fontSize: 16,
    color: '#666',
  },
  card: {
    margin: 16,
    borderRadius: 8,
    elevation: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchLabel: {
    marginRight: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 16,
  },
  detailsContainer: {
    marginBottom: 8,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 16,
    color: '#666',
  },
  editButton: {
    marginTop: 16,
    borderRadius: 8,
  },
  menuSection: {
    margin: 16,
    marginTop: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    elevation: 2,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptyMenuContainer: {
    alignItems: 'center',
    padding: 20,
  },
  emptyMenuText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#888',
    marginTop: 16,
  },
  emptyMenuSubText: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
  },
  addItemButton: {
    borderRadius: 8,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: '#ff8c00',
  },
  menuItemCard: {
    marginBottom: 8,
    borderRadius: 8,
    elevation: 1,
  },
  menuItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  menuItemInfo: {
    flex: 1,
    marginRight: 16,
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  menuItemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  menuItemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff8c00',
  },
  menuItemActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  availabilityIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 20,
  },
  availableIndicator: {
    backgroundColor: '#4caf50',
  },
  unavailableIndicator: {
    backgroundColor: '#f44336',
  },
  dangerZone: {
    margin: 16,
    marginTop: 0,
    backgroundColor: '#fff3f3',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ffcccc',
    marginBottom: 80,
  },
  dangerZoneTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f44336',
    marginBottom: 16,
  },
  deleteButton: {
    borderColor: '#f44336',
    borderWidth: 1,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#ff8c00',
  },
});

export default ShopDetailScreen; 