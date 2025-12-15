import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import notificationService from '../../services/notifications';
import * as Notifications from 'expo-notifications';

/**
 * NotificationTestScreen - Test all notification functionality
 * Use this screen to verify notifications work on physical devices
 */
export default function NotificationTestScreen() {
  const [permissionStatus, setPermissionStatus] = useState<string>('Unknown');
  const [scheduledCount, setScheduledCount] = useState<number>(0);
  const [lastNotification, setLastNotification] = useState<string>('None');

  useEffect(() => {
    checkPermissions();
    loadScheduledNotifications();

    // Listen for received notifications
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      setLastNotification(notification.request.content.title || 'Untitled');
    });

    return () => subscription.remove();
  }, []);

  const checkPermissions = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setPermissionStatus(status);
  };

  const loadScheduledNotifications = async () => {
    const scheduled = await notificationService.getScheduledNotifications();
    setScheduledCount(scheduled.length);
  };

  const handleRequestPermissions = async () => {
    const hasPermission = await notificationService.requestPermissions();
    if (hasPermission) {
      Alert.alert('Success', 'Notification permissions granted!');
      checkPermissions();
    } else {
      Alert.alert('Denied', 'Notification permissions denied');
    }
  };

  const handleSendTestNotification = async () => {
    await notificationService.sendImmediateNotification(
      '🧪 Test Notification',
      'This is a test notification sent immediately',
      'default'
    );
    Alert.alert('Sent', 'Test notification sent!');
  };

  const handleScheduleDailyReminder = async () => {
    await notificationService.scheduleDailyReminder();
    Alert.alert('Scheduled', 'Daily reminders set for 10am, 2pm, and 7pm');
    loadScheduledNotifications();
  };

  const handleScheduleEngagement = async () => {
    await notificationService.scheduleEngagementNotifications();
    Alert.alert('Scheduled', 'Engagement notifications set for 24h and 48h');
    loadScheduledNotifications();
  };

  const handleScheduleLifeFull = async () => {
    // Test with 2 minutes (120000ms)
    await notificationService.scheduleLifeFullNotification(120000);
    Alert.alert('Scheduled', 'Life-full notification set for 2 minutes from now');
    loadScheduledNotifications();
  };

  const handleCancelAll = async () => {
    await notificationService.cancelAllNotifications();
    Alert.alert('Cancelled', 'All scheduled notifications cancelled');
    loadScheduledNotifications();
  };

  const handleViewScheduled = async () => {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    if (scheduled.length === 0) {
      Alert.alert('No Notifications', 'No notifications are currently scheduled');
    } else {
      const list = scheduled.map((n, i) => 
        `${i + 1}. ${n.content.title}\n   Type: ${n.content.data?.type || 'unknown'}`
      ).join('\n\n');
      Alert.alert(`${scheduled.length} Scheduled`, list, [{ text: 'OK' }], { 
        cancelable: true 
      });
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.title}>📱 Notification Test Panel</Text>
        <Text style={styles.subtitle}>Test all notification features</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Status</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Permission:</Text>
          <Text style={[
            styles.statusValue,
            permissionStatus === 'granted' ? styles.granted : styles.denied
          ]}>
            {permissionStatus}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Scheduled:</Text>
          <Text style={styles.statusValue}>{scheduledCount} notifications</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Last Received:</Text>
          <Text style={styles.statusValue}>{lastNotification}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔧 Setup</Text>
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleRequestPermissions}
        >
          <Text style={styles.buttonText}>Request Permissions</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🧪 Test Actions</Text>
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleSendTestNotification}
        >
          <Text style={styles.buttonText}>Send Immediate Test</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleScheduleDailyReminder}
        >
          <Text style={styles.buttonText}>Schedule Daily Reminders</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleScheduleEngagement}
        >
          <Text style={styles.buttonText}>Schedule Engagement (24h/48h)</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleScheduleLifeFull}
        >
          <Text style={styles.buttonText}>Schedule Life-Full (2 min test)</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Management</Text>
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleViewScheduled}
        >
          <Text style={styles.buttonText}>View All Scheduled</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.dangerButton]} 
          onPress={handleCancelAll}
        >
          <Text style={styles.buttonText}>Cancel All Notifications</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.infoText}>
          ⚠️ Test on a physical device for best results.{'\n'}
          Emulators may not support notifications properly.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  granted: {
    color: '#4CAF50',
  },
  denied: {
    color: '#F44336',
  },
  button: {
    backgroundColor: '#58CC02',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  dangerButton: {
    backgroundColor: '#FF4B4B',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
    textAlign: 'center',
  },
});
