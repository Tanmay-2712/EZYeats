import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  ScrollView,
  Animated,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Searchbar, Card, Chip, Button, Avatar, Badge } from 'react-native-paper';
import { MaterialIcons, Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, getDocs, query, where, limit, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { getDistance } from 'geokit';

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

const HomeScreen = ({ navigation }) => {
  const { currentUser } = useAuth();
  const [shops, setShops] = useState([]);
  const [filteredShops, setFilteredShops] = useState([]);
  const [popularShops, setPopularShops] = useState([]);
  const [newShops, setNewShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [location, setLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(null);
  const [userFirstName, setUserFirstName] = useState('');
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    (async () => {
      try {
        // Get location permission
        const { status } = await Location.requestForegroundPermissionsAsync();
        setLocationPermission(status);
        
        if (status === 'granted') {
          const userLocation = await Location.getCurrentPositionAsync({});
          setLocation({
            latitude: userLocation.coords.latitude,
            longitude: userLocation.coords.longitude,
          });
        }
        
        // Get user details for personalized greeting
        if (currentUser?.displayName) {
          const names = currentUser.displayName.split(' ');
          setUserFirstName(names[0]);
        }
        
        // Fetch shops
        fetchShops();
      } catch (error) {
        console.error('Error in HomeScreen initialization:', error);
      }
    })();
  }, [currentUser]);

  useEffect(() => {
    // Start animations when component mounts
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (shops.length > 0) {
      filterShopsByCategory(selectedCategory);
    }
  }, [selectedCategory, shops, searchQuery]);

  const fetchShops = async () => {
    try {
      setLoading(true);
      
      // Get all shops
      const shopsQuery = query(
        collection(db, 'shops'),
        where('isActive', '==', true)
      );
      
      const shopsSnapshot = await getDocs(shopsQuery);
      const shopsData = shopsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        distance: calculateDistance(doc.data().location)
      }));
      
      // Sort shops by distance if location is available
      if (location) {
        shopsData.sort((a, b) => a.distance - b.distance);
      }
      
      setShops(shopsData);
      setFilteredShops(shopsData);
      
      // Get popular shops (by rating)
      const popularShopsData = [...shopsData]
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 5);
      
      setPopularShops(popularShopsData);
      
      // Get new shops (by createdAt)
      const newShopsData = [...shopsData]
        .sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0))
        .slice(0, 5);
      
      setNewShops(newShopsData);
      
    } catch (error) {
      console.error('Error fetching shops:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateDistance = (shopLocation) => {
    if (!location || !shopLocation) return 999999;
    
    try {
      return getDistance(
        { lat: location.latitude, lng: location.longitude },
        { lat: shopLocation.latitude, lng: shopLocation.longitude }
      );
    } catch (error) {
      console.error('Error calculating distance:', error);
      return 999999;
    }
  };

  const filterShopsByCategory = (category) => {
    let filtered = [...shops];
    
    // Apply category filter
    if (category !== 'all') {
      filtered = filtered.filter(shop => 
        shop.categories && shop.categories.includes(category)
      );
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(shop => 
        shop.name.toLowerCase().includes(query) ||
        (shop.description && shop.description.toLowerCase().includes(query)) ||
        (shop.categories && shop.categories.some(cat => cat.toLowerCase().includes(query)))
      );
    }
    
    setFilteredShops(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchShops();
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
  };

  const navigateToShopDetails = (shop) => {
    navigation.navigate('ShopDetails', { shop });
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
        <LinearGradient
          colors={['#ff8c00', '#ff7300']}
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
            
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => navigation.navigate('Profile')}
            >
              {currentUser?.photoURL ? (
                <Image 
                  source={{ uri: currentUser.photoURL }} 
                  style={styles.profileImage} 
                />
              ) : (
                <Avatar.Text 
                  size={44} 
                  label={getUserInitials()} 
                  color="#fff"
                  style={styles.profileAvatar}
                />
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>
        
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Search for food or restaurants..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
            inputStyle={styles.searchInput}
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
              selectedCategory === category.id && styles.selectedCategoryItem
            ]}
            onPress={() => handleCategorySelect(category.id)}
          >
            <View style={[
              styles.categoryIconContainer,
              selectedCategory === category.id && styles.selectedCategoryIconContainer
            ]}>
              <MaterialIcons 
                name={category.icon} 
                size={24} 
                color={selectedCategory === category.id ? '#fff' : '#ff8c00'} 
              />
            </View>
            <Text style={[
              styles.categoryName,
              selectedCategory === category.id && styles.selectedCategoryName
            ]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderPopularShops = () => {
    if (popularShops.length === 0) return null;
    
    return (
      <View style={styles.popularSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Popular Restaurants</Text>
          <TouchableOpacity 
            onPress={() => navigation.navigate('AllShops', { shops, title: 'Popular Restaurants', sorted: 'rating' })}
          >
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.popularShopsContainer}
        >
          {popularShops.map((shop) => renderPopularShopCard(shop))}
        </ScrollView>
      </View>
    );
  };

  const renderPopularShopCard = (shop) => (
    <TouchableOpacity
      key={shop.id}
      style={styles.popularShopCard}
      onPress={() => navigateToShopDetails(shop)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: shop.coverImage || 'https://foodtank.com/wp-content/uploads/2021/07/alfons-morales-YLSwjSy7stw-unsplash.jpg' }}
        style={styles.popularShopImage}
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.popularShopGradient}
      >
        <View style={styles.popularShopInfo}>
          <Text style={styles.popularShopName} numberOfLines={1}>
            {shop.name}
          </Text>
          <View style={styles.popularShopRating}>
            <MaterialIcons name="star" size={14} color="#FFD700" />
            <Text style={styles.popularShopRatingText}>
              {shop.rating ? shop.rating.toFixed(1) : 'New'} 
            </Text>
            {shop.distance && (
              <View style={styles.popularShopDistance}>
                <MaterialIcons name="location-on" size={14} color="#fff" />
                <Text style={styles.popularShopDistanceText}>
                  {(shop.distance < 1) 
                    ? `${Math.round(shop.distance * 1000)}m` 
                    : `${shop.distance.toFixed(1)}km`}
                </Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>
      {shop.isNew && (
        <View style={styles.newBadge}>
          <Text style={styles.newBadgeText}>NEW</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderAllShops = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <LottieView
            source={require('../../assets/animations/food-loading.json')}
            style={styles.loadingAnimation}
            autoPlay
            loop
          />
          <Text style={styles.loadingText}>Hungry? Finding restaurants near you...</Text>
        </View>
      );
    }
    
    if (filteredShops.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <LottieView
            source={require('../../assets/animations/empty-search.json')}
            style={styles.emptyAnimation}
            autoPlay
            loop
          />
          <Text style={styles.emptyTitle}>No restaurants found</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery 
              ? `No results for "${searchQuery}"`
              : selectedCategory !== 'all'
                ? `No restaurants in the ${CATEGORIES.find(c => c.id === selectedCategory)?.name} category`
                : 'No restaurants available in your area'}
          </Text>
          {(searchQuery || selectedCategory !== 'all') && (
            <Button
              mode="contained"
              onPress={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              style={styles.resetButton}
              buttonColor="#ff8c00"
            >
              Clear Filters
            </Button>
          )}
        </View>
      );
    }
    
    return (
      <Animated.View 
        style={[
          styles.allShopsSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: translateY }]
          }
        ]}
      >
        <Text style={styles.sectionTitle}>
          {selectedCategory === 'all' 
            ? 'All Restaurants' 
            : `${CATEGORIES.find(c => c.id === selectedCategory)?.name} Restaurants`}
        </Text>
        
        <View style={styles.allShopsContainer}>
          {filteredShops.map((shop) => renderShopCard(shop))}
        </View>
      </Animated.View>
    );
  };

  const renderShopCard = (shop) => (
    <TouchableOpacity
      key={shop.id}
      style={styles.shopCard}
      onPress={() => navigateToShopDetails(shop)}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: shop.coverImage || 'https://foodtank.com/wp-content/uploads/2021/07/alfons-morales-YLSwjSy7stw-unsplash.jpg' }}
        style={styles.shopImage}
      />
      
      <View style={styles.shopCardContent}>
        <View style={styles.shopInfo}>
          <Text style={styles.shopName} numberOfLines={1}>
            {shop.name}
          </Text>
          
          <View style={styles.shopMetadata}>
            <View style={styles.shopRating}>
              <MaterialIcons name="star" size={16} color="#FFD700" />
              <Text style={styles.shopRatingText}>
                {shop.rating ? shop.rating.toFixed(1) : 'New'}
              </Text>
            </View>
            
            {shop.distance && (
              <View style={styles.shopDistance}>
                <MaterialIcons name="location-on" size={14} color="#757575" />
                <Text style={styles.shopDistanceText}>
                  {(shop.distance < 1) 
                    ? `${Math.round(shop.distance * 1000)}m` 
                    : `${shop.distance.toFixed(1)}km`}
                </Text>
              </View>
            )}
          </View>
        </View>
        
        <Text style={styles.shopDescription} numberOfLines={2}>
          {shop.description || 'Delicious food waiting for you!'}
        </Text>
        
        <View style={styles.shopCategories}>
          {shop.categories && shop.categories.slice(0, 3).map((category, index) => (
            <Chip 
              key={index} 
              style={styles.categoryChip}
              textStyle={styles.categoryChipText}
            >
              {getCategoryName(category)}
            </Chip>
          ))}
          {shop.categories && shop.categories.length > 3 && (
            <Text style={styles.moreCategoriesText}>+{shop.categories.length - 3}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  // Helper functions
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getUserInitials = () => {
    if (!currentUser || !currentUser.displayName) return '?';
    return currentUser.displayName
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getCategoryName = (categoryId) => {
    const category = CATEGORIES.find(c => c.id === categoryId);
    return category ? category.name : categoryId;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" backgroundColor="#ff8c00" />
      
      {renderHeader()}
      
      <Animated.ScrollView
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
        {renderPopularShops()}
        {renderAllShops()}
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  headerGradient: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    paddingHorizontal: 16,
    paddingBottom: 32,
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
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  profileAvatar: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
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
    backgroundColor: '#fff',
  },
  searchInput: {
    fontSize: 14,
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
  popularShopsContainer: {
    paddingBottom: 8,
  },
  popularShopCard: {
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
  popularShopImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  popularShopGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  popularShopInfo: {
    justifyContent: 'flex-end',
  },
  popularShopName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  popularShopRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  popularShopRatingText: {
    fontSize: 12,
    color: '#fff',
    marginLeft: 4,
  },
  popularShopDistance: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  popularShopDistanceText: {
    fontSize: 12,
    color: '#fff',
    marginLeft: 2,
  },
  newBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#ff8c00',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  allShopsSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  allShopsContainer: {
    marginTop: 8,
  },
  shopCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  shopImage: {
    width: 100,
    height: 100,
    resizeMode: 'cover',
  },
  shopCardContent: {
    flex: 1,
    padding: 12,
  },
  shopInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  shopName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  shopMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shopRating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  shopRatingText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 2,
  },
  shopDistance: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  shopDistanceText: {
    fontSize: 12,
    color: '#757575',
    marginLeft: 2,
  },
  shopDescription: {
    fontSize: 13,
    color: '#757575',
    marginBottom: 8,
  },
  shopCategories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  categoryChip: {
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    height: 24,
  },
  categoryChipText: {
    fontSize: 10,
  },
  moreCategoriesText: {
    fontSize: 10,
    color: '#757575',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  loadingAnimation: {
    width: 200,
    height: 200,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyAnimation: {
    width: 200,
    height: 200,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  resetButton: {
    borderRadius: 24,
    paddingHorizontal: 16,
  },
});

export default HomeScreen; 