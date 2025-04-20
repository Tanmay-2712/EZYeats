import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { Card, Button, FAB, Searchbar, Banner } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';

const MyShopsScreen = ({ navigation }) => {
  const { currentUser } = useAuth();
  const [shops, setShops] = useState([]);
  const [filteredShops, setFilteredShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [bannerVisible, setBannerVisible] = useState(true);

  useEffect(() => {
    fetchMyShops();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchMyShops();
    });

    return unsubscribe;
  }, [navigation]);

  const fetchMyShops = async () => {
    try {
      setLoading(true);
      const shopRef = collection(db, 'shops');
      const q = query(shopRef, where('ownerId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      
      const shopsList = [];
      querySnapshot.forEach((doc) => {
        shopsList.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log(`Fetched ${shopsList.length} shops for vendor: ${currentUser.uid}`);
      setShops(shopsList);
      setFilteredShops(shopsList);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching shops:', error);
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMyShops();
    setRefreshing(false);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    
    if (query.trim() === '') {
      setFilteredShops(shops);
    } else {
      const filtered = shops.filter(shop => 
        shop.name.toLowerCase().includes(query.toLowerCase()) ||
        shop.location.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredShops(filtered);
    }
  };

  const handleCreateShop = () => {
    if (shops.length > 0) {
      Alert.alert(
        "Single Shop Mode",
        "In the current version, you can only manage one shop. Please update or manage your existing shop."
      );
    } else {
      navigation.navigate('CreateShop');
    }
  };

  const handleSelectShop = (shop) => {
    navigation.navigate('ShopDetail', { shopId: shop.id, shop });
  };

  const renderShopItem = ({ item }) => (
    <TouchableOpacity onPress={() => handleSelectShop(item)}>
      <Card style={styles.shopCard}>
        <Card.Content>
          <View style={styles.shopHeader}>
            <View>
              <Text style={styles.shopName}>{item.name || 'Unnamed Shop'}</Text>
              <Text style={styles.shopLocation}>
                <MaterialIcons name="location-on" size={14} color="#666" />
                {' '}{item.location || 'No location set'}
              </Text>
            </View>
            <View style={[
              styles.statusIndicator, 
              item.isOpen ? styles.openIndicator : styles.closedIndicator
            ]} />
          </View>
          
          {item.description ? (
            <Text style={styles.shopDescription} numberOfLines={2}>
              {item.description}
            </Text>
          ) : (
            <Text style={styles.emptyDescription}>
              No description available
            </Text>
          )}
          
          <View style={styles.shopFooter}>
            <Text style={styles.shopHours}>
              <MaterialIcons name="access-time" size={14} color="#666" />
              {' '}{item.openingTime || '9:00 AM'} - {item.closingTime || '5:00 PM'}
            </Text>
            <Button 
              mode="text" 
              onPress={() => handleSelectShop(item)}
              textColor="#ff8c00"
            >
              Manage
            </Button>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="store" size={80} color="#ddd" />
      <Text style={styles.emptyText}>No shops found</Text>
      <Text style={styles.emptySubText}>Create your first shop to start managing your business</Text>
      <Button 
        mode="contained" 
        onPress={handleCreateShop}
        style={styles.createButton}
        buttonColor="#ff8c00"
      >
        Create New Shop
      </Button>
    </View>
  );

  return (
    <View style={styles.container}>
      {shops.length > 0 && (
        <Banner
          visible={bannerVisible}
          actions={[
            {
              label: 'Dismiss',
              onPress: () => setBannerVisible(false),
            },
          ]}
          icon="information"
        >
          In the current version, only one shop per vendor is supported. 
        </Banner>
      )}
      
      {shops.length > 0 && (
        <Searchbar
          placeholder="Search your shop..."
          onChangeText={handleSearch}
          value={searchQuery}
          style={styles.searchBar}
          iconColor="#ff8c00"
        />
      )}
      
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#ff8c00" />
        </View>
      ) : (
        <FlatList
          data={filteredShops}
          renderItem={renderShopItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyState}
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
      
      {shops.length === 0 && (
        <FAB
          style={styles.fab}
          icon="plus"
          color="white"
          onPress={handleCreateShop}
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
  searchBar: {
    margin: 16,
    elevation: 2,
    backgroundColor: 'white',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 80,
  },
  shopCard: {
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
  },
  shopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  shopName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  shopLocation: {
    fontSize: 14,
    color: '#666',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 5,
  },
  openIndicator: {
    backgroundColor: '#4caf50',
  },
  closedIndicator: {
    backgroundColor: '#f44336',
  },
  shopDescription: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  shopFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  shopHours: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 80,
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
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  createButton: {
    borderRadius: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#ff8c00',
  },
});

export default MyShopsScreen; 