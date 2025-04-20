import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, SafeAreaView, StatusBar, ScrollView } from 'react-native';
import { Card, Badge, Chip, Button, IconButton, Surface, Menu } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { collection, query, where, orderBy, getDocs, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { ref, onValue, get } from 'firebase/database';
import { db, rtdb } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';

const LiveOrdersScreen = ({ navigation }) => {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shops, setShops] = useState([]);
  const [selectedShopId, setSelectedShopId] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [shopMenuVisible, setShopMenuVisible] = useState(false);

  // Define status tabs
  const statusTabs = [
    { id: 'all', label: 'All' },
    { id: 'new', label: 'New' },
    { id: 'accepted', label: 'Accepted' },
    { id: 'preparing', label: 'Preparing' },
    { id: 'ready', label: 'Ready' },
    { id: 'completed', label: 'Completed' }
  ];

  useEffect(() => {
    if (orders.length > 0) {
      navigation.setOptions({
        title: `Live Orders (${filteredOrders.length})`,
      });
    } else {
      navigation.setOptions({
        title: 'Live Orders',
      });
    }
  }, [filteredOrders.length, navigation]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        shops.length > 1 ? (
          <Menu
            visible={shopMenuVisible}
            onDismiss={() => setShopMenuVisible(false)}
            anchor={
              <TouchableOpacity 
                onPress={() => setShopMenuVisible(true)}
                style={{ marginRight: 16, flexDirection: 'row', alignItems: 'center' }}
              >
                <Text style={{ color: 'white', marginRight: 4 }}>
                  {selectedShopId ? shops.find(shop => shop.id === selectedShopId)?.name?.substring(0, 10) || 'Select Shop' : 'Select Shop'}
                  {selectedShopId && shops.find(shop => shop.id === selectedShopId)?.name?.length > 10 ? '...' : ''}
                </Text>
                <MaterialIcons name="arrow-drop-down" size={24} color="white" />
              </TouchableOpacity>
            }
          >
            {shops.map(shop => (
              <Menu.Item
                key={shop.id}
                onPress={() => {
                  setSelectedShopId(shop.id);
                  setShopMenuVisible(false);
                }}
                title={shop.name}
                style={selectedShopId === shop.id ? { backgroundColor: '#fff3e0' } : {}}
              />
            ))}
          </Menu>
        ) : filteredOrders.length > 0 ? (
          <Badge 
            visible={true}
            size={24}
            style={{
              backgroundColor: 'white',
              color: '#ff8c00',
              marginRight: 15,
              fontWeight: 'bold'
            }}
          >
            {filteredOrders.length}
          </Badge>
        ) : null
      )
    });
  }, [filteredOrders.length, shops, selectedShopId, shopMenuVisible]);

  useEffect(() => {
    console.log("LiveOrdersScreen: Initial mount");
    fetchUserShops();
  }, []);

  useEffect(() => {
    if (selectedShopId) {
      console.log(`LiveOrdersScreen: Selected shop changed to ${selectedShopId}`);
      setupRealtimeOrdersListener();
    }
  }, [selectedShopId]);

  // Filter orders based on active tab
  useEffect(() => {
    if (activeTab === 'all') {
      // For 'all' tab, only show active orders (not completed/cancelled)
      const activeOrders = orders.filter(order => 
        !['completed', 'cancelled'].includes(order.status)
      );
      setFilteredOrders(activeOrders);
    } else if (activeTab === 'new') {
      // Include both 'new' and 'pending' statuses for backward compatibility
      setFilteredOrders(orders.filter(order => order.status === 'new' || order.status === 'pending'));
    } else if (activeTab === 'completed') {
      // Show only completed orders
      setFilteredOrders(orders.filter(order => order.status === 'completed'));
    } else {
      // For other tabs, filter by specific status
      setFilteredOrders(orders.filter(order => order.status === activeTab));
    }
  }, [orders, activeTab]);

  const fetchUserShops = async () => {
    console.log("LiveOrdersScreen: Fetching user shops");
    try {
      const shopsRef = collection(db, 'shops');
      const q = query(shopsRef, where('ownerId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      
      const shopsList = [];
      querySnapshot.forEach((doc) => {
        shopsList.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log(`LiveOrdersScreen: Found ${shopsList.length} shops`);
      setShops(shopsList);
      
      // If shops found, select the first one by default
      if (shopsList.length > 0) {
        setSelectedShopId(shopsList[0].id);
      } else {
        console.log("LiveOrdersScreen: No shops found for this user");
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching shops:', error);
      setLoading(false);
    }
  };

  const setupRealtimeOrdersListener = () => {
    console.log(`LiveOrdersScreen: Setting up realtime listener for shop ${selectedShopId}`);
    try {
      setLoading(true);
      
      // First, try to get data once to check if there are any issues
      const liveOrdersRef = ref(rtdb, `shopOrders/${selectedShopId}`);
      
      // Check if data exists first
      get(liveOrdersRef).then(snapshot => {
        console.log(`LiveOrdersScreen: Initial data fetch - exists: ${snapshot.exists()}`);
        if (snapshot.exists()) {
          const count = Object.keys(snapshot.val() || {}).length;
          console.log(`LiveOrdersScreen: Found ${count} orders in initial fetch`);
        } else {
          console.log(`LiveOrdersScreen: No data at path shopOrders/${selectedShopId}`);
        }
      }).catch(error => {
        console.error('Error checking initial data:', error);
      });
      
      // Listen for changes
      const unsubscribe = onValue(liveOrdersRef, (snapshot) => {
        console.log(`LiveOrdersScreen: onValue callback triggered, exists: ${snapshot.exists()}`);
        const data = snapshot.val();
        const ordersList = [];
        
        if (data) {
          // Convert object to array
          Object.keys(data).forEach(key => {
            // Include all orders, including completed ones (but still skip cancelled)
            if (data[key].status === 'cancelled') {
              return;
            }
            
            // We're only getting orders for the selected shop, so we don't need additional filtering
            // Since we're fetching from shopOrders/${selectedShopId}, all orders must belong to this shop
            const order = data[key];
            
            // Verify shopId for extra safety
            if (order.shopId === selectedShopId) {
              // Make sure createdAt is a Date object
              const createdAt = order.createdAt ? new Date(order.createdAt) : new Date();
              
              ordersList.push({
                id: key,
                ...order,
                createdAt
              });
            } else {
              console.log(`LiveOrdersScreen: Found an order with wrong shopId. Expected ${selectedShopId}, got ${order.shopId}`);
            }
          });
          
          console.log(`LiveOrdersScreen: Processed ${ordersList.length} active orders for shop ${selectedShopId}`);
          
          // Sort orders by status priority and then by date (newest first for active orders, oldest first for completed)
          ordersList.sort((a, b) => {
            // Define status priority (pending first, then preparing, then ready)
            const statusPriority = {
              'pending': 1, // For backward compatibility
              'new': 1,
              'accepted': 2,
              'preparing': 3,
              'ready': 4,
              'completed': 5,
              'cancelled': 6
            };
            
            // Compare by status priority first
            if (statusPriority[a.status] !== statusPriority[b.status]) {
              return statusPriority[a.status] - statusPriority[b.status];
            }
            
            // If same status, sort by date (newest first for active orders, oldest first for completed)
            if (a.status === 'completed') {
              // For completed orders, show oldest first
              return a.createdAt - b.createdAt;
            } else {
              // For active orders, show newest first
              return b.createdAt - a.createdAt;
            }
          });
        } else {
          console.log(`LiveOrdersScreen: No data in snapshot`);
        }
        
        setOrders(ordersList);
        setLoading(false);
      }, error => {
        console.error('Error in onValue listener:', error);
        setLoading(false);
        // Fallback to Firestore
        fetchOrdersFromFirestore();
      });
      
      // Clean up listener when component unmounts or shop changes
      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up Realtime Database listener:', error);
      setLoading(false);
      
      // Fallback to Firestore if Realtime Database fails
      fetchOrdersFromFirestore();
    }
  };

  const fetchOrdersFromFirestore = async () => {
    console.log(`LiveOrdersScreen: Falling back to Firestore for shop ${selectedShopId}`);
    try {
      setLoading(true);
      
      if (!selectedShopId) {
        console.log('LiveOrdersScreen: No shop selected for Firestore fallback');
        setOrders([]);
        setLoading(false);
        return;
      }
      
      // Include both 'new' and 'pending' in the query for backward compatibility
      // Also include 'completed' orders for the completed tab
      const ordersRef = collection(db, 'orders');
      const q = query(
        ordersRef,
        where('shopId', '==', selectedShopId),
        where('status', 'in', ['new', 'pending', 'accepted', 'preparing', 'ready', 'completed'])
      );
      
      // Set up a real-time listener
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        console.log(`LiveOrdersScreen: Firestore snapshot received with ${querySnapshot.size} documents`);
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
        
        console.log(`LiveOrdersScreen: Processed ${ordersList.length} orders from Firestore`);
        
        // Sort orders by status priority and then by date (newest first for active orders, oldest first for completed)
        ordersList.sort((a, b) => {
          // Define status priority (pending first, then preparing, then ready)
          const statusPriority = {
            'pending': 1, // For backward compatibility
            'new': 1,
            'accepted': 2,
            'preparing': 3,
            'ready': 4,
            'completed': 5,
            'cancelled': 6
          };
          
          // Compare by status priority first
          if (statusPriority[a.status] !== statusPriority[b.status]) {
            return statusPriority[a.status] - statusPriority[b.status];
          }
          
          // If same status, sort by date (newest first for active orders, oldest first for completed)
          if (a.status === 'completed') {
            // For completed orders, show oldest first
            return a.createdAt - b.createdAt;
          } else {
            // For active orders, show newest first
            return b.createdAt - a.createdAt;
          }
        });
        
        setOrders(ordersList);
        setLoading(false);
      }, error => {
        console.error('Error in Firestore onSnapshot:', error);
        setLoading(false);
      });
      
      return unsubscribe;
    } catch (error) {
      console.error('Error fetching orders from Firestore:', error);
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    console.log('LiveOrdersScreen: Manual refresh triggered');
    setRefreshing(true);
    if (selectedShopId) {
      // For Realtime Database, just wait a moment as the listener will update automatically
      setTimeout(() => setRefreshing(false), 1000);
    } else {
      await fetchUserShops();
      setRefreshing(false);
    }
  };

  const handleSelectShop = (shopId) => {
    setSelectedShopId(shopId);
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

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount).toFixed(2)}`;
  };

  const renderOrderCard = ({ item }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
    >
      <Card style={[
        styles.orderCard,
        item.status === 'completed' && styles.completedOrderCard
      ]}>
        <Card.Content>
          <View style={styles.orderHeader}>
            <View style={styles.orderInfo}>
              <Text style={styles.orderTime}>{formatTime(item.createdAt)}</Text>
              <Text style={styles.orderId}>Order #{item.id.substring(0, 6)}</Text>
              {item.status === 'completed' && item.completedAt && (
                <Text style={styles.completedTime}>
                  Completed: {new Date(item.completedAt).toLocaleString()}
                </Text>
              )}
            </View>
            <Chip 
              mode="flat"
              style={[styles.statusChip, getStatusChipStyle(item.status)]}
            >
              {getStatusLabel(item.status)}
            </Chip>
          </View>
          
          <View style={styles.orderItems}>
            {item.items && item.items.map((orderItem, index) => (
              <View key={index} style={styles.orderItem}>
                <Text style={styles.itemQuantity}>{orderItem.quantity}x</Text>
                <Text style={styles.itemName}>{orderItem.name}</Text>
              </View>
            ))}
          </View>
          
          <View style={styles.orderFooter}>
            <View style={styles.orderDetails}>
              <Text style={styles.itemsCount}>
                {item.items && item.items.reduce((acc, curr) => acc + (curr.quantity || 1), 0)} item(s)
              </Text>
              <Text style={styles.orderTotal}>
                {formatCurrency(item.totalAmount || 0)}
              </Text>
            </View>
            
            <IconButton
              icon="chevron-right"
              size={24}
              iconColor="#ff8c00"
            />
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="receipt-long" size={80} color="#ddd" />
      <Text style={styles.emptyText}>No active orders</Text>
      <Text style={styles.emptySubText}>
        {shops.length > 0 
          ? "When customers place orders, they'll appear here" 
          : "You need to create a shop first to receive orders"}
      </Text>
      
      {shops.length === 0 && (
        <TouchableOpacity 
          style={styles.createShopButton}
          onPress={() => navigation.navigate('ProfileTab', { screen: 'CreateShop' })}
        >
          <Text style={styles.createShopButtonText}>Create a Shop</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Custom TabItem component for more compact and cleaner tab design
  const TabItem = ({ label, count, isActive, onPress }) => {
    return (
      <TouchableOpacity
        style={[
          styles.tab,
          isActive && styles.activeTab
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.tabContent}>
          <Text 
            style={[
              styles.tabText,
              isActive && styles.activeTabText
            ]}
          >
            {label}
          </Text>
          {count > 0 && (
            <View style={[
              styles.tabBadge,
              isActive ? styles.activeTabBadge : null
            ]}>
              <Text style={[
                styles.tabBadgeText,
                isActive && styles.activeTabBadgeText
              ]}>
                {count}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderTabBar = () => {
    return (
      <View style={styles.tabBarContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
        >
          {statusTabs.map(tab => {
            // Count based on tab ID
            let count;
            if (tab.id === 'all') {
              // All active orders (not completed or cancelled)
              count = orders.filter(order => !['completed', 'cancelled'].includes(order.status)).length;
            } else if (tab.id === 'new') {
              // Count both 'new' and 'pending' statuses for backward compatibility
              count = orders.filter(order => order.status === 'new' || order.status === 'pending').length;
            } else if (tab.id === 'completed') {
              // Count only completed orders
              count = orders.filter(order => order.status === 'completed').length;
            } else {
              // Count only specific status
              count = orders.filter(order => order.status === tab.id).length;
            }
              
            return (
              <TabItem
                key={tab.id}
                label={tab.label}
                count={count}
                isActive={activeTab === tab.id}
                onPress={() => setActiveTab(tab.id)}
              />
            );
          })}
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#ff8c00" barStyle="light-content" />
      <View style={styles.container}>
        {renderTabBar()}
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ff8c00" />
            <Text style={styles.loadingText}>Loading orders...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredOrders}
            renderItem={renderOrderCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.ordersList,
              filteredOrders.length === 0 && styles.emptyListContainer
            ]}
            ListEmptyComponent={renderEmptyList}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#ff8c00']}
                tintColor="#ff8c00"
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  tabBarContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabsContainer: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tab: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginHorizontal: 3,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    minHeight: 28,
  },
  activeTab: {
    backgroundColor: '#ff8c00',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: 'white',
    fontWeight: 'bold',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadge: {
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    paddingHorizontal: 4,
  },
  activeTabBadge: {
    backgroundColor: 'white',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#666',
  },
  activeTabBadgeText: {
    color: '#ff8c00',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
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
  orderInfo: {
    flexDirection: 'column',
  },
  orderTime: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
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
    backgroundColor: '#e8f5e9',
  },
  cancelledChip: {
    backgroundColor: '#ffebee',
  },
  orderItems: {
    marginBottom: 12,
  },
  orderItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 8,
    minWidth: 30,
  },
  itemName: {
    fontSize: 14,
    flex: 1,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  orderDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemsCount: {
    fontSize: 14,
    color: '#666',
    marginRight: 12,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff8c00',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#888',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
  },
  createShopButton: {
    marginTop: 24,
    backgroundColor: '#ff8c00',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  createShopButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  completedOrderCard: {
    backgroundColor: '#f9f9f9',
    borderLeftWidth: 4,
    borderLeftColor: '#673ab7',
    opacity: 0.8
  },
  completedTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic'
  },
});

export default LiveOrdersScreen; 