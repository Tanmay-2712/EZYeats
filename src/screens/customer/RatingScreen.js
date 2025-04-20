import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Button, Card, Title, Paragraph, Chip } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';

const RatingScreen = ({ route, navigation }) => {
  const { orderId, shopId, shopName } = route.params;
  const { currentUser } = useAuth();
  const [order, setOrder] = useState(null);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [qualityRating, setQualityRating] = useState(0);
  const [serviceRating, setServiceRating] = useState(0);
  const [valueRating, setValueRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState([]);

  // Predefined tags that user can select
  const feedbackTags = [
    { id: 1, label: 'Tasty Food' },
    { id: 2, label: 'Fast Service' },
    { id: 3, label: 'Good Portions' },
    { id: 4, label: 'Value for Money' },
    { id: 5, label: 'Friendly Staff' },
    { id: 6, label: 'Clean Environment' },
    { id: 7, label: 'Long Wait' },
    { id: 8, label: 'Food Could Be Better' },
    { id: 9, label: 'Incorrect Order' },
  ];

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const orderDoc = await getDoc(doc(db, 'orders', orderId));
      
      if (orderDoc.exists()) {
        const data = orderDoc.data();
        setOrder({
          id: orderDoc.id,
          ...data,
        });
        
        // Check if user already rated this order
        if (data.rating) {
          setRating(data.rating.overall || 0);
          setQualityRating(data.rating.quality || 0);
          setServiceRating(data.rating.service || 0);
          setValueRating(data.rating.value || 0);
          setReview(data.rating.review || '');
          setSelectedTags(data.rating.tags || []);
          setSubmitted(true);
        }
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      Alert.alert('Error', 'Could not fetch order details');
    }
  };

  const handleTagToggle = (tag) => {
    if (selectedTags.find(t => t.id === tag.id)) {
      setSelectedTags(selectedTags.filter(t => t.id !== tag.id));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const calculateOverallRating = () => {
    if (qualityRating === 0 || serviceRating === 0 || valueRating === 0) {
      return 0;
    }
    
    return Math.round((qualityRating + serviceRating + valueRating) / 3);
  };

  useEffect(() => {
    const overall = calculateOverallRating();
    setRating(overall);
  }, [qualityRating, serviceRating, valueRating]);

  const handleSubmitRating = async () => {
    if (rating === 0) {
      Alert.alert('Error', 'Please provide a rating');
      return;
    }

    try {
      setLoading(true);

      // Create rating object
      const ratingData = {
        overall: rating,
        quality: qualityRating,
        service: serviceRating,
        value: valueRating,
        review: review.trim(),
        tags: selectedTags,
        orderId: orderId,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        createdAt: serverTimestamp(),
      };

      // Update order with rating
      await updateDoc(doc(db, 'orders', orderId), {
        'rating': ratingData,
        'hasRating': true,
      });

      // Add to shop ratings collection
      const ratingId = `${orderId}_${currentUser.uid}`;
      await setDoc(doc(db, 'shopRatings', ratingId), {
        ...ratingData,
        shopId: shopId,
        shopName: shopName,
      });

      // Update shop average rating
      const shopRef = doc(db, 'shops', shopId);
      const shopDoc = await getDoc(shopRef);
      
      if (shopDoc.exists()) {
        const shopData = shopDoc.data();
        const ratingCount = shopData.ratingCount || 0;
        const ratingTotal = shopData.ratingTotal || 0;
        
        const newRatingCount = ratingCount + 1;
        const newRatingTotal = ratingTotal + rating;
        const newAverageRating = newRatingTotal / newRatingCount;
        
        await updateDoc(shopRef, {
          ratingCount: newRatingCount,
          ratingTotal: newRatingTotal,
          averageRating: newAverageRating,
        });
      }

      setSubmitted(true);
      setLoading(false);
      Alert.alert(
        'Thank You!', 
        'Your feedback has been submitted successfully',
        [
          { 
            text: 'Go to Orders', 
            onPress: () => navigation.navigate('OrdersTab') 
          }
        ]
      );
    } catch (error) {
      console.error('Error submitting rating:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to submit your rating. Please try again.');
    }
  };

  const renderStars = (currentRating, setRatingFunc) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => !submitted && setRatingFunc(star)}
            disabled={submitted}
          >
            <MaterialIcons
              name={star <= currentRating ? 'star' : 'star-border'}
              size={36}
              color={star <= currentRating ? '#FFD700' : '#aaa'}
              style={styles.starIcon}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (!order) {
    return (
      <View style={styles.loaderContainer}>
        <MaterialIcons name="hourglass-empty" size={48} color="#ff8c00" />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView}>
        <Card style={styles.headerCard}>
          <Card.Content>
            <Title style={styles.shopTitle}>{shopName}</Title>
            <Paragraph style={styles.orderIdText}>Order #{orderId.substring(0, 6)}</Paragraph>
            
            {submitted ? (
              <View style={styles.submittedContainer}>
                <MaterialIcons name="check-circle" size={64} color="#4CAF50" />
                <Text style={styles.submittedText}>Thank you for your feedback!</Text>
                <View style={styles.submittedRating}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <MaterialIcons
                      key={star}
                      name={star <= rating ? 'star' : 'star-border'}
                      size={32}
                      color={star <= rating ? '#FFD700' : '#aaa'}
                    />
                  ))}
                </View>
              </View>
            ) : (
              <Text style={styles.ratePrompt}>
                Please rate your experience with {shopName}
              </Text>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Overall Rating</Title>
            <View style={styles.ratingContainer}>
              <Text style={styles.ratingValue}>{rating}</Text>
              {renderStars(rating, setRating)}
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Food Quality</Title>
            {renderStars(qualityRating, setQualityRating)}
            
            <Title style={[styles.sectionTitle, styles.sectionSpacing]}>Service</Title>
            {renderStars(serviceRating, setServiceRating)}
            
            <Title style={[styles.sectionTitle, styles.sectionSpacing]}>Value for Money</Title>
            {renderStars(valueRating, setValueRating)}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>What did you like?</Title>
            <View style={styles.tagsContainer}>
              {feedbackTags.map((tag) => (
                <Chip
                  key={tag.id}
                  selected={selectedTags.some(t => t.id === tag.id)}
                  onPress={() => !submitted && handleTagToggle(tag)}
                  style={styles.tagChip}
                  selectedColor="#ff8c00"
                  disabled={submitted}
                >
                  {tag.label}
                </Chip>
              ))}
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Additional Comments</Title>
            <TextInput
              style={styles.reviewInput}
              placeholder="Share your experience..."
              value={review}
              onChangeText={setReview}
              multiline
              numberOfLines={4}
              editable={!submitted}
            />
          </Card.Content>
        </Card>

        {!submitted && (
          <Button
            mode="contained"
            onPress={handleSubmitRating}
            style={styles.submitButton}
            loading={loading}
            disabled={loading || rating === 0}
          >
            Submit Feedback
          </Button>
        )}

        {submitted && (
          <Button
            mode="outlined"
            onPress={() => navigation.navigate('OrdersTab')}
            style={styles.backButton}
          >
            Back to Orders
          </Button>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    padding: 16,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  headerCard: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  shopTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  orderIdText: {
    color: '#666',
    marginBottom: 8,
  },
  ratePrompt: {
    marginTop: 12,
    fontSize: 16,
    fontStyle: 'italic',
    color: '#666',
  },
  card: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  sectionSpacing: {
    marginTop: 24,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  ratingValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ff8c00',
    marginRight: 16,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  starIcon: {
    marginHorizontal: 4,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#ff8c00',
    marginVertical: 16,
    paddingVertical: 8,
  },
  backButton: {
    borderColor: '#ff8c00',
    marginVertical: 16,
    paddingVertical: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagChip: {
    margin: 4,
  },
  submittedContainer: {
    alignItems: 'center',
    padding: 16,
  },
  submittedText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 12,
    color: '#333',
  },
  submittedRating: {
    flexDirection: 'row',
    marginVertical: 8,
  },
});

export default RatingScreen; 