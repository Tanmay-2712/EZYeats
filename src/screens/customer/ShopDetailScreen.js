import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator, 
  Alert,
  SafeAreaView,
  StatusBar,
  SectionList
} from 'react-native';
import { Card, Button, Badge, Chip, Divider, FAB } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useCart } from '../../context/CartContext';

const ShopDetailScreen = ({ route, navigation }) => {
  const { shopId, shopName, shopData } = route.params;
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState(['all']);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filteredMenu, setFilteredMenu] = useState([]);
  const [groupedMenu, setGroupedMenu] = useState([]);
  const { cart, addToCart, getItemCount } = useCart();
  const [ratings, setRatings] = useState([]);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [viewMode, setViewMode] = useState('grid');

  useEffect(() => {
    fetchMenuItems();
    fetchShopRatings();
  }, [shopId]);

  useEffect(() => {
    if (selectedCategory === 'all') {
      organizeMenuByCategory(menuItems);
    } else {
      const filtered = menuItems.filter(item => item.category === selectedCategory);
      setFilteredMenu(filtered);
      organizeMenuByCategory(filtered);
    }
  }, [selectedCategory, menuItems]);

  const organizeMenuByCategory = (items) => {
    const categorizedMenu = {};
    
    items.forEach(item => {
      const category = item.category || 'Other';
      if (!categorizedMenu[category]) {
        categorizedMenu[category] = [];
      }
      categorizedMenu[category].push(item);
    });
    
    const sections = Object.keys(categorizedMenu).map(category => ({
      title: category,
      data: categorizedMenu[category]
    }));
    
    setGroupedMenu(sections);
  };

  const fetchMenuItems = async () => {
    try {
      const menuQuery = query(
        collection(db, 'menuItems'),
        where('shopId', '==', shopId),
        where('available', '==', true)
      );
      
      const querySnapshot = await getDocs(menuQuery);
      
      const items = [];
      const categorySet = new Set(['all']);
      
      querySnapshot.forEach((doc) => {
        const item = { id: doc.id, ...doc.data() };
        items.push(item);
        
        if (item.category) {
          categorySet.add(item.category);
        }
      });
      
      setMenuItems(items);
      setFilteredMenu(items);
      setCategories(Array.from(categorySet));
      organizeMenuByCategory(items);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching menu items:', error);
      setLoading(false);
    }
  };

  const fetchShopRatings = async () => {
    try {
      const q = query(
        collection(db, 'shopRatings'),
        where('shopId', '==', shopId),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      
      const querySnapshot = await getDocs(q);
      const fetchedRatings = [];
      
      querySnapshot.forEach((doc) => {
        fetchedRatings.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt ? new Date(doc.data().createdAt.seconds * 1000) : new Date()
        });
      });
      
      setRatings(fetchedRatings);
    } catch (error) {
      console.error('Error fetching shop ratings:', error);
    }
  };

  const filterByCategory = (category) => {
    setSelectedCategory(category);
  };

  const handleAddToCart = (item) => {
    if (!shopData.isOpen) {
      Alert.alert('Shop Closed', 'This shop is currently closed. Please try again later.');
      return;
    }
    
    addToCart(item, shopData);
    Alert.alert('Success', `${item.name} added to cart!`);
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getAverageRating = () => {
    if (ratings.length === 0) return 0;
    
    const sum = ratings.reduce((total, rating) => total + rating.overall, 0);
    return (sum / ratings.length).toFixed(1);
  };

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    return (
      <View style={styles.starsContainer}>
        {[...Array(fullStars)].map((_, i) => (
          <MaterialIcons key={`full-${i}`} name="star" size={16} color="#FFD700" />
        ))}
        {halfStar && <MaterialIcons name="star-half" size={16} color="#FFD700" />}
        {[...Array(emptyStars)].map((_, i) => (
          <MaterialIcons key={`empty-${i}`} name="star-border" size={16} color="#FFD700" />
        ))}
      </View>
    );
  };

  const renderMenuItem = ({ item }) => (
    <Card style={styles.menuItemCard}>
      {item.imageUrl && (
        <Card.Cover 
          source={{ uri: item.imageUrl }} 
          style={styles.menuItemImage} 
        />
      )}
      <Card.Content style={styles.menuItemContent}>
        <View style={styles.menuItemDetails}>
          <Text style={styles.menuItemName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.menuItemDescription} numberOfLines={2}>
            {item.description || 'No description available'}
          </Text>
          <View style={styles.menuItemFooter}>
            <Text style={styles.menuItemPrice}>₹{item.price.toFixed(2)}</Text>
            <Button 
              mode="contained" 
              onPress={() => handleAddToCart(item)}
              style={styles.addButton}
              buttonColor="#ff8c00"
              compact
            >
              Add
            </Button>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  const renderMenuItemRow = ({ item }) => (
    <Card style={styles.menuItemRowCard}>
      <View style={styles.menuItemRowContent}>
        <View style={styles.menuItemRowDetails}>
          <Text style={styles.menuItemName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.menuItemDescription} numberOfLines={2}>
            {item.description || 'No description available'}
          </Text>
          <View style={styles.menuItemRowFooter}>
            <Text style={styles.menuItemPrice}>₹{item.price.toFixed(2)}</Text>
            <Button 
              mode="contained" 
              onPress={() => handleAddToCart(item)}
              style={styles.addButton}
              buttonColor="#ff8c00"
              compact
            >
              Add
            </Button>
          </View>
        </View>
        {item.imageUrl ? (
          <Image 
            source={{ uri: item.imageUrl }} 
            style={styles.menuItemRowImage} 
            resizeMode="cover"
          />
        ) : (
          <View style={styles.noImageContainer}>
            <MaterialIcons name="restaurant" size={30} color="#ddd" />
          </View>
        )}
      </View>
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
      <Text 
        style={[
          styles.categoryText,
          selectedCategory === item && styles.selectedCategoryText
        ]}
      >
        {item === 'all' ? 'All' : item}
      </Text>
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
    </View>
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <View style={styles.shopInfoContainer}>
        <View style={styles.shopInfoHeader}>
          <View style={styles.shopDetails}>
            <Text style={styles.shopName}>{shopName}</Text>
            <View style={styles.ratingContainer}>
              {ratings.length > 0 && (
                <>
                  <Text style={styles.ratingScore}>{getAverageRating()}</Text>
                  {renderStars(parseFloat(getAverageRating()))}
                  <Text style={styles.reviewCount}>({ratings.length})</Text>
                </>
              )}
            </View>
            <View style={styles.shopInfoRow}>
              <MaterialIcons name="access-time" size={16} color="#666" />
              <Text style={styles.shopHours}>
                {' '}{shopData.openingTime} - {shopData.closingTime}
              </Text>
              <Badge 
                style={[
                  styles.statusBadge, 
                  shopData.isOpen ? styles.openBadge : styles.closedBadge
                ]}
              >
                {shopData.isOpen ? 'Open' : 'Closed'}
              </Badge>
            </View>
            <View style={styles.shopInfoRow}>
              <MaterialIcons name="location-on" size={16} color="#666" />
              <Text style={styles.shopLocation}>
                {' '}{shopData.location}
              </Text>
            </View>
          </View>
        </View>
        
        {shopData.description && (
          <Text style={styles.shopDescription}>{shopData.description}</Text>
        )}
      </View>

      <Divider style={styles.divider} />

      <View style={styles.categoriesContainer}>
        <FlatList
          data={categories}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />
        
        <TouchableOpacity 
          style={styles.viewToggle}
          onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
        >
          <MaterialIcons 
            name={viewMode === 'grid' ? 'view-list' : 'grid-view'} 
            size={24} 
            color="#666" 
          />
        </TouchableOpacity>
      </View>

      {viewMode === 'grid' ? (
        <FlatList
          data={filteredMenu}
          renderItem={renderMenuItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.menuGrid}
          columnWrapperStyle={styles.menuRow}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <SectionList
          sections={groupedMenu}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => renderMenuItemRow({ item })}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.menuList}
          stickySectionHeadersEnabled={true}
          showsVerticalScrollIndicator={false}
        />
      )}

      {getItemCount() > 0 && (
        <FAB
          style={styles.cartFab}
          icon="cart"
          label={`${getItemCount()} items`}
          onPress={() => navigation.navigate('Cart')}
          color="#fff"
        />
      )}
    </SafeAreaView>
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
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  shopInfoContainer: {
    padding: 16,
    backgroundColor: '#fff',
    elevation: 2,
  },
  shopInfoHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  shopDetails: {
    flex: 1,
  },
  shopName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingScore: {
    fontWeight: 'bold',
    marginRight: 4,
    color: '#333',
  },
  starsContainer: {
    flexDirection: 'row',
  },
  reviewCount: {
    color: '#666',
    marginLeft: 4,
    fontSize: 12,
  },
  shopInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  shopHours: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  shopLocation: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  openBadge: {
    backgroundColor: '#e6f7e9',
    color: '#4caf50',
  },
  closedBadge: {
    backgroundColor: '#ffeaea',
    color: '#f44336',
  },
  shopDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginTop: 5,
  },
  divider: {
    height: 1.5,
    backgroundColor: '#f0f0f0',
  },
  categoriesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 12,
  },
  categoriesList: {
    paddingHorizontal: 16,
    flexGrow: 1,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 10,
  },
  selectedCategoryChip: {
    backgroundColor: '#ff8c00',
  },
  categoryText: {
    color: '#666',
    fontWeight: '500',
  },
  selectedCategoryText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  viewToggle: {
    padding: 10,
    marginRight: 10,
  },
  menuGrid: {
    padding: 8,
  },
  menuRow: {
    justifyContent: 'space-between',
  },
  menuList: {
    paddingBottom: 80,
  },
  menuItemCard: {
    width: '48%',
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
  },
  menuItemImage: {
    height: 120,
  },
  menuItemContent: {
    padding: 10,
  },
  menuItemDetails: {
    flex: 1,
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  menuItemDescription: {
    fontSize: 14,
    color: '#777',
    marginBottom: 8,
    lineHeight: 18,
  },
  menuItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  menuItemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff8c00',
  },
  addButton: {
    borderRadius: 4,
    elevation: 0,
  },
  menuItemRowCard: {
    marginBottom: 10,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
  },
  menuItemRowContent: {
    flexDirection: 'row',
    padding: 12,
  },
  menuItemRowDetails: {
    flex: 1,
    marginRight: 10,
  },
  menuItemRowFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  menuItemRowImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  noImageContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  sectionHeader: {
    backgroundColor: '#fff',
    padding: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  cartFab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#ff8c00',
  },
});

export default ShopDetailScreen; 