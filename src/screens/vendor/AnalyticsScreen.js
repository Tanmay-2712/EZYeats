import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, Dimensions, RefreshControl } from 'react-native';
import { Card, Title, Paragraph, Button, Chip, Divider, SegmentedButtons } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';

const AnalyticsScreen = ({ navigation, route }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedShop, setSelectedShop] = useState(null);
  const [shops, setShops] = useState([]);
  const [timeRange, setTimeRange] = useState('week'); // 'day', 'week', 'month'
  const [salesData, setSalesData] = useState(null);
  const [topItems, setTopItems] = useState([]);
  const [feedbackData, setFeedbackData] = useState(null);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalItemsSold, setTotalItemsSold] = useState(0);
  
  const screenWidth = Dimensions.get('window').width - 32;
  
  useEffect(() => {
    fetchUserShops();
  }, []);
  
  useEffect(() => {
    if (selectedShop) {
      fetchAnalyticsData();
    }
  }, [selectedShop, timeRange]);
  
  const fetchUserShops = async () => {
    try {
      setLoading(true);
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
      
      setShops(shopsList);
      
      // If shops found, select the first one by default
      if (shopsList.length > 0) {
        setSelectedShop(shopsList[0].id);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching shops:', error);
      setLoading(false);
    }
  };
  
  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Get start and end dates based on timeRange
      const { startDate, endDate } = getDateRange(timeRange);
      
      // Fetch orders for selected shop in the date range
      await fetchOrdersData(startDate, endDate);
      
      // Fetch top selling items
      await fetchTopSellingItems(startDate, endDate);
      
      // Fetch customer feedback data
      await fetchFeedbackData();
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      setLoading(false);
    }
  };
  
  const getDateRange = (range) => {
    const now = new Date();
    let startDate = new Date();
    
    if (range === 'day') {
      startDate.setHours(0, 0, 0, 0);
    } else if (range === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (range === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    }
    
    return {
      startDate: Timestamp.fromDate(startDate),
      endDate: Timestamp.fromDate(now)
    };
  };
  
  const fetchOrdersData = async (startDate, endDate) => {
    try {
      // Query orders collection for the selected shop and date range
      const ordersRef = collection(db, 'orders');
      const q = query(
        ordersRef,
        where('shopId', '==', selectedShop),
        where('createdAt', '>=', startDate),
        where('createdAt', '<=', endDate),
        where('status', 'not-in', ['cancelled']),
        orderBy('createdAt', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      const orders = [];
      let revenue = 0;
      let itemCount = 0;
      
      querySnapshot.forEach((doc) => {
        const orderData = doc.data();
        orders.push({
          id: doc.id,
          ...orderData,
          createdAt: orderData.createdAt?.toDate() || new Date()
        });
        
        revenue += orderData.totalAmount || 0;
        itemCount += (orderData.items || []).reduce((sum, item) => sum + item.quantity, 0);
      });
      
      setTotalOrders(orders.length);
      setTotalRevenue(revenue);
      setTotalItemsSold(itemCount);
      
      // Generate sales data for chart
      generateSalesChartData(orders, startDate.toDate(), endDate.toDate());
    } catch (error) {
      console.error('Error fetching orders data:', error);
    }
  };
  
  const generateSalesChartData = (orders, startDate, endDate) => {
    let labels = [];
    let data = [];
    
    if (timeRange === 'day') {
      // Group by hour
      labels = ['8AM', '10AM', '12PM', '2PM', '4PM', '6PM', '8PM'];
      const hourlyData = [0, 0, 0, 0, 0, 0, 0];
      const hourMapping = {8: 0, 10: 1, 12: 2, 14: 3, 16: 4, 18: 5, 20: 6};
      
      orders.forEach(order => {
        const hour = order.createdAt.getHours();
        // Map the hour to the closest in our chart (8, 10, 12, 14, 16, 18, 20)
        const hourIndex = hourMapping[Object.keys(hourMapping).reduce((a, b) => 
          Math.abs(hour - a) < Math.abs(hour - b) ? a : b
        )];
        
        if (hourIndex !== undefined) {
          hourlyData[hourIndex] += order.totalAmount || 0;
        }
      });
      
      data = hourlyData;
    } else if (timeRange === 'week') {
      // Group by day of week
      labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const dailyData = [0, 0, 0, 0, 0, 0, 0];
      
      orders.forEach(order => {
        const dayIndex = order.createdAt.getDay();
        // Convert Sunday from 0 to 6 for our array
        const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
        dailyData[adjustedIndex] += order.totalAmount || 0;
      });
      
      data = dailyData;
    } else if (timeRange === 'month') {
      // Group by week
      labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      const weeklyData = [0, 0, 0, 0];
      
      orders.forEach(order => {
        const orderDate = order.createdAt;
        const dayOfMonth = orderDate.getDate();
        let weekIndex;
        
        if (dayOfMonth <= 7) weekIndex = 0;
        else if (dayOfMonth <= 14) weekIndex = 1;
        else if (dayOfMonth <= 21) weekIndex = 2;
        else weekIndex = 3;
        
        weeklyData[weekIndex] += order.totalAmount || 0;
      });
      
      data = weeklyData;
    }
    
    setSalesData({
      labels,
      datasets: [{ data }],
    });
  };
  
  const fetchTopSellingItems = async (startDate, endDate) => {
    try {
      // Query orders to calculate top items
      const ordersRef = collection(db, 'orders');
      const q = query(
        ordersRef,
        where('shopId', '==', selectedShop),
        where('createdAt', '>=', startDate),
        where('createdAt', '<=', endDate),
        where('status', 'not-in', ['cancelled'])
      );
      
      const querySnapshot = await getDocs(q);
      
      // Track items by id
      const itemsMap = new Map();
      
      // Process each order and its items
      querySnapshot.forEach(doc => {
        const orderData = doc.data();
        const items = orderData.items || [];
        
        items.forEach(item => {
          if (!itemsMap.has(item.id)) {
            itemsMap.set(item.id, {
              id: item.id,
              name: item.name,
              quantity: 0,
              revenue: 0
            });
          }
          
          const itemData = itemsMap.get(item.id);
          itemData.quantity += item.quantity || 0;
          itemData.revenue += (item.price * item.quantity) || 0;
          itemsMap.set(item.id, itemData);
        });
      });
      
      // Convert map to array and sort by revenue
      const sortedItems = Array.from(itemsMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5); // Top 5 items
      
      setTopItems(sortedItems);
    } catch (error) {
      console.error('Error fetching top selling items:', error);
    }
  };
  
  const fetchFeedbackData = async () => {
    try {
      // Query ratings for this shop
      const ratingsRef = collection(db, 'shopRatings');
      const q = query(
        ratingsRef,
        where('shopId', '==', selectedShop)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setFeedbackData({
          averageRating: 0,
          totalReviews: 0,
          ratings: [0, 0, 0, 0, 0] // 5-star to 1-star counts
        });
        return;
      }
      
      let totalRating = 0;
      const ratingCounts = [0, 0, 0, 0, 0]; // 5-star to 1-star
      
      querySnapshot.forEach(doc => {
        const ratingData = doc.data();
        const rating = ratingData.overall || 0;
        
        if (rating > 0) {
          totalRating += rating;
          // Adjust index for array (5-star is index 0, 1-star is index 4)
          const ratingIndex = 5 - rating;
          if (ratingIndex >= 0 && ratingIndex < 5) {
            ratingCounts[ratingIndex]++;
          }
        }
      });
      
      const totalReviews = querySnapshot.size;
      const averageRating = totalReviews > 0 ? totalRating / totalReviews : 0;
      
      setFeedbackData({
        averageRating,
        totalReviews,
        ratings: ratingCounts
      });
    } catch (error) {
      console.error('Error fetching feedback data:', error);
    }
  };
  
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnalyticsData();
    setRefreshing(false);
  };
  
  const formatCurrency = (amount) => {
    return `₹${amount.toFixed(2)}`;
  };
  
  if (loading && !refreshing) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#ff8c00" />
      </View>
    );
  }
  
  if (shops.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="store" size={80} color="#ddd" />
        <Text style={styles.emptyText}>No shops found</Text>
        <Text style={styles.emptySubText}>
          You need to create a shop before you can view analytics
        </Text>
        <Button 
          mode="contained" 
          style={styles.createButton}
          onPress={() => navigation.navigate('ProfileTab', { screen: 'CreateShop' })}
        >
          Create Shop
        </Button>
      </View>
    );
  }
  
  const chartConfig = {
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    color: (opacity = 1) => `rgba(255, 140, 0, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false
  };
  
  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {shops.length > 1 && (
        <View style={styles.shopSelector}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {shops.map(shop => (
              <Chip
                key={shop.id}
                selected={selectedShop === shop.id}
                onPress={() => setSelectedShop(shop.id)}
                style={styles.shopChip}
                selectedColor="#ff8c00"
              >
                {shop.name}
              </Chip>
            ))}
          </ScrollView>
        </View>
      )}
      
      <View style={styles.timeRangeSelector}>
        <SegmentedButtons
          value={timeRange}
          onValueChange={setTimeRange}
          buttons={[
            { value: 'day', label: 'Day' },
            { value: 'week', label: 'Week' },
            { value: 'month', label: 'Month' }
          ]}
        />
      </View>
      
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>
            Revenue {timeRange === 'day' ? 'Today' : timeRange === 'week' ? 'This Week' : 'This Month'}
          </Title>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{formatCurrency(totalRevenue)}</Text>
              <Text style={styles.statLabel}>Total Sales</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{totalItemsSold}</Text>
              <Text style={styles.statLabel}>Items Sold</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{totalOrders}</Text>
              <Text style={styles.statLabel}>Orders</Text>
            </View>
          </View>
          
          {salesData && salesData.datasets[0].data.some(value => value > 0) ? (
            <LineChart
              data={salesData}
              width={screenWidth}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          ) : (
            <View style={styles.noDataContainer}>
              <MaterialIcons name="bar-chart" size={64} color="#ddd" />
              <Text style={styles.noDataText}>No sales data for this period</Text>
            </View>
          )}
        </Card.Content>
      </Card>
      
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>
            <MaterialIcons name="trending-up" size={24} color="#ff8c00" style={styles.titleIcon} />
            Top Selling Items
          </Title>
          
          {topItems.length > 0 ? (
            topItems.map((item, index) => (
              <View key={item.id}>
                <View style={styles.topItemRow}>
                  <Text style={styles.topItemRank}>#{index + 1}</Text>
                  <Text style={styles.topItemName}>{item.name}</Text>
                  <Text style={styles.topItemQuantity}>{item.quantity} sold</Text>
                  <Text style={styles.topItemRevenue}>{formatCurrency(item.revenue)}</Text>
                </View>
                {index < topItems.length - 1 && <Divider style={styles.divider} />}
              </View>
            ))
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No items sold in this period</Text>
            </View>
          )}
        </Card.Content>
      </Card>
      
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>
            <MaterialIcons name="star" size={24} color="#ff8c00" style={styles.titleIcon} />
            Customer Feedback
          </Title>
          
          {feedbackData && (
            <View style={styles.feedbackContainer}>
              <View style={styles.ratingOverview}>
                <Text style={styles.averageRating}>
                  {feedbackData.averageRating > 0 ? feedbackData.averageRating.toFixed(1) : '-'}
                </Text>
                <View style={styles.starsContainer}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <MaterialIcons 
                      key={star}
                      name={star <= Math.round(feedbackData.averageRating) ? "star" : "star-border"} 
                      size={24} 
                      color="#FFD700" 
                    />
                  ))}
                </View>
                <Text style={styles.totalReviews}>Based on {feedbackData.totalReviews} reviews</Text>
              </View>
              
              {feedbackData.totalReviews > 0 ? (
                <View style={styles.ratingsBreakdown}>
                  {feedbackData.ratings.map((count, index) => {
                    const starNumber = 5 - index;
                    const percentage = feedbackData.totalReviews > 0 ? 
                      (count / feedbackData.totalReviews) * 100 : 0;
                    
                    return (
                      <View key={starNumber} style={styles.ratingBar}>
                        <Text style={styles.ratingLabel}>{starNumber} stars</Text>
                        <View style={styles.ratingBarContainer}>
                          <View style={[styles.ratingBarFill, { width: `${percentage}%` }]} />
                        </View>
                        <Text style={styles.ratingCount}>{count}</Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.noDataContainer}>
                  <Text style={styles.noDataText}>No reviews yet</Text>
                </View>
              )}
            </View>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubText: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 16,
  },
  createButton: {
    marginTop: 16,
    backgroundColor: '#ff8c00',
  },
  shopSelector: {
    marginBottom: 16,
  },
  shopChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  timeRangeSelector: {
    marginBottom: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleIcon: {
    marginRight: 8,
  },
  cardDescription: {
    color: '#666',
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ff8c00',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  noDataContainer: {
    alignItems: 'center',
    padding: 24,
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  topItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  topItemRank: {
    width: 30,
    fontWeight: 'bold',
    color: '#666',
  },
  topItemName: {
    flex: 1,
    fontWeight: '500',
  },
  topItemQuantity: {
    width: 70,
    textAlign: 'right',
    color: '#666',
  },
  topItemRevenue: {
    width: 80,
    textAlign: 'right',
    fontWeight: 'bold',
    color: '#ff8c00',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
  },
  feedbackContainer: {
    marginTop: 8,
  },
  ratingOverview: {
    alignItems: 'center',
    marginBottom: 16,
  },
  averageRating: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ff8c00',
  },
  starsContainer: {
    flexDirection: 'row',
    marginVertical: 8,
  },
  totalReviews: {
    color: '#666',
  },
  ratingsBreakdown: {
    marginTop: 8,
  },
  ratingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingLabel: {
    width: 60,
    fontSize: 12,
  },
  ratingBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#eee',
    borderRadius: 4,
    marginHorizontal: 8,
  },
  ratingBarFill: {
    height: 8,
    backgroundColor: '#FFD700',
    borderRadius: 4,
  },
  ratingCount: {
    width: 30,
    fontSize: 12,
    textAlign: 'right',
    color: '#666',
  },
});

export default AnalyticsScreen; 