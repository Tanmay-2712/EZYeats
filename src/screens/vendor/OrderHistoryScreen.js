import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, ScrollView, Alert } from 'react-native';
import { Card, Chip, Searchbar, Menu, Button } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';

const OrderHistoryScreen = ({ route, navigation }) => {
  const { shopId } = route.params || {};
  const { currentUser } = useAuth();
  const [shop, setShop] = useState(null);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month
  const [sortBy, setSortBy] = useState('dateDesc'); // dateDesc, dateAsc, amountDesc, amountAsc, statusAz, statusZa
  const [menuVisible, setMenuVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  // Define status tabs for history
  const statusTabs = [
    { id: 'all', label: 'All' },
    { id: 'completed', label: 'Completed' },
    { id: 'cancelled', label: 'Cancelled' },
  ];

  useEffect(() => {
    fetchShopDetails();
    fetchOrderHistory();
  }, [shopId]);

  const fetchShopDetails = async () => {
    if (!shopId) return;
    
    try {
      const shopDoc = await getDoc(doc(db, 'shops', shopId));
      if (shopDoc.exists()) {
        setShop(shopDoc.data());
      }
    } catch (error) {
      console.error('Error fetching shop details:', error);
    }
  };

  const fetchOrderHistory = async () => {
    try {
      setLoading(true);
      
      // If a specific shop ID is provided, use that, otherwise fetch orders for all user's shops
      const orderRef = collection(db, 'orders');
      let q;
      
      if (shopId) {
        console.log(`Fetching order history for specific shop: ${shopId}`);
        q = query(
          orderRef,
          where('shopId', '==', shopId),
          where('status', 'in', ['completed', 'cancelled'])
        );
      } else {
        // Fetch orders from all shops owned by the user
        console.log(`Fetching order history for all shops owned by user: ${currentUser.uid}`);
        const shopsRef = collection(db, 'shops');
        const shopsQuery = query(shopsRef, where('ownerId', '==', currentUser.uid));
        const querySnapshot = await getDocs(shopsQuery);
        
        const shopIds = [];
        querySnapshot.forEach((doc) => {
          shopIds.push(doc.id);
        });
        
        if (shopIds.length === 0) {
          console.log('No shops found for this user');
          setOrders([]);
          setFilteredOrders([]);
          setLoading(false);
          return;
        }
        
        console.log(`Found ${shopIds.length} shops: ${shopIds.join(', ')}`);
        q = query(
          orderRef,
          where('shopId', 'in', shopIds),
          where('status', 'in', ['completed', 'cancelled'])
        );
      }
      
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
      
      console.log(`Fetched ${ordersList.length} completed or cancelled orders`);
      setOrders(ordersList);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching order history:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to fetch order history. Please try again.');
    }
  };

  // Apply all filters including tab selection
  useEffect(() => {
    let result = [...orders];
    
    // Apply search filter if query exists
    if (searchQuery) {
      result = result.filter(order => 
        order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order.customerName && order.customerName.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    // Apply date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      let filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        default:
          break;
      }
      
      result = result.filter(order => order.createdAt >= filterDate);
    }
    
    // Apply status filter if not 'all'
    if (activeTab !== 'all') {
      result = result.filter(order => order.status === activeTab);
    }
    
    // Apply sorting
    result = sortOrders(result, sortBy);
    
    setFilteredOrders(result);
  }, [orders, searchQuery, dateFilter, sortBy, activeTab]);

  const sortOrders = (orders, sortOption) => {
    const sortedOrders = [...orders];
    
    switch (sortOption) {
      case 'dateDesc': // Newest first (default)
        return sortedOrders.sort((a, b) => b.createdAt - a.createdAt);
      case 'dateAsc': // Oldest first
        return sortedOrders.sort((a, b) => a.createdAt - b.createdAt);
      case 'amountDesc': // Highest amount first
        return sortedOrders.sort((a, b) => parseFloat(b.totalAmount) - parseFloat(a.totalAmount));
      case 'amountAsc': // Lowest amount first
        return sortedOrders.sort((a, b) => parseFloat(a.totalAmount) - parseFloat(b.totalAmount));
      case 'statusAz': // Status A-Z
        return sortedOrders.sort((a, b) => a.status.localeCompare(b.status));
      case 'statusZa': // Status Z-A
        return sortedOrders.sort((a, b) => b.status.localeCompare(a.status));
      default:
        return sortedOrders;
    }
  };

  const getSortLabel = () => {
    switch (sortBy) {
      case 'dateDesc': return 'Newest first';
      case 'dateAsc': return 'Oldest first';
      case 'amountDesc': return 'Highest amount';
      case 'amountAsc': return 'Lowest amount';
      case 'statusAz': return 'Status A-Z';
      case 'statusZa': return 'Status Z-A';
      default: return 'Sort by';
    }
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
  };

  const onClearSearch = () => {
    setSearchQuery('');
  };

  const selectDateFilter = (filter) => {
    setDateFilter(filter);
  };

  const showMenu = () => setMenuVisible(true);
  const hideMenu = () => setMenuVisible(false);
  
  const selectSortOption = (option) => {
    setSortBy(option);
    hideMenu();
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount).toFixed(2)}`;
  };

  const getStatusChipStyle = (status) => {
    switch (status) {
      case 'new':
        return { backgroundColor: '#FCE7B1', color: '#D39C00' }; // Amber/Yellow
      case 'accepted':
        return { backgroundColor: '#B3E5FC', color: '#0288D1' }; // Light Blue
      case 'preparing':
        return { backgroundColor: '#C8E6C9', color: '#388E3C' }; // Light Green
      case 'ready':
        return { backgroundColor: '#DCEDC8', color: '#689F38' }; // Lime Green
      case 'completed':
        return { backgroundColor: '#E8F5E9', color: '#2E7D32' }; // Green
      case 'cancelled':
        return { backgroundColor: '#FFCDD2', color: '#D32F2F' }; // Red
      default:
        return { backgroundColor: '#E0E0E0', color: '#757575' }; // Grey
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
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

  const renderOrderCard = ({ item }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
    >
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.orderId}>Order #{item.id.substring(0, 6)}</Text>
              <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
            </View>
            <Chip 
              mode="flat"
              style={[styles.statusChip, getStatusChipStyle(item.status)]}
              textStyle={getStatusChipStyle(item.status)}
            >
              {getStatusLabel(item.status)}
            </Chip>
          </View>
          
          <View style={styles.itemsPreview}>
            <Text style={styles.itemsCount}>
              {item.items.length} {item.items.length === 1 ? 'item' : 'items'}
            </Text>
            <Text style={styles.totalAmount}>{formatCurrency(item.totalAmount)}</Text>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="history" size={80} color="#ddd" />
      <Text style={styles.emptyText}>No past orders found</Text>
      <Text style={styles.emptySubText}>Completed and cancelled orders will appear here</Text>
    </View>
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrderHistory();
    setRefreshing(false);
  };

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

  // Then modify the renderTabBar function:
  const renderTabBar = () => {
    return (
      <View style={styles.tabBarContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
        >
          {statusTabs.map(tab => {
            const count = tab.id === 'all' 
              ? orders.length 
              : orders.filter(order => order.status === tab.id).length;
              
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
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search by order ID"
          onChangeText={handleSearch}
          value={searchQuery}
          style={styles.searchBar}
          onClearIconPress={onClearSearch}
          iconColor="#666"
        />
      </View>
      
      {renderTabBar()}
      
      <View style={styles.filterContainer}>
        <View style={styles.filterLabelRow}>
          <Text style={styles.filterLabel}>Filter by date:</Text>
          <Menu
            visible={menuVisible}
            onDismiss={hideMenu}
            anchor={
              <Button 
                onPress={showMenu} 
                mode="outlined" 
                style={styles.sortButton}
                icon="sort"
                contentStyle={styles.sortButtonContent}
              >
                {getSortLabel()}
              </Button>
            }
          >
            <Menu.Item onPress={() => selectSortOption('dateDesc')} title="Newest first" />
            <Menu.Item onPress={() => selectSortOption('dateAsc')} title="Oldest first" />
            <Menu.Item onPress={() => selectSortOption('amountDesc')} title="Highest amount" />
            <Menu.Item onPress={() => selectSortOption('amountAsc')} title="Lowest amount" />
            <Menu.Item onPress={() => selectSortOption('statusAz')} title="Status A-Z" />
            <Menu.Item onPress={() => selectSortOption('statusZa')} title="Status Z-A" />
          </Menu>
        </View>
        <View style={styles.filterButtons}>
          <TouchableOpacity
            style={[styles.filterButton, dateFilter === 'all' && styles.filterButtonActive]}
            onPress={() => selectDateFilter('all')}
          >
            <Text style={[styles.filterButtonText, dateFilter === 'all' && styles.filterButtonTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, dateFilter === 'today' && styles.filterButtonActive]}
            onPress={() => selectDateFilter('today')}
          >
            <Text style={[styles.filterButtonText, dateFilter === 'today' && styles.filterButtonTextActive]}>
              Today
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, dateFilter === 'week' && styles.filterButtonActive]}
            onPress={() => selectDateFilter('week')}
          >
            <Text style={[styles.filterButtonText, dateFilter === 'week' && styles.filterButtonTextActive]}>
              This Week
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, dateFilter === 'month' && styles.filterButtonActive]}
            onPress={() => selectDateFilter('month')}
          >
            <Text style={[styles.filterButtonText, dateFilter === 'month' && styles.filterButtonTextActive]}>
              This Month
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#ff8c00" />
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrderCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContainer,
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
    backgroundColor: 'white',
  },
  searchBar: {
    elevation: 0,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
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
  emptyListContainer: {
    flexGrow: 1,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  sortButton: {
    borderColor: '#ff8c00',
    borderRadius: 20,
    height: 36,
  },
  sortButtonContent: {
    height: 36,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginBottom: 8,
  },
  filterButtonActive: {
    backgroundColor: '#ff8c00',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
  },
  filterButtonTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
  },
  card: {
    marginBottom: 12,
    borderRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderId: {
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
  completedChip: {
    backgroundColor: '#e8f5e9',
  },
  cancelledChip: {
    backgroundColor: '#ffebee',
  },
  itemsPreview: {
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
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
});

export default OrderHistoryScreen; 