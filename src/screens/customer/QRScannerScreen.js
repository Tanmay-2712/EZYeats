import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert, Animated, Dimensions, StatusBar } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { MaterialIcons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

const { width } = Dimensions.get('window');
const SCAN_AREA_SIZE = width * 0.7; // 70% of screen width
const CORNER_WIDTH = 20;
const CORNER_THICKNESS = 3;

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

  // Animate the scan line
  useEffect(() => {
    if (!scanned && !loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnimation, {
            toValue: SCAN_AREA_SIZE,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnimation, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scanLineAnimation.setValue(0);
    }
    
    return () => {
      scanLineAnimation.setValue(0);
    };
  }, [scanned, loading]);

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
      <View style={styles.permissionContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <ActivityIndicator size="large" color="#ff8c00" />
        <Text style={styles.permissionText}>Requesting camera permission...</Text>
      </View>
    );
  }
  
  if (hasPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <MaterialIcons name="no-photography" size={80} color="#ff8c00" />
        <Text style={styles.permissionText}>No access to camera</Text>
        <Text style={styles.permissionSubText}>Camera permission is required to scan QR codes.</Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={styles.scanner}
      />
      
      <View style={styles.overlay}>
        <View style={styles.scanOuterContainer}>
          <View style={styles.scanContainer}>
            {/* Scanner corners */}
            <View style={[styles.corner, styles.topLeftCorner]} />
            <View style={[styles.corner, styles.topRightCorner]} />
            <View style={[styles.corner, styles.bottomLeftCorner]} />
            <View style={[styles.corner, styles.bottomRightCorner]} />
            
            {/* Scan line animation */}
            {!scanned && !loading && (
              <Animated.View 
                style={[
                  styles.scanLine, 
                  { transform: [{ translateY: scanLineAnimation }] }
                ]} 
              />
            )}
          </View>
        </View>
      </View>
      
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>Scan Shop QR Code</Text>
        <Text style={styles.subHeaderText}>
          Align the QR code within the frame to scan
        </Text>
      </View>
      
      <TouchableOpacity 
        style={styles.closeButton}
        onPress={() => navigation.goBack()}
      >
        <MaterialIcons name="close" size={28} color="#fff" />
      </TouchableOpacity>
      
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#ff8c00" />
          <Text style={styles.loadingText}>Loading shop menu...</Text>
        </View>
      )}
      
      {scanned && !loading && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.button}
            onPress={handleScanAgain}
          >
            <Text style={styles.buttonText}>Scan Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#000',
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
  scanOuterContainer: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: CORNER_WIDTH,
    height: CORNER_WIDTH,
    borderColor: '#ff8c00',
  },
  topLeftCorner: {
    top: 0,
    left: 0,
    borderLeftWidth: CORNER_THICKNESS,
    borderTopWidth: CORNER_THICKNESS,
  },
  topRightCorner: {
    top: 0,
    right: 0,
    borderRightWidth: CORNER_THICKNESS,
    borderTopWidth: CORNER_THICKNESS,
  },
  bottomLeftCorner: {
    bottom: 0,
    left: 0,
    borderLeftWidth: CORNER_THICKNESS,
    borderBottomWidth: CORNER_THICKNESS,
  },
  bottomRightCorner: {
    bottom: 0,
    right: 0,
    borderRightWidth: CORNER_THICKNESS,
    borderBottomWidth: CORNER_THICKNESS,
  },
  scanLine: {
    height: 2,
    width: '100%',
    backgroundColor: '#ff8c00',
  },
  headerContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subHeaderText: {
    fontSize: 16,
    color: '#f0f0f0',
    textAlign: 'center',
    paddingHorizontal: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    left: 15,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
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
    borderRadius: 8,
    elevation: 3,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 16,
    fontWeight: '500',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1c1c1c',
    padding: 20,
  },
  permissionText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    textAlign: 'center',
  },
  permissionSubText: {
    fontSize: 16,
    color: '#aaa',
    marginTop: 10,
    marginBottom: 30,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

export default QRScannerScreen; 