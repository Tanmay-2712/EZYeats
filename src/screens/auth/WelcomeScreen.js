import React, { useState } from 'react';
import { StyleSheet, View, Image, Text, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const WelcomeScreen = ({ navigation }) => {
  const [adminTaps, setAdminTaps] = useState(0);

  const handleLogoPress = () => {
    setAdminTaps(prev => {
      const newCount = prev + 1;
      if (newCount >= 5) {
        navigation.navigate('AdminInit');
        return 0;
      }
      return newCount;
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.logoContainer}>
        <TouchableOpacity onPress={handleLogoPress} activeOpacity={0.8}>
          <Text style={styles.logoText}>EZY EATS</Text>
        </TouchableOpacity>
        <Text style={styles.tagline}>Campus Canteen Ordering Made Easy</Text>
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.registerButton]}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.buttonText}>Create Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ff8c00',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logoText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  tagline: {
    fontSize: 18,
    color: 'white',
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    padding: 20,
  },
  button: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 15,
  },
  registerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  buttonText: {
    color: '#ff8c00',
    fontWeight: 'bold',
    fontSize: 18,
  },
});

export default WelcomeScreen; 