import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Animated,
  Image,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, TextInput, Divider, RadioButton, Chip } from 'react-native-paper';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { collection, addDoc, Timestamp, writeBatch, doc, updateDoc, getDoc, increment, setDoc } from 'firebase/firestore';
import { ref, set } from 'firebase/database';
import { db, rtdb } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useFocusEffect, CommonActions } from '@react-navigation/native';
import uuid from 'react-native-uuid';

const CheckoutScreen = ({ route, navigation }) => {
  const { currentUser } = useAuth();
  const { cart, clearCart, getCartTotal, totalAmount } = useCart();
  const { shopId, shopName } = route.params || {};
  
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [pickupOption, setPickupOption] = useState('asap');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [userData, setUserData] = useState(null);
  
  const animationScale = useRef(new Animated.Value(1)).current;
  const animationOpacity = useRef(new Animated.Value(1)).current;
  const successAnimation = useRef(null);

  // Add a check for route.params
  useEffect(() => {
    if (!route.params || !route.params.shopId) {
      Alert.alert(
        'Error',
        'Shop information is missing. Please try again.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  }, [route.params]);

  // Handle back button press
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        navigation.navigate('CartScreen');
        return true;
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [navigation])
  );

  // Check if cart is empty and show alert
  useEffect(() => {
    if (!cart || cart.length === 0) {
      Alert.alert(
        'Empty Cart',
        'Your cart is empty. Please add items to your cart before checkout.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      return;
    }
    
    // Get user data
    const fetchUserData = async () => {
      // No need to check if user is logged in since they must be logged in to access the Customer screens
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    
    if (currentUser) {
      fetchUserData();
    }
  }, [cart, currentUser, navigation]);
  
  const animateButton = () => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(animationScale, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(animationOpacity, {
          toValue: 0.9,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(animationScale, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(animationOpacity, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  const handlePlaceOrder = async () => {
    if (!cart || cart.length === 0) {
      Alert.alert('Error', 'Your cart is empty');
      return;
    }

    if (!shopId) {
      Alert.alert('Error', 'Shop information is missing. Please try again.');
      return;
    }

    try {
      setLoading(true);
      animateButton();

      // Create a unique order ID
      const orderId = uuid.v4();
      const timestamp = Timestamp.now();
      const total = getCartTotal ? getCartTotal() : totalAmount || 0;

      // Create order object matching EXACTLY what's allowed in the rules
      const order = {
        id: orderId,
        customerId: currentUser.uid,
        customerName: userData?.displayName || currentUser.email,
        customerPhone: userData?.phoneNumber || '',
        shopId,
        shopName,
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price || 0,
          quantity: item.quantity || 1,
          amount: (item.price || 0) * (item.quantity || 1)
        })),
        totalAmount: total,
        status: "pending", // Must be "pending" per rules for customer creation
        paymentMethod,
        pickupOption,
        specialInstructions: specialInstructions.trim(),
        pickupTime: pickupOption === 'schedule' ? pickupTime : '',
        createdAt: timestamp,
        updatedAt: timestamp,
        hasRating: false,
        rating: null,
        // Additional fields that might be expected
        orderAcceptedAt: null,
        preparingAt: null,
        readyAt: null,
        completedAt: null,
        cancelledAt: null
      };

      // First create just the order document without using a batch
      try {
        console.log("Creating order document...");
        const orderRef = doc(db, 'orders', orderId);
        await setDoc(orderRef, order);
        console.log("Order document created successfully!");

        // After successful order creation, try to update the shop
        // This is separated to avoid permission issues with the batch
        try {
          console.log("Trying to update shop order count...");
          // This might fail due to permissions, but we can proceed anyway
          const shopRef = doc(db, 'shops', shopId);
          await updateDoc(shopRef, {
            orderCount: increment(1),
            updatedAt: timestamp
          });
          console.log("Shop updated successfully!");
        } catch (shopUpdateError) {
          console.log("Failed to update shop, but order was created:", shopUpdateError);
          // Continue since the order was created successfully
        }

        // Now handle the Realtime Database part
        try {
          console.log("Saving to RTDB...");
          // Save to customer's orders with explicit paths and values
          const customerOrderData = {
            ...order,
            createdAt: timestamp.toDate().toISOString(),
            updatedAt: timestamp.toDate().toISOString(),
          };
          
          // First save to customer orders
          await set(ref(rtdb, `customerOrders/${currentUser.uid}/${orderId}`), customerOrderData);
          console.log("Customer order created in RTDB");
          
          // Then save to shop orders
          await set(ref(rtdb, `shopOrders/${shopId}/${orderId}`), customerOrderData);
          console.log("Shop order created in RTDB");
        } catch (rtdbError) {
          console.error('RTDB Error:', rtdbError);
          // Continue since the Firestore order was created successfully
        }
        
        // Clear cart after successful order
        clearCart();
        
        // Show success state
        setOrderPlaced(true);
        
        // Navigate to Orders tab after a delay
        setTimeout(() => {
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'OrdersTab' }],
            })
          );
        }, 2000);
        
      } catch (orderCreateError) {
        console.error('Error creating order document:', orderCreateError);
        throw orderCreateError;
      }
    } catch (error) {
      console.error('Error placing order:', error);
      
      let errorMessage = 'Failed to place order. ';
      
      if (error.code === 'permission-denied') {
        errorMessage += 'You do not have permission to place this order. Please try again later.';
      } else if (error.message) {
        errorMessage += error.message;
      }
      
      Alert.alert('Order Error', errorMessage);
      setLoading(false);
    }
  };

  const renderCartItems = () => {
    return cart.map((item, index) => (
      <View key={index} style={styles.cartItem}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
        </View>
        <View style={styles.itemPrice}>
          <Text style={styles.priceText}>₹{(item.price * item.quantity).toFixed(2)}</Text>
        </View>
      </View>
    ));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        {orderPlaced ? (
          <>
            <Image
              source={require('../../assets/images/order-success.png')}
              style={styles.successImage}
              resizeMode="contain"
            />
            <Text style={styles.successText}>Order Placed Successfully!</Text>
          </>
        ) : (
          <>
            <Image
              source={require('../../assets/images/food-loading.png')}
              style={styles.loadingImage}
              resizeMode="contain"
            />
            <Text style={styles.loadingText}>Placing your order...</Text>
          </>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={styles.placeholder} />
        </View>
        
        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
          <Card style={styles.shopCard}>
            <View style={styles.shopHeader}>
              <MaterialIcons name="store" size={24} color="#ff8c00" />
              <Text style={styles.shopName}>{shopName}</Text>
            </View>
          </Card>
          
          <Card style={styles.orderSummaryCard}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            <Divider style={styles.divider} />
            <View style={styles.cartItemsContainer}>
              {renderCartItems()}
            </View>
            <Divider style={styles.divider} />
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmount}>₹{(getCartTotal ? getCartTotal() : totalAmount || 0).toFixed(2)}</Text>
            </View>
          </Card>
          
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Pickup Options</Text>
            <Divider style={styles.divider} />
            <RadioButton.Group
              onValueChange={(value) => setPickupOption(value)}
              value={pickupOption}
            >
              <View style={styles.radioOption}>
                <RadioButton value="asap" color="#ff8c00" />
                <Text style={styles.radioLabel}>As Soon As Possible</Text>
              </View>
              
              <View style={styles.radioOption}>
                <RadioButton value="schedule" color="#ff8c00" />
                <Text style={styles.radioLabel}>Schedule for Later</Text>
              </View>
            </RadioButton.Group>
            
            {pickupOption === 'schedule' && (
              <TextInput
                label="Pickup Time"
                value={pickupTime}
                onChangeText={setPickupTime}
                style={styles.textInput}
                placeholder="e.g., Today at 6:00 PM"
                mode="outlined"
                outlineColor="#ddd"
                activeOutlineColor="#ff8c00"
              />
            )}
          </Card>
          
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Special Instructions</Text>
            <Divider style={styles.divider} />
            <TextInput
              label="Special Instructions"
              value={specialInstructions}
              onChangeText={setSpecialInstructions}
              style={styles.textArea}
              placeholder="Any special requests or notes for your order"
              multiline
              numberOfLines={4}
              mode="outlined"
              outlineColor="#ddd"
              activeOutlineColor="#ff8c00"
            />
          </Card>
          
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            <Divider style={styles.divider} />
            <RadioButton.Group
              onValueChange={(value) => setPaymentMethod(value)}
              value={paymentMethod}
            >
              <View style={styles.radioOption}>
                <RadioButton value="cod" color="#ff8c00" />
                <View style={styles.paymentMethod}>
                  <FontAwesome5 name="money-bill-wave" size={18} color="#4CAF50" />
                  <Text style={styles.radioLabel}>Cash on Delivery</Text>
                </View>
              </View>
              
              <View style={styles.radioOption}>
                <RadioButton value="online" color="#ff8c00" />
                <View style={styles.paymentMethod}>
                  <FontAwesome5 name="credit-card" size={18} color="#2196F3" />
                  <Text style={styles.radioLabel}>Online Payment (Coming Soon)</Text>
                  <Chip style={styles.comingSoonChip}>Soon</Chip>
                </View>
              </View>
            </RadioButton.Group>
          </Card>
        </ScrollView>
        
        <View style={styles.footer}>
          <Animated.View 
            style={[
              styles.footerContent,
              {
                transform: [{ scale: animationScale }],
                opacity: animationOpacity
              }
            ]}
          >
            <View style={styles.footerTotal}>
              <Text style={styles.footerTotalLabel}>Total:</Text>
              <Text style={styles.footerTotalAmount}>₹{(getCartTotal ? getCartTotal() : totalAmount || 0).toFixed(2)}</Text>
            </View>
            <Button
              mode="contained"
              onPress={handlePlaceOrder}
              style={styles.placeOrderButton}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
              buttonColor="#ff8c00"
            >
              Place Order
            </Button>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  shopCard: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  shopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shopName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
    color: '#333',
  },
  orderSummaryCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  sectionCard: {
    margin: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  divider: {
    backgroundColor: '#f0f0f0',
    height: 1,
    marginBottom: 16,
  },
  cartItemsContainer: {
    marginBottom: 16,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  itemQuantity: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  itemPrice: {
    minWidth: 80,
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff8c00',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  radioLabel: {
    fontSize: 14,
    marginLeft: 8,
    color: '#333',
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  comingSoonChip: {
    marginLeft: 8,
    height: 22,
    backgroundColor: '#e3f2fd',
  },
  textInput: {
    marginTop: 8,
    backgroundColor: '#fff',
    fontSize: 14,
  },
  textArea: {
    backgroundColor: '#fff',
    fontSize: 14,
  },
  footer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerTotal: {
    flexDirection: 'column',
  },
  footerTotalLabel: {
    fontSize: 12,
    color: '#666',
  },
  footerTotalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff8c00',
  },
  placeOrderButton: {
    borderRadius: 8,
    paddingVertical: 4,
    elevation: 2,
  },
  buttonContent: {
    height: 48,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingImage: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  successImage: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  successText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 16,
  },
});

export default CheckoutScreen;