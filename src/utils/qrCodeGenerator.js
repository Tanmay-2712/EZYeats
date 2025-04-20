/**
 * Utility functions for QR code generation and handling
 */

/**
 * Generates a QR code data string for a shop
 * @param {string} shopId - The Firestore document ID of the shop
 * @returns {string} - QR code data string in the format "ezyeats-shop:SHOP_ID"
 */
export const generateShopQRData = (shopId) => {
  if (!shopId) {
    throw new Error('Shop ID is required');
  }
  return `ezyeats-shop:${shopId}`;
};

/**
 * Extracts a shop ID from QR code data
 * @param {string} qrData - QR code data string
 * @returns {string|null} - Shop ID if valid format, null otherwise
 */
export const extractShopId = (qrData) => {
  if (!qrData || typeof qrData !== 'string') {
    return null;
  }
  
  if (qrData.startsWith('ezyeats-shop:')) {
    return qrData.replace('ezyeats-shop:', '');
  }
  
  return null;
}; 