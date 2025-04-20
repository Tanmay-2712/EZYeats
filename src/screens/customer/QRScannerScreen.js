import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert, Animated, Dimensions, StatusBar, SafeAreaView } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { MaterialIcons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

const { width } = Dimensions.get('window');
const SCAN_AREA_SIZE = width * 0.7;

const QRScannerScreen = ({ navigation }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const scanLineAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  useEffect(() => {
    if (!scanned && !loading) {
      animateScanLine();
    }
  }, [scanned, loading]);

  const animateScanLine = () => {
    scanLineAnimation.setValue(0);
    Animated.loop(
      Animated.timing(scanLineAnimation, {
        toValue: SCAN_AREA_SIZE,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  };

  const handleBarCodeScanned = async ({ type, data }) => {
    try {
      setScanned(true);
      setLoading(true);
      
      // Check if the QR code contains a valid shop ID
      if (!data || !data.startsWith('ezyeats-shop:')) {
        Alert.alert('Invalid QR Code', 'This is not a valid EZYeats shop QR code.');
        setLoading(false);
        return;
      }
      
      // Extract shop ID from QR code data
      // Format: "ezyeats-shop:SHOP_ID"
      const shopId = data.replace('ezyeats-shop:', '');
      
      // Get shop data from Firestore
      const shopRef = doc(db, 'shops', shopId);
      const shopDoc = await getDoc(shopRef);
      
      if (!shopDoc.exists()) {
        Alert.alert('Shop Not Found', 'The scanned shop could not be found.');
        setLoading(false);
        return;
      }
      
      const shopData = shopDoc.data();
      
      // Navigate to shop detail screen
      navigation.replace('ShopDetail', {
        shopId: shopId,
        shopName: shopData.name,
        shopData: { id: shopId, ...shopData }
      });
      
    } catch (error) {
      console.error('Error processing QR code:', error);
      Alert.alert('Error', 'There was an error processing the QR code. Please try again.');
      setLoading(false);
    }
  };

  const handleScanAgain = () => {
    setScanned(false);
    setLoading(false);
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.permissionContainer}>
          <ActivityIndicator size="large" color="#ff8c00" />
          <Text style={styles.permissionText}>Requesting camera permission...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.permissionContainer}>
          <MaterialIcons name="no-photography" size={80} color="#ff8c00" />
          <Text style={styles.permissionTitle}>Camera Access Needed</Text>
          <Text style={styles.permissionText}>Camera permission is required to scan QR codes.</Text>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={styles.scanner}
      />
      
      <View style={styles.overlay}>
        <View style={styles.scanWindowContainer}>
          <View style={styles.scanWindow}>
            {!scanned && !loading && (
              <Animated.View 
                style={[
                  styles.scanLine, 
                  { 
                    transform: [{ translateY: scanLineAnimation }] 
                  }
                ]} 
              />
            )}
            <View style={[styles.corner, styles.topLeftCorner]} />
            <View style={[styles.corner, styles.topRightCorner]} />
            <View style={[styles.corner, styles.bottomLeftCorner]} />
            <View style={[styles.corner, styles.bottomRightCorner]} />
          </View>
        </View>
      </View>
      
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>Scan Shop QR Code</Text>
        <Text style={styles.subHeaderText}>
          Align the QR code within the frame to scan
        </Text>
      </View>
      
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ff8c00" />
            <Text style={styles.loadingText}>Loading shop menu...</Text>
          </View>
        </View>
      )}
      
      {scanned && !loading && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.button}
            onPress={handleScanAgain}
          >
            <MaterialIcons name="qr-code-scanner" size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Scan Again</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <MaterialIcons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 20,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 30,
    lineHeight: 22,
  },
  scanner: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanWindowContainer: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanWindow: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  scanLine: {
    height: 2,
    width: '100%',
    backgroundColor: '#ff8c00',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#ff8c00',
    backgroundColor: 'transparent',
  },
  topLeftCorner: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRightCorner: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeftCorner: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRightCorner: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  headerContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  subHeaderText: {
    fontSize: 16,
    color: '#f0f0f0',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 80,
    width: '100%',
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#ff8c00',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    minWidth: 200,
  },
  loadingText: {
    color: '#333',
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
});

export default QRScannerScreen; 