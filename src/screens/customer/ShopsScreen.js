import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl, 
  Image,
  ScrollView,
  Dimensions,
  Animated,
  StatusBar,
  Platform
} from 'react-native';
import { Searchbar, Card, Chip, FAB, Badge, Button } from 'react-native-paper';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const CATEGORIES = [
  { id: 'all', name: 'All', icon: 'restaurant-menu' },
  { id: 'north-indian', name: 'North Indian', icon: 'lunch-dining' },
  { id: 'south-indian', name: 'South Indian', icon: 'dinner-dining' },
  { id: 'chinese', name: 'Chinese', icon: 'ramen-dining' },
  { id: 'fast-food', name: 'Fast Food', icon: 'fastfood' },
  { id: 'desserts', name: 'Desserts', icon: 'icecream' },
  { id: 'beverages', name: 'Beverages', icon: 'local-cafe' },
];

const ShopsScreen = ({ navigation }) => {
  const { currentUser } = useAuth();
  const [shops, setShops] = useState([]);
  const [filteredShops, setFilteredShops] = useState([]);
  const [topRatedShops, setTopRatedShops] = useState([]);
  const [popularShops, setPopularShops] = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [userFirstName, setUserFirstName] = useState('');
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      try {
        // Get user details for personalized greeting
        if (currentUser?.displayName) {
          const names = currentUser.displayName.split(' ');
          setUserFirstName(names[0]);
        }
        
        fetchShops();
        fetchTopItems();
        fetchAllItems();
      } catch (error) {
        console.error('Error in ShopsScreen initialization:', error);
      }
    })();
  }, [currentUser]);

  useEffect(() => {
    // Start animations when component mounts
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (shops.length > 0) {
      filterShops(selectedFilter);
    }
  }, [selectedFilter, shops, searchQuery]);

  const fetchShops = async () => {
    try {
      setLoading(true);
      
      const shopsQuery = query(collection(db, 'shops'));
      const querySnapshot = await getDocs(shopsQuery);
      
      const shopsList = [];
      querySnapshot.forEach((doc) => {
        const shopData = { id: doc.id, ...doc.data() };
        shopsList.push(shopData);
      });
      
      // Get top rated shops
      const rated = [...shopsList].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 5);
      setTopRatedShops(rated);
      
      // Get popular shops (open shops)
      const popular = [...shopsList].filter(shop => shop.isOpen).slice(0, 5);
      setPopularShops(popular);
      
      console.log(`Fetched ${shopsList.length} shops from Firestore`);
      setShops(shopsList);
      setFilteredShops(shopsList);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching shops:', error);
      setLoading(false);
    }
  };
  
  const fetchTopItems = async () => {
    try {
      const itemsQuery = query(
        collection(db, 'menuItems'),
        orderBy('rating', 'desc'),
        limit(6)
      );
      
      const querySnapshot = await getDocs(itemsQuery);
      
      const itemsList = [];
      querySnapshot.forEach((doc) => {
        itemsList.push({ id: doc.id, ...doc.data() });
      });
      
      setTopItems(itemsList);
    } catch (error) {
      console.error('Error fetching top items:', error);
    }
  };

  const fetchAllItems = async () => {
    try {
      const itemsQuery = query(
        collection(db, 'menuItems'),
        limit(20)
      );
      
      const querySnapshot = await getDocs(itemsQuery);
      
      const itemsList = [];
      querySnapshot.forEach((doc) => {
        itemsList.push({ id: doc.id, ...doc.data() });
      });
      
      setAllItems(itemsList);
    } catch (error) {
      console.error('Error fetching all items:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchShops();
    await fetchTopItems();
    await fetchAllItems();
    setRefreshing(false);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    
    if (query.trim() === '') {
      filterShops(selectedFilter);
    } else {
      const filtered = shops.filter(
        (shop) => 
          shop.name.toLowerCase().includes(query.toLowerCase()) ||
          shop.location.toLowerCase().includes(query.toLowerCase()) ||
          (shop.categories && shop.categories.some(cat => 
            cat.toLowerCase().includes(query.toLowerCase())
          ))
      );
      setFilteredShops(filtered);
    }
  };

  const filterShops = (filter) => {
    setSelectedFilter(filter);
    
    let filtered = [...shops];
    
    if (filter === 'open') {
      filtered = filtered.filter(shop => shop.isOpen);
    } else if (filter === 'topRated') {
      filtered = filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (filter !== 'all') {
      // Filter by category
      filtered = filtered.filter(shop => 
        shop.categories && shop.categories.includes(filter)
      );
    }
    
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(
        (shop) => 
          shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          shop.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (shop.categories && shop.categories.some(cat => 
            cat.toLowerCase().includes(searchQuery.toLowerCase())
          ))
      );
    }
    
    setFilteredShops(filtered);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const renderHeader = () => {
    const headerHeight = 170;
    const headerScale = scrollY.interpolate({
      inputRange: [0, headerHeight],
      outputRange: [1, 0.9],
      extrapolate: 'clamp',
    });
    
    const headerOpacity = scrollY.interpolate({
      inputRange: [0, headerHeight / 2, headerHeight],
      outputRange: [1, 0.9, 0.8],
      extrapolate: 'clamp',
    });
    
    return (
      <Animated.View 
        style={[
          styles.header,
          { 
            opacity: headerOpacity,
            transform: [{ scale: headerScale }]
          }
        ]}
      >
        <View
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <View style={styles.greetingContainer}>
              <Text style={styles.greeting}>
                {getGreeting()}, {userFirstName || 'Friend'}!
              </Text>
              <Text style={styles.greetingSubtitle}>
                What would you like to eat today?
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Search canteens, cuisines..."
            onChangeText={handleSearch}
            value={searchQuery}
            style={styles.searchBar}
            iconColor="#ff8c00"
          />
        </View>
      </Animated.View>
    );
  };

  const renderCategoriesSection = () => (
    <View style={styles.categoriesSection}>
      <Text style={styles.sectionTitle}>Categories</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
      >
        {CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryItem,
              selectedFilter === category.id && styles.selectedCategoryItem
            ]}
            onPress={() => filterShops(category.id)}
          >
            <View style={[
              styles.categoryIconContainer,
              selectedFilter === category.id && styles.selectedCategoryIconContainer
            ]}>
              <MaterialIcons 
                name={category.icon} 
                size={24} 
                color={selectedFilter === category.id ? '#fff' : '#ff8c00'} 
              />
            </View>
            <Text style={[
              styles.categoryName,
              selectedFilter === category.id && styles.selectedCategoryName
            ]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderTopShops = () => {
    if (topRatedShops.length === 0) return null;
    
    return (
      <View style={styles.topSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top Rated Canteens</Text>
          <TouchableOpacity 
            onPress={() => {
              setSelectedFilter('topRated');
            }}
          >
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.topShopsContainer}
        >
          {topRatedShops.map((shop) => (
            <TouchableOpacity
              key={shop.id}
              style={styles.topShopCard}
              onPress={() => navigation.navigate('ShopDetail', { 
                shopId: shop.id, 
                shopName: shop.name,
                shopData: shop
              })}
            >
              <Image
                source={{ uri: shop.coverImage || getShopFallbackImage(shop) }}
                style={styles.topShopImage}
              />
              <View
                style={styles.topShopGradient}
              >
                <View style={styles.topShopInfo}>
                  <Text style={styles.topShopName} numberOfLines={1}>
                    {shop.name}
                  </Text>
                  <View style={styles.topShopRating}>
                    <MaterialIcons name="star" size={14} color="#FFD700" />
                    <Text style={styles.topShopRatingText}>
                      {shop.rating ? shop.rating.toFixed(1) : 'New'} 
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderPopularShops = () => {
    if (popularShops.length === 0) return null;
    
    return (
      <View style={styles.popularSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Open Now</Text>
          <TouchableOpacity 
            onPress={() => {
              setSelectedFilter('open');
            }}
          >
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.popularShopsContainer}
        >
          {popularShops.map((shop) => (
            <TouchableOpacity
              key={shop.id}
              style={styles.popularShopCard}
              onPress={() => navigation.navigate('ShopDetail', { 
                shopId: shop.id, 
                shopName: shop.name,
                shopData: shop
              })}
            >
              <Image
                source={{ uri: shop.coverImage || getShopFallbackImage(shop) }}
                style={styles.popularShopImage}
              />
              <View style={styles.popularShopContent}>
                <Text style={styles.popularShopName} numberOfLines={1}>{shop.name}</Text>
                <View style={styles.popularShopMetadata}>
                  <Chip 
                    mode="flat"
                    style={styles.openChip}
                  >
                    Open
                  </Chip>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderTopItems = () => {
    if (topItems.length === 0) return null;
    
    return (
      <View style={styles.topItemsSection}>
        <Text style={styles.sectionTitle}>Popular Items</Text>
        <View style={styles.topItemsGrid}>
          {topItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.topItemCard}
              onPress={() => {
                // Navigate to the shop with this item
                if (item.shopId) {
                  const shop = shops.find(s => s.id === item.shopId);
                  if (shop) {
                    navigation.navigate('ShopDetail', { 
                      shopId: shop.id, 
                      shopName: shop.name,
                      shopData: shop,
                      highlightItemId: item.id
                    });
                  }
                }
              }}
            >
              <Image
                source={{ uri: item.imageUrl || 'https://via.placeholder.com/150' }}
                style={styles.topItemImage}
              />
              <View style={styles.topItemContent}>
                <Text style={styles.topItemName} numberOfLines={1}>{item.name}</Text>
                <View style={styles.topItemInfo}>
                  <Text style={styles.topItemPrice}>₹{item.price.toFixed(2)}</Text>
                  <View style={styles.topItemRating}>
                    <MaterialIcons name="star" size={12} color="#FFD700" />
                    <Text style={styles.topItemRatingText}>{item.rating?.toFixed(1) || '4.5'}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderAllItems = () => {
    if (allItems.length === 0) return null;
    
    return (
      <View style={styles.allItemsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Dishes You Might Like</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={allItems}
          keyExtractor={(item) => item.id}
          horizontal={false}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.dishCard}
              onPress={() => {
                // Navigate to the shop with this item
                if (item.shopId) {
                  const shop = shops.find(s => s.id === item.shopId);
                  if (shop) {
                    navigation.navigate('ShopDetail', { 
                      shopId: shop.id, 
                      shopName: shop.name,
                      shopData: shop,
                      highlightItemId: item.id
                    });
                  }
                }
              }}
            >
              <Image
                source={{ uri: item.imageUrl || 'https://via.placeholder.com/150' }}
                style={styles.dishImage}
              />
              <View style={styles.dishContent}>
                <Text style={styles.dishName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.dishShop} numberOfLines={1}>
                  {shops.find(s => s.id === item.shopId)?.name || 'Unknown Shop'}
                </Text>
                <View style={styles.dishFooter}>
                  <Text style={styles.dishPrice}>₹{item.price.toFixed(2)}</Text>
                  <View style={styles.ratingContainer}>
                    <MaterialIcons name="star" size={14} color="#FFD700" />
                    <Text style={styles.ratingText}>{item.rating?.toFixed(1) || 'New'}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.dishesGrid}
        />
      </View>
    );
  };

  const renderShopItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('ShopDetail', { 
        shopId: item.id, 
        shopName: item.name,
        shopData: item
      })}
    >
      <Card style={styles.shopCard}>
        <Card.Cover
          source={{ uri: item.coverImage || getShopFallbackImage(item) }}
          style={styles.shopCover}
        />
        <Card.Content>
          <View style={styles.shopHeader}>
            <View>
              <Text style={styles.shopName}>{item.name}</Text>
              <Text style={styles.shopLocation}>
                <MaterialIcons name="location-on" size={14} color="#666" />
                {' '}{item.location}
              </Text>
            </View>
            <Chip 
              mode="flat"
              style={[
                styles.statusChip, 
                item.isOpen ? styles.openChip : styles.closedChip
              ]}
            >
              {item.isOpen ? 'Open' : 'Closed'}
            </Chip>
          </View>
          
          <Text style={styles.shopDescription} numberOfLines={2}>
            {item.description || "No description available"}
          </Text>
          
          <View style={styles.shopFooter}>
            <Text style={styles.shopHours}>
              <MaterialIcons name="access-time" size={14} color="#666" />
              {' '}{item.openingTime} - {item.closingTime}
            </Text>
            
            {item.rating && (
              <View style={styles.ratingContainer}>
                <MaterialIcons name="star" size={14} color="#FFD700" />
                <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
              </View>
            )}
          </View>
          
          {item.categories && item.categories.length > 0 && (
            <View style={styles.categoriesRow}>
              {item.categories.slice(0, 3).map((category, index) => (
                <Chip 
                  key={index}
                  style={styles.categoryTag}
                  textStyle={styles.categoryTagText}
                >
                  {CATEGORIES.find(c => c.id === category)?.name || category}
                </Chip>
              ))}
              {item.categories.length > 3 && (
                <Text style={styles.moreCategoriesText}>+{item.categories.length - 3}</Text>
              )}
            </View>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  // Function to get a fallback image based on shop properties
  const getShopFallbackImage = (shop) => {
    // Create deterministic but diverse fallback images based on shop ID
    const shopIdSum = shop.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const imageIndex = shopIdSum % 6; // Use modulo to get one of 6 different images
    
    const fallbackImages = [
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1374&q=80',
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
      'https://images.unsplash.com/photo-1552566626-52f8b828add9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
      'https://images.unsplash.com/photo-1544148103-0773bf10d330?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
      'https://images.unsplash.com/photo-1559329007-40df8a9345d8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1374&q=80',
      'https://images.unsplash.com/photo-1590846406792-0adc7f938f1d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1585&q=80'
    ];
    
    return fallbackImages[imageIndex];
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#ff8c00" />
      
      {renderHeader()}
      
      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#ff8c00']}
            tintColor="#ff8c00"
          />
        }
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
      >
        {renderCategoriesSection()}
        {renderTopShops()}
        {renderPopularShops()}
        {renderTopItems()}
        {renderAllItems()}
        
        <View style={styles.allShopsSection}>
          <Text style={styles.sectionTitle}>
            {selectedFilter === 'all' 
              ? 'All Canteens' 
              : selectedFilter === 'open'
                ? 'Open Canteens'
                : selectedFilter === 'topRated'
                  ? 'Top Rated Canteens'
                  : `${CATEGORIES.find(c => c.id === selectedFilter)?.name || selectedFilter} Canteens`}
          </Text>
          
          {loading ? (
            <ActivityIndicator size="large" color="#ff8c00" style={styles.loader} />
          ) : filteredShops.length > 0 ? (
            <FlatList
              data={filteredShops}
              renderItem={renderShopItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.shopList}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="search-off" size={80} color="#ddd" />
              <Text style={styles.emptyText}>No canteens found</Text>
              
              {(searchQuery || selectedFilter !== 'all') && (
                <Button
                  mode="contained"
                  onPress={() => {
                    setSearchQuery('');
                    setSelectedFilter('all');
                  }}
                  style={styles.resetButton}
                  buttonColor="#ff8c00"
                >
                  Clear Filters
                </Button>
              )}
            </View>
          )}
        </View>
      </Animated.ScrollView>
      
      <FAB
        style={styles.fab}
        icon="qrcode-scan"
        color="#fff"
        onPress={() => navigation.navigate('QRScanner')}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    overflow: 'hidden',
  },
  headerGradient: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    paddingHorizontal: 16,
    paddingBottom: 32,
    backgroundColor: '#ff8c00',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  greetingSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  searchContainer: {
    marginTop: -20,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  searchBar: {
    borderRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  categoriesSection: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  categoriesContainer: {
    paddingBottom: 8,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 70,
  },
  categoryIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 8,
  },
  selectedCategoryIconContainer: {
    backgroundColor: '#ff8c00',
  },
  categoryName: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  selectedCategoryName: {
    fontWeight: 'bold',
    color: '#ff8c00',
  },
  selectedCategoryItem: {
    transform: [{ scale: 1.05 }],
  },
  topSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  popularSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
    color: '#ff8c00',
    fontWeight: '500',
  },
  topShopsContainer: {
    paddingBottom: 8,
  },
  popularShopsContainer: {
    paddingBottom: 8,
  },
  topShopCard: {
    width: width * 0.7,
    height: 180,
    marginRight: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  topShopImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  topShopGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  topShopInfo: {
    justifyContent: 'flex-end',
  },
  topShopName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  topShopRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topShopRatingText: {
    fontSize: 12,
    color: '#fff',
    marginLeft: 4,
  },
  popularShopCard: {
    width: 150,
    marginRight: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    elevation: 2,
  },
  popularShopImage: {
    width: '100%',
    height: 100,
    resizeMode: 'cover',
  },
  popularShopContent: {
    padding: 10,
  },
  popularShopName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  popularShopMetadata: {
    alignItems: 'flex-start',
  },
  topItemsSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  topItemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  topItemCard: {
    width: width * 0.44,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 2,
  },
  topItemImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  topItemContent: {
    padding: 10,
  },
  topItemName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  topItemInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topItemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ff8c00',
  },
  topItemRating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff9e6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  topItemRatingText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  allShopsSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  shopList: {
    padding: 0,
  },
  shopCard: {
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  shopCover: {
    height: 120,
  },
  shopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 10,
  },
  shopName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  shopLocation: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statusChip: {
    paddingHorizontal: 12,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  openChip: {
    backgroundColor: '#e6f7e9',
  },
  closedChip: {
    backgroundColor: '#ffeaea',
  },
  shopDescription: {
    fontSize: 14,
    color: '#757575',
    marginTop: 10,
    marginBottom: 10,
  },
  shopFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  shopHours: {
    fontSize: 14,
    color: '#666',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff9e6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  categoryTag: {
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginBottom: 4,
    height: 24,
  },
  categoryTagText: {
    fontSize: 10,
  },
  moreCategoriesText: {
    fontSize: 12,
    color: '#757575',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    marginBottom: 16,
  },
  resetButton: {
    borderRadius: 24,
  },
  loader: {
    marginVertical: 32,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#ff8c00',
  },
  allItemsSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  dishesGrid: {
    paddingBottom: 8,
  },
  dishCard: {
    width: width * 0.44,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    marginHorizontal: width * 0.015,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  dishImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  dishContent: {
    padding: 10,
  },
  dishName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  dishShop: {
    fontSize: 12,
    color: '#666',
    marginVertical: 4,
  },
  dishFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  dishPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ff8c00',
  },
});

export default ShopsScreen;