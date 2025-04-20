import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Image, TextInput, ActivityIndicator, StatusBar, Dimensions, RefreshControl } from 'react-native';
import { Card, Chip, Divider, FAB, Badge } from 'react-native-paper';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { db } from '../../config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { LinearGradient } from 'expo-linear-gradient';
import { useCart } from '../../context/CartContext';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;

const ShopsScreen = ({ navigation }) => {
  const [shops, setShops] = useState([]);
  const [filteredShops, setFilteredShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const { cart } = useCart();

  const categories = ['All', 'Restaurant', 'Cafe', 'Fast Food', 'Bakery', 'Juice Bar'];

  useEffect(() => {
    fetchShops();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (!loading) {
        fetchShops();
      }
    }, [])
  );

  const fetchShops = async () => {
    setLoading(true);
    try {
      const shopsCollection = collection(db, 'shops');
      const shopSnapshot = await getDocs(shopsCollection);
      const shopsList = shopSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        distance: getRandomDistance() // Mock distance - replace with actual calculation
      }));
      
      // Sort shops by distance
      shopsList.sort((a, b) => a.distance - b.distance);
      
      setShops(shopsList);
      setFilteredShops(shopsList);
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error("Error fetching shops:", error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getRandomDistance = () => {
    return Math.floor(Math.random() * 50) / 10; // Random distance between 0 and 5 km
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchShops();
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text.trim() === '') {
      filterByCategory(selectedCategory);
    } else {
      const filtered = shops.filter(shop => 
        shop.name.toLowerCase().includes(text.toLowerCase()) ||
        shop.category.toLowerCase().includes(text.toLowerCase()) ||
        shop.location.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredShops(filtered);
    }
  };

  const filterByCategory = (category) => {
    setSelectedCategory(category);
    if (category === 'All') {
      setFilteredShops(shops);
    } else {
      const filtered = shops.filter(shop => 
        shop.category === category
      );
      setFilteredShops(filtered);
    }
  };

  const renderShopItem = ({ item }) => (
    <TouchableOpacity 
      onPress={() => navigation.navigate('ShopDetail', { 
        shopId: item.id,
        shopName: item.name,
        shopData: item
      })}
      activeOpacity={0.7}
    >
      <Card style={styles.shopCard}>
        <View style={styles.shopCardContent}>
          <View style={styles.shopImageContainer}>
            {item.imageUrl ? (
              <Image 
                source={{ uri: item.imageUrl }} 
                style={styles.shopImage} 
                resizeMode="cover"
              />
            ) : (
              <View style={styles.noImageContainer}>
                <MaterialCommunityIcons name="storefront" size={50} color="#ddd" />
              </View>
            )}
            {item.isOpen ? (
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>Open</Text>
              </View>
            ) : (
              <View style={[styles.statusBadge, styles.closedBadge]}>
                <Text style={[styles.statusText, styles.closedText]}>Closed</Text>
              </View>
            )}
          </View>
          <View style={styles.shopInfo}>
            <View style={styles.shopHeader}>
              <Text style={styles.shopName} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={styles.ratingContainer}>
                <MaterialIcons name="star" size={16} color="#FFD700" />
                <Text style={styles.ratingText}>
                  {item.rating ? item.rating.toFixed(1) : '4.5'}
                </Text>
              </View>
            </View>
            
            <View style={styles.categoryContainer}>
              <Chip 
                mode="outlined" 
                style={styles.categoryChip}
                textStyle={styles.categoryText}
              >
                {item.category || 'Restaurant'}
              </Chip>
            </View>
            
            <View style={styles.shopLocation}>
              <MaterialIcons name="location-on" size={16} color="#666" />
              <Text style={styles.locationText} numberOfLines={1}>
                {item.location}
              </Text>
            </View>
            
            <View style={styles.shopFooter}>
              <View style={styles.distanceContainer}>
                <MaterialIcons name="directions-walk" size={16} color="#666" />
                <Text style={styles.distanceText}>{item.distance} km</Text>
              </View>
              <View style={styles.deliveryContainer}>
                <MaterialIcons name="delivery-dining" size={16} color="#666" />
                <Text style={styles.deliveryText}>Free Delivery</Text>
              </View>
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.categoryItem,
        selectedCategory === item && styles.selectedCategory
      ]}
      onPress={() => filterByCategory(item)}
    >
      <Text 
        style={[
          styles.categoryItemText,
          selectedCategory === item && styles.selectedCategoryText
        ]}
      >
        {item}
      </Text>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View>
      <LinearGradient
        colors={['#ff8c00', '#ff621f']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerContainer}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>EZYeats</Text>
          <Text style={styles.headerSubtitle}>Discover nearby food shops</Text>
        </View>
      </LinearGradient>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <MaterialIcons name="search" size={24} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search shops, food, location..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#999"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.categoriesContainer}>
        <FlatList
          data={categories}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item}
          horizontal
          showsHorizontalScrollIndicator={false}
        />
      </View>

      <View style={styles.resultsHeader}>
        <Text style={styles.resultsText}>
          {filteredShops.length} {filteredShops.length === 1 ? 'Shop' : 'Shops'} Found
        </Text>
        <View style={styles.sortContainer}>
          <MaterialIcons name="sort" size={18} color="#ff8c00" />
          <Text style={styles.sortText}>Nearest First</Text>
        </View>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#ff8c00" />
        <Text style={styles.loadingText}>Loading shops...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#ff8c00" />
      
      <FlatList
        data={filteredShops}
        renderItem={renderShopItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.shopsList}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="search-off" size={80} color="#ddd" />
            <Text style={styles.emptyTitle}>No shops found</Text>
            <Text style={styles.emptyText}>
              Try adjusting your search or category filter
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#ff8c00']}
            tintColor="#ff8c00"
          />
        }
      />

      {cart.length > 0 && (
        <FAB
          style={styles.fab}
          icon={() => (
            <View style={styles.fabContent}>
              <MaterialIcons name="shopping-cart" size={24} color="#fff" />
              <Badge style={styles.badge} size={22}>{cart.length}</Badge>
            </View>
          )}
          onPress={() => navigation.navigate('Cart')}
          color="#fff"
          customSize={60}
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
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  headerContainer: {
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    marginTop: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  categoriesContainer: {
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  categoryItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 6,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  selectedCategory: {
    backgroundColor: '#ff8c00',
  },
  categoryItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  selectedCategoryText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  resultsText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#666',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#ff8c00',
    fontWeight: '500',
  },
  shopsList: {
    paddingBottom: 20,
  },
  shopCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  shopCardContent: {
    flexDirection: 'row',
  },
  shopImageContainer: {
    position: 'relative',
    width: 120,
    height: 140,
  },
  shopImage: {
    width: '100%',
    height: '100%',
  },
  noImageContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  closedBadge: {
    backgroundColor: '#F44336',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  closedText: {
    color: '#fff',
  },
  shopInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  shopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shopName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingText: {
    marginLeft: 2,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  categoryContainer: {
    marginVertical: 4,
  },
  categoryChip: {
    height: 28,
    alignSelf: 'flex-start',
    backgroundColor: 'transparent',
    borderColor: '#ff8c00',
  },
  categoryText: {
    fontSize: 12,
    color: '#ff8c00',
  },
  shopLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  shopFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    marginLeft: 4,
    fontSize: 13,
    color: '#666',
  },
  deliveryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveryText: {
    marginLeft: 4,
    fontSize: 13,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#ff8c00',
    borderRadius: 30,
  },
  fabContent: {
    position: 'relative',
    width: 24,
    height: 24,
  },
  badge: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#F44336',
  },
});

export default ShopsScreen;