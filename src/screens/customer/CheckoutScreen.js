import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Button, TextInput, RadioButton, Divider } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, set } from 'firebase/database';
import { db, rtdb } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

const CheckoutScreen = ({ navigation }) => {
  const { currentUser } = useAuth();
  const { cart, shopInfo, getTotalPrice, clearCart } = useCart();
  
  const [pickupOption, setPickupOption] = useState('asap');
  const [pickupTime, setPickupTime] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Your cart is empty. Add items to proceed.');
      return;
    }

    if (!shopInfo) {
      Alert.alert('Error', 'Shop information is missing. Please try again.');
      return;
    }

    // Validate pickup time if custom time selected
    if (pickupOption === 'custom' && !pickupTime) {
      Alert.alert('Pickup Time Required', 'Please enter your preferred pickup time.');
      return;
    }

    setLoading(true);

    try {
      // Prepare order data
      const orderItems = cart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      }));

      // Current timestamp for both databases
      const timestamp = new Date();
      
      const orderData = {
        customerId: currentUser.uid,
        customerEmail: currentUser.email, // Add customer email for easier identification
        shopId: shopInfo.id,
        shopName: shopInfo.name,
        items: orderItems,
        totalAmount: getTotalPrice(),
        status: 'pending', // Initial status (pending confirmation from vendor)
        pickupTime: pickupOption === 'asap' ? 'ASAP' : pickupTime,
        specialInstructions: specialInstructions,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Create a version of the data with regular timestamps for Realtime DB
      const rtdbOrderData = {
        ...orderData,
        createdAt: timestamp.toISOString(),
        updatedAt: timestamp.toISOString()
      };
      
      // Save order to Firestore
      const docRef = await addDoc(collection(db, 'orders'), orderData);
      
      // Also save to Realtime Database for live updates
      try {
        // Add to shop's orders in realtime database - ensure the shopId is properly set
        await set(ref(rtdb, `shopOrders/${shopInfo.id}/${docRef.id}`), {
          ...rtdbOrderData,
          id: docRef.id, // Add ID field directly to make filtering easier
        });
        
        // Also add to customer's orders
        await set(ref(rtdb, `customerOrders/${currentUser.uid}/${docRef.id}`), {
          ...rtdbOrderData,
          id: docRef.id, // Add ID field directly to make filtering easier
        });
        
        console.log('Order added to Realtime Database with proper shopId:', shopInfo.id);
      } catch (rtdbError) {
        console.error('Failed to add to Realtime Database:', rtdbError);
        // Continue even if Realtime DB fails, as Firestore is our primary database
      }

      // Clear the cart after successful order
      clearCart();

      // Show success message
      Alert.alert(
        'Order Placed Successfully!',
        `Your order #${docRef.id.substring(0, 6)} has been placed.`,
        [
          {
            text: 'View Orders',
            onPress: () => navigation.navigate('OrdersTab'),
          },
        ]
      );

      setLoading(false);
    } catch (error) {
      console.error('Error placing order:', error);
      Alert.alert('Error', 'Failed to place your order. Please try again.');
      setLoading(false);
    }
  };

  const simulatePayment = () => {
    // In a real app, this would integrate with a payment gateway
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true });
      }, 1500);
    });
  };

  // If no shop info is available, show a message
  if (!shopInfo) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="shopping-cart" size={80} color="#ddd" />
        <Text style={styles.emptyText}>Your cart is empty</Text>
        <Text style={styles.emptySubText}>Add items to your cart to proceed with checkout</Text>
        <Button
          mode="contained"
          onPress={() => navigation.goBack()}
          style={styles.browseButton}
          buttonColor="#ff8c00"
        >
          Browse Shops
        </Button>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        <View style={styles.shopInfo}>
          <Text style={styles.shopName}>{shopInfo.name}</Text>
          <Text style={styles.shopLocation}>
            <MaterialIcons name="location-on" size={14} color="#666" />
            {' '}{shopInfo.location}
          </Text>
        </View>

        <View style={styles.orderSummary}>
          {cart.map((item) => (
            <View key={item.id} style={styles.summaryItem}>
              <Text style={styles.itemName}>{item.quantity}x {item.name}</Text>
              <Text style={styles.itemPrice}>₹{(item.price * item.quantity).toFixed(2)}</Text>
            </View>
          ))}
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.totalRow}>
          <Text style={styles.totalText}>Total</Text>
          <Text style={styles.totalAmount}>₹{getTotalPrice().toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pickup Options</Text>
        
        <RadioButton.Group 
          onValueChange={value => setPickupOption(value)} 
          value={pickupOption}
        >
          <View style={styles.radioOption}>
            <RadioButton value="asap" color="#ff8c00" />
            <Text style={styles.radioText}>As Soon As Possible</Text>
          </View>
          
          <View style={styles.radioOption}>
            <RadioButton value="custom" color="#ff8c00" />
            <Text style={styles.radioText}>Select Pickup Time</Text>
          </View>
        </RadioButton.Group>
        
        {pickupOption === 'custom' && (
          <TextInput
            label="Enter pickup time (e.g. 2:30 PM)"
            value={pickupTime}
            onChangeText={setPickupTime}
            style={styles.input}
            mode="outlined"
            outlineColor="#ccc"
            activeOutlineColor="#ff8c00"
          />
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Special Instructions</Text>
        <TextInput
          label="Any special requests? (optional)"
          value={specialInstructions}
          onChangeText={setSpecialInstructions}
          style={styles.input}
          multiline
          numberOfLines={3}
          mode="outlined"
          outlineColor="#ccc"
          activeOutlineColor="#ff8c00"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Method</Text>
        <View style={styles.paymentMethod}>
          <MaterialIcons name="payment" size={24} color="#666" />
          <Text style={styles.paymentText}>Pay on Pickup</Text>
        </View>
        <Text style={styles.paymentInfo}>
          You'll pay when you pickup your order.
        </Text>
      </View>

      <Button
        mode="contained"
        onPress={handlePlaceOrder}
        style={styles.placeOrderButton}
        contentStyle={styles.buttonContent}
        buttonColor="#ff8c00"
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="white" /> : 'Place Order'}
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  shopInfo: {
    marginBottom: 16,
  },
  shopName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  shopLocation: {
    fontSize: 14,
    color: '#666',
  },
  orderSummary: {
    marginBottom: 8,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  itemName: {
    fontSize: 14,
    flex: 1,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  totalText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff8c00',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  radioText: {
    fontSize: 16,
    marginLeft: 8,
  },
  input: {
    backgroundColor: '#fff',
    marginTop: 8,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 4,
    marginVertical: 8,
  },
  paymentText: {
    fontSize: 16,
    marginLeft: 12,
  },
  paymentInfo: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
  },
  placeOrderButton: {
    margin: 16,
    borderRadius: 4,
  },
  buttonContent: {
    height: 50,
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  emptySubText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  browseButton: {
    marginTop: 24,
  },
});

export default CheckoutScreen;