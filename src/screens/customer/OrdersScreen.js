import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { Card, Chip, Badge } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { ref, onValue, update } from 'firebase/database';
import { db, rtdb } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';

const OrdersScreen = ({ navigation }) => {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');

  useEffect(() => {
    const unsubscribe = setupRealtimeOrdersListener();
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const setupRealtimeOrdersListener = () => {
    try {
      setLoading(true);
      
      // Path to customer's orders in Realtime Database
      const customerOrdersRef = ref(rtdb, `customerOrders/${currentUser.uid}`);
      
      // Listen for changes
      const unsubscribe = onValue(customerOrdersRef, (snapshot) => {
        const data = snapshot.val();
        const ordersList = [];
        
        if (data) {
          // Convert object to array
          Object.keys(data).forEach(key => {
            const order = data[key];
            // Make sure createdAt is a Date object
            const createdAt = order.createdAt ? new Date(order.createdAt) : new Date();
            
            ordersList.push({
              id: key,
              ...order,
              createdAt
            });
          });
          
          // Sort orders by date (newest first)
          ordersList.sort((a, b) => b.createdAt - a.createdAt);
        }
        
        setOrders(ordersList);
        setLoading(false);
      });
      
      return unsubscribe;
    } catch (error) {
      console.error('Error setting up Realtime Database listener:', error);
      // Fallback to Firestore if Realtime Database fails
      fetchOrdersFromFirestore();
      return null;
    }
  };

  const fetchOrdersFromFirestore = async () => {
    try {
      setLoading(true);
      
      const orderRef = collection(db, 'orders');
      // Use a simpler query that doesn't require a composite index
      // Filter by customerId first
      const q = query(
        orderRef,
        where('customerId', '==', currentUser.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const ordersList = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt ? new Date(data.createdAt.seconds * 1000) : new Date();
        
        ordersList.push({
          id: doc.id,
          ...data,
          createdAt,
        });
      });
      
      // Sort the orders by createdAt client-side instead of in the query
      ordersList.sort((a, b) => b.createdAt - a.createdAt);
      
      setOrders(ordersList);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setLoading(false);
    }
  };

  const filterOrders = (filter) => {
    setSelectedFilter(filter);
  };

  const getFilteredOrders = () => {
    if (selectedFilter === 'all') {
      return orders;
    }
    
    return orders.filter(order => {
      if (selectedFilter === 'active') {
        return ['pending', 'confirmed', 'preparing', 'ready'].includes(order.status);
      }
      if (selectedFilter === 'completed') {
        return order.status === 'completed';
      }
      if (selectedFilter === 'cancelled') {
        return order.status === 'cancelled';
      }
      return true;
    });
  };

  const cancelOrder = async (orderId) => {
    try {
      // Check if order exists and is in pending status
      const orderIndex = orders.findIndex(order => order.id === orderId);
      if (orderIndex === -1) {
        Alert.alert('Error', 'Order not found');
        return;
      }
      
      const order = orders[orderIndex];
      if (order.status !== 'pending') {
        Alert.alert('Cannot Cancel', 'Only pending orders can be cancelled');
        return;
      }
      
      const timestamp = new Date();
      
      // Update order status in Firestore
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'cancelled',
        updatedAt: timestamp
      });
      
      // Update in Realtime Database as well
      try {
        // Update in customer's orders
        await update(ref(rtdb, `customerOrders/${currentUser.uid}/${orderId}`), {
          status: 'cancelled',
          updatedAt: timestamp.toISOString()
        });
        
        // Also update in shop's orders
        if (order.shopId) {
          await update(ref(rtdb, `shopOrders/${order.shopId}/${orderId}`), {
            status: 'cancelled',
            updatedAt: timestamp.toISOString()
          });
        }
      } catch (rtdbError) {
        console.error('Failed to update Realtime Database:', rtdbError);
        // Continue even if Realtime DB update fails
      }
      
      // Update local state (should happen automatically with the listener, but update anyway)
      const updatedOrders = [...orders];
      updatedOrders[orderIndex] = { ...order, status: 'cancelled' };
      setOrders(updatedOrders);
      
      Alert.alert('Success', 'Order cancelled successfully');
    } catch (error) {
      console.error('Error cancelling order:', error);
      Alert.alert('Error', 'Failed to cancel order. Please try again.');
    }
  };

  const handleCancelOrder = (orderId) => {
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
          onPress: () => cancelOrder(orderId),
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // For Realtime Database, just wait a bit as the listener should update automatically
    setTimeout(() => setRefreshing(false), 1000);
  };

  const formatDate = (date) => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  const renderOrderItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
    >
      <Card style={styles.orderCard}>
        <Card.Content>
          <View style={styles.orderHeader}>
            <View>
              <Text style={styles.orderNumber}>Order #{item.id.substring(0, 6)}</Text>
              <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
            </View>
            <Chip 
              mode="flat"
              style={[
                styles.statusChip, 
                getStatusChipStyle(item.status)
              ]}
            >
              {getStatusLabel(item.status)}
            </Chip>
          </View>
          
          <View style={styles.shopInfo}>
            <MaterialIcons name="store" size={16} color="#666" />
            <Text style={styles.shopName}>{item.shopName || 'Unknown Shop'}</Text>
          </View>
          
          <View style={styles.orderDetails}>
            <Text style={styles.itemsCount}>
              {item.items && item.items.reduce((acc, curr) => acc + (curr.quantity || 1), 0)} item(s)
            </Text>
            <Text style={styles.totalAmount}>₹{(item.totalAmount || 0).toFixed(2)}</Text>
          </View>
          
          {item.status === 'pending' && (
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => handleCancelOrder(item.id)}
            >
              <Text style={styles.cancelButtonText}>Cancel Order</Text>
            </TouchableOpacity>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="receipt-long" size={80} color="#ddd" />
      <Text style={styles.emptyText}>No orders yet</Text>
      <Text style={styles.emptySubText}>Your order history will appear here</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterChip,
            selectedFilter === 'all' && styles.activeFilter
          ]}
          onPress={() => filterOrders('all')}
        >
          <Text style={[
            styles.filterText,
            selectedFilter === 'all' && styles.activeFilterText
          ]}>All</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.filterChip,
            selectedFilter === 'active' && styles.activeFilter
          ]}
          onPress={() => filterOrders('active')}
        >
          <Text style={[
            styles.filterText,
            selectedFilter === 'active' && styles.activeFilterText
          ]}>Active</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.filterChip,
            selectedFilter === 'completed' && styles.activeFilter
          ]}
          onPress={() => filterOrders('completed')}
        >
          <Text style={[
            styles.filterText,
            selectedFilter === 'completed' && styles.activeFilterText
          ]}>Completed</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#ff8c00" style={styles.loader} />
      ) : getFilteredOrders().length > 0 ? (
        <FlatList
          data={getFilteredOrders()}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.ordersList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          }
        />
      ) : (
        renderEmptyList()
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
  },
  activeFilter: {
    backgroundColor: '#ff8c00',
  },
  filterText: {
    color: '#666',
  },
  activeFilterText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  ordersList: {
    padding: 16,
  },
  orderCard: {
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: '#666',
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
  shopInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  shopName: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemsCount: {
    fontSize: 14,
    color: '#666',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff8c00',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#888',
    marginTop: 10,
  },
  emptySubText: {
    fontSize: 14,
    color: '#888',
    marginTop: 10,
  },
  cancelButton: {
    backgroundColor: '#ff8c00',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default OrdersScreen; 