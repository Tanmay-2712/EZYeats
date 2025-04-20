import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Card, Chip, Divider, Button } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useNavigation } from '@react-navigation/native';

const OrderDetailScreen = ({ route }) => {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const orderDoc = await getDoc(doc(db, 'orders', orderId));
      
      if (orderDoc.exists()) {
        const data = orderDoc.data();
        // Convert Firestore timestamp to JS Date
        const createdAt = data.createdAt ? new Date(data.createdAt.seconds * 1000) : new Date();
        
        setOrder({
          id: orderDoc.id,
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

  const getStatusChipStyle = (status) => {
    switch (status) {
      case 'pending':
        return styles.pendingChip;
      case 'confirmed':
        return styles.confirmedChip;
      case 'preparing':
        return styles.preparingChip;
      case 'ready':
        return styles.readyChip;
      case 'completed':
        return styles.completedChip;
      case 'cancelled':
        return styles.cancelledChip;
      default:
        return {};
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'confirmed':
        return 'Confirmed';
      case 'preparing':
        return 'Preparing';
      case 'ready':
        return 'Ready for Pickup';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const getStatusDescription = (status) => {
    switch (status) {
      case 'pending':
        return 'Your order is waiting for the shop to confirm.';
      case 'confirmed':
        return 'Your order has been confirmed and will be prepared soon.';
      case 'preparing':
        return 'Your order is being prepared.';
      case 'ready':
        return 'Your order is ready for pickup!';
      case 'completed':
        return 'Your order has been completed. Thank you!';
      case 'cancelled':
        return 'Your order has been cancelled.';
      default:
        return '';
    }
  };

  const formatDate = (date) => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isOrderActive = () => {
    return ['pending', 'confirmed', 'preparing', 'ready'].includes(order?.status);
  };

  const canCancelOrder = () => {
    return ['pending', 'confirmed'].includes(order?.status);
  };

  const canRateOrder = () => {
    return order?.status === 'completed' && !order?.hasRating;
  };

  const handleCancelOrder = async () => {
    if (!canCancelOrder()) return;

    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'orders', orderId), {
                status: 'cancelled',
                updatedAt: new Date(),
              });
              
              // Refresh order data
              fetchOrderDetails();
            } catch (error) {
              console.error('Error cancelling order:', error);
              Alert.alert('Error', 'Failed to cancel order. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleCompleteOrder = async () => {
    if (order?.status !== 'ready') return;

    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'completed',
        updatedAt: new Date(),
      });
      
      // Refresh order data
      fetchOrderDetails();
    } catch (error) {
      console.error('Error completing order:', error);
      Alert.alert('Error', 'Failed to mark order as completed. Please try again.');
    }
  };

  const handleRateOrder = () => {
    if (!canRateOrder()) return;
    
    navigation.navigate('RateOrder', {
      orderId: orderId,
      shopId: order.shopId,
      shopName: order.shopName,
    });
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
                getStatusChipStyle(order.status)
              ]}
            >
              {getStatusLabel(order.status)}
            </Chip>
          </View>
          <Text style={styles.statusDescription}>
            {getStatusDescription(order.status)}
          </Text>
          
          {canCancelOrder() && (
            <Button
              mode="text"
              onPress={handleCancelOrder}
              style={styles.cancelButton}
              textColor="#f44336"
            >
              Cancel Order
            </Button>
          )}
          
          {order.status === 'ready' && (
            <Button
              mode="contained"
              onPress={handleCompleteOrder}
              style={styles.completeButton}
              buttonColor="#4caf50"
            >
              Mark as Picked Up
            </Button>
          )}
          
          {canRateOrder() && (
            <Button
              mode="contained"
              icon="star"
              onPress={handleRateOrder}
              style={styles.rateButton}
              contentStyle={styles.buttonContent}
            >
              Rate This Order
            </Button>
          )}
          
          {order.hasRating && (
            <View style={styles.ratingContainer}>
              <Text style={styles.ratedText}>You rated this order:</Text>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <MaterialIcons
                    key={star}
                    name={star <= (order.rating?.overall || 0) ? 'star' : 'star-border'}
                    size={24}
                    color={star <= (order.rating?.overall || 0) ? '#FFD700' : '#ddd'}
                    style={styles.starIcon}
                  />
                ))}
              </View>
              {order.rating?.review && (
                <Text style={styles.reviewText}>
                  "{order.rating.review}"
                </Text>
              )}
            </View>
          )}
        </Card.Content>
      </Card>
      
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Shop Information</Text>
          <View style={styles.shopInfo}>
            <MaterialIcons name="store" size={20} color="#666" />
            <Text style={styles.shopName}>{order.shopName}</Text>
          </View>
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
            {order.items.map((item, index) => (
              <View key={index} style={styles.orderItem}>
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemQuantity}>x{item.quantity}</Text>
                </View>
                <Text style={styles.itemPrice}>₹{(item.price * item.quantity).toFixed(2)}</Text>
              </View>
            ))}
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.totalRow}>
            <Text style={styles.totalText}>Total</Text>
            <Text style={styles.totalAmount}>₹{order.totalAmount.toFixed(2)}</Text>
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
    backgroundColor: '#ffefd5',
  },
  confirmedChip: {
    backgroundColor: '#e6f7ff',
  },
  preparingChip: {
    backgroundColor: '#fff0f5',
  },
  readyChip: {
    backgroundColor: '#e6f7e9',
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
  cancelButton: {
    marginTop: 8,
  },
  completeButton: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  shopInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shopName: {
    fontSize: 16,
    marginLeft: 8,
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
  rateButton: {
    marginTop: 16,
    backgroundColor: '#ff8c00',
  },
  ratingContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    alignItems: 'center',
  },
  ratedText: {
    fontWeight: '500',
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  starIcon: {
    marginHorizontal: 2,
  },
  reviewText: {
    fontStyle: 'italic',
    color: '#666',
    textAlign: 'center',
  },
  buttonContent: {
    padding: 12,
  },
});

export default OrderDetailScreen;