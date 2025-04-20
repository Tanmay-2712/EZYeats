import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Alert, Image, RefreshControl } from 'react-native';
import { FAB, Searchbar, Card, Chip, Button, ActivityIndicator, Divider } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';

const MenuScreen = ({ navigation }) => {
  const { currentUser } = useAuth();
  const [menuItems, setMenuItems] = useState([]);
  const [filteredMenuItems, setFilteredMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState(['all']);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [shops, setShops] = useState([]);

  useEffect(() => {
    // First load shops
    fetchShops();
  }, []);
  
  // When shops change, fetch menu items
  useEffect(() => {
    if (shops.length > 0) {
      fetchMenuItems();
    }
  }, [shops]);

  // Add this new useEffect to refresh menu when screen is focused
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (shops.length > 0) {
        // When returning to screen, don't show loading indicator, just refresh
        setLoading(false);
        fetchMenuItems();
      }
    });

    return unsubscribe;
  }, [navigation, shops]);

  const fetchShops = async () => {
    try {
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
      
      setShops(shopsList);
    } catch (error) {
      console.error('Error fetching shops:', error);
    }
  };

  const fetchMenuItems = async () => {
    try {
      // First check if shops are loaded
      if (shops.length === 0) {
        // Wait for shops to be fetched before trying to fetch menu items
        setLoading(false);
        return;
      }
      
      // If initial load, use loading, otherwise use refreshing
      if (loading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      
      // Use the first shop ID
      const shopId = shops[0].id;
      
      const q = query(
        collection(db, 'menuItems'),
        where('shopId', '==', shopId)
      );
      
      const querySnapshot = await getDocs(q);
      
      const items = [];
      const categorySet = new Set(['all']);
      
      querySnapshot.forEach((doc) => {
        const item = { id: doc.id, ...doc.data() };
        items.push(item);
        
        if (item.category) {
          categorySet.add(item.category);
        }
      });
      
      console.log(`Fetched ${items.length} menu items from Firestore`);
      setMenuItems(items);
      setFilteredMenuItems(items);
      setCategories(Array.from(categorySet));
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Error fetching menu items:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    
    if (query.trim() === '') {
      filterByCategory(selectedCategory);
    } else {
      let filtered = [...menuItems];
      
      if (selectedCategory !== 'all') {
        filtered = filtered.filter(item => item.category === selectedCategory);
      }
      
      filtered = filtered.filter(
        (item) => 
          item.name.toLowerCase().includes(query.toLowerCase()) ||
          (item.description && item.description.toLowerCase().includes(query.toLowerCase()))
      );
      
      setFilteredMenuItems(filtered);
    }
  };

  const filterByCategory = (category) => {
    setSelectedCategory(category);
    
    if (category === 'all') {
      if (searchQuery.trim() === '') {
        setFilteredMenuItems(menuItems);
      } else {
        handleSearch(searchQuery);
      }
    } else {
      const filtered = menuItems.filter(item => item.category === category);
      
      if (searchQuery.trim() !== '') {
        setFilteredMenuItems(
          filtered.filter(
            (item) => 
              item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
          )
        );
      } else {
        setFilteredMenuItems(filtered);
      }
    }
  };

  const handleToggleAvailability = async (item) => {
    try {
      const newAvailability = !item.available;
      
      await updateDoc(doc(db, 'menuItems', item.id), {
        available: newAvailability
      });
      
      // Update local state
      const updatedItems = menuItems.map(menuItem => {
        if (menuItem.id === item.id) {
          return { ...menuItem, available: newAvailability };
        }
        return menuItem;
      });
      
      setMenuItems(updatedItems);
      // Also update filtered items
      const updatedFilteredItems = filteredMenuItems.map(menuItem => {
        if (menuItem.id === item.id) {
          return { ...menuItem, available: newAvailability };
        }
        return menuItem;
      });
      
      setFilteredMenuItems(updatedFilteredItems);
    } catch (error) {
      console.error('Error toggling availability:', error);
      Alert.alert('Error', 'Failed to update item availability. Please try again.');
    }
  };

  const handleEditItem = (item) => {
    navigation.navigate('AddEditMenuItem', { item });
  };

  const handleDeleteItem = (item) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.name}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'menuItems', item.id));
              
              // Update local state
              const updatedItems = menuItems.filter(menuItem => menuItem.id !== item.id);
              setMenuItems(updatedItems);
              
              const updatedFilteredItems = filteredMenuItems.filter(menuItem => menuItem.id !== item.id);
              setFilteredMenuItems(updatedFilteredItems);
              
              Alert.alert('Success', 'Item deleted successfully');
            } catch (error) {
              console.error('Error deleting item:', error);
              Alert.alert('Error', 'Failed to delete item. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderMenuItem = ({ item }) => (
    <Card style={styles.menuItemCard}>
      <Card.Content>
        <View style={styles.menuItemContent}>
          {/* Left side: Image */}
          {item.imageUrl ? (
            <View style={styles.imageContainer}>
              <Image 
                source={{ uri: item.imageUrl }} 
                style={styles.menuItemImage} 
                resizeMode="cover"
              />
            </View>
          ) : (
            <View style={styles.noImageContainer}>
              <MaterialIcons name="restaurant" size={40} color="#ddd" />
            </View>
          )}
          
          {/* Right side: Details */}
          <View style={styles.menuItemDetails}>
            <View style={styles.menuItemHeader}>
              <Text style={styles.menuItemName}>{item.name}</Text>
              <Chip 
                mode="flat"
                style={[
                  styles.availabilityChip,
                  item.available ? styles.availableChip : styles.unavailableChip
                ]}
              >
                {item.available ? 'Available' : 'Unavailable'}
              </Chip>
            </View>
            
            {item.category && (
              <Text style={styles.menuItemCategory}>
                Category: {item.category}
              </Text>
            )}
            
            {item.description && (
              <Text style={styles.menuItemDescription} numberOfLines={2}>
                {item.description}
              </Text>
            )}
            
            <Text style={styles.menuItemPrice}>₹{item.price.toFixed(2)}</Text>
          </View>
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.buttonContainer}>
          <Button
            mode="text"
            onPress={() => handleToggleAvailability(item)}
            textColor="#ff8c00"
            compact
          >
            {item.available ? 'Mark Unavailable' : 'Mark Available'}
          </Button>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => handleEditItem(item)}
            >
              <MaterialIcons name="edit" size={22} color="#4285F4" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => handleDeleteItem(item)}
            >
              <MaterialIcons name="delete" size={22} color="#EA4335" />
            </TouchableOpacity>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryChip,
        selectedCategory === item && styles.selectedCategoryChip
      ]}
      onPress={() => filterByCategory(item)}
    >
      <Text style={[
        styles.categoryText,
        selectedCategory === item && styles.selectedCategoryText
      ]}>
        {item === 'all' ? 'All' : item}
      </Text>
    </TouchableOpacity>
  );

  const renderEmptyState = () => {
    // Check if there are no shops
    if (shops.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="store" size={80} color="#ddd" />
          <Text style={styles.emptyText}>
            You need to create a shop first
          </Text>
          <Text style={styles.emptySubText}>
            Go to the Profile tab to create your shop
          </Text>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('ProfileTab')}
            style={styles.setupButton}
            buttonColor="#ff8c00"
          >
            Go to Profile
          </Button>
        </View>
      );
    }
    
    // Regular empty menu state
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="restaurant-menu" size={80} color="#ddd" />
        <Text style={styles.emptyText}>
          {searchQuery.trim() !== '' || selectedCategory !== 'all'
            ? 'No items match your search'
            : 'Your menu is empty. Add some items to get started!'}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search menu items..."
        onChangeText={handleSearch}
        value={searchQuery}
        style={styles.searchBar}
        iconColor="#ff8c00"
      />
      
      {categories.length > 1 && (
        <FlatList
          data={categories}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />
      )}
      
      {loading ? (
        <ActivityIndicator size="large" color="#ff8c00" style={styles.loader} />
      ) : filteredMenuItems.length > 0 ? (
        <FlatList
          data={filteredMenuItems}
          renderItem={renderMenuItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.menuList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={fetchMenuItems}
              colors={['#ff8c00']}
              tintColor="#ff8c00"
            />
          }
        />
      ) : (
        renderEmptyState()
      )}
      
      {shops.length > 0 && (
        <FAB
          style={styles.fab}
          icon="plus"
          color="#fff"
          onPress={() => navigation.navigate('AddEditMenuItem')}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchBar: {
    margin: 16,
    borderRadius: 8,
    elevation: 2,
  },
  categoriesList: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 10,
    elevation: 2,
  },
  selectedCategoryChip: {
    backgroundColor: '#ff8c00',
  },
  categoryText: {
    color: '#666',
  },
  selectedCategoryText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  menuList: {
    padding: 16,
    paddingBottom: 80, // Extra space for FAB
  },
  menuItemCard: {
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
  },
  menuItemContent: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  imageContainer: {
    marginRight: 12,
  },
  menuItemDetails: {
    flex: 1,
  },
  menuItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  availabilityChip: {
    height: 24,
  },
  availableChip: {
    backgroundColor: '#e6f7e9',
  },
  unavailableChip: {
    backgroundColor: '#ffebee',
  },
  menuItemCategory: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  menuItemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  menuItemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff8c00',
  },
  divider: {
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  iconButton: {
    padding: 6,
  },
  menuItemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  noImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    marginTop: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  emptySubText: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
    marginBottom: 16,
  },
  setupButton: {
    marginTop: 16,
    borderRadius: 8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#ff8c00',
  },
});

export default MenuScreen;