import React, { useState } from 'react';
import { StyleSheet, View, Text, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { Button } from 'react-native-paper';
import { initializeSampleUsers } from '../../scripts/firebaseInit';

const AdminInitScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);

  const addLog = (message) => {
    setLogs(prevLogs => [...prevLogs, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleInitializeSampleData = async () => {
    setLoading(true);
    addLog('Starting initialization...');
    
    try {
      // Override console.log to capture initialization logs
      const originalConsoleLog = console.log;
      console.log = (message) => {
        originalConsoleLog(message);
        addLog(message);
      };
      
      await initializeSampleUsers();
      
      // Restore original console.log
      console.log = originalConsoleLog;
      
      addLog('Initialization complete!');
      Alert.alert('Success', 'Sample data has been initialized successfully.');
    } catch (error) {
      console.error('Error during initialization:', error);
      addLog(`Error: ${error.message}`);
      Alert.alert('Error', `Failed to initialize data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Firebase Admin Tools</Text>
      <Text style={styles.subtitle}>
        This screen is for initializing Firebase with sample data for testing purposes.
      </Text>
      
      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={handleInitializeSampleData}
          style={styles.button}
          disabled={loading}
          buttonColor="#ff8c00"
        >
          {loading ? <ActivityIndicator color="white" size="small" /> : 'Initialize Sample Data'}
        </Button>
        
        <Button
          mode="outlined"
          onPress={() => navigation.navigate('Welcome')}
          style={styles.button}
          textColor="#ff8c00"
        >
          Go to Welcome Screen
        </Button>
      </View>
      
      <View style={styles.logsContainer}>
        <Text style={styles.logsTitle}>Initialization Logs:</Text>
        <ScrollView style={styles.logs}>
          {logs.length > 0 ? (
            logs.map((log, index) => (
              <Text key={index} style={styles.logEntry}>{log}</Text>
            ))
          ) : (
            <Text style={styles.emptyLogs}>No logs available</Text>
          )}
        </ScrollView>
      </View>
      
      <Text style={styles.infoText}>
        Sample Login Credentials:{'\n'}
        Customer: customer@example.com / password123{'\n'}
        Vendor: vendor@example.com / password123
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  buttonContainer: {
    marginBottom: 30,
  },
  button: {
    marginBottom: 16,
  },
  logsContainer: {
    flex: 1,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  logsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  logs: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
  },
  logEntry: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4,
    color: '#333',
  },
  emptyLogs: {
    fontStyle: 'italic',
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'monospace',
    lineHeight: 20,
  },
});

export default AdminInitScreen; 