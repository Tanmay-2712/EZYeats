import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Alert, Image, StatusBar, Dimensions, Animated } from 'react-native';
import { Card, Button, Divider, Banner } from 'react-native-paper';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useCart } from '../../context/CartContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;

const CartScreen = ({ navigation }) => {
  const { cart, shopInfo, removeFromCart, clearCart, getTotalPrice, addToCart } = useCart();
  const [showBanner, setShowBanner] = useState(false);
  const [bannerMessage, setBannerMessage] = useState('');

  const showFeedback = (message) => {
    setBannerMessage(message);
    setShowBanner(true);
    setTimeout(() => setShowBanner(false), 3000);
  };

  const handleRemoveItem = (itemId, itemName) => {
    removeFromCart(itemId);
    showFeedback(`Removed ${itemName} from cart`);
  };

  const handleClearCart = () => {
    Alert.alert(
      'Clear Cart',
      'Are you sure you want to clear your cart?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          onPress: () => {
            clearCart();
            showFeedback('Cart cleared');
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to your cart before checkout.');
      return;
    }
    
    navigation.navigate('Checkout');
  };

  const handleIncreaseQuantity = (item) => {
    addToCart(item, shopInfo);
    showFeedback(`Added another ${item.name}`);
  };

  const renderCartItem = ({ item, index }) => {
    const itemTotal = item.price * item.quantity;
    
    return (
      <Animated.View
        style={[
          styles.cartItemContainer,
          { transform: [{ scale: 1 }] }
        ]}
      >
        <Card style={styles.cartItemCard}>
          <Card.Content style={styles.cartItemContent}>
            <View style={styles.cartItemInfo}>
              <View style={styles.cartItemHeader}>
                <Text style={styles.cartItemName} numberOfLines={1}>{item.name}</Text>
                <TouchableOpacity 
                  style={styles.removeButton}
                  onPress={() => handleRemoveItem(item.id, item.name)}
                >
                  <Ionicons name="trash-outline" size={20} color="#ff4d4d" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.cartItemPriceRow}>
                <Text style={styles.cartItemUnitPrice}>₹{item.price.toFixed(2)} x {item.quantity}</Text>
                <Text style={styles.cartItemTotalPrice}>₹{itemTotal.toFixed(2)}</Text>
              </View>
              
              <View style={styles.quantityContainer}>
                <TouchableOpacity 
                  style={styles.quantityButton}
                  onPress={() => handleRemoveItem(item.id, item.name)}
                >
                  <MaterialIcons name="remove" size={18} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.quantityText}>{item.quantity}</Text>
                <TouchableOpacity 
                  style={styles.quantityButton}
                  onPress={() => handleIncreaseQuantity(item)}
                >
                  <MaterialIcons name="add" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
            
            {item.imageUrl ? (
              <Image 
                source={{ uri: item.imageUrl }} 
                style={styles.cartItemImage} 
                resizeMode="cover"
              />
            ) : (
              <View style={styles.noImageContainer}>
                <MaterialIcons name="restaurant" size={30} color="#ddd" />
              </View>
            )}
          </Card.Content>
        </Card>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      
      <Banner
        visible={showBanner}
        actions={[
          {
            label: 'Dismiss',
            onPress: () => setShowBanner(false),
          },
        ]}
        icon={({ size }) => (
          <MaterialIcons name="info" size={size} color="#ff8c00" />
        )}
      >
        {bannerMessage}
      </Banner>
      
      {shopInfo && (
        <View style={styles.shopInfoContainer}>
          <View style={styles.shopNameContainer}>
            <Text style={styles.shopName}>{shopInfo.name}</Text>
            <TouchableOpacity 
              style={styles.shopButton}
              onPress={() => navigation.navigate('ShopDetail', { 
                shopId: shopInfo.id,
                shopName: shopInfo.name,
                shopData: shopInfo
              })}
            >
              <Text style={styles.shopButtonText}>View Shop</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.shopLocation}>
            <MaterialIcons name="location-on" size={16} color="#666" />
            {' '}{shopInfo.location}
          </Text>
        </View>
      )}

      {cart.length > 0 ? (
        <>
          <View style={styles.cartHeader}>
            <View style={styles.cartTitleContainer}>
              <MaterialIcons name="shopping-cart" size={22} color="#ff8c00" />
              <Text style={styles.cartTitle}>Your Order</Text>
            </View>
            <TouchableOpacity 
              onPress={handleClearCart}
              style={styles.clearButton}
            >
              <Text style={styles.clearText}>Clear All</Text>
            </TouchableOpacity>
          </View>
        
          <FlatList
            data={cart}
            renderItem={renderCartItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.cartList}
            showsVerticalScrollIndicator={false}
          />
          
          <View style={styles.checkoutContainer}>
            <Divider style={styles.divider}/>
            <View style={styles.priceBreakdown}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Subtotal</Text>
                <Text style={styles.priceValue}>₹{getTotalPrice().toFixed(2)}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Delivery Fee</Text>
                <Text style={styles.freeText}>FREE</Text>
              </View>
            </View>
            
            <View style={styles.totalContainer}>
              <Text style={styles.totalText}>Total</Text>
              <Text style={styles.totalAmount}>₹{getTotalPrice().toFixed(2)}</Text>
            </View>
            
            <Button
              mode="contained"
              onPress={handleCheckout}
              style={styles.checkoutButton}
              contentStyle={styles.checkoutButtonContent}
              buttonColor="#ff8c00"
              icon="credit-card-outline"
            >
              Proceed to Checkout
            </Button>
          </View>
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="shopping-cart" size={90} color="#ddd" />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyText}>Add items from a shop to start an order</Text>
          <Button
            mode="contained"
            onPress={() => navigation.goBack()}
            style={styles.continueButton}
            contentStyle={styles.continueButtonContent}
            buttonColor="#ff8c00"
            icon="store"
          >
            Browse Shops
          </Button>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  shopInfoContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 2,
  },
  shopNameContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  shopName: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  shopButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  shopButtonText: {
    color: '#ff8c00',
    fontWeight: '500',
    fontSize: 13,
  },
  shopLocation: {
    fontSize: 15,
    color: '#666',
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    elevation: 1,
  },
  cartTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  clearButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ff4d4d',
  },
  clearText: {
    color: '#ff4d4d',
    fontWeight: '500',
    fontSize: 13,
  },
  cartList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  cartItemContainer: {
    marginBottom: 12,
  },
  cartItemCard: {
    borderRadius: 10,
    elevation: 3,
    overflow: 'hidden',
  },
  cartItemContent: {
    flexDirection: 'row',
    padding: 16,
  },
  cartItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  cartItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cartItemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  removeButton: {
    padding: 4,
  },
  cartItemPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cartItemUnitPrice: {
    fontSize: 15,
    color: '#666',
  },
  cartItemTotalPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff8c00',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#ff8c00',
    borderRadius: 20,
    overflow: 'hidden',
  },
  quantityButton: {
    padding: 8,
    backgroundColor: '#ff8c00',
  },
  quantityText: {
    paddingHorizontal: 14,
    fontWeight: 'bold',
    fontSize: 16,
    color: '#fff',
  },
  cartItemImage: {
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
  },
  checkoutContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    elevation: 10,
  },
  divider: {
    height: 1.5,
    backgroundColor: '#f0f0f0',
    marginBottom: 16,
  },
  priceBreakdown: {
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 15,
    color: '#666',
  },
  priceValue: {
    fontSize: 15,
    color: '#333',
  },
  freeText: {
    fontSize: 15,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ff8c00',
  },
  checkoutButton: {
    borderRadius: 10,
    paddingVertical: 4,
    elevation: 4,
  },
  checkoutButtonContent: {
    height: 52,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  continueButton: {
    borderRadius: 10,
    paddingVertical: 4,
    elevation: 4,
  },
  continueButtonContent: {
    height: 48,
  }
});

export default CartScreen; 