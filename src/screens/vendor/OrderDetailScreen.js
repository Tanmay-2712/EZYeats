import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Card, Chip, Divider, Button } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, update, get } from 'firebase/database';
import { db, rtdb } from '../../firebase/config';

const OrderDetailScreen = ({ route, navigation }) => {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      // First try to get the order from Firestore to determine the shop ID
      let orderDoc = await getDoc(doc(db, 'orders', orderId));
      if (!orderDoc.exists()) {
        console.error('Order not found in Firestore');
        setLoading(false);
        return;
      }
      
      const orderData = orderDoc.data();
      const shopId = orderData.shopId;
      
      let rtdbSuccess = false;
      
      // Once we have the shopId, try to get real-time data
      try {
        const shopOrdersRef = ref(rtdb, `shopOrders/${shopId}/${orderId}`);
        const snapshot = await get(shopOrdersRef);
        
        if (snapshot.exists()) {
          const data = snapshot.val();
          // Convert ISO string to Date object
          const createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
          
          setOrder({
            id: orderId,
            ...data,
            createdAt,
          });
          rtdbSuccess = true;
          setLoading(false);
          return; // Exit early if we got data from RTDB
        }
      } catch (rtdbError) {
        console.log('Failed to fetch from RTDB, using Firestore data:', rtdbError);
      }
      
      // If Realtime DB failed or has no data, use the Firestore data we already fetched
      if (!rtdbSuccess) {
        const data = orderDoc.data();
        const createdAt = data.createdAt ? new Date(data.createdAt.seconds * 1000) : new Date();
        
        setOrder({
          id: orderId,
          ...data,
          createdAt,
        });
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching order details:', error);
      setLoading(false);
    }
  };

  const updateOrderStatus = async (newStatus) => {
    try {
      if (!order) return;

      const currentStatus = normalizeStatus(order.status);
      console.log(`Attempting to update order status from ${currentStatus} to ${newStatus}`);

      // Validate status transitions
      const validTransitions = {
        'new': ['accepted', 'cancelled'],
        'pending': ['accepted', 'cancelled'], // For backward compatibility
        'accepted': ['preparing', 'cancelled'],
        'preparing': ['ready', 'cancelled'],
        'ready': ['completed', 'cancelled'],
        'completed': [],
        'cancelled': []
      };

      if (!validTransitions[currentStatus].includes(newStatus)) {
        console.log(`Invalid transition from ${currentStatus} to ${newStatus}`);
        Alert.alert('Invalid Status Change', `Cannot change order status from ${currentStatus} to ${newStatus}`);
        return;
      } else {
        console.log(`Valid transition from ${currentStatus} to ${newStatus}`);
      }

      setLoading(true);
      
      // Get current timestamp to use for both Firestore and RTDB
      const now = new Date().toISOString();
      
      // Create status timestamp field name (e.g., acceptedAt, preparingAt)
      const timestampField = `${newStatus}At`;
      
      let updateSuccess = false;
      
      // Update the order status in Firestore first
      try {
        // Get a reference to the order document in Firestore
        const orderRef = doc(db, 'orders', orderId);
        
        console.log('Updating order in Firestore...');
        await updateDoc(orderRef, {
          status: newStatus,
          updatedAt: serverTimestamp(),
          [timestampField]: serverTimestamp()
        });
        console.log('Firestore update successful');
        updateSuccess = true;
        
        // Now try to update in Realtime Database (but don't fail if this part fails)
        if (order.shopId) {
          try {
            // Update in shopOrders/{shopId}/{orderId}
            console.log(`Updating shopOrders/${order.shopId}/${orderId}`);
            const shopOrderRef = ref(rtdb, `shopOrders/${order.shopId}/${orderId}`);
            await update(shopOrderRef, {
              status: newStatus,
              updatedAt: now,
              [timestampField]: now
            });
            console.log('Shop order updated in RTDB');
            
            // Update in customerOrders/{customerId}/{orderId}
            if (order.customerId) {
              console.log(`Updating customerOrders/${order.customerId}/${orderId}`);
              const customerOrderRef = ref(rtdb, `customerOrders/${order.customerId}/${orderId}`);
              await update(customerOrderRef, {
                status: newStatus,
                updatedAt: now,
                [timestampField]: now
              });
              console.log('Customer order updated in RTDB');
            }
          } catch (rtdbError) {
            // Log but don't fail on RTDB error
            console.warn('RTDB update failed, but Firestore was updated:', rtdbError);
            // Continue with success since Firestore was updated
          }
        }
        
        // Try to refetch order details to update the UI
        try {
          await fetchOrderDetails();
        } catch (fetchError) {
          console.warn('Error fetching updated order details:', fetchError);
          
          // If fetch fails, update the local state directly as a fallback
          if (order) {
            setOrder({
              ...order,
              status: newStatus,
              updatedAt: now,
              [timestampField]: now
            });
          }
        }
        
        // Show success message
        Alert.alert('Status Updated', `Order status updated to ${getStatusLabel(newStatus)}`);
      } catch (firestoreError) {
        console.error('Error updating in Firestore:', firestoreError);
        if (!updateSuccess) {
          Alert.alert('Error', 'Failed to update order status in Firestore. Please try again.');
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error in update process:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to update order status. Please try again.');
    }
  };

  const handleAcceptOrder = async () => {
    try {
      if (!order) return;
      const status = normalizeStatus(order.status);
      if (status !== 'new' && status !== 'pending') return;
      
      console.log("Accepting order with status:", status);
      await updateOrderStatus('accepted');
    } catch (error) {
      console.error('Error accepting order:', error);
    }
  };

  const handleRejectOrder = async () => {
    if (!order) return;
    const status = normalizeStatus(order.status);
    if (!['new', 'pending', 'accepted', 'preparing', 'ready'].includes(status)) return;
    
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes, Cancel Order',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateOrderStatus('cancelled');
              navigation.goBack();
            } catch (error) {
              console.error('Error cancelling order:', error);
            }
          },
        },
      ]
    );
  };

  const handleStartPreparing = async () => {
    if (!order) return;
    const status = normalizeStatus(order.status);
    if (status !== 'accepted') return;
    
    try {
      await updateOrderStatus('preparing');
    } catch (error) {
      console.error('Error updating order to preparing:', error);
    }
  };

  const handleOrderReady = async () => {
    if (!order) return;
    const status = normalizeStatus(order.status);
    if (status !== 'preparing') return;
    
    try {
      await updateOrderStatus('ready');
    } catch (error) {
      console.error('Error updating order to ready:', error);
    }
  };

  const handleCompleteOrder = async () => {
    if (!order) return;
    const status = normalizeStatus(order.status);
    if (status !== 'ready') return;
    
    try {
      await updateOrderStatus('completed');
    } catch (error) {
      console.error('Error completing order:', error);
    }
  };

  const getStatusChipStyle = (status) => {
    switch(status) {
      case 'pending': // For backward compatibility
      case 'new':
        return { backgroundColor: '#FFF9C4', color: '#F57F17' }; // Yellow
      case 'accepted':
        return { backgroundColor: '#BBDEFB', color: '#0D47A1' }; // Blue
      case 'preparing':
        return { backgroundColor: '#C8E6C9', color: '#1B5E20' }; // Green
      case 'ready':
        return { backgroundColor: '#B3E5FC', color: '#01579B' }; // Light Blue
      case 'completed':
        return { backgroundColor: '#C5CAE9', color: '#1A237E' }; // Indigo
      case 'cancelled':
        return { backgroundColor: '#FFCDD2', color: '#B71C1C' }; // Red
      default:
        return { backgroundColor: '#E0E0E0', color: '#424242' }; // Grey
    }
  };

  const getStatusLabel = (status) => {
    switch(status) {
      case 'pending': // For backward compatibility
      case 'new':
        return 'New Order';
      case 'accepted':
        return 'Accepted';
      case 'preparing':
        return 'Preparing';
      case 'ready':
        return 'Ready for Pickup';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const getStatusDescription = (status) => {
    switch (status) {
      case 'pending': // For backward compatibility
      case 'new':
        return 'This order is waiting for your confirmation.';
      case 'accepted':
        return 'This order has been accepted and is waiting to be prepared.';
      case 'preparing':
        return 'This order is being prepared.';
      case 'ready':
        return 'This order is ready for pickup by the customer.';
      case 'completed':
        return 'This order has been completed.';
      case 'cancelled':
        return 'This order has been cancelled.';
      default:
        return '';
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const normalizeStatus = (status) => {
    if (!status) return '';
    // Convert to lowercase for case-insensitive comparison
    const lowerStatus = status.toLowerCase();
    if (lowerStatus === 'pending') return 'pending';
    if (lowerStatus === 'new') return 'new';
    return status;
  };

  const getActionButtons = () => {
    if (!order) return null;
    
    // Normalize status for consistent handling
    const status = normalizeStatus(order.status);
    console.log("Getting action buttons for normalized status:", status);
    
    switch (status) {
      case 'pending': // For backward compatibility
      case 'new':
        return (
          <View style={styles.actionButtonsContainer}>
            <Button
              mode="contained"
              onPress={handleAcceptOrder}
              style={styles.acceptButton}
              buttonColor="#4caf50"
              contentStyle={styles.buttonContent}
            >
              Accept Order
            </Button>
            <Button
              mode="outlined"
              onPress={handleRejectOrder}
              style={styles.rejectButton}
              textColor="#f44336"
              contentStyle={styles.buttonContent}
            >
              Cancel Order
            </Button>
          </View>
        );
      case 'accepted':
        return (
          <View style={styles.actionButtonsContainer}>
            <Button
              mode="contained"
              onPress={handleStartPreparing}
              style={styles.actionButton}
              buttonColor="#ff8c00"
              contentStyle={styles.buttonContent}
            >
              Start Preparing
            </Button>
            <Button
              mode="outlined"
              onPress={handleRejectOrder}
              style={styles.rejectButton}
              textColor="#f44336"
              contentStyle={styles.buttonContent}
            >
              Cancel Order
            </Button>
          </View>
        );
      case 'preparing':
        return (
          <View style={styles.actionButtonsContainer}>
            <Button
              mode="contained"
              onPress={handleOrderReady}
              style={styles.actionButton}
              buttonColor="#2196f3"
              contentStyle={styles.buttonContent}
            >
              Mark as Ready
            </Button>
            <Button
              mode="outlined"
              onPress={handleRejectOrder}
              style={styles.rejectButton}
              textColor="#f44336"
              contentStyle={styles.buttonContent}
            >
              Cancel Order
            </Button>
          </View>
        );
      case 'ready':
        return (
          <View style={styles.actionButtonsContainer}>
            <Button
              mode="contained"
              onPress={handleCompleteOrder}
              style={styles.actionButton}
              buttonColor="#673ab7"
              contentStyle={styles.buttonContent}
            >
              Complete Order
            </Button>
            <Button
              mode="outlined"
              onPress={handleRejectOrder}
              style={styles.rejectButton}
              textColor="#f44336"
              contentStyle={styles.buttonContent}
            >
              Cancel Order
            </Button>
          </View>
        );
      case 'completed':
        return (
          <View style={styles.completedMessageContainer}>
            <MaterialIcons name="check-circle" size={36} color="#4caf50" />
            <Text style={styles.completedMessage}>This order has been completed</Text>
          </View>
        );
      case 'cancelled':
        return (
          <View style={styles.completedMessageContainer}>
            <MaterialIcons name="cancel" size={36} color="#f44336" />
            <Text style={styles.completedMessage}>This order has been cancelled</Text>
          </View>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#ff8c00" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={80} color="#ddd" />
        <Text style={styles.errorText}>Order not found</Text>
      </View>
    );
  }

  const normalizedStatus = normalizeStatus(order?.status);
  console.log("Current order status:", order?.status);
  console.log("Normalized status:", normalizedStatus);
  console.log("Should show action buttons:", ['pending', 'new', 'accepted', 'preparing', 'ready'].includes(normalizedStatus));
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.orderNumber}>Order #{order.id.substring(0, 6)}</Text>
        <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
      </View>
      
      <Card style={styles.statusCard}>
        <Card.Content>
          <View style={styles.statusHeader}>
            <Text style={styles.statusTitle}>Order Status</Text>
            <Chip 
              mode="flat"
              style={[
                styles.statusChip, 
                { backgroundColor: getStatusChipStyle(normalizedStatus).backgroundColor }
              ]}
              textStyle={{ color: getStatusChipStyle(normalizedStatus).color }}
            >
              {getStatusLabel(normalizedStatus)}
            </Chip>
          </View>
          <Text style={styles.statusDescription}>
            {getStatusDescription(normalizedStatus)}
          </Text>
          
          {['pending', 'new', 'accepted', 'preparing', 'ready'].includes(normalizedStatus) && getActionButtons()}
        </Card.Content>
      </Card>
      
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <Text style={styles.customerId}>Customer ID: {order.customerId}</Text>
        </Card.Content>
      </Card>
      
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Order Details</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Pickup Time:</Text>
            <Text style={styles.detailValue}>{order.pickupTime}</Text>
          </View>
          
          {order.specialInstructions && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Special Instructions:</Text>
              <Text style={styles.detailValue}>{order.specialInstructions}</Text>
            </View>
          )}
        </Card.Content>
      </Card>
      
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          
          <View style={styles.itemsList}>
            {order.items && order.items.map((item, index) => (
              <View key={index} style={styles.orderItem}>
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemQuantity}>x{item.quantity}</Text>
                </View>
                <Text style={styles.itemPrice}>₹{((item.price || 0) * (item.quantity || 1)).toFixed(2)}</Text>
              </View>
            ))}
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.totalRow}>
            <Text style={styles.totalText}>Total</Text>
            <Text style={styles.totalAmount}>₹{(order.totalAmount || 0).toFixed(2)}</Text>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#888',
    marginTop: 10,
  },
  header: {
    backgroundColor: '#ff8c00',
    padding: 20,
    paddingTop: 40,
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    elevation: 2,
  },
  statusCard: {
    marginTop: -20,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusChip: {
    height: 28,
  },
  pendingChip: {
    backgroundColor: '#fff3e0',
  },
  confirmedChip: {
    backgroundColor: '#e1f5fe',
  },
  preparingChip: {
    backgroundColor: '#fff0f5',
  },
  readyChip: {
    backgroundColor: '#e8f5e9',
  },
  completedChip: {
    backgroundColor: '#f0f0f0',
  },
  cancelledChip: {
    backgroundColor: '#ffebee',
  },
  statusDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  customerId: {
    fontSize: 14,
    color: '#666',
  },
  detailRow: {
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
  },
  itemsList: {
    marginBottom: 12,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  acceptButton: {
    flex: 1,
    marginRight: 8,
  },
  rejectButton: {
    flex: 1,
    marginLeft: 8,
    borderColor: '#f44336',
  },
  actionButton: {
    flex: 1,
  },
  buttonContent: {
    height: 48,
  },
  completedMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginTop: 16,
  },
  completedMessage: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8,
    fontWeight: 'bold',
  }
});

export default OrderDetailScreen;