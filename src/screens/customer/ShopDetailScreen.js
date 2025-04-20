import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Animated,
  Dimensions,
  StatusBar,
  TextInput,
  Modal,
  Platform
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { Chip, Badge, Divider } from 'react-native-paper';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useCart } from '../../context/CartContext';
import { BlurView } from 'expo-blur';
import { SharedElement } from 'react-navigation-shared-element';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const ITEM_HEIGHT = 110;

const ShopDetailScreen = ({ route, navigation }) => {
  const { shopId, shopName, shopData } = route.params;
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [expandedHours, setExpandedHours] = useState(false);
  
  const { addToCart, cart, getItemQuantity } = useCart();
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef(null);
  
  // Animation values
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [250, 60],
    extrapolate: 'clamp',
  });
  
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100, 150],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  });
  
  const titleOpacity = scrollY.interpolate({
    inputRange: [0, 50, 100],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    fetchShopProducts();
  }, []);

  const fetchShopProducts = async () => {
    try {
      const productsCollection = collection(db, `shops/${shopId}/products`);
      const productSnapshot = await getDocs(productsCollection);
      
      const productsList = productSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Get unique categories
      const uniqueCategories = ['All', ...new Set(productsList.map(product => product.category))];
      
      setProducts(productsList);
      setFilteredProducts(productsList);
      setCategories(uniqueCategories);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching shop products:', error);
      setLoading(false);
    }
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    
    if (category === 'All') {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product => product.category === category);
      setFilteredProducts(filtered);
    }
  };
  
  const handleSearch = (text) => {
    setSearchQuery(text);
    
    if (text.trim() === '') {
      handleCategorySelect(selectedCategory);
    } else {
      const filtered = products.filter(product => 
        product.name.toLowerCase().includes(text.toLowerCase()) ||
        product.description.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  };

  const handleAddToCart = () => {
    if (selectedProduct) {
      const productWithOptions = {
        ...selectedProduct,
        quantity,
        specialInstructions,
        shopId,
        shopName: shopData.name,
      };
      
      addToCart(productWithOptions);
      setShowProductModal(false);
      setSelectedProduct(null);
      setQuantity(1);
      setSpecialInstructions('');
    }
  };
  
  const openProductDetails = (product) => {
    setSelectedProduct(product);
    setQuantity(1);
    setSpecialInstructions('');
    setShowProductModal(true);
  };
  
  const incrementQuantity = () => {
    setQuantity(prev => prev + 1);
  };
  
  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };
  
  const toggleSearch = () => {
    setShowSearch(prev => !prev);
    setSearchQuery('');
    
    if (!showSearch && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current.focus();
      }, 100);
    }
  };
  
  const formatWeekday = (day) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day];
  };
  
  const getCartQuantity = () => {
    return cart.reduce((total, item) => {
      if (item.shopId === shopId) {
        return total + item.quantity;
      }
      return total;
    }, 0);
  };
  
  const renderHeader = () => (
    <>
      <Animated.View style={[styles.headerContainer, { height: headerHeight }]}>
        <Animated.View style={[styles.headerContent, { opacity: headerOpacity }]}>
          <View style={styles.shopImageContainer}>
            {shopData.imageUrl ? (
              <Image 
                source={{ uri: shopData.imageUrl }} 
                style={styles.shopImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.noImageContainer}>
                <MaterialIcons name="store" size={60} color="#ccc" />
              </View>
            )}
          </View>
        </Animated.View>
        
        <LinearGradient
          colors={['rgba(0,0,0,0.7)', 'transparent']}
          style={styles.headerGradient}
        />
        
        <View style={styles.shopInfoContainer}>
          <View style={styles.shopNameContainer}>
            <Text style={styles.shopName}>{shopData.name}</Text>
            <View style={styles.ratingContainer}>
              <MaterialIcons name="star" size={16} color="#FFD700" />
              <Text style={styles.ratingText}>{shopData.rating ? shopData.rating.toFixed(1) : '4.5'}</Text>
            </View>
          </View>
          
          {shopData.description && (
            <Text style={styles.shopDescription} numberOfLines={2}>
              {shopData.description}
            </Text>
          )}
          
          <View style={styles.shopMetaContainer}>
            <TouchableOpacity style={styles.metaItem} onPress={() => setExpandedHours(!expandedHours)}>
              <MaterialIcons name="access-time" size={16} color="#fff" />
              <Text style={styles.metaText}>
                {shopData.isOpen ? 'Open Now' : 'Closed'} · {shopData.openingTime} - {shopData.closingTime}
              </Text>
              <MaterialIcons 
                name={expandedHours ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                size={16} 
                color="#fff" 
              />
            </TouchableOpacity>
          </View>
          
          {expandedHours && (
            <View style={styles.hoursContainer}>
              {[0, 1, 2, 3, 4, 5, 6].map(day => (
                <View key={day} style={styles.hourRow}>
                  <Text style={styles.dayText}>{formatWeekday(day)}</Text>
                  <Text style={styles.timeText}>{shopData.openingTime} - {shopData.closingTime}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </Animated.View>
      
      <Animated.View style={[styles.headerBar, { opacity: titleOpacity }]}>
        <Text style={styles.headerTitle}>{shopData.name}</Text>
        {shopData.isOpen ? (
          <View style={styles.pillBadge}>
            <Text style={styles.pillBadgeText}>Open</Text>
          </View>
        ) : (
          <View style={[styles.pillBadge, styles.closedBadge]}>
            <Text style={styles.pillBadgeText}>Closed</Text>
          </View>
        )}
      </Animated.View>
      
      <View style={styles.navbar}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.navActions}>
          <TouchableOpacity style={styles.navButton} onPress={toggleSearch}>
            <MaterialIcons name="search" size={24} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => navigation.navigate('Rating', { shopId, shopName: shopData.name })}
          >
            <MaterialIcons name="rate-review" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      
      {showSearch && (
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <MaterialIcons name="search" size={24} color="#666" />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Search menu items..."
              value={searchQuery}
              onChangeText={handleSearch}
              placeholderTextColor="#999"
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch('')}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
      
      <View style={styles.categoriesContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.categoriesScroll}
        >
          {categories.map(category => (
            <TouchableOpacity 
              key={category} 
              style={[
                styles.categoryItem,
                selectedCategory === category && styles.selectedCategory
              ]}
              onPress={() => handleCategorySelect(category)}
            >
              <Text 
                style={[
                  styles.categoryItemText,
                  selectedCategory === category && styles.selectedCategoryText
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </>
  );

  const renderProductItem = ({ item }) => {
    const itemInCart = getItemQuantity(item.id, shopId);
    
    return (
      <TouchableOpacity 
        style={styles.productCard}
        onPress={() => openProductDetails(item)}
        activeOpacity={0.8}
      >
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productDescription} numberOfLines={2}>
            {item.description}
          </Text>
          <View style={styles.productFooter}>
            <Text style={styles.productPrice}>₹{item.price.toFixed(2)}</Text>
            {itemInCart > 0 && (
              <View style={styles.inCartBadge}>
                <Text style={styles.inCartText}>{itemInCart} in cart</Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.productImageContainer}>
          {item.imageUrl ? (
            <Image 
              source={{ uri: item.imageUrl }} 
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.noProductImage}>
              <MaterialIcons name="fastfood" size={30} color="#ccc" />
            </View>
          )}
          
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => openProductDetails(item)}
          >
            <MaterialIcons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };
  
  const renderEmptyProducts = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="search-off" size={80} color="#ddd" />
      <Text style={styles.emptyTitle}>No items found</Text>
      <Text style={styles.emptyText}>
        Try adjusting your search or category filter
      </Text>
    </View>
  );

  const renderProductModal = () => (
    <Modal
      visible={showProductModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowProductModal(false)}
    >
      <BlurView 
        intensity={Platform.OS === 'ios' ? 90 : 100} 
        style={styles.modalBlur}
        tint="dark"
      >
        <View style={styles.modalContent}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setShowProductModal(false)}
          >
            <MaterialIcons name="close" size={24} color="#333" />
          </TouchableOpacity>
          
          {selectedProduct?.imageUrl ? (
            <Image 
              source={{ uri: selectedProduct.imageUrl }} 
              style={styles.modalImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.modalNoImage}>
              <MaterialIcons name="fastfood" size={60} color="#ccc" />
            </View>
          )}
          
          <View style={styles.modalInfo}>
            <Text style={styles.modalProductName}>{selectedProduct?.name}</Text>
            <Text style={styles.modalProductPrice}>₹{selectedProduct?.price.toFixed(2)}</Text>
            <Text style={styles.modalProductDescription}>{selectedProduct?.description}</Text>
            
            <View style={styles.quantityContainer}>
              <Text style={styles.sectionTitle}>Quantity</Text>
              <View style={styles.quantityControl}>
                <TouchableOpacity 
                  style={[styles.quantityButton, quantity <= 1 && styles.quantityButtonDisabled]}
                  onPress={decrementQuantity}
                  disabled={quantity <= 1}
                >
                  <MaterialIcons name="remove" size={22} color={quantity <= 1 ? "#ccc" : "#333"} />
                </TouchableOpacity>
                
                <Text style={styles.quantityText}>{quantity}</Text>
                
                <TouchableOpacity 
                  style={styles.quantityButton}
                  onPress={incrementQuantity}
                >
                  <MaterialIcons name="add" size={22} color="#333" />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.specialInstructionsContainer}>
              <Text style={styles.sectionTitle}>Special Instructions</Text>
              <TextInput
                style={styles.specialInstructionsInput}
                placeholder="Add special instructions (optional)"
                placeholderTextColor="#999"
                multiline
                value={specialInstructions}
                onChangeText={setSpecialInstructions}
              />
            </View>
            
            <TouchableOpacity 
              style={styles.addToCartButton}
              onPress={handleAddToCart}
            >
              <Text style={styles.addToCartButtonText}>
                Add to Cart - ₹{(selectedProduct?.price * quantity).toFixed(2)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff8c00" />
        <Text style={styles.loadingText}>Loading menu...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      <Animated.FlatList
        data={filteredProducts}
        renderItem={renderProductItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.productsList}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyProducts}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      />
      
      {getCartQuantity() > 0 && (
        <TouchableOpacity 
          style={styles.viewCartButton}
          onPress={() => navigation.navigate('Cart')}
        >
          <View style={styles.cartButtonContent}>
            <View style={styles.cartInfo}>
              <Badge style={styles.cartBadge}>{getCartQuantity()}</Badge>
              <Text style={styles.viewCartText}>View Cart</Text>
            </View>
            <MaterialIcons name="shopping-cart" size={24} color="#fff" />
          </View>
        </TouchableOpacity>
      )}
      
      {renderProductModal()}
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
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  headerContainer: {
    height: 250,
    position: 'relative',
    overflow: 'hidden',
  },
  headerContent: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ff8c00',
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    zIndex: 1,
  },
  shopImageContainer: {
    width: '100%',
    height: '100%',
  },
  shopImage: {
    width: '100%',
    height: '100%',
  },
  noImageContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ff8c00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shopInfoContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    zIndex: 2,
  },
  shopNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shopName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingText: {
    marginLeft: 4,
    color: '#fff',
    fontWeight: 'bold',
  },
  shopDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 8,
    marginBottom: 12,
  },
  shopMetaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    marginLeft: 4,
    color: '#fff',
    fontSize: 14,
    marginRight: 4,
  },
  hoursContainer: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  hourRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  dayText: {
    color: '#fff',
  },
  timeText: {
    color: '#fff',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    paddingTop: StatusBar.currentHeight,
    backgroundColor: '#ff8c00',
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  pillBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  closedBadge: {
    backgroundColor: '#F44336',
  },
  pillBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: StatusBar.currentHeight + 8,
    paddingBottom: 8,
    zIndex: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  navActions: {
    flexDirection: 'row',
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    marginLeft: 8,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  categoriesContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  categoriesScroll: {
    paddingHorizontal: 8,
    paddingVertical: 12,
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
  productsList: {
    paddingBottom: 80,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  productDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  productFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff8c00',
  },
  inCartBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  inCartText: {
    fontSize: 12,
    color: '#2196F3',
  },
  productImageContainer: {
    position: 'relative',
    width: 90,
    height: 90,
    borderRadius: 8,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  noProductImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#ff8c00',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
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
  viewCartButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#ff8c00',
    padding: 16,
    borderRadius: 8,
    elevation: 4,
  },
  cartButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cartInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartBadge: {
    backgroundColor: '#fff',
    color: '#ff8c00',
    fontWeight: 'bold',
  },
  viewCartText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  modalBlur: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.8,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 5,
  },
  modalImage: {
    width: '100%',
    height: 200,
  },
  modalNoImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalInfo: {
    padding: 16,
  },
  modalProductName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  modalProductPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff8c00',
    marginBottom: 12,
  },
  modalProductDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  quantityContainer: {
    marginBottom: 20,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonDisabled: {
    opacity: 0.5,
  },
  quantityText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 20,
  },
  specialInstructionsContainer: {
    marginBottom: 24,
  },
  specialInstructionsInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  addToCartButton: {
    backgroundColor: '#ff8c00',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  addToCartButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ShopDetailScreen; 