import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator, 
  RefreshControl, 
  SafeAreaView,
  StatusBar,
  Image,
  Animated,
  ScrollView
} from 'react-native';
import { Card, Chip, Badge, Divider, Button, Searchbar, Avatar } from 'react-native-paper';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, doc, updateDoc, orderBy, Timestamp } from 'firebase/firestore';
import { ref, onValue, update } from 'firebase/database';
import { db, rtdb } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import moment from 'moment';

const OrdersScreen = ({ navigation }) => {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsubscribe = setupRealtimeOrdersListener();
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
    
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
      
      const ordersQuery = query(
        collection(db, 'orders'),
        where('customerId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      
      const ordersSnapshot = await getDocs(ordersQuery);
      const ordersData = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      }));
      
      setOrders(ordersData);
      
      // Start fade-in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      }).start();
      
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrdersFromFirestore();
  };

  const cancelOrder = async (order) => {
    try {
      // Update Firestore
      const orderRef = doc(db, 'orders', order.id);
      await updateDoc(orderRef, {
        status: 'cancelled',
        cancelledAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      
      // Update Realtime Database if needed
      const customerOrderRef = ref(rtdb, `customerOrders/${currentUser.uid}/${order.id}`);
      const shopOrderRef = ref(rtdb, `shopOrders/${order.shopId}/${order.id}`);
      
      update(customerOrderRef, {
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      update(shopOrderRef, {
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      // Update local state
      setOrders(prevOrders => 
        prevOrders.map(o => 
          o.id === order.id 
            ? {...o, status: 'cancelled', cancelledAt: new Date(), updatedAt: new Date()} 
            : o
        )
      );
    } catch (error) {
      console.error('Error cancelling order:', error);
    }
  };

  const getFilteredOrders = () => {
    let filtered = orders;
    
    // Apply status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(order => order.status === selectedStatus);
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(order => 
        order.shopName.toLowerCase().includes(query) ||
        order.id.toLowerCase().includes(query) ||
        `#${order.id.substring(0, 8)}`.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#FFC107';
      case 'accepted':
        return '#2196F3';
      case 'preparing':
        return '#FF9800';
      case 'ready':
        return '#4CAF50';
      case 'completed':
        return '#4CAF50';
      case 'cancelled':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <MaterialIcons name="hourglass-top" size={18} color="#FFC107" />;
      case 'accepted':
        return <MaterialIcons name="check-circle" size={18} color="#2196F3" />;
      case 'preparing':
        return <MaterialIcons name="food-fork-drink" size={18} color="#FF9800" />;
      case 'ready':
        return <MaterialIcons name="delivery-dining" size={18} color="#4CAF50" />;
      case 'completed':
        return <MaterialIcons name="done-all" size={18} color="#4CAF50" />;
      case 'cancelled':
        return <MaterialIcons name="cancel" size={18} color="#F44336" />;
      default:
        return <MaterialIcons name="help" size={18} color="#9E9E9E" />;
    }
  };

  const formatStatus = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const renderOrderItem = ({ item }) => {
    const statusColor = getStatusColor(item.status);
    const statusIcon = getStatusIcon(item.status);
    const canCancel = ['pending', 'accepted'].includes(item.status);
    const orderDate = moment(item.createdAt).format('MMM DD, YYYY • h:mm A');
    const orderItems = Array.isArray(item.items) ? item.items : [];
    const itemsCount = orderItems.length;
    
    return (
      <Animated.View style={[styles.orderItemContainer, { opacity: fadeAnim }]}>
        <Card style={styles.orderCard}>
          <Card.Content>
            <View style={styles.orderHeader}>
              <View style={styles.shopInfo}>
                <Avatar.Icon 
                  size={40} 
                  icon="store" 
                  color="#fff"
                  style={{ backgroundColor: '#ff8c00' }} 
                />
                <View style={styles.shopDetails}>
                  <Text style={styles.shopName}>{item.shopName}</Text>
                  <Text style={styles.orderId}>#{item.id.substring(0, 8)}</Text>
                </View>
              </View>
              <View style={[styles.statusContainer, { borderColor: statusColor }]}>
                {statusIcon}
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {formatStatus(item.status)}
                </Text>
              </View>
            </View>
            
            <Divider style={styles.divider} />
            
            <View style={styles.orderDetails}>
              <View style={styles.detailRow}>
                <MaterialIcons name="access-time" size={16} color="#757575" />
                <Text style={styles.detailText}>{orderDate}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <MaterialIcons name="shopping-basket" size={16} color="#757575" />
                <Text style={styles.detailText}>{itemsCount} {itemsCount === 1 ? 'item' : 'items'}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <MaterialIcons name="payments" size={16} color="#757575" />
                <Text style={styles.detailText}>₹{item.totalAmount.toFixed(2)}</Text>
              </View>
            </View>
            
            <View style={styles.orderActions}>
              <Button 
                mode="outlined" 
                onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
                style={styles.viewButton}
                labelStyle={styles.viewButtonLabel}
                icon="eye"
              >
                View Details
              </Button>
              
              {canCancel && (
                <Button 
                  mode="outlined" 
                  onPress={() => cancelOrder(item)}
                  style={styles.cancelButton}
                  labelStyle={styles.cancelButtonLabel}
                  icon="close-circle"
                >
                  Cancel
                </Button>
              )}
            </View>
          </Card.Content>
        </Card>
      </Animated.View>
    );
  };

  const renderEmptyList = () => {
    if (loading) return null;
    
    return (
      <View style={styles.emptyContainer}>
        <Image
          source={require('../../assets/images/empty-orders.png')}
          style={styles.emptyImage}
          resizeMode="contain"
        />
        <Text style={styles.emptyTitle}>No Orders Found</Text>
        <Text style={styles.emptyText}>
          {searchQuery || selectedStatus !== 'all'
            ? "Try changing your filters"
            : "You haven't placed any orders yet"}
        </Text>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.headerTitle}>My Orders</Text>
      <Searchbar
        placeholder="Search by shop name or order ID"
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        inputStyle={styles.searchInput}
        iconColor="#666"
      />
      
      <View style={styles.filtersContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScrollContent}
        >
          <Chip
            selected={selectedStatus === 'all'}
            onPress={() => setSelectedStatus('all')}
            style={[styles.filterChip, selectedStatus === 'all' && styles.selectedFilterChip]}
            textStyle={[styles.filterChipText, selectedStatus === 'all' && styles.selectedFilterChipText]}
          >
            All
          </Chip>
          <Chip
            selected={selectedStatus === 'pending'}
            onPress={() => setSelectedStatus('pending')}
            style={[styles.filterChip, selectedStatus === 'pending' && styles.selectedFilterChip]}
            textStyle={[styles.filterChipText, selectedStatus === 'pending' && styles.selectedFilterChipText]}
          >
            Pending
          </Chip>
          <Chip
            selected={selectedStatus === 'accepted'}
            onPress={() => setSelectedStatus('accepted')}
            style={[styles.filterChip, selectedStatus === 'accepted' && styles.selectedFilterChip]}
            textStyle={[styles.filterChipText, selectedStatus === 'accepted' && styles.selectedFilterChipText]}
          >
            Accepted
          </Chip>
          <Chip
            selected={selectedStatus === 'preparing'}
            onPress={() => setSelectedStatus('preparing')}
            style={[styles.filterChip, selectedStatus === 'preparing' && styles.selectedFilterChip]}
            textStyle={[styles.filterChipText, selectedStatus === 'preparing' && styles.selectedFilterChipText]}
          >
            Preparing
          </Chip>
          <Chip
            selected={selectedStatus === 'ready'}
            onPress={() => setSelectedStatus('ready')}
            style={[styles.filterChip, selectedStatus === 'ready' && styles.selectedFilterChip]}
            textStyle={[styles.filterChipText, selectedStatus === 'ready' && styles.selectedFilterChipText]}
          >
            Ready
          </Chip>
          <Chip
            selected={selectedStatus === 'completed'}
            onPress={() => setSelectedStatus('completed')}
            style={[styles.filterChip, selectedStatus === 'completed' && styles.selectedFilterChip]}
            textStyle={[styles.filterChipText, selectedStatus === 'completed' && styles.selectedFilterChipText]}
          >
            Completed
          </Chip>
          <Chip
            selected={selectedStatus === 'cancelled'}
            onPress={() => setSelectedStatus('cancelled')}
            style={[styles.filterChip, selectedStatus === 'cancelled' && styles.selectedFilterChip]}
            textStyle={[styles.filterChipText, selectedStatus === 'cancelled' && styles.selectedFilterChipText]}
          >
            Cancelled
          </Chip>
        </ScrollView>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Image
          source={require('../../assets/images/food-loading.png')}
          style={styles.loadingImage}
          resizeMode="contain"
        />
        <Text style={styles.loadingText}>Loading your orders...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {renderHeader()}
      
      <FlatList
        data={getFilteredOrders()}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#ff8c00']}
            tintColor="#ff8c00"
          />
        }
        ListEmptyComponent={renderEmptyList}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  headerContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  searchBar: {
    elevation: 0,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 16,
    height: 46,
  },
  searchInput: {
    fontSize: 14,
  },
  filtersContainer: {
    marginBottom: 8,
  },
  filtersScrollContent: {
    paddingRight: 16,
  },
  filterChip: {
    marginRight: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
  },
  selectedFilterChip: {
    backgroundColor: '#ff8c00',
  },
  filterChipText: {
    color: '#666',
    fontSize: 12,
  },
  selectedFilterChipText: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  orderItemContainer: {
    marginBottom: 16,
  },
  orderCard: {
    borderRadius: 12,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  shopInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  shopDetails: {
    marginLeft: 12,
    flex: 1,
  },
  shopName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  orderId: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  divider: {
    backgroundColor: '#f0f0f0',
    height: 1,
    marginBottom: 12,
  },
  orderDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#757575',
    marginLeft: 8,
  },
  orderActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  viewButton: {
    flex: 1,
    marginRight: 8,
    borderColor: '#ff8c00',
    borderRadius: 8,
  },
  viewButtonLabel: {
    color: '#ff8c00',
    fontSize: 12,
  },
  cancelButton: {
    flex: 1,
    marginLeft: 8,
    borderColor: '#F44336',
    borderRadius: 8,
  },
  cancelButtonLabel: {
    color: '#F44336',
    fontSize: 12,
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
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyImage: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default OrdersScreen; 