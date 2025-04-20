import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
  Alert,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import { Chip, FAB, Badge, ActivityIndicator, Divider, Button, Searchbar } from 'react-native-paper';
import { collection, getDoc, doc, getDocs, query, where, limit, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');
const HEADER_MAX_HEIGHT = 220;
const HEADER_MIN_HEIGHT = Platform.OS === 'ios' ? 90 : 70;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

const ShopDetailsScreen = ({ route, navigation }) => {
  const { shop } = route.params;
  const { currentUser } = useAuth();
  const { 
    cart, 
    addToCart, 
    removeFromCart, 
    clearCart, 
    getCartItemCount,
    getCartTotal,
    getShopId 
  } = useCart();
  
  const [menuItems, setMenuItems] = useState([]);
  const [filteredMenuItems, setFilteredMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [shopRating, setShopRating] = useState(null);
  const [cartVisible, setCartVisible] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const cartBounceAnim = useRef(new Animated.Value(1)).current;
  
  // Check if there's an existing cart for another shop
  useEffect(() => {
    const existingShopId = getShopId();
    if (existingShopId && existingShopId !== shop.id && getCartItemCount() > 0) {
      Alert.alert(
        'Clear existing cart?',
        'You have items in your cart from another restaurant. Would you like to clear your cart and order from this restaurant instead?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => navigation.goBack(),
          },
          {
            text: 'Clear Cart',
            onPress: () => clearCart(),
          },
        ]
      );
    }
  }, []);

  useEffect(() => {
    fetchMenuItems();
    fetchShopRating();
  }, []);

  useEffect(() => {
    filterMenuItems();
  }, [menuItems, selectedCategory, searchQuery]);

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      const menuQuery = query(
        collection(db, 'shops', shop.id, 'menuItems'),
        where('isAvailable', '==', true),
        orderBy('category'),
        orderBy('name')
      );
      
      const menuSnapshot = await getDocs(menuQuery);
      const menuData = menuSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Extract unique categories
      const uniqueCategories = [...new Set(menuData.map(item => item.category))];
      setCategories(['all', ...uniqueCategories]);
      
      setMenuItems(menuData);
      setFilteredMenuItems(menuData);
    } catch (error) {
      console.error('Error fetching menu items:', error);
      Alert.alert('Error', 'Failed to load menu items. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchShopRating = async () => {
    try {
      const ratingRef = doc(db, 'shopRatings', shop.id);
      const ratingDoc = await getDoc(ratingRef);
      
      if (ratingDoc.exists()) {
        setShopRating(ratingDoc.data());
      }
    } catch (error) {
      console.error('Error fetching shop rating:', error);
    }
  };

  const filterMenuItems = () => {
    let filtered = [...menuItems];
    
    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(query) || 
        (item.description && item.description.toLowerCase().includes(query))
      );
    }
    
    setFilteredMenuItems(filtered);
  };

  const handleAddToCart = (item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addToCart(item, shop);
    
    // Animate cart button
    Animated.sequence([
      Animated.timing(cartBounceAnim, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(cartBounceAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleRemoveFromCart = (itemId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    removeFromCart(itemId);
  };

  const getItemCountInCart = (itemId) => {
    const cartItem = cart.find(item => item.id === itemId);
    return cartItem ? cartItem.quantity : 0;
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchMenuItems();
    fetchShopRating();
  };

  const navigateToCart = () => {
    navigation.navigate('Cart', { shopId: shop.id });
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
  };

  const toggleSearch = () => {
    setShowSearch(!showSearch);
    if (showSearch) {
      setSearchQuery('');
    }
  };

  const renderHeader = () => {
    // Animation values
    const headerHeight = scrollY.interpolate({
      inputRange: [0, HEADER_SCROLL_DISTANCE],
      outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
      extrapolate: 'clamp',
    });
    
    const imageOpacity = scrollY.interpolate({
      inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
      outputRange: [1, 0.5, 0],
      extrapolate: 'clamp',
    });
    
    const imageTranslate = scrollY.interpolate({
      inputRange: [0, HEADER_SCROLL_DISTANCE],
      outputRange: [0, -50],
      extrapolate: 'clamp',
    });
    
    const titleScale = scrollY.interpolate({
      inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
      outputRange: [1, 0.9, 0.8],
      extrapolate: 'clamp',
    });
    
    const titleTranslate = scrollY.interpolate({
      inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
      outputRange: [0, -30, -50],
      extrapolate: 'clamp',
    });
    
    return (
      <Animated.View style={[styles.header, { height: headerHeight }]}>
        <Animated.Image
          source={{ uri: shop.coverImage || 'https://foodtank.com/wp-content/uploads/2021/07/alfons-morales-YLSwjSy7stw-unsplash.jpg' }}
          style={[
            styles.headerImage,
            {
              opacity: imageOpacity,
              transform: [{ translateY: imageTranslate }],
            },
          ]}
        />
        
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.headerGradient}
        />
        
        <Animated.View
          style={[
            styles.headerContent,
            {
              transform: [
                { scale: titleScale },
                { translateY: titleTranslate },
              ],
            },
          ]}
        >
          <View style={styles.headerInfo}>
            <Text style={styles.shopName}>{shop.name}</Text>
            
            <View style={styles.shopMetadata}>
              <View style={styles.ratingContainer}>
                <MaterialIcons name="star" size={18} color="#FFD700" />
                <Text style={styles.ratingText}>
                  {shop.rating ? shop.rating.toFixed(1) : 'New'}
                </Text>
                {shopRating && (
                  <Text style={styles.ratingCount}>
                    ({shopRating.count} ratings)
                  </Text>
                )}
              </View>
              
              {shop.priceLevel && (
                <View style={styles.priceContainer}>
                  <Text style={styles.priceText}>
                    {'₹'.repeat(shop.priceLevel)}
                  </Text>
                </View>
              )}
            </View>
            
            <View style={styles.shopCategories}>
              {shop.categories && shop.categories.map((category, index) => (
                <Chip 
                  key={index} 
                  style={styles.categoryChip}
                  textStyle={styles.categoryChipText}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </Chip>
              ))}
            </View>
          </View>
        </Animated.View>
        
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.searchButton}
          onPress={toggleSearch}
        >
          <MaterialIcons name={showSearch ? "close" : "search"} size={24} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderShopInfo = () => (
    <View style={styles.shopInfoContainer}>
      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <MaterialIcons name="access-time" size={20} color="#ff8c00" />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoLabel}>Hours</Text>
            <Text style={styles.infoValue}>
              {shop.openingTime} - {shop.closingTime}
            </Text>
          </View>
        </View>
        
        <View style={styles.infoItem}>
          <MaterialIcons name="delivery-dining" size={20} color="#ff8c00" />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoLabel}>Pickup Time</Text>
            <Text style={styles.infoValue}>
              {shop.prepTime || '15-25'} mins
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <MaterialIcons name="location-on" size={20} color="#ff8c00" />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoLabel}>Location</Text>
            <Text style={styles.infoValue} numberOfLines={2}>
              {shop.address || 'Campus Location'}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.infoItem}
          onPress={() => navigation.navigate('ShopReviews', { shopId: shop.id, shopName: shop.name })}
        >
          <MaterialIcons name="rate-review" size={20} color="#ff8c00" />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoLabel}>Reviews</Text>
            <Text style={styles.infoValue}>See all reviews</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCategories = () => (
    <View style={styles.categoriesContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesScrollContent}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryButton,
              selectedCategory === category && styles.selectedCategoryButton,
            ]}
            onPress={() => handleCategorySelect(category)}
          >
            <Text
              style={[
                styles.categoryButtonText,
                selectedCategory === category && styles.selectedCategoryButtonText,
              ]}
            >
              {category === 'all' 
                ? 'All Items' 
                : category.charAt(0).toUpperCase() + category.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderSearchBar = () => {
    if (!showSearch) return null;
    
    return (
      <Animated.View 
        style={styles.searchContainer}
        entering={Animated.FadeInDown.duration(300)}
        exiting={Animated.FadeOutUp.duration(300)}
      >
        <Searchbar
          placeholder="Search menu items..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
          iconColor="#ff8c00"
          autoFocus={true}
        />
      </Animated.View>
    );
  };

  const renderMenuItem = ({ item }) => {
    const count = getItemCountInCart(item.id);
    
    return (
      <View style={styles.menuItemCard}>
        <View style={styles.menuItemContent}>
          <View style={styles.menuItemInfo}>
            <Text style={styles.menuItemName}>{item.name}</Text>
            
            <Text style={styles.menuItemPrice}>₹{item.price.toFixed(2)}</Text>
            
            {item.description && (
              <Text style={styles.menuItemDescription} numberOfLines={2}>
                {item.description}
              </Text>
            )}
            
            {item.isVegetarian !== undefined && (
              <View style={styles.vegBadge}>
                <View 
                  style={[
                    styles.vegIndicator, 
                    { backgroundColor: item.isVegetarian ? 'green' : 'red' }
                  ]} 
                />
                <Text style={styles.vegText}>
                  {item.isVegetarian ? 'Veg' : 'Non-veg'}
                </Text>
              </View>
            )}
          </View>
          
          {item.imageUrl && (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.menuItemImage}
            />
          )}
        </View>
        
        <View style={styles.quantityControls}>
          {count > 0 ? (
            <View style={styles.quantityContainer}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => handleRemoveFromCart(item.id)}
              >
                <MaterialIcons name="remove" size={16} color="#ff8c00" />
              </TouchableOpacity>
              
              <Text style={styles.quantityText}>{count}</Text>
              
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => handleAddToCart(item)}
              >
                <MaterialIcons name="add" size={16} color="#ff8c00" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => handleAddToCart(item)}
            >
              <Text style={styles.addButtonText}>Add</Text>
              <MaterialIcons name="add" size={16} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderSectionHeader = (title) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  const renderMenu = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <LottieView
            source={require('../../assets/animations/food-loading.json')}
            style={styles.loadingAnimation}
            autoPlay
            loop
          />
          <Text style={styles.loadingText}>Loading menu...</Text>
        </View>
      );
    }
    
    if (filteredMenuItems.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <LottieView
            source={require('../../assets/animations/empty-search.json')}
            style={styles.emptyAnimation}
            autoPlay
            loop
          />
          <Text style={styles.emptyTitle}>No items found</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery 
              ? `No results for "${searchQuery}"`
              : selectedCategory !== 'all'
                ? `No items in the ${selectedCategory} category`
                : 'No menu items available'}
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
    
    if (selectedCategory !== 'all' || searchQuery) {
      // For filtered results, show a flat list
      return (
        <FlatList
          data={filteredMenuItems}
          keyExtractor={(item) => item.id}
          renderItem={renderMenuItem}
          contentContainerStyle={styles.menuContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            searchQuery ? (
              <Text style={styles.searchResultsText}>
                {filteredMenuItems.length} results for "{searchQuery}"
              </Text>
            ) : null
          }
        />
      );
    }
    
    // For showing all menu items, group by category
    const menuByCategory = {};
    filteredMenuItems.forEach(item => {
      if (!menuByCategory[item.category]) {
        menuByCategory[item.category] = [];
      }
      menuByCategory[item.category].push(item);
    });
    
    // Sort categories alphabetically
    const sortedCategories = Object.keys(menuByCategory).sort();
    
    return (
      <View style={styles.menuContainer}>
        {sortedCategories.map((category) => (
          <View key={category}>
            {renderSectionHeader(category.charAt(0).toUpperCase() + category.slice(1))}
            {menuByCategory[category].map((item) => (
              <React.Fragment key={item.id}>
                {renderMenuItem({ item })}
              </React.Fragment>
            ))}
          </View>
        ))}
      </View>
    );
  };

  const renderCartButton = () => {
    const itemCount = getCartItemCount();
    const cartTotal = getCartTotal();
    
    if (itemCount === 0) return null;
    
    return (
      <Animated.View 
        style={[
          styles.cartButtonContainer,
          {
            transform: [{ scale: cartBounceAnim }],
          },
        ]}
      >
        <TouchableOpacity style={styles.cartButton} onPress={navigateToCart}>
          <View style={styles.cartContent}>
            <View style={styles.cartInfo}>
              <Text style={styles.cartCount}>{itemCount} {itemCount === 1 ? 'item' : 'items'}</Text>
              <Text style={styles.cartTotal}>₹{cartTotal.toFixed(2)}</Text>
            </View>
            
            <View style={styles.viewCartContainer}>
              <Text style={styles.viewCartText}>View Cart</Text>
              <MaterialIcons name="arrow-forward-ios" size={14} color="#fff" />
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <StatusBar 
        translucent 
        backgroundColor="transparent" 
        barStyle="light-content" 
      />
      
      {renderHeader()}
      
      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            progressViewOffset={HEADER_MAX_HEIGHT}
            colors={['#ff8c00']}
            tintColor="#ff8c00"
          />
        }
      >
        <View style={styles.contentContainer}>
          {renderShopInfo()}
          <Divider style={styles.divider} />
          {renderCategories()}
          {renderSearchBar()}
          {renderMenu()}
        </View>
      </Animated.ScrollView>
      
      {renderCartButton()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    overflow: 'hidden',
    zIndex: 1,
  },
  headerImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: null,
    height: HEADER_MAX_HEIGHT,
    resizeMode: 'cover',
  },
  headerGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  headerContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  headerInfo: {
    marginTop: 8,
  },
  shopName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  shopMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 4,
  },
  ratingCount: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 4,
  },
  priceContainer: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  priceText: {
    fontSize: 12,
    color: '#fff',
  },
  shopCategories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: 8,
    marginBottom: 4,
    height: 24,
  },
  categoryChipText: {
    fontSize: 10,
    color: '#fff',
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 55 : 40,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  searchButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 55 : 40,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  scrollContent: {
    paddingTop: HEADER_MAX_HEIGHT,
    paddingBottom: 60,
  },
  contentContainer: {
    backgroundColor: '#f8f8f8',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    paddingBottom: 20,
    minHeight: height - HEADER_MAX_HEIGHT + 20,
  },
  shopInfoContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  infoTextContainer: {
    marginLeft: 8,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  divider: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#ddd',
  },
  categoriesContainer: {
    paddingVertical: 8,
    marginBottom: 8,
  },
  categoriesScrollContent: {
    paddingHorizontal: 16,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 12,
  },
  selectedCategoryButton: {
    backgroundColor: '#ff8c00',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  selectedCategoryButtonText: {
    color: '#fff',
  },
  searchContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  searchBar: {
    borderRadius: 24,
    elevation: 2,
    backgroundColor: '#fff',
  },
  searchInput: {
    fontSize: 14,
  },
  searchResultsText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  menuContainer: {
    paddingHorizontal: 16,
    paddingBottom: 60,
  },
  sectionHeader: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  menuItemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  menuItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  menuItemInfo: {
    flex: 1,
    paddingRight: 12,
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  menuItemPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ff8c00',
    marginBottom: 8,
  },
  menuItemDescription: {
    fontSize: 13,
    color: '#777',
    marginBottom: 8,
  },
  menuItemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  vegBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vegIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 4,
  },
  vegText: {
    fontSize: 12,
    color: '#666',
  },
  quantityControls: {
    alignItems: 'flex-end',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff8c00',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginRight: 4,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ff8c00',
    borderRadius: 16,
    overflow: 'hidden',
  },
  quantityButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF4E8',
  },
  quantityText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    width: 24,
    textAlign: 'center',
  },
  cartButtonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    zIndex: 100,
  },
  cartButton: {
    backgroundColor: '#ff8c00',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  cartContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cartInfo: {
    flex: 1,
  },
  cartCount: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  cartTotal: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  viewCartContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewCartText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
    marginRight: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
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
    paddingVertical: 48,
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

export default ShopDetailsScreen; 