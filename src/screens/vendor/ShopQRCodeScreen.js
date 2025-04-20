import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Share, Alert } from 'react-native';
import { Button, Card, Title, Paragraph } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { generateShopQRData } from '../../utils/qrCodeGenerator';

const ShopQRCodeScreen = ({ route, navigation }) => {
  const { shopId } = route.params;
  const { currentUser } = useAuth();
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrValue, setQrValue] = useState('');
  const [qrRef, setQrRef] = useState(null);
  const [hasMediaPermission, setHasMediaPermission] = useState(null);

  useEffect(() => {
    fetchShopDetails();
    checkMediaPermission();
  }, [shopId]);

  const checkMediaPermission = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    setHasMediaPermission(status === 'granted');
  };

  const fetchShopDetails = async () => {
    try {
      setLoading(true);
      const shopDoc = await getDoc(doc(db, 'shops', shopId));
      
      if (!shopDoc.exists()) {
        Alert.alert('Error', 'Shop not found');
        navigation.goBack();
        return;
      }
      
      const shopData = { id: shopDoc.id, ...shopDoc.data() };
      
      // Verify this shop belongs to the current user
      if (shopData.ownerId !== currentUser.uid) {
        Alert.alert('Error', 'You do not have permission to access this shop');
        navigation.goBack();
        return;
      }
      
      setShop(shopData);
      
      // Generate QR code data
      const qrData = generateShopQRData(shopId);
      setQrValue(qrData);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching shop details:', error);
      Alert.alert('Error', 'Failed to load shop details');
      setLoading(false);
    }
  };

  const saveQRCodeToDevice = async () => {
    if (!hasMediaPermission) {
      Alert.alert(
        'Permission Required',
        'Storage permission is required to save QR code',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Grant Permission', onPress: checkMediaPermission }
        ]
      );
      return;
    }

    try {
      if (!qrRef) {
        Alert.alert('Error', 'QR code not ready yet. Please try again.');
        return;
      }

      // Convert QR code to image
      const qrImage = await qrRef.toDataURL();
      const fileUri = FileSystem.documentDirectory + `${shop.name.replace(/\s+/g, '_')}_qrcode.png`;
      
      await FileSystem.writeAsStringAsync(fileUri, qrImage, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Save to device
      const asset = await MediaLibrary.createAssetAsync(fileUri);
      await MediaLibrary.createAlbumAsync('EZYeats', asset, false);
      
      Alert.alert('Success', 'QR Code saved to your gallery');
    } catch (error) {
      console.error('Error saving QR code:', error);
      Alert.alert('Error', 'Failed to save QR code');
    }
  };

  const shareQRCode = async () => {
    try {
      if (!qrRef) {
        Alert.alert('Error', 'QR code not ready yet. Please try again.');
        return;
      }

      // Convert QR code to image
      const qrImage = await qrRef.toDataURL();
      const fileUri = FileSystem.documentDirectory + `${shop.name.replace(/\s+/g, '_')}_qrcode.png`;
      
      await FileSystem.writeAsStringAsync(fileUri, qrImage, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Sharing not available', 'Sharing is not available on this device');
        return;
      }
      
      // Share the QR code
      await Sharing.shareAsync(fileUri, {
        mimeType: 'image/png',
        dialogTitle: `${shop.name} QR Code`,
        UTI: 'public.png'
      });
    } catch (error) {
      console.error('Error sharing QR code:', error);
      Alert.alert('Error', 'Failed to share QR code');
    }
  };

  const shareShopLink = async () => {
    try {
      // You can use a deep link here if your app supports it
      // For now we'll just share a text that includes the shop ID
      await Share.share({
        message: `Check out ${shop.name} on EZYeats! Open the app and scan this shop's QR code or use shop ID: ${shopId}`,
      });
    } catch (error) {
      console.error('Error sharing shop link:', error);
    }
  };

  if (loading || !shop) {
    return (
      <View style={styles.loadingContainer}>
        <MaterialIcons name="hourglass-empty" size={48} color="#ff8c00" />
        <Text style={styles.loadingText}>Loading shop details...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.qrCard}>
        <Card.Content style={styles.qrCardContent}>
          <Title style={styles.shopName}>{shop.name}</Title>
          <Paragraph style={styles.shopLocation}>
            <MaterialIcons name="location-on" size={16} color="#666" />
            {' '}{shop.location}
          </Paragraph>
          
          <View style={styles.qrContainer}>
            {qrValue ? (
              <QRCode
                value={qrValue}
                size={200}
                color="#000"
                backgroundColor="#fff"
                getRef={(ref) => setQrRef(ref)}
              />
            ) : (
              <View style={styles.qrPlaceholder}>
                <MaterialIcons name="qr-code" size={100} color="#ddd" />
              </View>
            )}
          </View>
          
          <Text style={styles.qrInfo}>
            Customers can scan this QR code to view your shop's menu
          </Text>
        </Card.Content>
      </Card>
      
      <Card style={styles.instructionsCard}>
        <Card.Content>
          <Title style={styles.instructionsTitle}>How to use your QR code</Title>
          <View style={styles.instructionItem}>
            <MaterialIcons name="print" size={24} color="#ff8c00" />
            <Text style={styles.instructionText}>
              Print the QR code and place it at your shop's entrance or counter
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <MaterialIcons name="smartphone" size={24} color="#ff8c00" />
            <Text style={styles.instructionText}>
              Customers can scan the code with the EZYeats app to view your menu
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <MaterialIcons name="shopping-cart" size={24} color="#ff8c00" />
            <Text style={styles.instructionText}>
              They can browse and place orders directly from their phones
            </Text>
          </View>
        </Card.Content>
      </Card>
      
      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          icon="download"
          onPress={saveQRCodeToDevice}
          style={styles.actionButton}
          buttonColor="#ff8c00"
        >
          Save to Device
        </Button>
        
        <Button
          mode="contained"
          icon="share"
          onPress={shareQRCode}
          style={styles.actionButton}
          buttonColor="#4CAF50"
        >
          Share QR Code
        </Button>
        
        <Button
          mode="outlined"
          icon="link"
          onPress={shareShopLink}
          style={styles.linkButton}
          textColor="#ff8c00"
        >
          Share as Text
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  qrCard: {
    margin: 16,
    backgroundColor: '#fff',
    elevation: 4,
  },
  qrCardContent: {
    alignItems: 'center',
    padding: 16,
  },
  shopName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  shopLocation: {
    color: '#666',
    marginBottom: 20,
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9f9f9',
  },
  qrInfo: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
  },
  instructionsCard: {
    margin: 16,
    marginTop: 0,
    backgroundColor: '#fff',
    elevation: 4,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  instructionText: {
    marginLeft: 16,
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  buttonContainer: {
    margin: 16,
    marginTop: 0,
  },
  actionButton: {
    marginBottom: 12,
    paddingVertical: 8,
  },
  linkButton: {
    marginBottom: 24,
    borderColor: '#ff8c00',
    paddingVertical: 8,
  },
});

export default ShopQRCodeScreen; 