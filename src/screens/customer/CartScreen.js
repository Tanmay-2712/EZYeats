import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { Button, Card, Divider, IconButton, Badge } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { addDoc, collection, doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase/config';
import uuid from 'react-native-uuid';
import { Image as RNImage } from 'react-native';

const CartItem = ({ item, onIncrease, onDecrease, onRemove }) => {
  return (
    <Card style={styles.cartItemCard}>
      <View style={styles.cartItemContent}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.cartItemImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <MaterialIcons name="restaurant" size={24} color="#bbb" />
          </View>
        )}

        <View style={styles.itemDetails}>
          <View style={styles.itemNameRow}>
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            <IconButton
              icon="close"
              size={18}
              iconColor="#888"
              style={styles.removeButton}
              onPress={() => onRemove && onRemove(item.id)}
            />
          </View>
          
          <Text style={styles.itemPrice}>₹{((item.price || 0) * (item.quantity || 1)).toFixed(2)}</Text>
          
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => onDecrease && onDecrease(item.id)}
            >
              <MaterialIcons name="remove" size={16} color="#fff" />
            </TouchableOpacity>
            
            <Text style={styles.quantityText}>{item.quantity || 1}</Text>
            
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => onIncrease && onIncrease(item.id)}
            >
              <MaterialIcons name="add" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Card>
  );
};

const CartScreen = () => {
  const { 
    cart, 
    shopData, 
    totalAmount, 
    incrementItem, 
    decrementItem, 
    removeItem, 
    clearCart 
  } = useCart();
  
  const { user } = useAuth();
  const navigation = useNavigation();
  const [orderProcessing, setOrderProcessing] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Calculate the total amount safely in case it's undefined
  const safeTotalAmount = totalAmount || 0;

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            setUserInfo(userDoc.data());
          }
        } catch (error) {
          console.error('Error fetching user info:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, [user]);

  const handleCheckout = async () => {
    // We don't need to check if the user is logged in because
    // authentication is already handled at the AppNavigator level

    // Navigate directly to the checkout screen
    navigation.navigate('Checkout', { 
      shopId: shopData?.id || '', 
      shopName: shopData?.name || 'Unknown Shop'
    });
  };

  // Place order functionality moved to CheckoutScreen
  const placeOrder = async () => {
    if (!shopData?.isOpen) {
      Alert.alert('Shop Closed', 'This shop is currently closed. Please try again later.');
      return;
    }

    try {
      setOrderProcessing(true);
      
      // Create order
      const orderId = uuid.v4();
      const batch = writeBatch(db);
      
      const orderRef = doc(collection(db, "orders"), orderId);
      const orderItems = cart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price || 0,
        quantity: item.quantity || 1,
        amount: (item.price || 0) * (item.quantity || 1)
      }));
      
      const orderData = {
        id: orderId,
        userId: user.uid,
        userEmail: user.email,
        userName: userInfo?.fullName || user.email.split('@')[0],
        userPhone: userInfo?.phoneNumber || '',
        shopId: shopData?.id || '',
        shopName: shopData?.name || 'Unknown Shop',
        items: orderItems,
        totalAmount: safeTotalAmount,
        status: 'pending',
        createdAt: serverTimestamp(),
        orderAcceptedAt: null,
        preparingAt: null,
        readyAt: null,
        completedAt: null,
        cancelledAt: null,
        notes: '',
        rating: null
      };
      
      batch.set(orderRef, orderData);
      
      await batch.commit();
      
      // Show success animation
      setOrderSuccess(true);
      setTimeout(() => {
        clearCart();
        navigation.navigate('OrdersTab', { screen: 'OrdersList' });
      }, 2000);
      
    } catch (error) {
      console.error('Error creating order:', error);
      let errorMessage = 'Failed to place your order. Please try again.';
      
      if (error.message) {
        errorMessage += ` Error: ${error.message}`;
      }
      
      Alert.alert('Order Error', errorMessage);
    } finally {
      setOrderProcessing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff8c00" />
      </View>
    );
  }

  if (orderSuccess) {
    return (
      <View style={styles.successContainer}>
        <RNImage
          source={require('../../assets/images/order-success.png')}
          style={styles.successImage}
          resizeMode="contain"
        />
        <Text style={styles.successText}>Order Placed Successfully!</Text>
      </View>
    );
  }

  if (cart.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.emptyCartContainer}>
          <RNImage
            source={require('../../assets/images/empty-cart.png')}
            style={styles.emptyCartImage}
            resizeMode="contain"
          />
          <Text style={styles.emptyCartTitle}>Your cart is empty</Text>
          <Text style={styles.emptyCartSubtitle}>Add some items to get started!</Text>
          <Button
            mode="contained"
            style={styles.browseButton}
            buttonColor="#ff8c00"
            onPress={() => navigation.navigate('ShopsTab', { screen: 'Shops' })}
          >
            Browse Shops
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {shopData ? (
          <View style={styles.shopInfoContainer}>
            <View style={styles.shopDetails}>
              <MaterialIcons name="store" size={22} color="#ff8c00" />
              <View style={styles.shopNameContainer}>
                <Text style={styles.shopName}>{shopData.name || 'Shop'}</Text>
                <Text style={styles.shopLocation}>{shopData.location || 'Location not available'}</Text>
              </View>
            </View>
            <Badge style={[styles.statusBadge, shopData.isOpen ? styles.openBadge : styles.closedBadge]}>
              {shopData.isOpen ? 'Open' : 'Closed'}
            </Badge>
          </View>
        ) : (
          <View style={styles.shopInfoContainer}>
            <View style={styles.shopDetails}>
              <MaterialIcons name="store" size={22} color="#ff8c00" />
              <View style={styles.shopNameContainer}>
                <Text style={styles.shopName}>Shop</Text>
                <Text style={styles.shopLocation}>Shop details unavailable</Text>
              </View>
            </View>
          </View>
        )}
        
        <Divider style={styles.divider} />
        
        <View style={styles.listHeader}>
          <Text style={styles.listHeaderText}>Your Items</Text>
          <TouchableOpacity onPress={clearCart} style={styles.clearCartButton}>
            <Text style={styles.clearCartText}>Clear Cart</Text>
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={cart}
          renderItem={({ item }) => (
            <CartItem
              item={item}
              onIncrease={incrementItem}
              onDecrease={decrementItem}
              onRemove={removeItem}
            />
          )}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          style={styles.cartList}
        />
        
        <View style={styles.orderSummaryContainer}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>₹{safeTotalAmount.toFixed(2)}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryValue}>₹0.00</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Platform Fee</Text>
            <Text style={styles.summaryValue}>₹0.00</Text>
          </View>
          
          <Divider style={styles.summaryDivider} />
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₹{safeTotalAmount.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>
      
      <View style={styles.checkoutContainer}>
        <View style={styles.checkoutHeader}>
          <Text style={styles.checkoutTotal}>Total Amount:</Text>
          <Text style={styles.checkoutAmount}>₹{safeTotalAmount.toFixed(2)}</Text>
        </View>
        <Button
          mode="contained"
          style={styles.checkoutButton}
          buttonColor="#ff8c00"
          labelStyle={styles.checkoutButtonLabel}
          onPress={handleCheckout}
          loading={orderProcessing}
          disabled={orderProcessing || !shopData || (shopData && !shopData.isOpen)}
        >
          {!shopData ? 'PROCEED TO CHECKOUT' : 
           (shopData && !shopData.isOpen) ? 'SHOP CLOSED' : 'PROCEED TO CHECKOUT'}
        </Button>
        {shopData && !shopData.isOpen && (
          <Text style={styles.shopClosedWarning}>This shop is currently closed</Text>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  emptyCartContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyCartImage: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  emptyCartTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 20,
    color: '#333',
  },
  emptyCartSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    marginBottom: 30,
  },
  browseButton: {
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  shopInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  shopDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shopNameContainer: {
    marginLeft: 12,
  },
  shopName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  shopLocation: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
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
  divider: {
    backgroundColor: '#f0f0f0',
    height: 1.5,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  listHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  clearCartButton: {
    padding: 8,
  },
  clearCartText: {
    color: '#ff8c00',
    fontWeight: '500',
  },
  cartList: {
    paddingHorizontal: 16,
  },
  cartItemCard: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
  },
  cartItemContent: {
    flexDirection: 'row',
    padding: 12,
  },
  cartItemImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
  },
  placeholderImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
  },
  itemNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginRight: -8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  removeButton: {
    margin: 0,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff8c00',
    marginVertical: 4,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  quantityButton: {
    backgroundColor: '#ff8c00',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    marginHorizontal: 16,
    fontSize: 16,
    fontWeight: 'bold',
  },
  orderSummaryContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 15,
    color: '#666',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  summaryDivider: {
    marginVertical: 12,
    backgroundColor: '#ddd',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ff8c00',
  },
  checkoutContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  checkoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkoutTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  checkoutAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff8c00',
  },
  checkoutButton: {
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  checkoutButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  shopClosedWarning: {
    color: '#f44336',
    textAlign: 'center',
    marginTop: 8,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  successImage: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  successText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4caf50',
    marginTop: 20,
  },
});

export default CartScreen; 